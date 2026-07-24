from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://codepulse:codepulse@localhost:5432/codepulse"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:3000/auth/callback"
    gitlab_client_id: str = ""
    gitlab_client_secret: str = ""
    gitlab_redirect_uri: str = "http://localhost:3000/auth/gitlab/callback"
    gitlab_api_url: str = "https://gitlab.com/api/v4"
    secret_key: str = "change-me-in-production"
    frontend_url: str = "http://localhost:3000"
    github_api_url: str = "https://api.github.com"
    github_graphql_url: str = "https://api.github.com/graphql"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # AWS S3 Settings
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "codepulse-documentation"
    s3_endpoint_url: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

