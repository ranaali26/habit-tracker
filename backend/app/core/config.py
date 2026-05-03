from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str

    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 14
    JWT_ALGORITHM: str = "HS256"

    CORS_ORIGINS: str = "http://localhost:5173"

    REFRESH_COOKIE_NAME: str = "refresh_token"
    REFRESH_COOKIE_PATH: str = "/api/auth/refresh"
    REFRESH_COOKIE_SAMESITE: str = "lax"
    REFRESH_COOKIE_SECURE: bool = False
    REFRESH_COOKIE_HTTPONLY: bool = True

    class Config:
        env_file = ".env"

settings = Settings()