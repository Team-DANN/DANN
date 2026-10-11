"""tmp-product-check.py: manual check of propose_create_product and /confirm.

Run from agent-actions/ with the venv active. Paste the owner token below,
run it, then DELETE this file (it holds a real token) and run git status.
Needs local Node on 5000 and uvicorn on 8001. Costs about 35,000 Groq tokens
and takes about 5 minutes (50 s between chat messages).
"""

import json
import sys
import time

import httpx

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8xNzg4OTM5OTQxMzU4IiwiYnVzaW5lc3NfaWQiOiJiaXpfMTc4ODkzOTk0MTM1OCIsImlhdCI6MTc5MTY1ODg2NiwiZXhwIjoxNzkyMjYzNjY2fQ.D8mqpLGIq7Bu758czBLV1IVzkyoGcYUs10kLCiBaJ_I"  # paste the owner token here; never commit this file
NODE = "http://localhost:5000"
AGENTS = "http://localhost:8001"
PAUSE = 50  # seconds between chat calls (Groq: 8,000 tokens a minute)
RETRY_WAITS = (20, 60, 60)  # after a 429; a retry re-runs the whole message

if not TOKEN.strip():
    sys.exit("Paste the owner token into TOKEN first.")

HEAD = {"Authorization": f"Bearer {TOKEN.strip()}"}
http = httpx.Client(timeout=120)
passed = failed = 0
tokens_used = 0


def check(label, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label} {detail}")


def node_get(path):
    r = http.get(NODE + path, headers=HEAD)
    assert r.status_code == 200, (path, r.status_code, r.text[:200])
    return r.json()["data"]


def node_post(path, body):
    r = http.post(NODE + path, headers=HEAD, json=body)
    assert r.status_code in (200, 201), (path, r.status_code, r.text[:200])
    return r.json()["data"]


def chat(history):
    global tokens_used
    waits = (0,) + RETRY_WAITS
    for attempt, wait in enumerate(waits, start=1):
        if wait:
            print(f"  429, waiting {wait} s (try {attempt} of {len(waits)})")
            time.sleep(wait)
        r = http.post(AGENTS + "/chat", headers=HEAD, json={"messages": history})
        if r.status_code != 429:
            break
    assert r.status_code == 200, (r.status_code, r.text[:300])
    out = r.json()
    used = (out.get("usage") or {}).get("total_tokens", 0)
    tokens_used += used
    print(f"  tools: {out.get('tools_used')}  tokens: {used}")
    print(f"  reply: {out.get('reply')!r}")
    return out


def confirm(token):
    r = http.post(AGENTS + "/confirm", headers=HEAD, json={"token": token})
    return r.status_code, r.json()


def named(rows, name):
    return [r for r in rows if str(r.get("name", "")).lower() == name.lower()]


def say(history, text):
    history.append({"role": "user", "content": text})
    out = chat(history)
    history.append({"role": "assistant", "content": out.get("reply") or ""})
    return out


def wait():
    print(f"  (pausing {PAUSE} s for Groq's per-minute budget)")
    time.sleep(PAUSE)


# ---- 0. identity and leftovers ----------------------------------------------
print("0. identity and leftovers")
me = node_get("/api/auth/me")
check("signed in as owner or manager with production", me["role"] in ("owner", "manager") and "production" in me["modules"])
leftovers = [
    r["name"]
    for path in ("/api/products", "/api/materials", "/api/retailers")
    for r in node_get(path)
    if str(r.get("name", "")).lower().startswith("zz ")
]
if leftovers:
    sys.exit(f"Leftover ZZ records exist: {leftovers}. Run the cleanup SQL first.")
check("no leftover ZZ records", True)

flour = node_post("/api/materials", {"name": "ZZ Prod Flour", "unit": "kg", "unit_cost": 40, "current_stock": 10,
                                      "reorder_threshold": 0})
print(f"  created the throwaway material ZZ Prod Flour ({flour.get('material_id') or flour.get('id')})")

# ---- 1. product with an existing ingredient ---------------------------------
print("1. product with an existing ingredient")
history1 = []
out = say(history1, "add a new product called ZZ Chat Cake, we sell it at 50 each, it uses 0.5 kg of ZZ Prod Flour per cake")
proposal = out.get("proposal") or {}
check("a proposal came back", bool(proposal))
check("tool is create_product and not undoable", proposal.get("tool") == "create_product" and proposal.get("undoable") is False)
check("only propose_create_product was called", out.get("tools_used") == ["propose_create_product"], str(out.get("tools_used")))
labels = [line.get("label") for line in proposal.get("lines", [])]
check("card has Name, Selling price and the ingredient", {"Name", "Selling price", "ZZ Prod Flour"} <= set(labels), str(labels))
check("no 'no recipe' warning", not any("no recipe" in w for w in proposal.get("warnings", [])))
check("the proposal created nothing", not named(node_get("/api/products"), "ZZ Chat Cake"))

