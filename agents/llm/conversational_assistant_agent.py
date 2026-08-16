from agents.clients.llm_client import get_llm_client
from agents.llm.prompts.assistant_system_prompt import ASSISTANT_SYSTEM_PROMPT


async def ask_assistant(message: str, tenant_context: dict) -> str:
    """Claude Sonnet, tenant data injected server-side — never trust the
    client to supply its own context."""
    client = get_llm_client()
    raise NotImplementedError
