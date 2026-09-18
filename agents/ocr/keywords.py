"""
Keyword dictionaries per category, used by classifier.py to check whether
an uploaded image matches its claimed category.

Prefer single words over multi-word phrases — a two-word phrase only
needs one word garbled by OCR to miss entirely, a single word only
needs itself. classifier.py handles fuzzy/substring matching, so this
file should stay pure data — no logic here.
"""

FINANCE = [
    "accounts", "account", "journal", "entry", "cash", "credit", "debit",
    "reason", "capital", "invested", "invoice", "payment", "expense",
    "revenue", "income", "balance", "ledger", "receipt", "paid", "owed",
    "transaction", "bank", "asset", "liability", "equity", "profit",
    "loss", "salary", "wages", "rent", "tax", "refund", "deposit",
    "withdrawal", "budget", "cost", "amount", "total", "due",
]

PRODUCTION = [
    "production", "produced", "batch", "output", "yield", "units",
    "log", "shift", "line", "machine", "quantity", "made", "manufactured",
    "assembly", "defect", "reject", "downtime", "operator", "recipe",
    "ingredients", "mix", "bake", "oven", "temperature", "wastage",
    "rework", "quality", "inspection", "packed", "packaging",
]

ORDERS = [
    "order", "orders", "customer", "purchase", "delivery", "deliver",
    "dispatch", "shipped", "shipment", "quantity", "item", "items",
    "price", "quote", "invoice", "supplier", "vendor", "date",
    "confirmed", "pending", "cancelled", "return", "exchange", "client",
    "address", "contact", "phone", "reference",
]

INVENTORY = [
    "stock", "inventory", "count", "quantity", "reorder", "level",
    "warehouse", "storage", "batch", "expiry", "expiration", "unit",
    "sku", "item", "items", "received", "issued", "shortage", "surplus",
    "damaged", "returned", "stocktake", "audit", "location", "bin",
    "shelf", "supplier", "restock", "low",
]

CATEGORIES = {
    "finance": FINANCE,
    "production": PRODUCTION,
    "orders": ORDERS,
    "inventory": INVENTORY,
}