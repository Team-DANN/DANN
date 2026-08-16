#!/usr/bin/env bash
# Run from the repo root (DANN/), on the client-agents branch.
# Fills in the rest of agents/ — Tier 1 predictors have real working logic,
# Tier 2 LLM files are stubs to build once Tier 1 is validated.
set -e

cd agents 2>/dev/null || { echo "No agents/ folder here — run this from the repo root."; exit 1; }

mkdir -p routes schemas predictors llm/prompts clients tests

touch __init__.py routes/__init__.py schemas/__init__.py predictors/__init__.py \
  llm/__init__.py clients/__init__.py

cat > config.py << 'EOF'
import os

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
EOF

# ---------- routes ----------

cat > routes/intelligence_routes.py << 'EOF'
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
EOF

# ---------- schemas ----------

cat > schemas/runway.py << 'EOF'
from pydantic import BaseModel


class RunwayRequest(BaseModel):
    product_id: str


class RunwayResponse(BaseModel):
    days_remaining: float
    stock_level: float
EOF

cat > schemas/anomaly.py << 'EOF'
from pydantic import BaseModel


class AnomalyResponse(BaseModel):
    flagged_indices: list[int]
    threshold: float
EOF

cat > schemas/reorder.py << 'EOF'
from pydantic import BaseModel


class ReorderRequest(BaseModel):
    lead_time_days: float
    daily_consumption_rate: float
    safety_stock: float = 0


class ReorderResponse(BaseModel):
    reorder_point: float
EOF

cat > schemas/risk_score.py << 'EOF'
from pydantic import BaseModel


class RiskScoreRequest(BaseModel):
    overdue_amount: float
    days_late: int


class RiskScoreResponse(BaseModel):
    score: float
EOF

cat > schemas/voice_extraction.py << 'EOF'
from pydantic import BaseModel


class VoiceExtractionRequest(BaseModel):
    transcript: str


class VoiceExtractionResponse(BaseModel):
    product: str
    quantity: float
    unit: str
    notes: str | None = None
EOF

cat > schemas/assistant.py << 'EOF'
from pydantic import BaseModel


class AssistantRequest(BaseModel):
    message: str


class AssistantResponse(BaseModel):
    reply: str
EOF

# ---------- predictors (Tier 1 — real logic, no LLM) ----------

cat > predictors/runway_predictor.py << 'EOF'
def predict_runway(stock_level: float, daily_consumption_rate: float) -> float:
    """Days of runway remaining = stock / daily consumption.
    Returns float('inf') if there's no consumption to divide by."""
    if daily_consumption_rate <= 0:
        return float("inf")
    return stock_level / daily_consumption_rate
EOF

cat > predictors/anomaly_detector.py << 'EOF'
import statistics


def detect_anomalies(values: list[float], threshold: float = 2.0) -> list[int]:
    """Flags indices where a value is more than `threshold` standard
    deviations from the mean. Simple statistical flagging, no ML."""
    if len(values) < 2:
        return []
    mean = statistics.mean(values)
    stdev = statistics.pstdev(values)
    if stdev == 0:
        return []
    return [i for i, v in enumerate(values) if abs(v - mean) / stdev > threshold]
EOF

cat > predictors/reorder_engine.py << 'EOF'
def calculate_reorder_point(
    lead_time_days: float,
    daily_consumption_rate: float,
    safety_stock: float = 0,
) -> float:
    """Reorder point = (lead time * consumption rate) + safety stock."""
    return (lead_time_days * daily_consumption_rate) + safety_stock
EOF

cat > predictors/payment_risk_scorer.py << 'EOF'
def score_payment_risk(overdue_amount: float, days_late: int) -> float:
    """Simple 0-100 risk score. Higher overdue amount and more days
    late both push the score up. Not late -> 0."""
    if days_late <= 0:
        return 0.0
    score = min(100.0, (overdue_amount / 1000) * 10 + days_late * 2)
    return round(score, 1)
EOF

# ---------- llm (Tier 2 — build after Tier 1 is validated) ----------

cat > llm/prompts/voice_extraction_prompt.py << 'EOF'
VOICE_EXTRACTION_PROMPT = """You are extracting structured production data
from a voice note transcript. Return JSON only.
Fields: product, quantity, unit, notes."""
EOF

cat > llm/prompts/assistant_system_prompt.py << 'EOF'
ASSISTANT_SYSTEM_PROMPT = """You are MicroMake's assistant. Tenant data is
injected server-side before this prompt — never ask the user to paste
their own data, it's already in context."""
EOF

cat > llm/voice_extraction_agent.py << 'EOF'
from agents.clients.whisper_client import get_whisper_client
from agents.clients.llm_client import get_llm_client
from agents.llm.prompts.voice_extraction_prompt import VOICE_EXTRACTION_PROMPT


async def extract_from_transcript(transcript: str) -> dict:
    """Whisper transcript -> Claude Haiku -> structured JSON.
    Build after the Tier 1 predictors are validated with real pilot data."""
    client = get_llm_client()
    raise NotImplementedError
EOF

cat > llm/conversational_assistant_agent.py << 'EOF'
from agents.clients.llm_client import get_llm_client
from agents.llm.prompts.assistant_system_prompt import ASSISTANT_SYSTEM_PROMPT


async def ask_assistant(message: str, tenant_context: dict) -> str:
    """Claude Sonnet, tenant data injected server-side — never trust the
    client to supply its own context."""
    client = get_llm_client()
    raise NotImplementedError
EOF

# ---------- clients ----------

cat > clients/llm_client.py << 'EOF'
import anthropic
from agents.config import ANTHROPIC_API_KEY


def get_llm_client():
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
EOF

cat > clients/whisper_client.py << 'EOF'
from openai import OpenAI
from agents.config import OPENAI_API_KEY


def get_whisper_client():
    return OpenAI(api_key=OPENAI_API_KEY)
EOF

# ---------- tests ----------

cat > tests/test_runway_predictor.py << 'EOF'
from agents.predictors.runway_predictor import predict_runway


def test_predict_runway_basic():
    assert predict_runway(stock_level=100, daily_consumption_rate=10) == 10


def test_predict_runway_zero_consumption():
    assert predict_runway(stock_level=100, daily_consumption_rate=0) == float("inf")
EOF

cat > tests/test_anomaly_detector.py << 'EOF'
from agents.predictors.anomaly_detector import detect_anomalies


def test_no_anomalies_in_uniform_data():
    assert detect_anomalies([10, 10, 10, 10]) == []


def test_flags_outlier():
    result = detect_anomalies([10, 10, 10, 10, 100], threshold=1.5)
    assert 4 in result
EOF

cat > tests/test_reorder_engine.py << 'EOF'
from agents.predictors.reorder_engine import calculate_reorder_point


def test_reorder_point_basic():
    assert calculate_reorder_point(lead_time_days=3, daily_consumption_rate=10) == 30


def test_reorder_point_with_safety_stock():
    assert calculate_reorder_point(3, 10, safety_stock=5) == 35
EOF

cat > tests/test_payment_risk_scorer.py << 'EOF'
from agents.predictors.payment_risk_scorer import score_payment_risk


def test_not_late_is_zero_risk():
    assert score_payment_risk(overdue_amount=500, days_late=0) == 0.0


def test_late_payment_has_positive_risk():
    assert score_payment_risk(overdue_amount=500, days_late=10) > 0
EOF

echo "agents/ scaffolded."
find . -type f | sort