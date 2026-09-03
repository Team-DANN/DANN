from pydantic import BaseModel


class AnomalyResponse(BaseModel):
    flagged_indices: list[int]
    threshold: float
