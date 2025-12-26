from pydantic import BaseModel
from typing import Optional


class ModelCreate(BaseModel):
    brand_id: int
    name: str


class ModelUpdate(BaseModel):
    brand_id: Optional[int] = None
    name: Optional[str] = None


class ModelResponse(BaseModel):
    id: int
    brand_id: int
    name: str

    class Config:
        from_attributes = True



