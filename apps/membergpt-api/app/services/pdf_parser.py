import io
import pdfplumber
import requests
import os
import json
from datetime import datetime


def parse_dexa_pdf_from_bytes(file_bytes: bytes):
    text = ""

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"

    gemini_key = os.getenv("GEMINI_API_KEY")

    prompt = f"""
You are a medical data extractor.

Extract the following fields from the DEXA scan text:

- weightKg
- bodyFatPercent
- fatMassKg
- leanMassKg
- scanDate

Return ONLY valid JSON like:
{{
  "weightKg": number,
  "bodyFatPercent": number,
  "fatMassKg": number,
  "leanMassKg": number,
  "scanDate": "YYYY-MM-DD"
}}

If a field is missing, estimate conservatively.

DEXA TEXT:
{text}
"""

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={gemini_key}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ]
        },
        timeout=20
    )

    data = response.json()

    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]

        # extract JSON safely
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        json_str = raw_text[start:end]

        parsed = json.loads(json_str)

        return {
            "weightKg": float(parsed["weightKg"]),
            "bodyFatPercent": float(parsed["bodyFatPercent"]),
            "fatMassKg": float(parsed["fatMassKg"]),
            "leanMassKg": float(parsed["leanMassKg"]),
            "scanDate": datetime.fromisoformat(parsed["scanDate"]),
        }

    except Exception as e:
        raise Exception(f"Gemini parsing failed: {str(e)}")