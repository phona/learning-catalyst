"""
Model factory for Learning Catalyst AI providers.

Creates model instances dynamically based on provider and model type.
"""

from typing import Dict, Type, List, Optional, Any
from ..core.models import ProviderConfig, ModelList, ModelType
from .models import AIModel, ChatModel, EmbeddingModel, RerankModel
from ..core.exceptions import ModelError, ValidationError
from .providers import OpenAIProvider, DeepSeekProvider, SiliconFlowProvider, ChatGLMProvider
from .providers.openai_compatible import OpenAICompatibleProvider, CustomProviderFactory
from .types import ProviderType


class ModelFactory:
    """Factory for creating AI model instances."""

    # Registry of available providers
    _providers: Dict[str, Type] = {
        "openai": OpenAIProvider,
        "deepseek": DeepSeekProvider,
        "siliconflow": SiliconFlowProvider,
        "chatglm": ChatGLMProvider,
    }

    @classmethod
    def register_provider(cls, name: str, provider_class: Type) -> None:
        """Register a new provider class."""
        cls._providers[name.lower()] = provider_class

    @classmethod
    def register_custom_provider(cls, config: ProviderConfig) -> OpenAICompatibleProvider:
        """Register a custom OpenAI-compatible provider."""
        provider = CustomProviderFactory.create_openai_compatible_provider(config)
        cls._providers[config.name.lower()] = type(provider)
        return provider

    @classmethod
    def create_custom_provider(cls, name: str, base_url: str, api_key: Optional[str] = None, **kwargs) -> OpenAICompatibleProvider:
        """Create and register a custom provider from URL."""
        provider = CustomProviderFactory.create_from_url(name, base_url, api_key, **kwargs)
        cls._providers[name.lower()] = type(provider)
        return provider

    @classmethod
    def get_provider_instance(cls, config: ProviderConfig):
        """Get a provider instance from configuration."""
        provider_name = config.name.lower()

        if provider_name not in cls._providers:
            raise ModelError(f"Provider '{config.name}' not registered")

        provider_class = cls._providers[provider_name]
        return provider_class(config)

    @classmethod
    async def create_model(
        cls,
        provider_name: str,
        model_id: str,
        model_type: ModelType,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        **kwargs
    ) -> AIModel:
        """Create a model instance dynamically."""

        # Create provider config
        config = ProviderConfig(
            name=provider_name,
            api_key=api_key,
            base_url=base_url,
            **kwargs
        )

        # Get provider instance
        provider = cls.get_provider_instance(config)

        # Get available models from provider
        models = await provider.list_available_models()

        # Find the requested model
        model_list = []
        if model_type == ModelType.CHAT:
            model_list = models.get("chat", [])
        elif model_type == ModelType.EMBEDDING:
            model_list = models.get("embedding", [])
        elif model_type == ModelType.RERANK:
            model_list = models.get("rerank", [])

        # Find model with matching ID
        target_model = None
        for model in model_list:
            if model.model_id == model_id:
                target_model = model
                break

        if not target_model:
            raise ModelError(f"Model '{model_id}' of type '{model_type.value}' not found in provider '{provider_name}'")

        return target_model

    @classmethod
    async def list_all_available_models(cls, configs: List[ProviderConfig]) -> Dict[str, ModelList]:
        """List all available models from multiple providers."""
        all_models = {}

        for config in configs:
            try:
                provider = cls.get_provider_instance(config)
                models = await provider.list_available_models()
                all_models[config.name] = models
            except Exception as e:
                # Skip providers that fail to initialize
                continue

        return all_models

    @classmethod
    def get_registered_providers(cls) -> List[str]:
        """Get list of registered provider names."""
        return list(cls._providers.keys())

    @classmethod
    def is_provider_registered(cls, provider_name: str) -> bool:
        """Check if a provider is registered."""
        return provider_name.lower() in cls._providers