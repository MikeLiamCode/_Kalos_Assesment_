import io
import re
from datetime import datetime
import pdfplumber


def _extract_number(patterns: list[str], text: str, field_name: str) -> float:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
    raise ValueError(f"Could not extract {field_name} from PDF text")


def _extract_date(text: str) -> datetime:
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


def parse_dexa_pdf_from_bytes(file_bytes: bytes):
    text = ""

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"

    # Adjust these patterns if your PDF labels differ slightly
    weight_kg = _extract_number(
        [
            r"Weight\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"Total\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
        ],
        text,
        "weightKg",
    )

    body_fat_percent = _extract_number(
        [
            r"Body\s*Fat\s*%?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"Percent\s*Body\s*Fat\s*[:\-]?\s*(\d+(?:\.\d+)?)",
        ],
        text,
        "bodyFatPercent",
    )

    fat_mass_kg = _extract_number(
        [
            r"Fat\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"Total\s*Fat\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
        ],
        text,
        "fatMassKg",
    )

    lean_mass_kg = _extract_number(
        [
            r"Lean\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"Lean\s*Tissue\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"Fat\s*Free\s*Mass\s*(?:\(kg\)|kg)?\s*[:\-]?\s*(\d+(?:\.\d+)?)",
        ],
        text,
        "leanMassKg",
    )

    scan_date = _extract_date(text)

    return {
        "weightKg": weight_kg,
        "bodyFatPercent": body_fat_percent,
        "fatMassKg": fat_mass_kg,
        "leanMassKg": lean_mass_kg,
        "scanDate": scan_date,
    }