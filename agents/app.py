"""
FastAPI entrypoint for the agents service (Tier 2: insights + chatbot).
Deployed separately from the Node backend — this process owns none of
the Postgres data itself, it calls out to Node for raw data and computes
insights/chatbot responses on top.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.intelligence_routes import router as intelligence_router

app = FastAPI(title="DANN Agents Service")

# Same CORS concern as the Node backend — the two Vercel frontends call
# this service directly (not proxied through Node), so both origins need
# to be allowlisted here too, not just on the Node side.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dannbusiness.vercel.app",
        "https://dannclient.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intelligence_router)


@app.on_event("startup")
async def preload_model():
    # Loads the sentence-transformers model (and downloads it, on a fresh
    # deploy) during startup rather than on the first real chatbot request
    # — a cold first request could otherwise take 30+ seconds and time out.
    from chatbot.classifier import _ensure_loaded
    _ensure_loaded()


@app.get("/health")
async def health_check():
    return {"success": True, "data": {"status": "ok"}}