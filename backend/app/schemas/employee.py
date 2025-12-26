from pydantic import BaseModel, Field
from typing import Optional
from ..models.employee import EmployeeStatus


class EmployeeCreate(BaseModel):
    full_name: str
    phone_extension: str = Field(..., min_length=3, max_length=3)
    status: EmployeeStatus = EmployeeStatus.ACTIVE


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_extension: Optional[str] = Field(None, min_length=3, max_length=3)
    status: Optional[EmployeeStatus] = None


class EmployeeResponse(BaseModel):
    id: int
    full_name: str
    phone_extension: str
    status: EmployeeStatus

    class Config:
        from_attributes = True

