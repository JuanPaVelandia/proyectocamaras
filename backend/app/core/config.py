import os

class Settings:
    PROJECT_NAME: str = "Vidria Auth"
    
    # FRONTEND
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # EMAIL
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "noreply@vidria.com")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Vidria Security")

settings = Settings()
