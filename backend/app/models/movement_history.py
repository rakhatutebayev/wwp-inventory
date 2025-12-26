from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
from .device import LocationType


class MovementHistory(Base):
    __tablename__ = "movement_history"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    from_location_type = Column(Enum(LocationType), nullable=True)
    from_location_id = Column(Integer, nullable=True)
    to_location_type = Column(Enum(LocationType), nullable=False)
    to_location_id = Column(Integer, nullable=False)
    moved_at = Column(DateTime(timezone=True), server_default=func.now())
    moved_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    device = relationship("Device", back_populates="movement_history")
    moved_by_user = relationship("User", back_populates="movements")



