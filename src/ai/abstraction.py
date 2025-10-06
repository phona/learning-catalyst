"""
Model abstraction layer interface
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, NamedTuple

from src.data.models.extended_models import (
    AIResponse,
    Credentials,
    EmbeddingResponse,
    Message,
    RerankResponse,
)


class ModelProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Get the name of the provider"""
        pass

    @abstractmethod
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider"""
        pass

    @abstractmethod
    async def list_available_models(self) -> List["Model"]:
        """Get list of available models for a provider"""
        pass


class Model(ABC):
    """Abstract base class for all models."""
    @abstractmethod
    async def get_provider(self) -> ModelProvider: ...
    @abstractmethod
    async def get_id(self) -> str: ...


class ChatModel(Model):
    @abstractmethod
    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to LLM and get response"""
        pass


class EmbeddingModel(Model):
    @abstractmethod
    async def get_embeddings(
        self, texts: List[str], dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts"""
        pass


class RerankModel(Model):
    @abstractmethod
    async def rerank(
        self, query: str, documents: List[str], top_k: int = 10
    ) -> RerankResponse:
        """Rerank documents based on query relevance"""
        pass


ConfiguredModels = NamedTuple(
    "ConfiguredModels", [
        ("chat_model", Optional[ChatModel]),
        ("embedding_model", Optional[EmbeddingModel]),
        ("rerank_model", Optional[RerankModel])
    ]
)


class ModelAbstractionLayer(ABC):
    """Abstract layer for model abstraction."""
    @abstractmethod
    async def send_message(
        self, messages: List[Message], temperature: float = 0.7
    ) -> AIResponse:
        """Send message to LLM provider and get response"""
        pass

    @abstractmethod
    async def get_embeddings(
        self, texts: List[str], dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model"""
        pass

    @abstractmethod
    async def rerank(
        self, query: str, documents: List[str], top_k: int = 10
    ) -> RerankResponse:
        """Rerank documents based on query relevance"""
        pass

    @abstractmethod
    async def set_chat_model(self) -> None:
        """Set the chat model to use."""
        pass

    @abstractmethod
    async def set_embedding_model(self) -> None:
        """Set the embedding model to use."""
        pass

    @abstractmethod
    async def set_rerank_model(self) -> None:
        pass

    @abstractmethod
    def inused_models(self) -> ConfiguredModels:
        """Get currently in-use models"""
        pass

    @abstractmethod
    def list_configured_models(self) -> Dict[str, List[Model]]:
        """
        List all configured models grouped by provider.
        Each provider maps to a list of its models.
        models include chat, embedding, and rerank models.
        """
        pass
