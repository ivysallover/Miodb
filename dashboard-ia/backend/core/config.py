import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Explicitly load backend/.env into os.environ
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dashboard IA API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS: Allow all origins by default so remote Vercel and previews always connect cleanly
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    MAX_UPLOAD_BYTES: int = 100 * 1024 * 1024
    MAX_CONCURRENT_ANALYSES: int = 2
    
    # Gemini
    GEMINI_API_KEY: str = ""
    
    model_config = SettingsConfigDict(
        env_file=str(_env_path) if _env_path.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        enable_decoding=False
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        """Support the comma-separated form used in the deployment guide and CORS_ORIGINS env var."""
        cors_env = os.environ.get("CORS_ORIGINS") or value
        if isinstance(cors_env, str):
            if cors_env.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in cors_env.split(",") if origin.strip()]
        return value or ["*"]

@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    if s.GEMINI_API_KEY and not os.environ.get("GEMINI_API_KEY"):
        os.environ["GEMINI_API_KEY"] = s.GEMINI_API_KEY
    return s
