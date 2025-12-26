from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.responses import StreamingResponse
import csv
import io

from ..database import get_db
from ..models.device import Device, LocationType
from ..models.device_type import DeviceType
from ..models.brand import Brand
from ..models.employee import Employee
from ..models.warehouse import Warehouse
from ..schemas.device import DeviceResponse
from ..services.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/devices", response_model=List[DeviceResponse])
def get_devices_report(
    device_type_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    location_type: Optional[LocationType] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список устройств с фильтрацией"""
    query = db.query(Device)
    
    if device_type_id:
        query = query.filter(Device.device_type_id == device_type_id)
    if brand_id:
        query = query.filter(Device.brand_id == brand_id)
    if location_type:
        query = query.filter(Device.current_location_type == location_type)
    if location_id:
        query = query.filter(Device.current_location_id == location_id)
    
    devices = query.all()
    return devices


@router.get("/devices/export")
def export_devices_report(
    device_type_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    location_type: Optional[LocationType] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт списка устройств в CSV"""
    query = db.query(Device)
    
    if device_type_id:
        query = query.filter(Device.device_type_id == device_type_id)
    if brand_id:
        query = query.filter(Device.brand_id == brand_id)
    if location_type:
        query = query.filter(Device.current_location_type == location_type)
    if location_id:
        query = query.filter(Device.current_location_id == location_id)
    
    devices = query.all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "ID", "Тип устройства", "Бренд", "Модель", 
        "Серийный номер", "Инвентарный номер", 
        "Тип локации", "Локация", "Дата создания"
    ])
    
    # Write data
    for device in devices:
        device_type = db.query(DeviceType).filter(DeviceType.id == device.device_type_id).first()
        brand = db.query(Brand).filter(Brand.id == device.brand_id).first()
        
        location_name = ""
        if device.current_location_type == LocationType.EMPLOYEE:
            employee = db.query(Employee).filter(Employee.id == device.current_location_id).first()
            location_name = employee.full_name if employee else ""
        elif device.current_location_type == LocationType.WAREHOUSE:
            warehouse = db.query(Warehouse).filter(Warehouse.id == device.current_location_id).first()
            location_name = warehouse.name if warehouse else ""
        
        writer.writerow([
            device.id,
            device_type.name if device_type else "",
            brand.name if brand else "",
            "",  # Model name would need join
            device.serial_number,
            device.inventory_number,
            device.current_location_type.value,
            location_name,
            device.created_at.strftime("%Y-%m-%d %H:%M:%S") if device.created_at else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=devices_report.csv"}
    )


@router.get("/locations")
def get_locations_report(
    location_type: Optional[LocationType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отчет по локациям - что где находится"""
    result = []
    
    if not location_type or location_type == LocationType.WAREHOUSE:
        warehouses = db.query(Warehouse).all()
        for warehouse in warehouses:
            devices = db.query(Device).filter(
                Device.current_location_type == LocationType.WAREHOUSE,
                Device.current_location_id == warehouse.id
            ).all()
            result.append({
                "location_type": "warehouse",
                "location_id": warehouse.id,
                "location_name": warehouse.name,
                "device_count": len(devices),
                "devices": [
                    {
                        "id": d.id,
                        "inventory_number": d.inventory_number,
                        "serial_number": d.serial_number
                    }
                    for d in devices
                ]
            })
    
    if not location_type or location_type == LocationType.EMPLOYEE:
        employees = db.query(Employee).all()
        for employee in employees:
            devices = db.query(Device).filter(
                Device.current_location_type == LocationType.EMPLOYEE,
                Device.current_location_id == employee.id
            ).all()
            result.append({
                "location_type": "employee",
                "location_id": employee.id,
                "location_name": employee.full_name,
                "phone_extension": employee.phone_extension,
                "device_count": len(devices),
                "devices": [
                    {
                        "id": d.id,
                        "inventory_number": d.inventory_number,
                        "serial_number": d.serial_number
                    }
                    for d in devices
                ]
            })
    
    return result



