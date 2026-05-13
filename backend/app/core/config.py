from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    GOOGLE_CLOUD_PROJECT: str = "flighthub-vertex-ai"
    GOOGLE_CLOUD_REGION: str = "asia-southeast1"
    GOOGLE_GENAI_USE_VERTEXAI: bool = True

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True

    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:////mnt/gcs-db/travel_booking.db")
    MODEL_NAME: str = "gemini-2.0-flash"


settings = Settings()
