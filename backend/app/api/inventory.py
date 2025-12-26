from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.inventory_session import InventorySession, InventorySessionStatus
from ..models.inventory_record import InventoryRecord
from ..models.device import Device
from ..models.device_type import DeviceType
from ..schemas.inventory import (
    InventorySessionCreate,
    InventorySessionUpdate,
    InventorySessionResponse,
    InventoryRecordCreate,
    InventoryRecordUpdate,
    InventoryRecordResponse,
    InventoryStatistics,
    DeviceBasic,
    DeviceTypeBasic,
)
from ..services.auth import get_current_user
from ..models.user import User
from ..models.inventory_session import inventory_session_device_types

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/sessions", response_model=InventorySessionResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_session(
    session_data: InventorySessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новую сессию инвентаризации"""
    # Проверяем, что типы устройств существуют
    device_types = db.query(DeviceType).filter(DeviceType.id.in_(session_data.device_type_ids)).all()
    if len(device_types) != len(session_data.device_type_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more device types not found"
        )
    
    # Создаем сессию
    db_session = InventorySession(
        name=session_data.name,
        description=session_data.description,
        status=InventorySessionStatus.ACTIVE,
        created_by_user_id=current_user.id,
    )
    db.add(db_session)
    db.flush()
    
    # Добавляем типы устройств
    for device_type in device_types:
        db_session.device_types.append(device_type)
    
    # Получаем все устройства выбранных типов
    devices = db.query(Device).filter(Device.device_type_id.in_(session_data.device_type_ids)).all()
    
    # Создаем записи для каждого устройства
    for device in devices:
        record = InventoryRecord(
            inventory_session_id=db_session.id,
            device_id=device.id,
            checked=False,
        )
        db.add(record)
    
    db.commit()
    db.refresh(db_session)
    
    # Загружаем device_types для ответа
    db.refresh(db_session)
    # Принудительная загрузка через запрос
    db_session = db.query(InventorySession).options(
        joinedload(InventorySession.device_types)
    ).filter(InventorySession.id == db_session.id).first()
    
    return db_session


@router.get("/sessions", response_model=List[InventorySessionResponse])
def get_inventory_sessions(
    status: Optional[InventorySessionStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список сессий инвентаризации"""
    query = db.query(InventorySession).options(joinedload(InventorySession.device_types))
    if status:
        query = query.filter(InventorySession.status == status)
    sessions = query.order_by(InventorySession.created_at.desc()).all()
    return sessions


@router.get("/sessions/{session_id}", response_model=InventorySessionResponse)
def get_inventory_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить сессию инвентаризации по ID"""
    session = db.query(InventorySession).options(
        joinedload(InventorySession.device_types)
    ).filter(InventorySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory session not found"
        )
    return session


@router.put("/sessions/{session_id}", response_model=InventorySessionResponse)
def update_inventory_session(
    session_id: int,
    session_update: InventorySessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить сессию инвентаризации"""
    session = db.query(InventorySession).filter(InventorySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory session not found"
        )
    
    update_data = session_update.model_dump(exclude_unset=True)
    if 'status' in update_data and update_data['status'] == InventorySessionStatus.COMPLETED:
        update_data['completed_at'] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}/devices", response_model=List[InventoryRecordResponse])
