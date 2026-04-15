import io
import re
import os
import json
from datetime import datetime
import pdfplumber
import requests


def _extract_number(patterns: list[str], text: str):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except Exception:
                pass
    return None


def _extract_date(text: str):
    date_patterns = [
        r"(?:Scan\s*Date|Exam\s*Date|Study\s*Date|Date)\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{2,4})",
        r"(\d{4}-\d{2}-\d{2})",
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw = match.group(1).strip()
            for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d"):
                try:
                    return datetime.strptime(raw, fmt)
                except ValueError:
                    pass

    return datetime.utcnow()


def _extract_with_regex(text: str):
    return {
        "weightKg": _extract_number(
            [
                r"Weight\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"Total\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            ],
            text,
        ),
        "bodyFatPercent": _extract_number(
            [
                r"Body\s*Fat\s*%?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"Percent\s*Body\s*Fat\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            ],
            text,
        ),
        "fatMassKg": _extract_number(
            [
                r"Fat\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"Total\s*Fat\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            ],
            text,
        ),
        "leanMassKg": _extract_number(
            [
                r"Lean\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"Lean\s*Tissue\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"Fat\s*Free\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"FFM\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
                r"Lean\s*Body\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            ],
            text,
        ),
        "scanDate": _extract_date(text),
    }


def _extract_with_gemini(text: str):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or not text.strip():
        return {}

    prompt = f"""
Extract these DEXA values from the text and return ONLY valid JSON:

{{
  "weightKg": number or null,
  "bodyFatPercent": number or null,
  "fatMassKg": number or null,
  "leanMassKg": number or null,
  "scanDate": "YYYY-MM-DD" or null
}}

Rules:
- Return only JSON
- If a field is missing, return null
- Do not explain anything

DEXA TEXT:
{text}
"""

    try:
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
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        if start == -1 or end == 0:
            return {}

        parsed = json.loads(raw_text[start:end])

        result = {}

        if parsed.get("weightKg") is not None:
            result["weightKg"] = float(parsed["weightKg"])
        if parsed.get("bodyFatPercent") is not None:
            result["bodyFatPercent"] = float(parsed["bodyFatPercent"])
        if parsed.get("fatMassKg") is not None:
            result["fatMassKg"] = float(parsed["fatMassKg"])
        if parsed.get("leanMassKg") is not None:
            result["leanMassKg"] = float(parsed["leanMassKg"])
        if parsed.get("scanDate"):
            try:
                result["scanDate"] = datetime.fromisoformat(parsed["scanDate"])
            except Exception:
                pass

        return result
    except Exception:
        return {}


def parse_dexa_pdf_from_bytes(file_bytes: bytes):
    text = ""

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
    except Exception:
        text = ""

    regex_result = _extract_with_regex(text)
    gemini_result = _extract_with_gemini(text)

    final_result = {
        "weightKg": regex_result.get("weightKg"),
        "bodyFatPercent": regex_result.get("bodyFatPercent"),
        "fatMassKg": regex_result.get("fatMassKg"),
        "leanMassKg": regex_result.get("leanMassKg"),
        "scanDate": regex_result.get("scanDate"),
    }

    for key, value in gemini_result.items():
        if final_result.get(key) is None:
            final_result[key] = value

    return {
        "weightKg": float(final_result.get("weightKg") or 0.0),
        "bodyFatPercent": float(final_result.get("bodyFatPercent") or 0.0),
        "fatMassKg": float(final_result.get("fatMassKg") or 0.0),
        "leanMassKg": float(final_result.get("leanMassKg") or 0.0),
        "scanDate": final_result.get("scanDate") or datetime.utcnow(),
    }