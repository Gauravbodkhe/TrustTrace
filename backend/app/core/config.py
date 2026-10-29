"""
TrustTrace Backend Configuration
Reads settings from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_ENV: str = "development"
    APP_VERSION: str = "0.1.0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    LOG_LEVEL: str = "INFO"

    # Database (SQLite default for local development)
    DATABASE_URL: str = "sqlite:///./trusttrace.db"

    # Supabase (optional)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None

    # Google Gemini (optional)
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # Experiment Runner
    MAX_CONCURRENT_RUNS: int = 4
    DEFAULT_MAX_RETRIES: int = 3
    DEFAULT_TIMEOUT_SECONDS: int = 30
    DEFAULT_REPETITIONS: int = 3

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def gemini_available(self) -> bool:
        return bool(self.GOOGLE_API_KEY)

    @property
    def supabase_available(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)


settings = Settings()
