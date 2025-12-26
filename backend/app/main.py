from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base
from .api import auth, companies, device_type, brand, model, employees, warehouses, devices, movements, reports, labels, inventory

# Create tables (only if they don't exist)
# В production лучше использовать миграции Alembic
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create tables: {e}")

app = FastAPI(
    title="WWP Inventory API",
    description="Система учета компьютерной техники",
    version="1.0.0"
)

# CORS - parse comma-separated string to list
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(device_type.router, prefix="/api")
app.include_router(brand.router, prefix="/api")
app.include_router(model.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(warehouses.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(movements.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(labels.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "WWP Inventory API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

