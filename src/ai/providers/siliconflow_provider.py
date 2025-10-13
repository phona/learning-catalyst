"""
SiliconFlow provider implementation for Learning Catalyst.

Minimal async implementation of SiliconFlow API integration.
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


class SiliconFlowChatModel(ChatModel):
    """SiliconFlow chat model implementation."""

    def __init__(self, model_id: str, provider: 'SiliconFlowProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'SiliconFlowProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ):
        """Send message to SiliconFlow chat model."""
        if not 0.0 <= temperature <= 2.0:
            raise ValidationError("temperature", temperature, "must be between 0.0 and 2.0")

        # Convert Message objects to SiliconFlow format
        siliconflow_messages = []
        for msg in messages:
            siliconflow_msg = {"role": msg.role, "content": msg.content}
            if msg.name:
                siliconflow_msg["name"] = msg.name
            if msg.function_call:
                siliconflow_msg["function_call"] = msg.function_call
            siliconflow_messages.append(siliconflow_msg)

        payload = {
            "model": self.model_id,
            "messages": siliconflow_messages,
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
                raise AuthenticationError("siliconflow", "Invalid API key")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError("siliconflow", f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError("siliconflow", str(e))


class SiliconFlowEmbeddingModel(EmbeddingModel):
    """SiliconFlow embedding model implementation."""

    def __init__(self, model_id: str, provider: 'SiliconFlowProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'SiliconFlowProvider':
        """Get the provider instance."""
        return self._provider

    async def get_embeddings(
        self,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings from SiliconFlow."""
        if not texts:
            raise ValidationError("texts", texts, "cannot be empty")

        payload = {
            "model": self.model_id,
            "input": texts
        }

        if dimensions:
            payload["dimensions"] = dimensions

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.provider.config.base_url}/embeddings",
                    headers={
                        "Authorization": f"Bearer {self.provider.config.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=self.provider.config.timeout
                )
                response.raise_for_status()

                data = response.json()

                return EmbeddingResponse(
                    embeddings=[item["embedding"] for item in data["data"]],
                    usage=data.get("usage", {}),
                    model=data["model"],
                    dimensions=len(data["data"][0]["embedding"])
                )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise AuthenticationError("siliconflow", "Invalid API key")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError("siliconflow", f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError("siliconflow", str(e))


class SiliconFlowProvider(AIProvider):
    """SiliconFlow provider implementation."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        if not self.config.base_url:
            self.config.base_url = "https://api.siliconflow.cn/v1"

    @property
    def name(self) -> str:
        return "siliconflow"

    async def list_available_models(self) -> ModelList:
        """List available SiliconFlow models."""
        # Common SiliconFlow models
        chat_models = [
            SiliconFlowChatModel("Qwen/Qwen2.5-7B-Instruct", self),
            SiliconFlowChatModel("Qwen/Qwen2.5-14B-Instruct", self),
            SiliconFlowChatModel("Qwen/Qwen2.5-32B-Instruct", self),
            SiliconFlowChatModel("Qwen/Qwen2.5-72B-Instruct", self),
        ]

        embedding_models = [
            SiliconFlowEmbeddingModel("BAAI/bge-large-en-v1.5", self),
            SiliconFlowEmbeddingModel("BAAI/bge-large-zh-v1.5", self),
        ]

        return ModelList(
            chat=chat_models,
            embedding=embedding_models,
            rerank=[]  # SiliconFlow doesn't have rerank models
        )

    async def health_check(self) -> bool:
        """Check if SiliconFlow API is accessible."""
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