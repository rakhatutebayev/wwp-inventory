from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class InventoryRecord(Base):
    __tablename__ = "inventory_records"

    id = Column(Integer, primary_key=True, index=True)
    inventory_session_id = Column(Integer, ForeignKey("inventory_sessions.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    checked = Column(Boolean, default=False, nullable=False)
    checked_at = Column(DateTime(timezone=True), nullable=True)
    checked_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String, nullable=True)

    session = relationship("InventorySession", back_populates="records")
    device = relationship("Device", back_populates="inventory_records")
    checked_by_user = relationship("User", back_populates="inventory_records")

