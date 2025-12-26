from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import Optional
import qrcode
from io import BytesIO
import base64
from jose import jwt, JWTError

from ..database import get_db
from ..models.device import Device
from ..models.brand import Brand
from ..models.model import Model
from ..services.auth import get_current_user
from ..models.user import User
from ..config import settings

router = APIRouter(prefix="/labels", tags=["labels"])


def generate_qr_code(data: str, size: int = 200) -> str:
    """Генерирует QR-код и возвращает base64 строку"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size))
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str


async def get_user_from_token_optional(
    token: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Валидация токена из URL параметра (если передан)"""
    if not token:
        return None
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


@router.get("/print", response_class=HTMLResponse)
async def print_labels(
    device_ids: str,  # comma-separated device IDs
    format: str = "38x21",  # 38x21, 50x25, 70x36, 100x50
    token: Optional[str] = None,  # Token для авторизации через URL (альтернатива заголовку)
    db: Session = Depends(get_db),
    url_token_user: Optional[User] = Depends(get_user_from_token_optional),
):
    """
    Генерирует HTML страницу для печати наклеек с QR-кодами
    
    Форматы:
    - 38x21 мм (Avery L7159) - 24 наклейки на A4
    - 50x25 мм - 21 наклейка на A4
    - 70x36 мм (Avery L7160) - 12 наклеек на A4
    - 100x50 мм - 8 наклеек на A4
    
    Авторизация: токен из URL параметра (для использования в браузере через Linking)
    """
    # Требуем токен в URL параметре для использования в браузере
    if not url_token_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token required in URL parameter for browser access",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    device_id_list = [int(id.strip()) for id in device_ids.split(",") if id.strip()]
    
    if not device_id_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No device IDs provided"
        )
    
    devices = db.query(Device).filter(Device.id.in_(device_id_list)).all()
    
    if len(devices) != len(device_id_list):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some devices not found"
        )
    
    # Форматы наклеек (ширина x высота в мм, количество на листе)
    formats = {
        "38x21": {"width": 38, "height": 21, "per_page": 24, "cols": 4, "rows": 6},
        "50x25": {"width": 50, "height": 25, "per_page": 21, "cols": 3, "rows": 7},
        "70x36": {"width": 70, "height": 36, "per_page": 12, "cols": 3, "rows": 4},
        "100x50": {"width": 100, "height": 50, "per_page": 8, "cols": 2, "rows": 4},
    }
    
    if format not in formats:
        format = "38x21"
    
    label_format = formats[format]
    
    # Генерируем QR-коды для всех устройств
    qr_codes = []
    for device in devices:
        qr_data = device.inventory_number  # QR код содержит инвентарный номер
        qr_code_base64 = generate_qr_code(qr_data, size=label_format["width"] - 10)
        
        # Получаем модель устройства
        model = db.query(Model).filter(Model.id == device.model_id).first()
        model_name = model.name if model else "Не указана"
        
        qr_codes.append({
            "device": device,
            "qr_code": qr_code_base64,
            "model_name": model_name,
        })
    
    # Генерируем HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Печать наклеек</title>
        <style>
            @page {{
                size: A4;
                margin: 0;
            }}
            body {{
                margin: 0;
                padding: 10mm;
                font-family: Arial, sans-serif;
            }}
            .labels-container {{
                display: grid;
                grid-template-columns: repeat({label_format["cols"]}, 1fr);
                gap: 2mm;
                width: 100%;
            }}
            .label {{
                width: {label_format["width"]}mm;
                height: {label_format["height"]}mm;
                border: 1px solid #ccc;
                padding: 2mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-inside: avoid;
            }}
            .qr-code {{
                width: {label_format["width"] - 10}mm;
                height: {label_format["width"] - 10}mm;
                margin-bottom: 1mm;
            }}
            .qr-code img {{
                width: 100%;
                height: 100%;
                object-fit: contain;
            }}
            .label-text {{
                font-size: {max(6, label_format["width"] / 6)}pt;
                text-align: center;
                margin-top: 0.5mm;
                line-height: 1.2;
            }}
            .label-text-bold {{
                font-weight: bold;
            }}
            .inventory-number {{
                font-size: {max(7, label_format["width"] / 5)}pt;
                font-weight: bold;
                text-align: center;
                margin-top: 1mm;
            }}
            @media print {{
                body {{
                    margin: 0;
                    padding: 0;
                }}
                .no-print {{
                    display: none;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <h2>Печать наклеек - Формат {format} мм</h2>
            <p><strong>Количество устройств:</strong> {len(devices)}</p>
            <div style="margin: 15px 0;">
                <p style="margin-bottom: 10px;"><strong>Инструкция:</strong></p>
                <ol style="margin-left: 20px; margin-bottom: 15px;">
                    <li>Нажмите кнопку "Печать" ниже</li>
                    <li>В диалоге печати выберите нужный принтер</li>
                    <li>Убедитесь, что выбрана правильная бумага (A4, наклейки)</li>
                    <li>Настройте параметры печати (масштаб 100%, без полей)</li>
                    <li>Нажмите "Печать"</li>
                </ol>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🖨️ Печать (выбрать принтер)
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                    Закрыть
                </button>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffc107;">
                <p style="margin: 0; font-size: 12px;">
                    <strong>💡 Совет:</strong> В диалоге печати вы можете выбрать принтер из списка доступных устройств. 
                    Убедитесь, что в принтере установлена бумага для наклеек формата {format} мм.
                </p>
            </div>
        </div>
        <div class="labels-container">
    """
    
    for qr_data in qr_codes:
        device = qr_data['device']
        html += f"""
            <div class="label">
                <div class="qr-code">
                    <img src="data:image/png;base64,{qr_data['qr_code']}" alt="QR Code">
                </div>
                <div class="label-text label-text-bold">{qr_data['model_name']}</div>
                <div class="label-text">Сер: {device.serial_number}</div>
                <div class="inventory-number">Инв: {device.inventory_number}</div>
            </div>
        """
    
    html += """
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)


@router.get("/qr/{device_id}")
def get_qr_code(
    device_id: int,
    size: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить QR-код для устройства"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    qr_code_base64 = generate_qr_code(device.inventory_number, size=size)
    return {
        "device_id": device_id,
        "inventory_number": device.inventory_number,
        "qr_code": f"data:image/png;base64,{qr_code_base64}"
    }


@router.get("/label-data/{device_id}")
def get_label_data(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить данные метки для устройства (JSON)"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Получаем модель устройства
    model = db.query(Model).filter(Model.id == device.model_id).first()
    model_name = model.name if model else "Не указана"
    
    # Генерируем QR код
    qr_code_base64 = generate_qr_code(device.inventory_number, size=200)
    
    return {
        "device_id": device_id,
        "inventory_number": device.inventory_number,
        "serial_number": device.serial_number,
        "model_name": model_name,
        "qr_code": f"data:image/png;base64,{qr_code_base64}",
    }

