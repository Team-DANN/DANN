from pydantic import BaseModel


class VoiceExtractionRequest(BaseModel):
    transcript: str


class VoiceExtractionResponse(BaseModel):
    product: str
    quantity: float
    unit: str
    notes: str | None = None
