import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "UK Wind Generation Forecast Analytics"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./wind_procurement.db")
    
    # Elexon API
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    
    # Default gate closure / decision cutoff (11:00 GMT for EPEX Day-Ahead auction)
    DEFAULT_CUTOFF_TIME: str = "11:00"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
