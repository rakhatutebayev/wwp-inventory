from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(String, nullable=True)

    devices = relationship("Device", foreign_keys="Device.current_location_id",
                          primaryjoin="and_(Device.current_location_type=='warehouse', Device.current_location_id==Warehouse.id)")
    movements_from = relationship("MovementHistory", foreign_keys="MovementHistory.from_location_id",
                                 primaryjoin="and_(MovementHistory.from_location_type=='warehouse', MovementHistory.from_location_id==Warehouse.id)")
    movements_to = relationship("MovementHistory", foreign_keys="MovementHistory.to_location_id",
                               primaryjoin="and_(MovementHistory.to_location_type=='warehouse', MovementHistory.to_location_id==Warehouse.id)")



