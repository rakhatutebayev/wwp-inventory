from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
import enum
from ..database import Base


class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"  # Работает
    FIRED = "fired"    # Уволен


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False, index=True)
    phone_extension = Column(String(3), nullable=False, unique=True, index=True)
    status = Column(Enum(EmployeeStatus), nullable=False, default=EmployeeStatus.ACTIVE, index=True)

    devices = relationship("Device", foreign_keys="Device.current_location_id", 
                         primaryjoin="and_(Device.current_location_type=='employee', Device.current_location_id==Employee.id)")
    movements_from = relationship("MovementHistory", foreign_keys="MovementHistory.from_location_id",
                                 primaryjoin="and_(MovementHistory.from_location_type=='employee', MovementHistory.from_location_id==Employee.id)")
    movements_to = relationship("MovementHistory", foreign_keys="MovementHistory.to_location_id",
                               primaryjoin="and_(MovementHistory.to_location_type=='employee', MovementHistory.to_location_id==Employee.id)")

