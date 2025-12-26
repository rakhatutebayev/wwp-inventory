from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from ..database import Base


class DeviceType(Base):
    __tablename__ = "device_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    code = Column(String(2), unique=True, nullable=False, index=True)  # 2 цифры, например 01, 02
    description = Column(Text, nullable=True)

    devices = relationship("Device", back_populates="device_type")
    inventory_sessions = relationship("InventorySession", secondary="inventory_session_device_types", back_populates="device_types")

