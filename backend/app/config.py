from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    DATABASE_URL: str

    JWT_ALGORITHM: str
    JWT_SECRET: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int | None = None
    REFRESH_TOKEN_EXPIRE_DAYS: int | None = None

    class Config:
        env_file = ".env"


settings = Settings()
