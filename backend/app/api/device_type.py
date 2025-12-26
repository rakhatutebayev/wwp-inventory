from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.device_type import DeviceType
from ..schemas.device_type import DeviceTypeCreate, DeviceTypeUpdate, DeviceTypeResponse
from ..services.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/device-types", tags=["device-types"])


@router.get("/", response_model=List[DeviceTypeResponse])
def read_device_types(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device_types = db.query(DeviceType).offset(skip).limit(limit).all()
    return device_types


@router.post("/", response_model=DeviceTypeResponse, status_code=status.HTTP_201_CREATED)
def create_device_type(
    device_type: DeviceTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if device type with this name or code already exists
    db_device_type = db.query(DeviceType).filter(
        (DeviceType.name == device_type.name) | (DeviceType.code == device_type.code)
    ).first()
    if db_device_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device type with this name or code already exists"
        )
    
    db_device_type = DeviceType(**device_type.model_dump())
    db.add(db_device_type)
    db.commit()
    db.refresh(db_device_type)
    return db_device_type


@router.get("/{device_type_id}", response_model=DeviceTypeResponse)
def read_device_type(
    device_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_device_type = db.query(DeviceType).filter(DeviceType.id == device_type_id).first()
    if db_device_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device type not found"
        )
    return db_device_type


@router.put("/{device_type_id}", response_model=DeviceTypeResponse)
def update_device_type(
    device_type_id: int,
    device_type: DeviceTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_device_type = db.query(DeviceType).filter(DeviceType.id == device_type_id).first()
    if db_device_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device type not found"
        )
    
    # Код обязателен - если не передан, используем существующий
    update_data = device_type.model_dump(exclude_unset=True)
    if "code" not in update_data or not update_data["code"]:
        update_data["code"] = db_device_type.code
    else:
        # Проверяем уникальность кода, если он изменяется
        if update_data["code"] != db_device_type.code:
            existing = db.query(DeviceType).filter(
                DeviceType.code == update_data["code"],
                DeviceType.id != device_type_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Device type with this code already exists"
                )
    
    for field, value in update_data.items():
        setattr(db_device_type, field, value)
    
    db.commit()
    db.refresh(db_device_type)
    return db_device_type


@router.delete("/{device_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device_type(
    device_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_device_type = db.query(DeviceType).filter(DeviceType.id == device_type_id).first()
    if db_device_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device type not found"
        )
    
    db.delete(db_device_type)
    db.commit()
    return None