status, body = confirm(proposal.get("token", ""))
check("confirm 200 and ok", status == 200 and body.get("ok") is True, str(body)[:200])
check("reply says the product was added", "Added the product" in body.get("reply", ""), body.get("reply", ""))
cakes = named(node_get("/api/products"), "ZZ Chat Cake")
check("exactly one ZZ Chat Cake", len(cakes) == 1)
if cakes:
    cake = cakes[0]
    recipe = cake.get("recipe") or []
    check("selling price 50 and stock 0", float(cake["selling_price"]) == 50 and float(cake["current_stock"]) == 0)
    check("recipe is 0.5 kg of ZZ Prod Flour", len(recipe) == 1 and recipe[0]["material_name"] == "ZZ Prod Flour"
          and float(recipe[0]["quantity_per_unit"]) == 0.5)
    check("cost per unit is 20 (0.5 x 40)", abs(float(cake["cost_per_unit"]) - 20) < 1e-6, str(cake["cost_per_unit"]))
status, again = confirm(proposal.get("token", ""))
check("second tap is a repeat", status == 200 and again.get("repeat") is True, str(again)[:200])
check("still exactly one ZZ Chat Cake", len(named(node_get("/api/products"), "ZZ Chat Cake")) == 1)
wait()

# ---- 2. product with a new ingredient ----------------------------------------
print("2. product with an ingredient that is not in DANN")
history2 = []
out = say(history2, "add a new product called ZZ Chat Cookie, we sell it at 10 each, it uses 0.1 kg of ZZ Chat Cocoa per cookie")
check("no proposal yet (the material is not in DANN)", not out.get("proposal"))
check("the reply asks about cocoa", "cocoa" in (out.get("reply") or "").lower())
wait()
out = say(history2, "yes add it as a new material. It is measured in kg, we have 5 kg in stock and it costs 300 per kg")
proposal = out.get("proposal") or {}
check("a proposal came back", bool(proposal))
lines = proposal.get("lines") or []
check("first line is New material", bool(lines) and lines[0].get("label") == "New material", str(lines[:1]))
check("a warning says confirming adds the material", any("also adds" in w for w in proposal.get("warnings", [])),
      str(proposal.get("warnings")))
check("nothing was created by the proposal", not named(node_get("/api/materials"), "ZZ Chat Cocoa")
      and not named(node_get("/api/products"), "ZZ Chat Cookie"))

status, body = confirm(proposal.get("token", ""))
check("confirm 200 and ok", status == 200 and body.get("ok") is True, str(body)[:200])
check("reply says the material and the product were added",
      body.get("reply", "").startswith("Added the new material") and "Added the product" in body.get("reply", ""), body.get("reply", ""))
cocoa = named(node_get("/api/materials"), "ZZ Chat Cocoa")
check("exactly one ZZ Chat Cocoa", len(cocoa) == 1)
if cocoa:
    check("cocoa has stock 5 and unit cost 300", float(cocoa[0]["current_stock"]) == 5 and float(cocoa[0]["unit_cost"]) == 300)
cookies = named(node_get("/api/products"), "ZZ Chat Cookie")
check("exactly one ZZ Chat Cookie", len(cookies) == 1)
if cookies:
    recipe = cookies[0].get("recipe") or []
    check("recipe is 0.1 kg of cocoa", len(recipe) == 1 and recipe[0]["material_name"].lower() == "zz chat cocoa"
          and float(recipe[0]["quantity_per_unit"]) == 0.1)
    check("cost per unit is 30 (0.1 x 300)", abs(float(cookies[0]["cost_per_unit"]) - 30) < 1e-6, str(cookies[0]["cost_per_unit"]))
status, again = confirm(proposal.get("token", ""))
check("second tap is a repeat", status == 200 and again.get("repeat") is True)
check("still one cocoa and one cookie", len(named(node_get("/api/materials"), "ZZ Chat Cocoa")) == 1
      and len(named(node_get("/api/products"), "ZZ Chat Cookie")) == 1)
wait()

# ---- 3. near-duplicate name ---------------------------------------------------
print("3. near-duplicate product name")
out = say([], "add a new product called ZZ Chat Cakes sold at 50")
check("no proposal for a near-duplicate", not out.get("proposal"))
check("the reply mentions the existing cake", "zz chat cake" in (out.get("reply") or "").lower())
check("still exactly one ZZ Chat Cake", len(named(node_get("/api/products"), "ZZ Chat Cake")) == 1)
wait()

# ---- 4. missing price ----------------------------------------------------------
print("4. missing price")
out = say([], "add a new product called ZZ Chat Pie")
check("no proposal without a price", not out.get("proposal"))
reply = (out.get("reply") or "").lower()
check("the reply asks for the price", "price" in reply or "sell" in reply, reply)
check("ZZ Chat Pie was not created", not named(node_get("/api/products"), "ZZ Chat Pie"))

# ---- 5. audit -----------------------------------------------------------------
print("5. audit rows")
rows = [r for r in node_get("/api/agent-actions") if r.get("tool") == "create_product"
        and "zz chat" in json.dumps(r).lower()]
check("two executed create_product rows", sum(1 for r in rows if r.get("status") == "executed") >= 2,
      str([r.get("status") for r in rows]))

print(f"\n{passed} of {passed + failed} checks passed, {tokens_used} Groq tokens used")
print("Now: run the cleanup SQL, then `rm tmp-product-check.py` and `git status`.")
sys.exit(1 if failed else 0)