"""
Model abstraction layer interface
"""

from abc import ABC, abstractmethod
from typing import Dict, List, NamedTuple, Optional

from src.data.models.extended_models import AIResponse, Credentials, EmbeddingResponse, Message, RerankResponse


class ModelProvider(ABC):
    """Abstract base class for model providers."""

    # Class attributes to be overridden by subclasses
    name: str = ""
    description: str = ""

    @abstractmethod
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider"""

    @abstractmethod
    async def list_available_models(self) -> Dict[str, List["Model"]]:
        """
        Get list of available models for this provider, grouped by model type,
        return empty dict if models api the provider has not implemented.

        Returns:
            A dictionary with model types as keys (chat, embedding, rerank) and
            lists of Model instances as values.
        """

    @abstractmethod
    def create_model_instance(self, model_id: str) -> Optional["Model"]:
        """Create appropriate model instance based on model ID"""


class Model(ABC):
    """Abstract base class for all models."""

    @abstractmethod
    async def get_provider(self) -> ModelProvider:
        """Get the provider for this model"""

    @abstractmethod
    async def get_id(self) -> str:
        """Get the ID of this model"""


class ChatModel(Model):
    """Abstract base class for chat models."""

    @abstractmethod
    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to LLM and get response"""


class EmbeddingModel(Model):
    """Abstract base class for embedding models."""

    @abstractmethod
    async def get_embeddings(self, texts: List[str], dimensions: Optional[int] = None) -> EmbeddingResponse:
        """Get embeddings for texts"""


class RerankModel(Model):
    """Abstract base class for rerank models."""

    @abstractmethod
    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> RerankResponse:
        """Rerank documents based on query relevance"""


ConfiguredModels = NamedTuple(
    "ConfiguredModels",
    [
        ("chat_model", Optional[ChatModel]),
        ("embedding_model", Optional[EmbeddingModel]),
        ("rerank_model", Optional[RerankModel]),
    ],
)


class ModelAbstractionLayer(ABC):
    """Abstract layer for model abstraction."""

    @abstractmethod
    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to LLM provider and get response"""

    @abstractmethod
    async def get_embeddings(self, texts: List[str], dimensions: Optional[int] = None) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model"""

    @abstractmethod
    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> RerankResponse:
        """Rerank documents based on query relevance"""

    @abstractmethod
    async def set_chat_model(self, provider_name: str, model_id: str) -> None:
        """Set the chat model to use."""

    @abstractmethod
    async def set_embedding_model(self, provider_name: str, model_id: str) -> None:
        """Set the embedding model to use."""

    @abstractmethod
    async def set_rerank_model(self, provider_name: str, model_id: str) -> None:
        """Set the rerank model to use."""

    @abstractmethod
    def inused_models(self) -> ConfiguredModels:
        """Get currently in-use models"""

    @abstractmethod
    def list_configured_models(self) -> Dict[str, List[Model]]:
        """
        List all configured models grouped by provider.
        Each provider maps to a list of its models.
        models include chat, embedding, and rerank models.
        """
