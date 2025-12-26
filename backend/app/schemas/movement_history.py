from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.device import LocationType


class MovementHistoryCreate(BaseModel):
    device_id: int
    to_location_type: LocationType
    to_location_id: int


class MovementHistoryResponse(BaseModel):
    id: int
    device_id: int
    from_location_type: Optional[LocationType] = None
    from_location_id: Optional[int] = None
    to_location_type: LocationType
    to_location_id: int
    moved_at: datetime
    moved_by: int

    class Config:
        from_attributes = True



