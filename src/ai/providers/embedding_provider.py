"""
Embedding provider implementation
"""
import httpx
from typing import List, Dict, Any
from src.data.models.extended_models import Credentials, ProviderCapabilities


class EmbeddingProvider:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    async def get_embeddings(self, model: str, texts: List[str]):
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
        """Validate embedding API credentials"""
        try:
            headers = {
                "Authorization": f"Bearer {credentials.api_key}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{credentials.base_url}/models", headers=headers)
                return response.status_code == 200
        except Exception:
            return False

    async def list_available_models(self) -> List[str]:
        """Get list of available embedding models"""
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
        """Get capabilities information for embedding provider"""
        return ProviderCapabilities(
            supports_streaming=False,  # Embeddings don't typically stream
            max_tokens=8192,  # Max input tokens for embedding models
            supported_models=await self.list_available_models(),
            input_cost_per_token=0.0000001,  # Example cost
            output_cost_per_token=0,  # Embeddings output is typically free
            supports_embeddings=True,
            supports_rerank=False
        )