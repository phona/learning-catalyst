"""
Model abstraction service implementation
"""

from typing import Dict, List, Optional

from src.data.models.extended_models import (
    AIResponse,
    Credentials,
    EmbeddingResponse,
    Message,
    RerankResponse,
)

from .abstraction import ModelAbstractionLayer, ModelProvider, ChatModel, EmbeddingModel, RerankModel, ConfiguredModels, Model


class ModelAbstractionService(ModelAbstractionLayer):
    """Service implementation for the model abstraction layer that handles
    communication with various LLM providers."""
    
    def __init__(self):
        self._providers: Dict[str, ModelProvider] = {}
        self._chat_model: Optional[ChatModel] = None
        self._embedding_model: Optional[EmbeddingModel] = None
        self._rerank_model: Optional[RerankModel] = None

    def register_provider(self, provider: ModelProvider) -> None:
        """Register a model provider with the service."""
        self._providers[provider.name] = provider

    async def send_message(
        self, messages: List[Message], temperature: float = 0.7
    ) -> AIResponse:
        """Send message to LLM provider and get response."""
        if not self._chat_model:
            raise ValueError(
                "No chat model configured. Please use the /set-config command to set up your AI provider and model first."
            )
        
        return await self._chat_model.send_message(messages, temperature)

    async def get_embeddings(
        self, texts: List[str], dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model."""
        if not self._embedding_model:
            raise ValueError(
                "No embedding model configured. Please use the /set-config command to set up your AI provider and model first."
            )
        
        return await self._embedding_model.get_embeddings(texts, dimensions)

    async def rerank(
        self, query: str, documents: List[str], top_k: int = 10
    ) -> RerankResponse:
        """Rerank documents based on query relevance."""
        if not self._rerank_model:
            raise ValueError(
                "No rerank model configured. Please use the /set-config command to set up your AI provider and model first."
            )
        
        return await self._rerank_model.rerank(query, documents, top_k)

    async def set_chat_model(self, provider_name: Optional[str] = None, model_id: Optional[str] = None) -> None:
        """Set the chat model to use for send_message operations."""
        if provider_name and provider_name in self._providers:
            provider = self._providers[provider_name]
            if model_id:
                # Find the specific model
                models = await provider.list_available_models()
                for model in models:
                    if isinstance(model, ChatModel) and await model.get_id() == model_id:
                        self._chat_model = model
                        return
                raise ValueError(f"Chat model {model_id} not found in provider {provider_name}")
            else:
                # Use the first available chat model
                models = await provider.list_available_models()
                chat_models = [m for m in models if isinstance(m, ChatModel)]
                if chat_models:
                    self._chat_model = chat_models[0]
                    return
                raise ValueError(f"No chat models available in provider {provider_name}")
        elif self._chat_model is None:
            raise ValueError("No provider specified and no chat model currently configured")

    async def set_embedding_model(self, provider_name: Optional[str] = None, model_id: Optional[str] = None) -> None:
        """Set the embedding model to use for get_embeddings operations."""
        if provider_name and provider_name in self._providers:
            provider = self._providers[provider_name]
            if model_id:
                # Find the specific model
                models = await provider.list_available_models()
                for model in models:
                    if isinstance(model, EmbeddingModel) and await model.get_id() == model_id:
                        self._embedding_model = model
                        return
                raise ValueError(f"Embedding model {model_id} not found in provider {provider_name}")
            else:
                # Use the first available embedding model
                models = await provider.list_available_models()
                embedding_models = [m for m in models if isinstance(m, EmbeddingModel)]
                if embedding_models:
                    self._embedding_model = embedding_models[0]
                    return
                raise ValueError(f"No embedding models available in provider {provider_name}")
        elif self._embedding_model is None:
            raise ValueError("No provider specified and no embedding model currently configured")

    async def set_rerank_model(self, provider_name: Optional[str] = None, model_id: Optional[str] = None) -> None:
        """Set the rerank model to use for rerank operations."""
        if provider_name and provider_name in self._providers:
            provider = self._providers[provider_name]
            if model_id:
                # Find the specific model
                models = await provider.list_available_models()
                for model in models:
                    if isinstance(model, RerankModel) and await model.get_id() == model_id:
                        self._rerank_model = model
                        return
                raise ValueError(f"Rerank model {model_id} not found in provider {provider_name}")
            else:
                # Use the first available rerank model
                models = await provider.list_available_models()
                rerank_models = [m for m in models if isinstance(m, RerankModel)]
                if rerank_models:
                    self._rerank_model = rerank_models[0]
                    return
                raise ValueError(f"No rerank models available in provider {provider_name}")
        elif self._rerank_model is None:
            raise ValueError("No provider specified and no rerank model currently configured")

    def inused_models(self) -> ConfiguredModels:
        """Get currently in-use models."""
        # Create dummy instances if models are not set
        chat_model = self._chat_model
        embedding_model = self._embedding_model
        rerank_model = self._rerank_model
        
        return ConfiguredModels(
            chat_model=chat_model,
            embedding_model=embedding_model,
            rerank_model=rerank_model
        )

    def list_configured_models(self) -> Dict[str, List[Model]]:
        """
        List all configured models grouped by provider.
        Each provider maps to a list of its models.
        models include chat, embedding, and rerank models.
        """
        # This method returns the currently configured providers, not their available models
        # For a complete list, use list_available_models()
        result: Dict[str, List[Model]] = {}
        for provider_name in self._providers.keys():
            # We can't call async method here, so we return empty lists
            # The actual models should be fetched via list_available_models()
            result[provider_name] = []
        return result

    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider."""
        if provider not in self._providers:
            raise ValueError(f"Provider {provider} not registered")
        
        return await self._providers[provider].validate_credentials(provider, credentials)

    async def list_available_models(self) -> List[Model]:
        """Get list of available models for all providers."""
        all_models: List[Model] = []
        for provider in self._providers.values():
            models = await provider.list_available_models()
            all_models.extend(models)
        return all_models
