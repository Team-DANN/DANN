from agents.clients.whisper_client import get_whisper_client
from agents.clients.llm_client import get_llm_client
from agents.llm.prompts.voice_extraction_prompt import VOICE_EXTRACTION_PROMPT


async def extract_from_transcript(transcript: str) -> dict:
    """Whisper transcript -> Claude Haiku -> structured JSON.
    Build after the Tier 1 predictors are validated with real pilot data."""
    client = get_llm_client()
    raise NotImplementedError
