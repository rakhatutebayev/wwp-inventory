from pydantic import BaseModel, Field
from typing import Optional


class DeviceTypeCreate(BaseModel):
    name: str
    code: str = Field(..., min_length=2, max_length=2, description="Код типа устройства из 2 цифр")
    description: Optional[str] = None


class DeviceTypeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = Field(None, min_length=2, max_length=2, description="Код типа устройства из 2 цифр")
    description: Optional[str] = None


class DeviceTypeResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

