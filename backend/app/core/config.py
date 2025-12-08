import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vidria Auth"
    
    # DATABASE
    DATABASE_URL: str
    
    # SECURITY
    JWT_SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # ADMIN
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "Admin123!"
    ADMIN_EMAIL: str = "admin@frigate.local"
    DEFAULT_ADMIN_WHATSAPP: Optional[str] = None
    
    # WHATSAPP
    WHATSAPP_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    
    # FRONTEND
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = []

    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # EMAIL
    # Resend API (preferido si está configurado)
    RESEND_API_KEY: Optional[str] = None
    
    # SMTP (alternativa)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@vidria.com"
    EMAILS_FROM_NAME: str = "Vidria Security"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
