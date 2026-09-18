"""
Orchestrates the OCR pipeline: image bytes + claimed category in, a
single response shape out — regardless of whether the failure happened
at the OCR engine (bad photo) or classification (wrong category).
Callers (routes/ocr.py) only ever need to handle one result shape.
"""

from ocr.engine import extract_text, OCRProcessingError
from ocr.classifier import classify


def process_image(image_bytes: bytes, claimed_category: str) -> dict:
    try:
        text = extract_text(image_bytes)
    except OCRProcessingError as e:
        return {
            "status": "unclear",
            "claimed_category": claimed_category,
            "detected_category": None,
            "scores": {},
            "text": None,
            "message": str(e),
        }

    result = classify(text, claimed_category)
    result["text"] = text
    return result