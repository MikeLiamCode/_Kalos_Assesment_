from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db
from app.schemas import ParseRequest
from app.services.pdf_parser import parse_dexa_pdf

router = APIRouter()

@router.post("")
def parse_scan(payload: ParseRequest, db: Session = Depends(get_db)):
    parsed = parse_dexa_pdf(payload.filePath)

    db.execute(text("""
        INSERT INTO \"Scan\" (
            id, \"memberId\", \"scanDate\", \"weightKg\", \"bodyFatPercent\", \"fatMassKg\", \"leanMassKg\",
            \"visceralFatMassKg\", \"boneMassKg\", \"bmrKcal\", \"trunkFatKg\", \"trunkLeanMassKg\",
            \"androidFatPercent\", \"gynoidFatPercent\", \"createdAt\"
        ) VALUES (
            gen_random_uuid()::text,
            :member_id, :scan_date, :weight_kg, :body_fat, :fat_mass, :lean_mass,
            :visceral, :bone, :bmr, :trunk_fat, :trunk_lean,
            :android_fat, :gynoid_fat, now()
        )
    """), {
        "member_id": payload.memberId,
        "scan_date": parsed["scanDate"],
        "weight_kg": parsed["weightKg"],
        "body_fat": parsed["bodyFatPercent"],
        "fat_mass": parsed["fatMassKg"],
        "lean_mass": parsed["leanMassKg"],
        "visceral": parsed["visceralFatMassKg"],
        "bone": parsed["boneMassKg"],
        "bmr": parsed.get("bmrKcal", 1500),
        "trunk_fat": parsed["trunkFatKg"],
        "trunk_lean": parsed["trunkLeanMassKg"],
        "android_fat": parsed["androidFatPercent"],
        "gynoid_fat": parsed["gynoidFatPercent"],
    })

    db.execute(text("UPDATE \"UploadedFile\" SET \"parseStatus\" = 'SUCCESS' WHERE id = :upload_id"), {"upload_id": payload.uploadId})
    db.commit()
    return {"ok": True, "parsed": parsed}