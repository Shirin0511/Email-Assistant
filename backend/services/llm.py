from openai import OpenAI

from config import settings

client= OpenAI(
    api_key= settings.llm_api_key,
    base_url= settings.llm_base_url
)