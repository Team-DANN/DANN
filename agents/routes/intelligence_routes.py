"""
FastAPI routes for Tier 2 agents: insight digest, chatbot, and OCR
classification. All require a valid bearer JWT (verified against
JWT_SECRET, same secret the Node backend signs with).
"""

from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from jose import jwt, JWTError
from pydantic import BaseModel

from config import JWT_SECRET
from insights.engine import generate_insights
from insights.snapshot import build_snapshot
from chatbot.handlers import get_chatbot_response
from schemas.ocr import OCRCategory
from ocr.service import process_image

MAX_UPLOAD_BYTES = 1_000_000

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


async def verify_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token


@router.get("/insights")
async def get_insights(token: str = Depends(verify_token)):
    snapshot = await build_snapshot(token)
    insights = generate_insights(snapshot)
    return {
        "success": True,
        "data": [
            {"id": i.id, "domain": i.domain, "severity": i.severity, "message": i.message, "data": i.data}
            for i in insights
        ],
    }


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat(body: ChatRequest, token: str = Depends(verify_token)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")
    response = await get_chatbot_response(body.message, token)
    return {"success": True, "data": {"response": response}}


@router.post("/ocr/classify")
async def classify_image(
    category: OCRCategory = Form(...),
    file: UploadFile = File(...),
    token: str = Depends(verify_token),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 1MB limit")

    result = process_image(image_bytes, category.value)
    return {"success": True, "data": result}