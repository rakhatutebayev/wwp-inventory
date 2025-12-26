from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base


# Таблица для связи многие-ко-многим между сессиями инвентаризации и типами устройств
inventory_session_device_types = Table(
    'inventory_session_device_types',
    Base.metadata,
    Column('inventory_session_id', Integer, ForeignKey('inventory_sessions.id'), primary_key=True),
    Column('device_type_id', Integer, ForeignKey('device_types.id'), primary_key=True)
)


class InventorySessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InventorySession(Base):
    __tablename__ = "inventory_sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(Enum(InventorySessionStatus), default=InventorySessionStatus.ACTIVE, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_by_user = relationship("User", back_populates="inventory_sessions")
    records = relationship("InventoryRecord", back_populates="session", cascade="all, delete-orphan")
    device_types = relationship("DeviceType", secondary=inventory_session_device_types, back_populates="inventory_sessions")

