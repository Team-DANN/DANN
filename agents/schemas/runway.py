from pydantic import BaseModel


class RunwayRequest(BaseModel):
    product_id: str


class RunwayResponse(BaseModel):
    days_remaining: float
    stock_level: float
