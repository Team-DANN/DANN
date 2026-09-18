import sys
import httpx
import config


class OCRProcessingError(Exception):
    """Raised when OCR.space couldn't extract usable text from the image."""
    pass


def extract_text(image_bytes: bytes) -> str:
    response = httpx.post(
        config.OCR_SPACE_ENDPOINT,
        files={"file": ("image.jpg", image_bytes)},
        data={"apikey": config.OCR_SPACE_API_KEY, "language": "eng"},
    )
    result = response.json()

    if result.get("IsErroredOnProcessing"):
        raise OCRProcessingError(result.get("ErrorMessage", "OCR failed to process the image."))

    parsed_results = result.get("ParsedResults")
    if not parsed_results:
        raise OCRProcessingError("OCR returned no results — image may be unreadable.")

    text = parsed_results[0].get("ParsedText", "").strip()
    if not text:
        raise OCRProcessingError("No text could be extracted — image may be blank, blurry, or unreadable.")

    return text


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m ocr.engine path/to/image.jpg")
        sys.exit(1)

    with open(sys.argv[1], "rb") as f:
        print(extract_text(f.read()))