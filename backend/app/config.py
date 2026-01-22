import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Modal Classifier Configuration
    modal_classifier_url: str = ""
    classifier_timeout: int = 10  # seconds

    # AssemblyAI Configuration
    assemblyai_api_key: str = ""  # Set via ASSEMBLYAI_API_KEY env var

    # WeatherAPI Configuration
    weatherapi_key: str = ""  # Set via WEATHERAPI_KEY env var

    # Gemini Configuration
    gemini_api_key: str = ""  # Set via GEMINI_API_KEY env var

    # Rime TTS Configuration
    rime_api_key: str = ""  # Set via RIME_API_KEY env var

    # Groq Configuration
    groq_api_key: str = ""  # Set via GROQ_API_KEY env var

    # Tavily Search Configuration
    tavily_api_key: str = ""  # Set via TAVILY_API_KEY env var

    # LLM Provider Selection ("groq" or "gemini")
    llm_provider: str = "groq"  # Easy manual switch

    # Intent Classification
    confidence_threshold: float = 0.5

    # CORS Configuration
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:4321",  # Astro dev server
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4321",
        "http://127.0.0.1:5173",
        "http://frontend:4321",  # Docker network
    ]

    # Context Management
    context_expiry_seconds: int = 1800  # 30 minutes

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
