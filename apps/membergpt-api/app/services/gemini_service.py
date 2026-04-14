import os
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"


def format_with_gemini(question: str, raw_answer: str) -> str:
    prompt = f"""
You are a fitness analytics assistant.

User question:
{question}

Database answer:
{raw_answer}

Rewrite the answer in a clear, professional, human-friendly way.
Keep it short (2-3 lines max).
Do NOT add any new information.
"""

    response = requests.post(
        URL,
        headers={"Content-Type": "application/json"},
        json={
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ]
        },
    )

    if response.status_code != 200:
        return raw_answer  # fallback

    try:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        return raw_answer