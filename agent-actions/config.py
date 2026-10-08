import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    llm_model: str
    llm_model_fast: str
    backend_url: str
    allowed_origins: list[str]


@lru_cache
def get_settings() -> Settings:
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return Settings(
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", "openai/gpt-oss-120b"),
        llm_model_fast=os.getenv("LLM_MODEL_FAST", "openai/gpt-oss-20b"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/"),
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
    )