from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.employee import Employee, EmployeeStatus
from ..models.device import Device, LocationType
from ..schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from ..schemas.device import DeviceResponse
from ..services.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/", response_model=List[EmployeeResponse])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    employees = db.query(Employee).offset(skip).limit(limit).all()
    return employees


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка уникальности телефонного номера
    existing_employee = db.query(Employee).filter(
        Employee.phone_extension == employee.phone_extension
    ).first()
    
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phone extension {employee.phone_extension} is already assigned to employee: {existing_employee.full_name} (ID: {existing_employee.id})"
        )
    
    db_employee = Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.get("/{employee_id}", response_model=EmployeeResponse)
def read_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if db_employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return db_employee


@router.get("/{employee_id}/devices", response_model=List[DeviceResponse])
def get_employee_devices(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список устройств, которые находятся у сотрудника"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    devices = db.query(Device).filter(
        Device.current_location_type == LocationType.EMPLOYEE,
        Device.current_location_id == employee_id
    ).all()
    
    return devices


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if db_employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    update_data = employee.model_dump(exclude_unset=True)
    
    # Проверка уникальности телефонного номера при обновлении
    if "phone_extension" in update_data:
        existing_employee = db.query(Employee).filter(
            Employee.phone_extension == update_data["phone_extension"],
            Employee.id != employee_id
        ).first()
        
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phone extension {update_data['phone_extension']} is already assigned to employee: {existing_employee.full_name} (ID: {existing_employee.id})"
            )
    
    # Проверка: нельзя уволить сотрудника, если на нем есть устройства
    if "status" in update_data and update_data["status"] == EmployeeStatus.FIRED:
        devices_count = db.query(Device).filter(
            Device.current_location_type == LocationType.EMPLOYEE,
            Device.current_location_id == employee_id
        ).count()
        
        if devices_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot fire employee: employee has {devices_count} device(s) assigned. Please move devices first."
            )
    
    for field, value in update_data.items():
        setattr(db_employee, field, value)
    
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if db_employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Проверка: нельзя удалить сотрудника, если на нем есть устройства
    devices_count = db.query(Device).filter(
        Device.current_location_type == LocationType.EMPLOYEE,
        Device.current_location_id == employee_id
    ).count()
    
    if devices_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete employee: employee has {devices_count} device(s) assigned. Please move devices first."
        )
    
    db.delete(db_employee)
    db.commit()
    return None

