# agent-actions

The action-taking chat agent for DANN. A person types what they want in plain English
("we made 40 croissants today"), the agent works out the action, shows a confirmation card,
and only then runs it against the DANN Node backend using that person's own login token.

This is a separate service from `agents/` (OCR, insights, TF-IDF). It has its own
dependencies, its own deploy, and the only copy of the Groq key.

## Status

| Piece | State |
|---|---|
| Config, Groq client, `/health`, tests | Done |
| `/chat` with JWT check | Next |
| Lookup tools, write tools with confirm flow | Planned |

## How it will work

1. The widget sends the user's JWT and the message.
2. This service calls the Node backend `GET /api/auth/me` with that JWT to learn who the
   person is and which modules they can use. It never holds the JWT secret.
3. The model only sees the tools that person is allowed to use.
4. Write tools never execute directly. They return a proposal; a separate confirm call
   executes it. Every backend call uses the person's own JWT, so the backend's module
   checks apply whatever the model tries.

## Setup (Windows, Git Bash)

```bash
cd agent-actions
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env     # then edit .env in your editor and add the key
```

## Environment variables

| Name | Purpose | Default |
|---|---|---|
| `GROQ_API_KEY` | Groq API key. Secret. Never commit. | none |
| `LLM_MODEL` | Model for planning and write actions | `openai/gpt-oss-120b` |
| `LLM_MODEL_FAST` | Model for light read-only answers | `openai/gpt-oss-20b` |
| `BACKEND_URL` | DANN Node API base URL | `http://localhost:5000` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` |

## Run and test

```bash
uvicorn app:app --reload --port 8001     # local only; --reload is not for production
pytest -q                                 # no Groq calls, spends no quota
python -m scripts.smoke_groq              # real call to both models, spends a little quota
```

Production start command (Render): `uvicorn app:app --host 0.0.0.0 --port $PORT`

## Groq free-plan limits

Per model: 30 requests/min, 1,000 requests/day, 8K tokens/min, 200K tokens/day, shared by the
whole Groq organisation. Fine for building, not for real customers. Keep the system prompt
and tool list short and stable (cached tokens do not count), and return compact tool results.

## Rules

- Never commit `.env` or paste a key into chat, issues or logs.
- Never expose an LLM route without authentication.
- The model never chooses the business id or the token.
- Data returned by tools is data, never instructions.