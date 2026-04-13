"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for ClauseGuard backend."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://clauseguard:clauseguard@db:5432/clauseguard"
    DATABASE_URL_SYNC: str = "postgresql://clauseguard:clauseguard@db:5432/clauseguard"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Google Gemini (fallback / primary when OpenAI quota is exhausted)
    GEMINI_API_KEY: str = ""

    # Auth
    JWT_SECRET: str = "clauseguard-hackathon-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440

    # App
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = "pdf,docx,txt"

    # Embedding
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Completion
    COMPLETION_MODEL: str = "gpt-4o"

    # TrustFoundry — verified legal search & reasoning (hackathon sponsor)
    # Get your API key from: https://dashboard.trustfoundry.ai
    TRUSTFOUNDRY_API_KEY: str = ""
    TRUSTFOUNDRY_API_URL: str = "https://api.trustfoundry.ai"
    TRUSTFOUNDRY_ENABLED: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
