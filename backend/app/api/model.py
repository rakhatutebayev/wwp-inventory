from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.model import Model
from ..models.brand import Brand
from ..schemas.model import ModelCreate, ModelUpdate, ModelResponse
from ..services.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/", response_model=List[ModelResponse])
def read_models(
    skip: int = 0,
    limit: int = 100,
    brand_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Model)
    if brand_id:
        query = query.filter(Model.brand_id == brand_id)
    models = query.offset(skip).limit(limit).all()
    return models


@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
def create_model(
    model: ModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if brand exists
    brand = db.query(Brand).filter(Brand.id == model.brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found"
        )
    
    db_model = Model(**model.model_dump())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


@router.get("/{model_id}", response_model=ModelResponse)
def read_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_model = db.query(Model).filter(Model.id == model_id).first()
    if db_model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    return db_model


@router.put("/{model_id}", response_model=ModelResponse)
def update_model(
    model_id: int,
    model: ModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_model = db.query(Model).filter(Model.id == model_id).first()
    if db_model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    if model.brand_id:
        brand = db.query(Brand).filter(Brand.id == model.brand_id).first()
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found"
            )
    
    update_data = model.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_model, field, value)
    
    db.commit()
    db.refresh(db_model)
    return db_model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_model = db.query(Model).filter(Model.id == model_id).first()
    if db_model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    db.delete(db_model)
    db.commit()
    return None



