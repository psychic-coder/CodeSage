from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = "changeme"
    allowed_origins: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/codesage"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    qdrant_url: str = "http://localhost:6333"
    redis_url: str = "redis://localhost:6379/0"

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "codesage-repos"

    openai_api_key: str = "sk-..."
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai"
    llm_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"

    github_client_id: str = ""
    github_client_secret: str = ""
    github_personal_token: str = ""

    max_repo_size_mb: int = 500
    max_files_per_repo: int = 5000
    max_file_size_kb: int = 500
    embedding_batch_size: int = 100

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()