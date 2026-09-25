from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_api_key : str 
    llm_base_url : str = "https://router.huggingface.co/v1"
    llm_model : str = "openai/gpt-oss-120b:fastest"


settings = Settings()    