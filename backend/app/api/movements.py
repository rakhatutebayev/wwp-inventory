from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.device import Device, LocationType
from ..models.movement_history import MovementHistory
from ..models.employee import Employee, EmployeeStatus
from ..models.warehouse import Warehouse
from ..schemas.movement_history import MovementHistoryCreate, MovementHistoryResponse
from ..services.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/movements", tags=["movements"])


@router.post("/", response_model=MovementHistoryResponse, status_code=status.HTTP_201_CREATED)
def create_movement(
    movement: MovementHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if device exists
    device = db.query(Device).filter(Device.id == movement.device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Get current location first to check for duplicates
    from_location_type = device.current_location_type
    from_location_id = device.current_location_id
    
    # Проверка: предотвращение дубликатов - нельзя переместить устройство в ту же локацию, где оно уже находится
    if (from_location_type == movement.to_location_type and 
        from_location_id == movement.to_location_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Устройство уже находится в выбранной локации. Перемещение в ту же локацию невозможно."
        )
    
    # Validate destination location
    location_name = ""  # Для сообщений об ошибках
    if movement.to_location_type == LocationType.EMPLOYEE:
        employee = db.query(Employee).filter(Employee.id == movement.to_location_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        location_name = employee.full_name
        
        # Проверка: сотрудник должен быть активным
        if employee.status != EmployeeStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move device to fired employee"
            )
        
        # Проверка: у сотрудника не должно быть устройства с таким же инвентарным номером
        existing_device = db.query(Device).filter(
            Device.current_location_type == LocationType.EMPLOYEE,
            Device.current_location_id == movement.to_location_id,
            Device.inventory_number == device.inventory_number,
            Device.id != device.id
        ).first()
        
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee already has a device with inventory number {device.inventory_number}"
            )
            
    elif movement.to_location_type == LocationType.WAREHOUSE:
        warehouse = db.query(Warehouse).filter(Warehouse.id == movement.to_location_id).first()
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warehouse not found"
            )
        
        location_name = warehouse.name
        
        # Проверка: на складе не должно быть устройства с таким же инвентарным номером
        existing_device = db.query(Device).filter(
            Device.current_location_type == LocationType.WAREHOUSE,
            Device.current_location_id == movement.to_location_id,
            Device.inventory_number == device.inventory_number,
            Device.id != device.id
        ).first()
        
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Warehouse already has a device with inventory number {device.inventory_number}"
            )
    
    # Create movement history record
    db_movement = MovementHistory(
        device_id=movement.device_id,
        from_location_type=from_location_type,
        from_location_id=from_location_id,
        to_location_type=movement.to_location_type,
        to_location_id=movement.to_location_id,
        moved_by=current_user.id
    )
    
    # Update device location
    device.current_location_type = movement.to_location_type
    device.current_location_id = movement.to_location_id
    
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    return db_movement


@router.get("/", response_model=List[MovementHistoryResponse])
def read_movements(
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MovementHistory)
    
    if device_id:
        query = query.filter(MovementHistory.device_id == device_id)
    
    movements = query.order_by(MovementHistory.moved_at.desc()).offset(skip).limit(limit).all()
    return movements


@router.get("/{movement_id}", response_model=MovementHistoryResponse)
def read_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_movement = db.query(MovementHistory).filter(MovementHistory.id == movement_id).first()
    if db_movement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movement not found"
        )
    return db_movement

