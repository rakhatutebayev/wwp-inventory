from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


class LocationType(str, enum.Enum):
    WAREHOUSE = "warehouse"
    EMPLOYEE = "employee"


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    device_type_id = Column(Integer, ForeignKey("device_types.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    serial_number = Column(String, unique=True, nullable=False, index=True)
    inventory_number = Column(String, unique=True, nullable=False, index=True)
    current_location_type = Column(Enum(LocationType), nullable=False)
    current_location_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="devices")
    device_type = relationship("DeviceType", back_populates="devices")
    brand = relationship("Brand", back_populates="devices")
    model = relationship("Model", back_populates="devices")
    movement_history = relationship("MovementHistory", back_populates="device", order_by="MovementHistory.moved_at.desc()")
    inventory_records = relationship("InventoryRecord", back_populates="device")

