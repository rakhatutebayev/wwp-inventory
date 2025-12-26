from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from ..database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    code = Column(String(3), unique=True, nullable=False, index=True)  # 3 символа, например WWP
    description = Column(Text, nullable=True)

    devices = relationship("Device", back_populates="company")



