# tests/test_ocr.py — costs zero requests
from unittest.mock import patch
from ocr.service import process_image

def test_match_when_text_contains_category_keywords():
    with patch("ocr.service.extract_text", return_value="cash journal entry credit debit"):
        result = process_image(b"fake", "finance")
    assert result["status"] == "match"

def test_unclear_when_ocr_fails():
    from ocr.engine import OCRProcessingError
    with patch("ocr.service.extract_text", side_effect=OCRProcessingError("blurry")):
        result = process_image(b"fake", "finance")
    assert result["status"] == "unclear"
def test_mismatch_when_no_claimed_category_keywords_found():
    with patch("ocr.service.extract_text", return_value="stock count reorder level warehouse"):
        result = process_image(b"fake", "finance")
    assert result["status"] == "mismatch"
    assert result["detected_category"] == "inventory"

def test_ambiguous_when_multiple_categories_match():
    with patch("ocr.service.extract_text", return_value="cash journal item quantity"):
        result = process_image(b"fake", "finance")
    assert result["ambiguous"] is True