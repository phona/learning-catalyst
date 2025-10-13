"""
AI provider registry for Learning Catalyst.

Registry for managing AI providers with support for built-in and custom providers.
"""

from typing import Dict, List, Optional, Type, Any

from ..core.models import ProviderConfig, ModelList
from ..core.exceptions import (
    ProviderError, AuthenticationError, ModelError,
    ProviderConnectionError, ValidationError, ProviderRegistrationError,
    ProviderSwitchError
)
from .types import ProviderType
from .providers.openai_compatible import OpenAICompatibleProvider
from .providers.base import AIProvider


class ProviderRegistry:
    """Registry for managing AI providers."""

    def __init__(self):
        """Initialize the provider registry."""
        self._providers: Dict[str, AIProvider] = {}
        self._provider_classes: Dict[str, Type[AIProvider]] = {}

    async def register_provider(
        self,
        provider_class: Type[AIProvider],
        config: ProviderConfig
    ) -> bool:
        """
        Register a new provider instance.

        Args:
            provider_class: Provider class to register
            config: Provider configuration

        Returns:
            bool: True if registration successful

        Raises:
            ProviderRegistrationError: If registration fails
        """
        try:
            provider = provider_class(config)

            # Test the provider by listing models
            await provider.list_available_models()

            self._providers[config.name] = provider
            self._provider_classes[config.name] = provider_class

            return True

        except Exception as e:
            raise ProviderRegistrationError(config.name, str(e))

    async def register_custom_provider(self, config: ProviderConfig) -> bool:
        """
        Register a custom OpenAI-compatible provider.

        Args:
            config: Custom provider configuration

        Returns:
            bool: True if registration successful

        Raises:
            ProviderRegistrationError: If registration fails
        """
        try:
            provider = OpenAICompatibleProvider(config)

            # Test the provider by listing models
            await provider.list_available_models()

            self._providers[config.name] = provider
            self._provider_classes[config.name] = type(provider)

            return True

        except Exception as e:
            raise ProviderRegistrationError(config.name, str(e))

    async def register_custom_provider_from_url(
        self,
        name: str,
        base_url: str,
        api_key: Optional[str] = None,
        **kwargs
    ) -> bool:
        """
        Register a custom provider from URL.

        Args:
            name: Provider name
            base_url: Provider base URL
            api_key: Optional API key
            **kwargs: Additional configuration options

        Returns:
            bool: True if registration successful

        Raises:
            ProviderRegistrationError: If registration fails
        """
        try:
            config = ProviderConfig(
                name=name,
                base_url=base_url,
                api_key=api_key,
                **kwargs
            )
            return await self.register_custom_provider(config)

        except Exception as e:
            raise ProviderRegistrationError(name, str(e))

    async def unregister_provider(self, provider_name: str) -> bool:
        """
        Unregister a provider.

        Args:
            provider_name: Name of provider to unregister

        Returns:
            bool: True if unregistration successful
        """
        if provider_name in self._providers:
            del self._providers[provider_name]
        if provider_name in self._provider_classes:
            del self._provider_classes[provider_name]
        return provider_name in self._providers

    async def get_provider(self, provider_name: str) -> Optional[AIProvider]:
        """
        Get registered provider by name.

        Args:
            provider_name: Name of provider

        Returns:
            AIProvider instance or None if not found
        """
        return self._providers.get(provider_name)

    async def list_providers(self) -> List[str]:
        """
        List all registered provider names.

        Returns:
            List of provider names
        """
        return list(self._providers.keys())

    async def get_provider_metrics(self, provider_name: str) -> Dict[str, Any]:
        """
        Get usage metrics for a provider.

        Args:
            provider_name: Name of provider

        Returns:
            Dictionary with metrics (requests, errors, latency, etc.)
        """
        # Basic implementation - could be extended
        provider = await self.get_provider(provider_name)
        if not provider:
            raise ProviderError(f"Provider '{provider_name}' not found")

        return {
            "name": provider.name,
            "status": "active",  # Could be more sophisticated
            "models_count": len(await provider.list_available_models()),
            "config": {
                "timeout": provider.config.timeout,
                "max_retries": provider.config.max_retries,
                "rate_limit": provider.config.rate_limit
            }
        }

    async def switch_provider(
        self,
        from_provider: str,
        to_provider: str
    ) -> bool:
        """
        Switch from one provider to another.

        Args:
            from_provider: Current provider name
            to_provider: Target provider name

        Returns:
            bool: True if switch successful

        Raises:
            ProviderError: If switch fails
        """
        # Check if target provider exists and is accessible
        target_provider = await self.get_provider(to_provider)
        if not target_provider:
            raise ProviderError(f"Target provider '{to_provider}' not found")

        try:
            # Test target provider
            await target_provider.list_available_models()
            return True
        except Exception as e:
            raise ProviderSwitchError(from_provider, to_provider, str(e))

    async def get_provider_models(self, provider_name: str) -> ModelList:
        """
        Get available models for a specific provider.

        Args:
            provider_name: Name of provider

        Returns:
            ModelList with available models

        Raises:
            ProviderError: If provider not found
        """
        provider = await self.get_provider(provider_name)
        if not provider:
            raise ProviderError(f"Provider '{provider_name}' not found")

        return await provider.list_available_models()

    async def test_provider(self, provider_name: str) -> bool:
        """
        Test if a provider is working.

        Args:
            provider_name: Name of provider to test

        Returns:
            bool: True if provider is working
        """
        try:
            provider = await self.get_provider(provider_name)
            if provider:
                await provider.list_available_models()
                return True
            return False
        except Exception:
            return False