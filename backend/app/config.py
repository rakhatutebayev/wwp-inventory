from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/wwp_inventory"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS (comma-separated string)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:3001"
    
    class Config:
        env_file = ".env"


settings = Settings()

