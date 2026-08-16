from openai import OpenAI
from agents.config import OPENAI_API_KEY


def get_whisper_client():
    return OpenAI(api_key=OPENAI_API_KEY)
