"""
OpenAI provider implementation for Learning Catalyst.

Minimal async implementation of OpenAI API integration.
"""

import asyncio
import time
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


class OpenAIChatModel(ChatModel):
    """OpenAI chat model implementation."""

    def __init__(self, model_id: str, provider: 'OpenAIProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'OpenAIProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ):
        """Send message to OpenAI chat model."""
        if not 0.0 <= temperature <= 2.0:
            raise ValidationError("temperature", temperature, "must be between 0.0 and 2.0")

        # Convert Message objects to OpenAI format
        openai_messages = []
        for msg in messages:
            openai_msg = {"role": msg.role, "content": msg.content}
            if msg.name:
                openai_msg["name"] = msg.name
            if msg.function_call:
                openai_msg["function_call"] = msg.function_call
            openai_messages.append(openai_msg)

        payload = {
            "model": self.model_id,
            "messages": openai_messages,
            "temperature": temperature
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stream:
            payload["stream"] = True

        try:
            response = await self.provider._make_request_with_retry(
                "POST",
                f"{self.provider.config.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.provider.config.api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=self.provider.config.timeout
            )

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
                raise AuthenticationError("openai", "Invalid API key")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError("openai", f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError("openai", str(e))


class OpenAIEmbeddingModel(EmbeddingModel):
    """OpenAI embedding model implementation."""

    def __init__(self, model_id: str, provider: 'OpenAIProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'OpenAIProvider':
        """Get the provider instance."""
        return self._provider

    async def get_embeddings(
        self,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings from OpenAI."""
        if not texts:
            raise ValidationError("texts", texts, "cannot be empty")

        payload = {
            "model": self.model_id,
            "input": texts
        }

        if dimensions:
            payload["dimensions"] = dimensions

        try:
            response = await self.provider._make_request_with_retry(
                "POST",
                f"{self.provider.config.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.provider.config.api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=self.provider.config.timeout
            )

            data = response.json()

            return EmbeddingResponse(
                embeddings=[item["embedding"] for item in data["data"]],
                usage=data.get("usage", {}),
                model=data["model"],
                dimensions=len(data["data"][0]["embedding"])
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise AuthenticationError("openai", "Invalid API key")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError("openai", f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError("openai", str(e))


class OpenAIProvider(AIProvider):
    """OpenAI provider implementation."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        if not self.config.base_url:
            self.config.base_url = "https://api.openai.com/v1"

        # Rate limiting
        self._last_request_time = 0
        self._min_request_interval = 0.1  # 100ms between requests
        self._max_retries = 3
        self._retry_delay = 1.0  # Base delay for exponential backoff

    async def _rate_limit(self):
        """Apply rate limiting to prevent API abuse."""
        current_time = time.time()
        time_since_last_request = current_time - self._last_request_time

        if time_since_last_request < self._min_request_interval:
            sleep_time = self._min_request_interval - time_since_last_request
            await asyncio.sleep(sleep_time)

        self._last_request_time = time.time()

    async def _make_request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> httpx.Response:
        """Make HTTP request with exponential backoff retry logic."""
        last_exception = None

        for attempt in range(self._max_retries + 1):
            try:
                # Apply rate limiting
                await self._rate_limit()

                async with httpx.AsyncClient() as client:
                    response = await client.request(method, url, **kwargs)
                    response.raise_for_status()
                    return response

            except httpx.HTTPStatusError as e:
                last_exception = e

                # Don't retry on authentication or not found errors
                if e.response.status_code in [401, 403, 404]:
                    raise

                # Retry on rate limit errors (429) and server errors (5xx)
                if e.response.status_code in [429, 500, 502, 503, 504]:
                    if attempt < self._max_retries:
                        delay = self._retry_delay * (2 ** attempt)
                        await asyncio.sleep(delay)
                        continue

                raise

            except (httpx.RequestError, httpx.TimeoutException) as e:
                last_exception = e

                if attempt < self._max_retries:
                    delay = self._retry_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
                    continue

                raise

        # If we get here, all retries failed
        raise last_exception

    @property
    def name(self) -> str:
        return "openai"

    async def list_available_models(self) -> ModelList:
        """List available OpenAI models by fetching from the API."""
        try:
            response = await self._make_request_with_retry(
                "GET",
                f"{self.config.base_url}/models",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}"
                },
                timeout=self.config.timeout
            )

            data = response.json()
            models = data.get("data", [])

            # Filter and categorize models
            chat_models = []
            embedding_models = []

            # Known model patterns
            chat_patterns = ["gpt-4", "gpt-3.5", "o1"]
            embedding_patterns = ["text-embedding"]

            for model in models:
                model_id = model["id"]

                # Check if it's a chat model
                if any(pattern in model_id for pattern in chat_patterns):
                    if not any(exclude in model_id for exclude in ["-vision", "-audio"]):
                        chat_models.append(OpenAIChatModel(model_id, self))

                # Check if it's an embedding model
                elif any(pattern in model_id for pattern in embedding_patterns):
                    embedding_models.append(OpenAIEmbeddingModel(model_id, self))

            # Sort by model name (newest/most capable first)
            chat_models.sort(key=lambda m: m.model_id, reverse=True)
            embedding_models.sort(key=lambda m: m.model_id, reverse=True)

            return ModelList(
                chat=chat_models,
                embedding=embedding_models,
                rerank=[]  # OpenAI doesn't have rerank models
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise AuthenticationError("openai", "Invalid API key")
            else:
                raise ProviderConnectionError("openai", f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError("openai", str(e))
        except Exception as e:
            # Fallback to hardcoded list if API fails
            chat_models = [
                OpenAIChatModel("gpt-4", self),
                OpenAIChatModel("gpt-4-turbo", self),
                OpenAIChatModel("gpt-3.5-turbo", self),
            ]

            embedding_models = [
                OpenAIEmbeddingModel("text-embedding-ada-002", self),
                OpenAIEmbeddingModel("text-embedding-3-small", self),
                OpenAIEmbeddingModel("text-embedding-3-large", self),
            ]

            return ModelList(
                chat=chat_models,
                embedding=embedding_models,
                rerank=[]
            )

    async def health_check(self) -> bool:
        """Check if OpenAI API is accessible."""
        try:
            response = await self._make_request_with_retry(
                "GET",
                f"{self.config.base_url}/models",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}"
                },
                timeout=10
            )
            return response.status_code == 200
        except:
            return False