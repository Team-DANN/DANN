from enum import Enum


class OCRCategory(str, Enum):
    finance = "finance"
    production = "production"
    orders = "orders"
    inventory = "inventory"