"""
FastAPI routes for Tier 2 agents: insight digest + chatbot. Both require
a valid bearer JWT (verified against JWT_SECRET, same secret the Node
backend signs with) and forward that same token to the Node backend when
building a BusinessSnapshot — this service never talks to Postgres
directly, Node remains the source of truth.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt, JWTError
from pydantic import BaseModel

from config import JWT_SECRET
from insights.engine import generate_insights
from insights.snapshot import build_snapshot
from chatbot.handlers import get_chatbot_response

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


async def verify_token(authorization: str = Header(...)) -> str:
    """Extracts and verifies the bearer token, returns the raw token string
    (not the decoded payload) — snapshot.py forwards this same token to
    Node, which does its own verification/business-scoping. This function
    just confirms it's genuinely a token Node issued before we do any work."""
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
            {
                "id": i.id,
                "domain": i.domain,
                "severity": i.severity,
                "message": i.message,
                "data": i.data,
            }
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
