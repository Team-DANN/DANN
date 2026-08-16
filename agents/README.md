# agents/
Owner: client-agents branch.
Claude-powered intelligence layer: runway prediction, anomaly detection,
reorder suggestions, payment risk scoring (Tier 1, pure math, build first),
plus voice logging and the conversational assistant (Tier 2, LLM-backed,
build after Tier 1 is validated). backend/ only ever imports from
agents/routes/intelligence_routes.py — that's the one integration seam.
