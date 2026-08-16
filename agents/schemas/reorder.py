from pydantic import BaseModel


class ReorderRequest(BaseModel):
    lead_time_days: float
    daily_consumption_rate: float
    safety_stock: float = 0


class ReorderResponse(BaseModel):
    reorder_point: float
