"""
OpenAI provider implementation
"""
import httpx
from typing import List, Dict, Any
from src.data.models.extended_models import Credentials, ProviderCapabilities


class OpenAIProvider:
    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.base_url = base_url

    async def send_message(self, model: str, messages: List[Dict], temperature: float = 0.7):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat/completions", 
                                        json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    async def get_embeddings(self, model: str, texts: List[str]):
        # Implementation for OpenAI embeddings
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "input": texts
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/embeddings", 
                                        json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    async def validate_credentials(self, credentials: Credentials) -> bool:
        """Validate OpenAI API credentials"""
        try:
            # Make a simple request to validate the API key
            headers = {
                "Authorization": f"Bearer {credentials.api_key}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{credentials.base_url or self.base_url}/models", headers=headers)
                return response.status_code == 200
        except Exception:
            return False

    async def list_available_models(self) -> List[str]:
        """Get list of available OpenAI models"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/models", headers=headers)
            response.raise_for_status()
            data = response.json()
            return [model["id"] for model in data["data"]]

    async def get_provider_capabilities(self) -> ProviderCapabilities:
        """Get capabilities information for OpenAI provider"""
        return ProviderCapabilities(
            supports_streaming=True,
            max_tokens=128000,  # For GPT-4 Turbo
            supported_models=await self.list_available_models(),
            input_cost_per_token=0.00001,  # Example: $0.01 per 1K tokens for input
            output_cost_per_token=0.00003,  # Example: $0.03 per 1K tokens for output
            supports_embeddings=True,
            supports_rerank=False
        )