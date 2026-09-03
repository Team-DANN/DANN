import anthropic
from agents.config import ANTHROPIC_API_KEY


def get_llm_client():
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
