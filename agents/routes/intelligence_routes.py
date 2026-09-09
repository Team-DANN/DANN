from fastapi import APIRouter

# This is the ONLY file backend/ imports from. Every agents/ capability
# gets exposed here and nowhere else.
router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])


@router.get("/runway/{product_id}")
def get_runway(product_id: str):
    """Tier 1 — see predictors/runway_predictor.py"""
    raise NotImplementedError


@router.get("/anomalies")
def get_anomalies():
    """Tier 1 — see predictors/anomaly_detector.py"""
    raise NotImplementedError


@router.post("/assistant")
def ask_assistant(message: str):
    """Tier 2 — see llm/conversational_assistant_agent.py"""
    raise NotImplementedError
