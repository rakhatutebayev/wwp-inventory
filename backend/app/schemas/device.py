from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.device import LocationType


class DeviceCreate(BaseModel):
    company_id: int
    device_type_id: int
    brand_id: int
    model_id: int
    serial_number: str
    inventory_number: Optional[str] = None  # Автогенерация, если не указан
    current_location_type: LocationType
    current_location_id: int


class DeviceUpdate(BaseModel):
    device_type_id: Optional[int] = None
    brand_id: Optional[int] = None
    model_id: Optional[int] = None
    serial_number: Optional[str] = None
    inventory_number: Optional[str] = None


class DeviceLocationUpdate(BaseModel):
    to_location_type: LocationType
    to_location_id: int


class DeviceResponse(BaseModel):
    id: int
    company_id: int
    device_type_id: int
    brand_id: int
    model_id: int
    serial_number: str
    inventory_number: str
    current_location_type: LocationType
    current_location_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

