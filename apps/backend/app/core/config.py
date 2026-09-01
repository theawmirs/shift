from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from zoneinfo import ZoneInfo
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "SHIFT API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str | None = Field(default_factory=lambda: os.getenv("DATABASE_URL"))
    DB_PATH: str = Field(default_factory=lambda: os.getenv("WORKTIME_DB_PATH", "/root/hermes/projects/work-time/data/work_hours.db"))
    EXPORTS_DIR: str = Field(default_factory=lambda: os.getenv("WORKTIME_EXPORTS_DIR", "/root/hermes/projects/work-time/exports"))
    
    # Timezone & Security
    TIMEZONE: str = "Asia/Tehran"
    JWT_SECRET: str | None = None  # Loaded dynamically from DB settings or ENV
    JWT_ALG: str = "HS256"
    JWT_EXP_MINUTES: int = 15
    JWT_REFRESH_DAYS: int = 7
    JWT_EXP_DAYS_LEGACY: int = 30
    LOGIN_TOKEN_EXP_MIN: int = 3
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str | None = Field(default_factory=lambda: os.getenv("TELEGRAM_BOT_TOKEN"))
    BOT_USERNAME: str = "attloginbot"
    BOT_URL_BASE: str = "https://t.me/attloginbot"

    @property
    def tehran_tz(self) -> ZoneInfo:
        return ZoneInfo(self.TIMEZONE)

settings = Settings()
