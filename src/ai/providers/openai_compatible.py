"""
Custom provider infrastructure for Learning Catalyst.

Base classes and utilities for OpenAI-compatible and custom AI providers.
"""

import asyncio
from typing import List, Dict, Any, Optional, Union
import httpx
from abc import ABC, abstractmethod

from ...core.models import (
    ProviderConfig, ModelList, Message, ChatResponse,
    EmbeddingResponse, RerankResponse, RerankResult
)
from ...core.exceptions import (
    ProviderError, AuthenticationError, ModelError,
    ProviderConnectionError, ValidationError
)
from ...ai.types import (
    AuthenticationConfig, AuthenticationType,
    ProviderCapabilities, ProviderType, ModelCapabilities,
    GPT_CAPABILITIES, CODING_MODEL_CAPABILITIES, EMBEDDING_CAPABILITIES
)
from .base import AIProvider, AIModel, ChatModel, EmbeddingModel


class CustomChatModel(ChatModel):
    """Custom chat model implementation for OpenAI-compatible providers."""

    def __init__(self, model_id: str, provider: 'OpenAICompatibleProvider', capabilities: Optional[ModelCapabilities] = None):
        super().__init__(model_id, provider)
        self.capabilities = capabilities or GPT_CAPABILITIES

    async def get_provider(self) -> 'OpenAICompatibleProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ):
        """Send message to custom chat model."""
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
            headers = await self.provider.get_auth_headers()
            headers["Content-Type"] = "application/json"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.provider.config.base_url}/chat/completions",
                    headers=headers,
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
                    timestamp=data.get("created", 0)
                )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise AuthenticationError(self.provider.name, "Invalid API key or authentication failed")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError(self.provider.name, f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError(self.provider.name, str(e))


class CustomEmbeddingModel(EmbeddingModel):
    """Custom embedding model implementation for OpenAI-compatible providers."""

    def __init__(self, model_id: str, provider: 'OpenAICompatibleProvider', capabilities: Optional[ModelCapabilities] = None):
        super().__init__(model_id, provider)
        self.capabilities = capabilities or EMBEDDING_CAPABILITIES

    async def get_provider(self) -> 'OpenAICompatibleProvider':
        """Get the provider instance."""
        return self._provider

    async def get_embeddings(
        self,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings from custom provider."""
        if not texts:
            raise ValidationError("texts", texts, "cannot be empty")

        payload = {
            "model": self.model_id,
            "input": texts
        }

        if dimensions:
            payload["dimensions"] = dimensions

        try:
            headers = await self.provider.get_auth_headers()
            headers["Content-Type"] = "application/json"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.provider.config.base_url}/embeddings",
                    headers=headers,
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
                raise AuthenticationError(self.provider.name, "Invalid API key or authentication failed")
            elif e.response.status_code == 404:
                raise ModelError(f"Model {self.model_id} not found")
            else:
                raise ProviderConnectionError(self.provider.name, f"HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            raise ProviderConnectionError(self.provider.name, str(e))


class OpenAICompatibleProvider(AIProvider):
    """Base class for OpenAI-compatible providers."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._auth_config: Optional[AuthenticationConfig] = None

    @property
    def name(self) -> str:
        """Return the provider name."""
        return self.config.name

    async def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for API requests."""
        headers = {}

        # Add custom headers from configuration
        if self.config.custom_headers:
            headers.update(self.config.custom_headers)

        # Add organization header if provided
        if self.config.organization_id:
            headers["OpenAI-Organization"] = self.config.organization_id

        # Add API key authentication
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        return headers

    async def list_available_models(self) -> ModelList:
        """List available models from the provider."""
        # Try to fetch models from the provider API
        try:
            headers = await self.get_auth_headers()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.config.base_url}/models",
                    headers=headers,
                    timeout=10
                )
                response.raise_for_status()

                data = response.json()
                models = data.get("data", [])

                chat_models = []
                embedding_models = []

                for model_data in models:
                    model_id = model_data.get("id", "")

                    # Classify model type based on ID patterns
                    if any(pattern in model_id.lower() for pattern in ["gpt", "chat", "instruct", "llama", "mixtral"]):
                        capabilities = self._detect_model_capabilities(model_id)
                        chat_models.append(CustomChatModel(model_id, self, capabilities))
                    elif any(pattern in model_id.lower() for pattern in ["embedding", "embed"]):
                        embedding_models.append(CustomEmbeddingModel(model_id, self))

                return ModelList(
                    chat=chat_models,
                    embedding=embedding_models,
                    rerank=[]  # Most OpenAI-compatible providers don't have rerank models
                )

        except Exception as e:
            # If we can't fetch models, return common defaults based on provider
            return self._get_default_models()

    def _detect_model_capabilities(self, model_id: str) -> ModelCapabilities:
        """Detect model capabilities based on model ID patterns."""
        model_id_lower = model_id.lower()

        capabilities = set()

        # Check for streaming support
        if any(pattern in model_id_lower for pattern in ["gpt-4", "gpt-3.5", "claude", "llama", "mixtral"]):
            capabilities.add(ModelCapability.STREAMING)

        # Check for function calling
        if any(pattern in model_id_lower for pattern in ["gpt-4", "gpt-3.5", "claude-3"]):
            capabilities.add(ModelCapability.FUNCTION_CALLING)

        # Check for vision capabilities
        if any(pattern in model_id_lower for pattern in ["vision", "gpt-4-v", "claude-3", "multimodal"]):
            capabilities.add(ModelCapability.VISION)
            capabilities.add(ModelCapability.MULTIMODAL)

        # Check for code generation
        if any(pattern in model_id_lower for pattern in ["code", "coder", "instruct", "deepseek-coder"]):
            capabilities.add(ModelCapability.CODE_GENERATION)

        # Check for reasoning
        if any(pattern in model_id_lower for pattern in ["gpt-4", "claude-3", "reasoning"]):
            capabilities.add(ModelCapability.REASONING)

        # Determine specialization
        specialization = "General purpose"
        if "code" in model_id_lower or "coder" in model_id_lower:
            specialization = "Code generation and programming"
        elif "embed" in model_id_lower:
            specialization = "Text embeddings"
        elif "vision" in model_id_lower:
            specialization = "Multimodal AI with vision"

        return ModelCapabilities(
            capabilities=capabilities,
            specialization=specialization
        )

    def _get_default_models(self) -> ModelList:
        """Get default models when API fetching fails."""
        # Return common models based on provider name
        provider_name = self.config.name.lower()

        if "groq" in provider_name:
            return ModelList(
                chat=[
                    CustomChatModel("llama3-70b-8192", self),
                    CustomChatModel("llama3-8b-8192", self),
                    CustomChatModel("mixtral-8x7b-32768", self)
                ],
                embedding=[],
                rerank=[]
            )
        elif "together" in provider_name:
            return ModelList(
                chat=[
                    CustomChatModel("meta-llama/Llama-2-70b-chat-hf", self),
                    CustomChatModel("mistralai/Mixtral-8x7B-Instruct-v0.1", self)
                ],
                embedding=[],
                rerank=[]
            )
        else:
            # Generic defaults
            return ModelList(
                chat=[CustomChatModel("gpt-3.5-turbo", self)],
                embedding=[CustomEmbeddingModel("text-embedding-ada-002", self)],
                rerank=[]
            )

    async def health_check(self) -> bool:
        """Check if the provider is accessible."""
        try:
            headers = await self.get_auth_headers()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.config.base_url}/models",
                    headers=headers,
                    timeout=10
                )
                return response.status_code == 200
        except:
            return False

    def get_capabilities(self) -> ProviderCapabilities:
        """Get provider capabilities."""
        return ProviderCapabilities(
            provider_type=ProviderType.OPENAI_COMPATIBLE,
            supported_model_types=["chat", "embedding"],
            authentication_methods=["api_key", "bearer_token", "custom_headers"],
            features=["streaming", "function_calling", "custom_headers", "organization_support"]
        )


class CustomProviderFactory:
    """Factory for creating custom providers."""

    @staticmethod
    def create_openai_compatible_provider(config: ProviderConfig) -> OpenAICompatibleProvider:
        """Create an OpenAI-compatible provider from configuration."""
        return OpenAICompatibleProvider(config)

    @staticmethod
    def create_from_url(name: str, base_url: str, api_key: Optional[str] = None, **kwargs) -> OpenAICompatibleProvider:
        """Create a custom provider from a URL."""
        config = ProviderConfig(
            name=name,
            base_url=base_url,
            api_key=api_key,
            **kwargs
        )
        return OpenAICompatibleProvider(config)