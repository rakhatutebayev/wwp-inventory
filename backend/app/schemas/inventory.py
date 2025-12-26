from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.inventory_session import InventorySessionStatus


class InventorySessionBase(BaseModel):
    name: str
    description: Optional[str] = None
    device_type_ids: List[int]


class InventorySessionCreate(InventorySessionBase):
    pass


class InventorySessionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[InventorySessionStatus] = None


class DeviceTypeBasic(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class InventorySessionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: InventorySessionStatus
    created_by_user_id: int
    created_at: datetime
    completed_at: Optional[datetime]
    device_types: List[DeviceTypeBasic]

    class Config:
        from_attributes = True


class InventoryRecordCreate(BaseModel):
    device_id: int
    checked: bool = True
    notes: Optional[str] = None


class InventoryRecordUpdate(BaseModel):
    checked: Optional[bool] = None
    notes: Optional[str] = None


class DeviceBasic(BaseModel):
    id: int
    inventory_number: str
    serial_number: str
    device_type_id: int
    brand_id: int
    model_id: int

    class Config:
        from_attributes = True


class InventoryRecordResponse(BaseModel):
    id: int
    inventory_session_id: int
    device_id: int
    checked: bool
    checked_at: Optional[datetime]
    checked_by_user_id: Optional[int]
    notes: Optional[str]
    device: DeviceBasic

    class Config:
        from_attributes = True


class InventoryStatistics(BaseModel):
    total_devices: int
    checked_devices: int
    remaining_devices: int
    progress_percent: float