def get_session_devices(
    session_id: int,
    checked: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список устройств в сессии инвентаризации"""
    session = db.query(InventorySession).filter(InventorySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory session not found"
        )
    
    query = db.query(InventoryRecord).options(
        joinedload(InventoryRecord.device)
    ).filter(InventoryRecord.inventory_session_id == session_id)
    if checked is not None:
        query = query.filter(InventoryRecord.checked == checked)
    
    records = query.all()
    return records


@router.get("/sessions/{session_id}/statistics", response_model=InventoryStatistics)
def get_session_statistics(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику по сессии инвентаризации"""
    session = db.query(InventorySession).filter(InventorySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory session not found"
        )
    
    total = db.query(InventoryRecord).filter(InventoryRecord.inventory_session_id == session_id).count()
    checked = db.query(InventoryRecord).filter(
        InventoryRecord.inventory_session_id == session_id,
        InventoryRecord.checked == True
    ).count()
    remaining = total - checked
    progress_percent = (checked / total * 100) if total > 0 else 0.0
    
    return InventoryStatistics(
        total_devices=total,
        checked_devices=checked,
        remaining_devices=remaining,
        progress_percent=round(progress_percent, 2)
    )


@router.post("/sessions/{session_id}/records", response_model=InventoryRecordResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_record(
    session_id: int,
    record_data: InventoryRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать или обновить запись проверки устройства"""
    session = db.query(InventorySession).filter(InventorySession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory session not found"
        )
    
    if session.status != InventorySessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify records in a non-active session"
        )
    
    # Проверяем, существует ли устройство
    device = db.query(Device).filter(Device.id == record_data.device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Проверяем, что устройство относится к типам, выбранным в сессии
    if device.device_type_id not in [dt.id for dt in session.device_types]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device type does not match session device types"
        )
    
    # Ищем существующую запись
    record = db.query(InventoryRecord).filter(
        InventoryRecord.inventory_session_id == session_id,
        InventoryRecord.device_id == record_data.device_id
    ).first()
    
    if record:
        # Обновляем существующую запись
        record.checked = record_data.checked
        record.notes = record_data.notes
        if record_data.checked:
            record.checked_at = datetime.utcnow()
            record.checked_by_user_id = current_user.id
        else:
            record.checked_at = None
            record.checked_by_user_id = None
    else:
        # Создаем новую запись
        record = InventoryRecord(
            inventory_session_id=session_id,
            device_id=record_data.device_id,
            checked=record_data.checked,
            notes=record_data.notes,
            checked_at=datetime.utcnow() if record_data.checked else None,
            checked_by_user_id=current_user.id if record_data.checked else None,
        )
        db.add(record)
    
    db.commit()
    db.refresh(record)
    return record


@router.put("/sessions/{session_id}/records/{record_id}", response_model=InventoryRecordResponse)
def update_inventory_record(
    session_id: int,
    record_id: int,
    record_update: InventoryRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить запись проверки устройства"""
    record = db.query(InventoryRecord).filter(
        InventoryRecord.id == record_id,
        InventoryRecord.inventory_session_id == session_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found"
        )
    
    session = db.query(InventorySession).filter(InventorySession.id == session_id).first()
    if session.status != InventorySessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify records in a non-active session"
        )
    
    update_data = record_update.model_dump(exclude_unset=True)
    
    if 'checked' in update_data:
        record.checked = update_data['checked']
        if update_data['checked']:
            record.checked_at = datetime.utcnow()
            record.checked_by_user_id = current_user.id
        else:
            record.checked_at = None
            record.checked_by_user_id = None
    
    if 'notes' in update_data:
        record.notes = update_data['notes']
    
    db.commit()
    db.refresh(record)
    return record


@router.post("/records/{record_id}/check", response_model=InventoryRecordResponse)
def check_inventory_record(
    record_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отметить устройство как проверенное в сессии инвентаризации"""
    record = db.query(InventoryRecord).options(
        joinedload(InventoryRecord.device)
    ).filter(InventoryRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found"
        )
    
    session = db.query(InventorySession).filter(InventorySession.id == record.inventory_session_id).first()
    if session.status != InventorySessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify records in a non-active session"
        )
    
    if record.checked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device already checked in this session"
        )
    
    record.checked = True
    record.checked_at = datetime.utcnow()
    record.checked_by_user_id = current_user.id
    if notes:
        record.notes = notes
    
    db.commit()
    db.refresh(record)
    
    return record


@router.post("/records/{record_id}/uncheck", response_model=InventoryRecordResponse)
def uncheck_inventory_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Снять отметку проверки с устройства в сессии инвентаризации"""
    record = db.query(InventoryRecord).options(
        joinedload(InventoryRecord.device)
    ).filter(InventoryRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found"
        )
    
    session = db.query(InventorySession).filter(InventorySession.id == record.inventory_session_id).first()
    if session.status != InventorySessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify records in a non-active session"
        )
    
    if not record.checked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device is not checked in this session"
        )
    
    record.checked = False
    record.checked_at = None
    record.checked_by_user_id = None
    
    db.commit()
    db.refresh(record)
    
    return record

