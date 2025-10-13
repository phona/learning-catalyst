"""
DeepSeek provider implementation for Learning Catalyst.

Minimal async implementation of DeepSeek API integration.
"""

import asyncio
from typing import List, Dict, Any, Optional
import httpx
from dataclasses import dataclass

from ...core.models import (
    ProviderConfig, ModelList, Message, ChatResponse,
    EmbeddingResponse, RerankResponse, RerankResult
)
from ...core.exceptions import (
    ProviderError, AuthenticationError, ModelError,
    ProviderConnectionError, ValidationError
)
from ..models import AIModel, ChatModel, EmbeddingModel, RerankModel
from .base import AIProvider


class DeepSeekChatModel(ChatModel):
    """DeepSeek chat model implementation."""

    def __init__(self, model_id: str, provider: 'DeepSeekProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'DeepSeekProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ):
        """Send message to DeepSeek chat model."""
        if not 0.0 <= temperature <= 2.0:
            raise ValidationError("temperature", temperature, "must be between 0.0 and 2.0")

        # Convert Message objects to DeepSeek format
        deepseek_messages = []
        for msg in messages:
            deepseek_msg = {"role": msg.role, "content": msg.content}
            if msg.name:
                deepseek_msg["name"] = msg.name
            if msg.function_call:
                deepseek_msg["function_call"] = msg.function_call
            deepseek_messages.append(deepseek_msg)

        payload = {
            "model": self.model_id,
            "messages": deepseek_messages,
            "temperature": temperature
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stream:
            payload["stream"] = True

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.provider.config.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.provider.config.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=self.provider.config.timeout
                )
                response.raise_for_status()

                data = response.json()

                return ChatResponse(
                    content=data["choices"][0]["message"]["content"],
                    finish_reason=data["choices"][0]["finish_reason"],
                    usage=data.get("usage", {}),
                    model=data["model"],
                    timestamp=data["created"]
                )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise AuthenticationError("deepseek", "Invalid API key")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError("deepseek", f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError("deepseek", str(e))


class DeepSeekProvider(AIProvider):
    """DeepSeek provider implementation."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        if not self.config.base_url:
            self.config.base_url = "https://api.deepseek.com"

    @property
    def name(self) -> str:
        return "deepseek"

    async def list_available_models(self) -> ModelList:
        """List available DeepSeek models."""
        # Common DeepSeek models
        chat_models = [
            DeepSeekChatModel("deepseek-chat", self),
            DeepSeekChatModel("deepseek-coder", self),
        ]

        return ModelList(
            chat=chat_models,
            embedding=[],  # DeepSeek doesn't have embedding models
            rerank=[]     # DeepSeek doesn't have rerank models
        )

    async def health_check(self) -> bool:
        """Check if DeepSeek API is accessible."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.config.base_url}/models",
                    headers={
                        "Authorization": f"Bearer {self.config.api_key}"
                    },
                    timeout=10
                )
                return response.status_code == 200
        except:
            return False