from pydantic import BaseModel


class RiskScoreRequest(BaseModel):
    overdue_amount: float
    days_late: int


class RiskScoreResponse(BaseModel):
    score: float
