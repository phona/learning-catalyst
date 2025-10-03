"""
Local model provider implementation (for Ollama, Llama.cpp, etc.)
"""
import httpx
from typing import List, Dict, Any
from src.data.models.extended_models import Credentials, ProviderCapabilities


class LocalModelProvider:
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def send_message(self, model: str, messages: List[Dict], temperature: float = 0.7):
        headers = {
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False  # For simplicity, not using streaming
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat/completions", 
                                        json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    async def get_embeddings(self, model: str, texts: List[str]):
        headers = {
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
        """Validate local model endpoint"""
        try:
            headers = {
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{credentials.base_url or self.base_url}/models", headers=headers)
                return response.status_code == 200
        except Exception:
            return False

    async def list_available_models(self) -> List[str]:
        """Get list of available local models"""
        headers = {
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/models", headers=headers)
            response.raise_for_status()
            data = response.json()
            return [model["id"] for model in data["data"]]

    async def get_provider_capabilities(self) -> ProviderCapabilities:
        """Get capabilities information for local model provider"""
        return ProviderCapabilities(
            supports_streaming=True,
            max_tokens=4096,  # Typical for local models
            supported_models=await self.list_available_models(),
            input_cost_per_token=0,  # No cost for local models
            output_cost_per_token=0,  # No cost for local models
            supports_embeddings=True,
            supports_rerank=False
        )