"""
Abstract base classes for AI providers.

All provider interfaces and model abstractions for Learning Catalyst.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Union, AsyncGenerator, TYPE_CHECKING
from dataclasses import dataclass

from ...core.models import (
    ProviderConfig, ModelList, Message, ChatResponse,
    EmbeddingResponse, RerankResponse, RerankResult
)
from ...core.exceptions import ModelError, ValidationError

if TYPE_CHECKING:
    pass


class AIProvider(ABC):
    """Abstract base class for all AI providers."""

    def __init__(self, config: ProviderConfig):
        """Initialize provider with configuration."""
        self.config = config

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name."""
        pass

    @abstractmethod
    async def list_available_models(self) -> ModelList:
        """
        Get list of available model instances for this provider.

        Returns:
            ModelList TypedDict with model instances organized by type:
            {
                "chat": [ChatModel(...), ChatModel(...)],
                "embedding": [EmbeddingModel(...)],
                "rerank": [RerankModel(...)]
            }

        Raises:
            ProviderConnectionError: If unable to connect to provider
            AuthenticationError: If authentication fails
        """
        pass


class AIModel(ABC):
    """Abstract base class for all AI models."""

    def __init__(self, model_id: str, provider: 'AIProvider'):
        """Initialize model with ID and provider."""
        self._model_id = model_id
        self._provider = provider

    @property
    def model_id(self) -> str:
        """Return the model ID."""
        return self._model_id

    @abstractmethod
    async def get_provider(self) -> 'AIProvider':
        """Get the provider instance."""
        pass


class ChatModel(AIModel):
    """Abstract base class for chat models."""

    @abstractmethod
    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[ChatResponse, AsyncGenerator[ChatResponse, None]]:
        """
        Send messages to the chat model and get response.

        Args:
            messages: List of messages in conversation
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream response

        Returns:
            ChatResponse or AsyncGenerator of ChatResponse if streaming

        Raises:
            ModelError: If model request fails
            ValidationError: If input is invalid
        """
        pass


class EmbeddingModel(AIModel):
    """Abstract base class for embedding models."""

    @abstractmethod
    async def get_embeddings(
        self,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """
        Get embeddings for the provided texts.

        Args:
            texts: List of texts to embed
            dimensions: Optional embedding dimensions

        Returns:
            EmbeddingResponse with embedding vectors

        Raises:
            ModelError: If embedding generation fails
            ValidationError: If input is invalid
        """
        pass


class RerankModel(AIModel):
    """Abstract base class for rerank models."""

    @abstractmethod
    async def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = 10
    ) -> RerankResponse:
        """
        Rerank documents based on query relevance.

        Args:
            query: Search query
            documents: List of documents to rank
            top_k: Number of top results to return

        Returns:
            RerankResponse with ranked results

        Raises:
            ModelError: If reranking fails
            ValidationError: If input is invalid
        """
        pass