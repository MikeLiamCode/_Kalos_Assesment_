from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.db import SessionLocal
from app.services.pdf_parser import parse_dexa_pdf_from_bytes

router = APIRouter()

@router.post("/parse")
async def parse_report(
    memberId: str = Form(...),
    uploadId: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        contents = await file.read()
        parsed = parse_dexa_pdf_from_bytes(contents)

        db = SessionLocal()
        try:
            scan = db.scan.create({
                "memberId": memberId,
                "weightKg": parsed["weightKg"],
                "bodyFatPercent": parsed["bodyFatPercent"],
                "fatMassKg": parsed["fatMassKg"],
                "leanMassKg": parsed["leanMassKg"],
                "scanDate": parsed["scanDate"],
            })

            db.uploadedFile.update({
                "where": {"id": uploadId},
                "data": {"parseStatus": "SUCCESS"},
            })

            return {"ok": True, "scanId": scan["id"]}
        finally:
            db.close()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))