"""
Model Abstraction Service implementation
Provides a unified interface for interacting with different AI providers
"""

# Import providers dynamically to avoid import issues
import importlib
from datetime import datetime
from typing import Any, Dict, List, Optional

from src.ai.abstraction import ConfiguredModels, Model, ModelAbstractionLayer, ModelProvider
from src.data.models.extended_models import AIResponse, Credentials, EmbeddingResponse, Message, RerankResponse


class BaseModelProvider(ModelProvider):
    """Base implementation for model providers"""

    def __init__(self, name: str):
        self._name = name
        self._models: Dict[str, Any] = {}

    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider"""
        # Base implementation always returns True
        # Concrete providers should override this
        return True

    async def list_available_models(self) -> Dict[str, List["Model"]]:
        """Get list of available models for a provider, grouped by type"""
        # Base implementation returns empty dict
        # Concrete providers should override this
        return {"chat": [], "embedding": [], "rerank": []}

    def register_model(self, model_id: str, model: "Model") -> None:
        """Register a model with this provider"""
        self._models[model_id] = model

    def get_model(self, model_id: str) -> Optional["Model"]:
        """Get a model by ID"""
        return self._models.get(model_id)


class ModelAbstractionService(ModelAbstractionLayer):
    """Service implementation for the Model Abstraction Layer"""

    # Class method that returns ModelProvider classes
    @classmethod
    def get_provider_classes(cls) -> Dict[str, type]:
        """Get all available provider classes using their name properties"""

        provider_modules = [
            ("src.ai.providers.deepseek_provider", "DeepSeekProvider"),
            ("src.ai.providers.siliconflow_provider", "SiliconFlowProvider"),
            ("src.ai.providers.openai_compatible_provider", "OpenAICompatibleModelProvider"),
            ("src.ai.providers.chatglm_provider", "ChatGLMProvider"),
        ]

        result: Dict[str, type] = {}
        for module_name, class_name in provider_modules:
            try:
                module = importlib.import_module(module_name)
                provider_class = getattr(module, class_name)
                provider_name = getattr(provider_class, "name", class_name)
                result[provider_name] = provider_class
            except (ImportError, AttributeError):
                # Skip providers that can't be imported
                continue

        return result

    @classmethod
    def get_provider_class_descriptions(cls) -> Dict[str, str]:
        """Get descriptions for all available provider classes"""
        provider_classes = cls.get_provider_classes()
        descriptions: Dict[str, str] = {}
        for provider_name, provider_class in provider_classes.items():
            descriptions[provider_name] = getattr(provider_class, "description", "No description available")
        return descriptions

    @staticmethod
    def get_provider_class(provider_name: str) -> type:
        """Get a specific provider class by name"""
        provider_classes = ModelAbstractionService.get_provider_classes()
        if provider_name not in provider_classes:
            raise ValueError(f"Unknown provider: {provider_name}")
        return provider_classes[provider_name]

    def __init__(self):
        self._providers: Dict[str, ModelProvider] = {}
        self._configured_models: ConfiguredModels = ConfiguredModels(chat_model=None, embedding_model=None, rerank_model=None)

    @property
    def providers(self) -> Dict[str, ModelProvider]:
        """Get all registered provider instances"""
        return self._providers

    def register_provider(self, provider: ModelProvider) -> None:
        """Register a model provider"""
        self._providers[provider.__class__.name] = provider

    def get_provider(self, name: str) -> Optional[ModelProvider]:
        """Get a provider by name"""
        return self._providers.get(name)

    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return list(self._providers.keys())

    def get_provider_descriptions(self) -> Dict[str, str]:
        """Get descriptions for all available providers"""
        descriptions: Dict[str, str] = {}
        for provider_name, provider in self._providers.items():
            descriptions[provider_name] = getattr(provider.__class__, "description", "No description available")
        return descriptions

    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to LLM provider and get response"""
        if not self._configured_models.chat_model:
            # No chat model configured - user must set one explicitly

            return AIResponse(
                content=(
                    "Error: No chat model configured. Please set a chat model using " "set_chat_model(provider_name, model_id)"
                ),
                model="unknown",
                provider="unknown",
                usage={},
                timestamp=datetime.now().isoformat(),
            )

        if not self._configured_models.chat_model:
            return AIResponse(
                content="Error: No chat model configured",
                model="unknown",
                provider="unknown",
                usage={},
                timestamp=datetime.now().isoformat(),
            )

        return await self._configured_models.chat_model.send_message(messages, temperature)

    async def get_embeddings(self, texts: List[str], dimensions: Optional[int] = None) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model"""
        if not self._configured_models.embedding_model:
            # No embedding model configured - user must set one explicitly
            return EmbeddingResponse(
                embeddings=[],
                model="unknown",
                provider="unknown",
                usage={},
                error=(
                    "No embedding model configured. Please set an embedding model using "
                    "set_embedding_model(provider_name, model_id)"
                ),
            )

        if not self._configured_models.embedding_model:
            return EmbeddingResponse(
                embeddings=[], model="unknown", provider="unknown", usage={}, error="No embedding model configured"
            )

        return await self._configured_models.embedding_model.get_embeddings(texts, dimensions)

    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> RerankResponse:
        """Rerank documents based on query relevance"""
        if not self._configured_models.rerank_model:
            # No rerank model configured - user must set one explicitly
            return RerankResponse(
                results=[],
                model="unknown",
                provider="unknown",
                usage={},
                error=(
                    "No rerank model configured. Please set a rerank model using " "set_rerank_model(provider_name, model_id)"
                ),
            )

        if not self._configured_models.rerank_model:
            return RerankResponse(results=[], model="unknown", provider="unknown", usage={}, error="No rerank model configured")

        return await self._configured_models.rerank_model.rerank(query, documents, top_k)

    async def set_chat_model(self, provider_name: str, model_id: str) -> None:
        """Set the chat model to use"""
        if not provider_name:
            raise ValueError("Provider name is required")

        if not model_id:
            raise ValueError("Model ID is required")

        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {provider_name}")

        # Create model instance dynamically since users choose their own models
        if hasattr(provider, "_create_model_instance"):
            model = provider.create_model_instance(model_id)
            if model:
                self._configured_models = ConfiguredModels(
                    chat_model=model,  # type: ignore - we know this is a ChatModel
                    embedding_model=self._configured_models.embedding_model,
                    rerank_model=self._configured_models.rerank_model,
                )
                return

        raise ValueError(f"Unable to create model: {model_id} for provider: {provider_name}")

    async def set_embedding_model(self, provider_name: str, model_id: str) -> None:
        """Set the embedding model to use"""
        if not provider_name:
            raise ValueError("Provider name is required")

        if not model_id:
            raise ValueError("Model ID is required")

        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {provider_name}")

        # Create model instance dynamically since users choose their own models
        if hasattr(provider, "_create_model_instance"):
            model = provider.create_model_instance(model_id)
            if model:
                self._configured_models = ConfiguredModels(
                    chat_model=self._configured_models.chat_model,
                    embedding_model=model,  # type: ignore - we know this is an EmbeddingModel
                    rerank_model=self._configured_models.rerank_model,
                )
                return

        raise ValueError(f"Unable to create model: {model_id} for provider: {provider_name}")

    async def set_rerank_model(self, provider_name: str, model_id: str) -> None:
        """Set the rerank model to use"""
        if not provider_name:
            raise ValueError("Provider name is required")

        if not model_id:
            raise ValueError("Model ID is required")

        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {provider_name}")

        # Create model instance dynamically since users choose their own models
        if hasattr(provider, "_create_model_instance"):
            model = provider.create_model_instance(model_id)
            if model:
                self._configured_models = ConfiguredModels(
                    chat_model=self._configured_models.chat_model,
                    embedding_model=self._configured_models.embedding_model,
                    rerank_model=model,  # type: ignore - we know this is a RerankModel
                )
                return

        raise ValueError(f"Unable to create model: {model_id} for provider: {provider_name}")

    def inused_models(self) -> ConfiguredModels:
        """Get currently in-use models"""
        return self._configured_models

    def list_configured_models(self) -> Dict[str, List["Model"]]:
        """
        List all configured models grouped by provider.
        Each provider maps to a list of its models.
        models include chat, embedding, and rerank models.
        """
        result: Dict[str, List[Model]] = {}

        # Since we can't use await in a non-async method, we'll use a simplified approach
        # that only checks if models are configured, not their providers
        for provider_name in self._providers:
            # Get all models for this provider
            models: List[Model] = []

            # Add chat models
            chat_model = self._configured_models.chat_model
            if chat_model:
                models.append(chat_model)

            # Add embedding models
            embedding_model = self._configured_models.embedding_model
            if embedding_model:
                models.append(embedding_model)

            # Add rerank models
            rerank_model = self._configured_models.rerank_model
            if rerank_model:
                models.append(rerank_model)

            if models:
                result[provider_name] = models

        return result

    async def validate_api_key(self, provider_name: str, api_key: str) -> bool:
        """Validate an API key for a provider"""
        provider = self.get_provider(provider_name)
        if not provider:
            return False

        credentials = Credentials(provider=provider_name, api_key=api_key)
        return await provider.validate_credentials(provider_name, credentials)

    def update_provider_api_key(self, provider_name: str, api_key: str) -> bool:
        """Update the API key for an existing provider"""
        provider = self.get_provider(provider_name)
        if not provider:
            return False

        # Update the API key for the provider
        if hasattr(provider, "_api_key"):
            setattr(provider, "_api_key", api_key)  # type: ignore
            return True
        return False
