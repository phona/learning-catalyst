"""
Claude provider implementation
"""
import httpx
from typing import List, Dict, Any
from src.data.models.extended_models import Credentials, ProviderCapabilities


class ClaudeProvider:
    def __init__(self, api_key: str, base_url: str = "https://api.anthropic.com/v1"):
        self.api_key = api_key
        self.base_url = base_url

    async def send_message(self, model: str, messages: List[Dict], temperature: float = 0.7):
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }

        # Convert messages to Claude format (user/assistant alternating)
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg["role"] if msg["role"] != "system" else "user",  # Claude doesn't have system role in messages
                "content": msg["content"]
            })

        payload = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": 1024,  # Required for Claude
            "temperature": temperature
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/messages", 
                                        json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    async def get_embeddings(self, model: str, texts: List[str]):
        # Claude doesn't natively support embeddings, so we'd need to use another provider
        # This is just a placeholder implementation
        raise NotImplementedError("Claude does not support embeddings directly")

    async def validate_credentials(self, credentials: Credentials) -> bool:
        """Validate Claude API credentials"""
        try:
            # Make a simple request to validate the API key
            headers = {
                "x-api-key": credentials.api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{credentials.base_url or self.base_url}/models", headers=headers)
                return response.status_code == 200
        except Exception:
            return False

    async def list_available_models(self) -> List[str]:
        """Get list of available Claude models"""
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/models", headers=headers)
            response.raise_for_status()
            data = response.json()
            return [model["id"] for model in data["data"]]

    async def get_provider_capabilities(self) -> ProviderCapabilities:
        """Get capabilities information for Claude provider"""
        return ProviderCapabilities(
            supports_streaming=True,
            max_tokens=200000,  # For Claude 3 models
            supported_models=await self.list_available_models(),
            input_cost_per_token=0.000003,  # Example: $0.003 per 1K tokens for input
            output_cost_per_token=0.000015,  # Example: $0.015 per 1K tokens for output
            supports_embeddings=False,  # Claude doesn't support embeddings
            supports_rerank=False
        )