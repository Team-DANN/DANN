"""Measure what each kind of message costs on the live agent-actions service."""
import os
import sys
import time

import httpx

URL = os.environ.get("AGENT_URL", "https://dann-agent-actions.onrender.com")
TOKEN = os.environ.get("DANN_TOKEN")
if not TOKEN:
    sys.exit("Set DANN_TOKEN first.")

CASES = [
    ("plain greeting", "hi"),
    ("stock", "what is in stock?"),
    ("low stock", "what's running low?"),
    ("profit", "how is my profit?"),
    ("who owes", "who owes me money?"),
    ("runway", "how many days of stock do I have left?"),
    ("action: log a batch", "log 1 unit of smokey bbq"),
]
PAUSE = 20

total = 0
with httpx.Client(timeout=90) as http:
    for i, (label, text) in enumerate(CASES):
        if i:
            time.sleep(PAUSE)
        r = http.post(
            f"{URL}/chat",
            headers={"Authorization": f"Bearer {TOKEN}"},
            json={"messages": [{"role": "user", "content": text}]},
        )
        if r.status_code != 200:
            print(f"{label}: HTTP {r.status_code} {r.text[:200]}")
            continue
        body = r.json()
        u = body.get("usage", {})
        total += u.get("total_tokens") or 0
        print(
            f"{label}: model={body.get('model')} tools={body.get('tools_used')} "
            f"tokens={u.get('total_tokens')} (prompt {u.get('prompt_tokens')}, out {u.get('completion_tokens')})"
        )
        print(f"  reply: {body.get('reply', '')[:110]!r}")
print(f"total: {total} tokens") 