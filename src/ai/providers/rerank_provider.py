"""
Rerank provider implementation
"""
import httpx
from typing import List, Dict, Any
from src.data.models.extended_models import Credentials, ProviderCapabilities


class RerankProvider:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    async def rerank(self, model: str, query: str, documents: List[str], top_k: int = 10):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "query": query,
            "documents": documents,
            "top_k": top_k
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/rerank", 
                                        json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    async def validate_credentials(self, credentials: Credentials) -> bool:
        """Validate rerank API credentials"""
        try:
            headers = {
                "Authorization": f"Bearer {credentials.api_key}",
                "Content-Type": "application/json",
            }

            # Test with a simple models list request
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{credentials.base_url}/models", headers=headers)
                return response.status_code == 200
        except Exception:
            return False

    async def list_available_models(self) -> List[str]:
        """Get list of available rerank models"""
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
        """Get capabilities information for rerank provider"""
        return ProviderCapabilities(
            supports_streaming=False,  # Reranking doesn't typically stream
            max_tokens=8192,  # Max tokens for reranking input
            supported_models=await self.list_available_models(),
            input_cost_per_token=0.0000002,  # Example cost
            output_cost_per_token=0,  # Reranking output is typically free
            supports_embeddings=False,  # Reranking is different from embeddings
            supports_rerank=True
        )