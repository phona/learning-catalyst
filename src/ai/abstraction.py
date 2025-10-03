"""
Model abstraction layer interface
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, Union
from src.data.models.extended_models import Message, AIResponse, Credentials, EmbeddingResponse, RerankResponse, ProviderCapabilities


class ModelAbstractionLayer(ABC):
    @abstractmethod
    async def send_message(
        self, 
        provider: str, 
        model: str, 
        messages: List[Message],
        temperature: float = 0.7
    ) -> AIResponse:
        """Send message to LLM provider and get response"""
        pass

    @abstractmethod
    async def get_embeddings(
        self,
        provider: str,
        model: str,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model"""
        pass

    @abstractmethod
    async def rerank(
        self,
        provider: str,
        model: str,
        query: str,
        documents: List[str],
        top_k: int = 10
    ) -> RerankResponse:
        """Rerank documents based on query relevance"""
        pass

    @abstractmethod
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider"""
        pass

    @abstractmethod
    async def list_available_models(self, provider: str) -> List[str]:
        """Get list of available models for a provider"""
        pass

    @abstractmethod
    async def get_provider_capabilities(self, provider: str) -> ProviderCapabilities:
        """Get capabilities information for a provider"""
        pass