from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.device import Device, LocationType
from ..models.company import Company
from ..models.device_type import DeviceType
from ..models.brand import Brand
from ..models.model import Model
from ..models.employee import Employee
from ..models.warehouse import Warehouse
from ..schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceLocationUpdate
from ..services.auth import get_current_user
from ..models.user import User
import re

router = APIRouter(prefix="/devices", tags=["devices"])


def generate_inventory_number(company_id: int, device_type_id: int, db: Session) -> str:
    """
    Генерирует инвентарный номер в формате {COMPANY_CODE}-{DEVICE_TYPE_CODE}/{SEQUENTIAL_NUMBER}
    Например: WWP-02/0022
    """
    # Получаем коды компании и типа устройства
    company = db.query(Company).filter(Company.id == company_id).first()
    device_type = db.query(DeviceType).filter(DeviceType.id == device_type_id).first()
    
    if not company or not device_type:
        raise ValueError("Company or DeviceType not found")
    
    company_code = company.code
    device_type_code = device_type.code
    
    # Ищем все устройства с такой же компанией и типом устройства
    devices = db.query(Device).filter(
        Device.company_id == company_id,
        Device.device_type_id == device_type_id
    ).all()
    
    # Извлекаем порядковые номера из существующих инвентарных номеров
    max_sequence = 0
    pattern = re.compile(rf"^{re.escape(company_code)}-{re.escape(device_type_code)}/(\d+)$")
    
    for device in devices:
        match = pattern.match(device.inventory_number)
        if match:
            sequence = int(match.group(1))
            max_sequence = max(max_sequence, sequence)
    
    # Увеличиваем на 1
    next_sequence = max_sequence + 1
    
    # Формируем номер (4 цифры с ведущими нулями)
    return f"{company_code}-{device_type_code}/{next_sequence:04d}"


@router.get("/", response_model=List[DeviceResponse])
def read_devices(
    skip: int = 0,
    limit: int = 100,
    device_type_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    location_type: Optional[LocationType] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Device)
    
    if device_type_id:
        query = query.filter(Device.device_type_id == device_type_id)
    if brand_id:
        query = query.filter(Device.brand_id == brand_id)
    if location_type:
        query = query.filter(Device.current_location_type == location_type)
    if location_id:
        query = query.filter(Device.current_location_id == location_id)
    
    devices = query.offset(skip).limit(limit).all()
    return devices


@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate company
    company = db.query(Company).filter(Company.id == device.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Validate device type
    device_type = db.query(DeviceType).filter(DeviceType.id == device.device_type_id).first()
    if not device_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device type not found"
        )
    
    brand = db.query(Brand).filter(Brand.id == device.brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found"
        )
    
    model = db.query(Model).filter(Model.id == device.model_id).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # Check unique constraints
    if db.query(Device).filter(Device.serial_number == device.serial_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device with this serial number already exists"
        )
    
    # Generate inventory number if not provided
    inventory_number = device.inventory_number
    if not inventory_number:
        inventory_number = generate_inventory_number(device.company_id, device.device_type_id, db)
    
    # Check if generated inventory number already exists
    if db.query(Device).filter(Device.inventory_number == inventory_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device with this inventory number already exists"
        )
    
    # Validate location
    if device.current_location_type == LocationType.EMPLOYEE:
        employee = db.query(Employee).filter(Employee.id == device.current_location_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
    elif device.current_location_type == LocationType.WAREHOUSE:
        warehouse = db.query(Warehouse).filter(Warehouse.id == device.current_location_id).first()
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warehouse not found"
            )
    
    device_data = device.model_dump()
    device_data["inventory_number"] = inventory_number
    db_device = Device(**device_data)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@router.get("/by-inventory/{inventory_number}", response_model=DeviceResponse)
def get_device_by_inventory_number(
    inventory_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Найти устройство по инвентарному номеру (для сканирования QR-кода)"""
    db_device = db.query(Device).filter(Device.inventory_number == inventory_number).first()
    if db_device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with inventory number {inventory_number} not found"
        )
    return db_device


@router.get("/{device_id}", response_model=DeviceResponse)
def read_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if db_device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    return db_device


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: int,
    device: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if db_device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Validate unique constraints if updating
    if device.serial_number and device.serial_number != db_device.serial_number:
        if db.query(Device).filter(Device.serial_number == device.serial_number).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device with this serial number already exists"
            )
    
    if device.inventory_number and device.inventory_number != db_device.inventory_number:
        if db.query(Device).filter(Device.inventory_number == device.inventory_number).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device with this inventory number already exists"
            )
    
    # Validate references if updating
    if device.device_type_id:
        device_type = db.query(DeviceType).filter(DeviceType.id == device.device_type_id).first()
        if not device_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device type not found"
            )
    
    if device.brand_id:
        brand = db.query(Brand).filter(Brand.id == device.brand_id).first()
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found"
            )
    
    if device.model_id:
        model = db.query(Model).filter(Model.id == device.model_id).first()
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
    
    update_data = device.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_device, field, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if db_device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    db.delete(db_device)
    db.commit()
    return None

