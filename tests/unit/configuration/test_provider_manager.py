"""
TDD tests for Provider Manager.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Provider Manager before implementation. Tests cover provider registration, configuration,
model discovery, and switching functionality.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List
from tests.test_helpers import (
    create_mock_provider,
    assert_raises_specific_error
)


class TestProviderManager:
    """Test cases for Provider Manager following TDD principles."""

    @pytest.mark.unit
    def test_provider_manager_initialization(self):
        """Test that provider manager can be initialized (TDD: Red phase)."""
        # This test will initially fail until ProviderManager is implemented
        from src.core.configuration.provider_manager import ProviderManager

        provider_manager = ProviderManager()
        assert provider_manager.list_providers() == []
        assert provider_manager.get_enabled_providers() == []

    @pytest.mark.unit
    def test_provider_registration(self):
        """Test that providers can be registered."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Create provider config
        config = ProviderConfig(
            name="openai",
            api_key="sk-test-key",
            base_url="https://api.openai.com/v1",
            timeout=30,
            max_retries=3
        )

        # Register provider
        mock_provider = create_mock_provider("openai")
        result = provider_manager.register_provider("openai", mock_provider, config)

        assert result is True
        assert "openai" in provider_manager.list_providers()
        assert provider_manager.get_provider("openai") == mock_provider

    @pytest.mark.unit
    def test_provider_registration_validation(self):
        """Test that provider registration validates inputs."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Test duplicate registration
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(name="openai", api_key="sk-test")

        provider_manager.register_provider("openai", mock_provider, config)

        with pytest.raises(ValueError, match="Provider 'openai' is already registered"):
            provider_manager.register_provider("openai", mock_provider, config)

        # Test invalid provider name
        with pytest.raises(ValueError, match="Provider name cannot be empty"):
            provider_manager.register_provider("", mock_provider, config)

        with pytest.raises(ValueError, match="Provider name cannot be empty"):
            provider_manager.register_provider(None, mock_provider, config)

    @pytest.mark.unit
    def test_provider_unregistration(self):
        """Test that providers can be unregistered."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Unregister provider
        result = provider_manager.unregister_provider("openai")
        assert result is True
        assert "openai" not in provider_manager.list_providers()

        # Test unregistering non-existent provider
        with pytest.raises(ValueError, match="Provider 'nonexistent' is not registered"):
            provider_manager.unregister_provider("nonexistent")

    @pytest.mark.unit
    def test_provider_model_discovery(self):
        """Test that provider models can be discovered."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider with models
        mock_provider = create_mock_provider("openai", ["gpt-4o-mini", "gpt-3.5-turbo"])
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Get provider models
        models = provider_manager.get_provider_models("openai")
        assert "chat" in models
        assert len(models["chat"]) == 2
        assert models["chat"][0].model_id == "gpt-4o-mini"

        # Test getting models for non-existent provider
        with pytest.raises(ValueError, match="Provider 'nonexistent' is not registered"):
            provider_manager.get_provider_models("nonexistent")

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_provider_testing(self):
        """Test that provider connectivity can be tested."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider
        mock_provider = create_mock_provider("openai")
        mock_provider.test_connection = AsyncMock(return_value=True)
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Test provider connection
        result = await provider_manager.test_provider("openai")
        assert result is True

        # Test non-existent provider
        with pytest.raises(ValueError, match="Provider 'nonexistent' is not registered"):
            await provider_manager.test_provider("nonexistent")

    @pytest.mark.unit
    def test_active_provider_management(self):
        """Test that active provider can be managed."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register multiple providers
        providers = ["openai", "deepseek", "anthropic"]
        for provider_name in providers:
            mock_provider = create_mock_provider(provider_name)
            config = ProviderConfig(name=provider_name, api_key=f"sk-{provider_name}")
            provider_manager.register_provider(provider_name, mock_provider, config)

        # Set active provider
        result = provider_manager.set_active_provider("deepseek")
        assert result is True
        assert provider_manager.get_active_provider() == "deepseek"

        # Test setting non-existent provider as active
        with pytest.raises(ValueError, match="Provider 'nonexistent' is not registered"):
            provider_manager.set_active_provider("nonexistent")

    @pytest.mark.unit
    def test_provider_switching(self):
        """Test that providers can be switched."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register providers
        openai_provider = create_mock_provider("openai")
        deepseek_provider = create_mock_provider("deepseek")

        openai_config = ProviderConfig(name="openai", api_key="sk-openai")
        deepseek_config = ProviderConfig(name="deepseek", api_key="sk-deepseek")

        provider_manager.register_provider("openai", openai_provider, openai_config)
        provider_manager.register_provider("deepseek", deepseek_provider, deepseek_config)

        # Set initial active provider
        provider_manager.set_active_provider("openai")
        assert provider_manager.get_active_provider() == "openai"

        # Switch providers
        result = provider_manager.switch_provider("openai", "deepseek")
        assert result is True
        assert provider_manager.get_active_provider() == "deepseek"

        # Test switching to non-existent provider
        with pytest.raises(ValueError, match="Target provider 'nonexistent' is not registered"):
            provider_manager.switch_provider("openai", "nonexistent")

        with pytest.raises(ValueError, match="Source provider 'nonexistent' is not registered"):
            provider_manager.switch_provider("nonexistent", "deepseek")

    @pytest.mark.unit
    def test_provider_configuration_management(self):
        """Test that provider configuration can be managed."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(
            name="openai",
            api_key="sk-test",
            base_url="https://api.openai.com/v1",
            timeout=30,
            max_retries=3,
            rate_limit=60
        )
        provider_manager.register_provider("openai", mock_provider, config)

        # Get provider configuration
        retrieved_config = provider_manager.get_provider_config("openai")
        assert retrieved_config.name == "openai"
        assert retrieved_config.api_key == "sk-test"
        assert retrieved_config.timeout == 30

        # Update provider configuration
        updated_config = ProviderConfig(
            name="openai",
            api_key="sk-updated",
            base_url="https://api.openai.com/v1",
            timeout=45,
            max_retries=5,
            rate_limit=100
        )
        provider_manager.update_provider_config("openai", updated_config)

        retrieved_config = provider_manager.get_provider_config("openai")
        assert retrieved_config.api_key == "sk-updated"
        assert retrieved_config.timeout == 45
        assert retrieved_config.max_retries == 5

    @pytest.mark.unit
    def test_provider_status_tracking(self):
        """Test that provider status can be tracked."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Initial status should be unknown
        status = provider_manager.get_provider_status("openai")
        assert status["status"] == "unknown"
        assert "last_checked" in status

        # Update provider status
        provider_manager.update_provider_status("openai", {
            "status": "healthy",
            "last_checked": "2025-01-20T10:00:00Z",
            "response_time_ms": 150,
            "error_count": 0
        })

        status = provider_manager.get_provider_status("openai")
        assert status["status"] == "healthy"
        assert status["response_time_ms"] == 150
        assert status["error_count"] == 0

    @pytest.mark.unit
    def test_provider_metrics_collection(self):
        """Test that provider metrics can be collected."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Record metrics
        provider_manager.record_provider_metrics("openai", {
            "request_count": 1,
            "tokens_used": 150,
            "response_time_ms": 200,
            "success": True
        })

        provider_manager.record_provider_metrics("openai", {
            "request_count": 1,
            "tokens_used": 300,
            "response_time_ms": 150,
            "success": True
        })

        # Get metrics
        metrics = provider_manager.get_provider_metrics("openai")
        assert metrics["total_requests"] == 2
        assert metrics["total_tokens"] == 450
        assert metrics["average_response_time_ms"] == 175  # (200 + 150) / 2
        assert metrics["success_rate"] == 1.0

    @pytest.mark.unit
    def test_provider_model_selection(self):
        """Test that optimal models can be selected from providers."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register providers with different models
        openai_provider = create_mock_provider("openai", ["gpt-4o", "gpt-3.5-turbo"])
        deepseek_provider = create_mock_provider("deepseek", ["deepseek-chat", "deepseek-coder"])

        openai_config = ProviderConfig(name="openai", api_key="sk-openai")
        deepseek_config = ProviderConfig(name="deepseek", api_key="sk-deepseek")

        provider_manager.register_provider("openai", openai_provider, openai_config)
        provider_manager.register_provider("deepseek", deepseek_provider, deepseek_config)

        # Find models by capability
        chat_models = provider_manager.find_models_by_capability("chat")
        assert len(chat_models) >= 2
        assert any(model.provider == "openai" for model in chat_models)
        assert any(model.provider == "deepseek" for model in chat_models)

        # Find best model for specific use case
        best_model = provider_manager.find_best_model(
            capability="chat",
            criteria={"cost_effectiveness": True, "speed": True}
        )
        assert best_model is not None
        assert best_model.capability == "chat"

    @pytest.mark.unit
    def test_provider_health_monitoring(self):
        """Test that provider health can be monitored."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register providers
        providers = ["openai", "deepseek", "anthropic"]
        for provider_name in providers:
            mock_provider = create_mock_provider(provider_name)
            mock_provider.test_connection = AsyncMock(return_value=True)
            config = ProviderConfig(name=provider_name, api_key=f"sk-{provider_name}")
            provider_manager.register_provider(provider_name, mock_provider, config)

        # Set one provider as unhealthy
        provider_manager.update_provider_status("deepseek", {
            "status": "unhealthy",
            "error": "Connection timeout",
            "last_checked": "2025-01-20T10:00:00Z"
        })

        # Get health status
        health_status = provider_manager.get_all_providers_health()
        assert health_status["openai"]["status"] == "unknown"  # Not checked yet
        assert health_status["deepseek"]["status"] == "unhealthy"
        assert health_status["anthropic"]["status"] == "unknown"

        # Get healthy providers only
        healthy_providers = provider_manager.get_healthy_providers()
        assert "deepseek" not in healthy_providers

    @pytest.mark.unit
    def test_provider_configuration_validation(self):
        """Test that provider configuration is validated."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Test invalid configuration
        invalid_configs = [
            ProviderConfig(name="", api_key="sk-test"),  # Empty name
            ProviderConfig(name="openai", api_key=""),    # Empty API key
            ProviderConfig(name="openai", api_key="sk", timeout=-1),  # Negative timeout
            ProviderConfig(name="openai", api_key="sk", max_retries=-1),  # Negative retries
        ]

        for invalid_config in invalid_configs:
            mock_provider = create_mock_provider("openai")
            with pytest.raises(ValueError):
                provider_manager.register_provider("openai", mock_provider, invalid_config)

        # Test valid configuration
        valid_config = ProviderConfig(
            name="openai",
            api_key="sk-test-key",
            base_url="https://api.openai.com/v1",
            timeout=30,
            max_retries=3,
            rate_limit=60
        )

        mock_provider = create_mock_provider("openai")
        result = provider_manager.register_provider("openai", mock_provider, valid_config)
        assert result is True

    @pytest.mark.unit
    def test_provider_fallback_mechanism(self):
        """Test that provider fallback mechanism works."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register multiple providers
        providers = ["openai", "deepseek", "anthropic"]
        for provider_name in providers:
            mock_provider = create_mock_provider(provider_name)
            config = ProviderConfig(name=provider_name, api_key=f"sk-{provider_name}")
            provider_manager.register_provider(provider_name, mock_provider, config)

        # Set provider priority
        provider_manager.set_provider_priority(["openai", "deepseek", "anthropic"])

        # Simulate provider failure
        provider_manager.update_provider_status("openai", {
            "status": "unhealthy",
            "error": "Connection failed",
            "last_checked": "2025-01-20T10:00:00Z"
        })

        # Get fallback provider
        fallback = provider_manager.get_fallback_provider()
        assert fallback == "deepseek"

        # Set all providers as unhealthy
        for provider_name in providers:
            provider_manager.update_provider_status(provider_name, {
                "status": "unhealthy",
                "error": "Connection failed",
                "last_checked": "2025-01-20T10:00:00Z"
            })

        # No fallback available
        fallback = provider_manager.get_fallback_provider()
        assert fallback is None

    @pytest.mark.unit
    def test_provider_performance_optimization(self):
        """Test that provider performance can be optimized."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        provider_manager = ProviderManager()

        # Register provider
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Record performance metrics
        for i in range(10):
            provider_manager.record_provider_metrics("openai", {
                "request_count": 1,
                "tokens_used": 100 + i * 10,
                "response_time_ms": 200 - i * 5,  # Improving performance
                "success": True
            })

        # Get optimization recommendations
        recommendations = provider_manager.get_performance_optimization_recommendations("openai")
        assert "current_performance" in recommendations
        assert "optimization_suggestions" in recommendations

        # Apply optimization
        provider_manager.apply_performance_optimization("openai")
        optimized_config = provider_manager.get_provider_config("openai")
        assert optimized_config.optimized is True

    @pytest.mark.unit
    def test_provider_configuration_persistence(self, config_dir):
        """Test that provider configuration can be persisted."""
        from src.core.configuration.provider_manager import ProviderManager
        from src.core.configuration.provider_config import ProviderConfig

        config_file = config_dir / "providers.json"
        provider_manager = ProviderManager(config_file=config_file)

        # Register provider
        mock_provider = create_mock_provider("openai")
        config = ProviderConfig(name="openai", api_key="sk-test")
        provider_manager.register_provider("openai", mock_provider, config)

        # Save configuration
        provider_manager.save_configuration()
        assert config_file.exists()

        # Load configuration
        new_manager = ProviderManager(config_file=config_file)
        new_manager.load_configuration()

        assert "openai" in new_manager.list_providers()
        loaded_config = new_manager.get_provider_config("openai")
        assert loaded_config.name == "openai"