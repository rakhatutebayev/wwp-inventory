from pydantic import BaseModel, Field
from typing import Optional


class CompanyBase(BaseModel):
    name: str
    code: str = Field(..., min_length=3, max_length=3, description="Код компании из 3 символов")
    description: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = Field(None, min_length=3, max_length=3, description="Код компании из 3 символов")
    description: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: int

    class Config:
        from_attributes = True

