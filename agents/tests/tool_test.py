import ollama, json

tools = [{
  "type": "function",
  "function": {
    "name": "get_inventory",
    "description": "Get current raw material stock levels",
    "parameters": {"type": "object", "properties": {}, "required": []},
  },
}]

def get_inventory(): return {"flour_kg": 120, "sugar_kg": 35}  # fake for now
registry = {"get_inventory": get_inventory}

messages = [{"role": "user", "content": "How much flour do I have?"}]
for _ in range(5):  # hard cap on loop iterations
    resp = ollama.chat(model="qwen2.5:7b", messages=messages, tools=tools)
    msg = resp.message
    messages.append(msg)
    if not msg.tool_calls:
        print(msg.content); break
    for call in msg.tool_calls:
        result = registry[call.function.name](**call.function.arguments)
        messages.append({"role": "tool", "content": json.dumps(result)})