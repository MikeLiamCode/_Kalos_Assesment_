from fastapi import APIRouter, UploadFile, File, Form, HTTPException
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

        return {
            "ok": True,
            "memberId": memberId,
            "uploadId": uploadId,
            "parsed": {
                "weightKg": float(parsed.get("weightKg", 0.0) or 0.0),
                "bodyFatPercent": float(parsed.get("bodyFatPercent", 0.0) or 0.0),
                "fatMassKg": float(parsed.get("fatMassKg", 0.0) or 0.0),
                "leanMassKg": float(parsed.get("leanMassKg", 0.0) or 0.0),
                "scanDate": (
                    parsed.get("scanDate").isoformat()
                    if parsed.get("scanDate")
                    else None
                ),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))