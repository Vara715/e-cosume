import os
import urllib.parse
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "e-consumption"
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
        # If password contains unescaped '@', URL-encode it
        if "@" in url and url.count("@") > 1 and "://" in url:
            scheme_and_auth, host_part = url.rsplit("@", 1)
            scheme, rest = scheme_and_auth.split("://", 1)
            if ":" in rest:
                user, password = rest.split(":", 1)
                encoded_pass = urllib.parse.quote(password, safe="")
                url = f"{scheme}://{user}:{encoded_pass}@{host_part}"
        if url.startswith("postgresql://") and not url.startswith("postgresql+"):
            try:
                import psycopg  # noqa: F401
            except ImportError:
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
