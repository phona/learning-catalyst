"""
Integration tests for AI Provider Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of AI provider integration based on real-world usage patterns from docs/examples/integration.md.
Tests cover provider setup, switching, multi-provider management, and error handling.
"""

import pytest
import asyncio
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from tests.test_helpers import (
    assert_valid_config_structure,
    measure_async_performance,
    assert_async_performance_under,
    create_mock_provider
)


class TestProviderIntegration:
    """Integration tests for AI provider functionality."""

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_openai_provider_initialization(self):
        """Test OpenAI provider initialization from examples/integration.md."""
        from src.ai.service import AIService

        # Mock environment with OpenAI API key
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-openai-key'}):
            service = AIService()

            # Initialize OpenAI provider
            result = await service.initialize_provider('openai')

            assert result['success'] is True
            assert 'openai' in service.get_active_providers()
            assert service.get_default_provider() == 'openai'

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_deepseek_provider_configuration(self):
        """Test DeepSeek provider configuration as shown in integration examples."""
        from src.ai.service import AIService

        service = AIService()

        # Configure DeepSeek provider
        config = {
            'api_key': 'test-deepseek-key',
            'base_url': 'https://api.deepseek.com/v1',
            'models': ['deepseek-chat', 'deepseek-coder']
        }

        result = await service.configure_provider('deepseek', config)

        assert result['success'] is True
        assert 'deepseek' in service.get_configured_providers()

        # Verify provider can list models
        models = await service.list_provider_models('deepseek')
        assert 'deepseek-chat' in models['chat']
        assert 'deepseek-coder' in models['chat']

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_multi_provider_switching(self):
        """Test switching between multiple providers."""
        from src.ai.service import AIService

        service = AIService()

        # Set up multiple providers
        providers = ['openai', 'deepseek', 'anthropic']
        for provider in providers:
            await service.configure_provider(provider, {'api_key': f'test-{provider}-key'})

        # Test switching providers
        for provider in providers:
            result = await service.switch_provider(provider)
            assert result['success'] is True
            assert service.get_current_provider() == provider

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_health_monitoring(self):
        """Test provider health monitoring and failover."""
        from src.ai.service import AIService

        service = AIService()

        # Set up primary and backup providers
        await service.configure_provider('openai', {'api_key': 'test-openai-key'})
        await service.configure_provider('deepseek', {'api_key': 'test-deepseek-key'})

        # Mock health check failure for primary provider
        with patch.object(service, '_check_provider_health') as mock_health:
            mock_health.side_effect = lambda p: {'healthy': p != 'openai'}

            # Test automatic failover
            health_status = await service.check_all_providers_health()
            assert not health_status['openai']['healthy']
            assert health_status['deepseek']['healthy']

            # Test switching to healthy provider
            result = await service.switch_to_healthy_provider()
            assert result['success'] is True
            assert service.get_current_provider() == 'deepseek'

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_model_management(self):
        """Test model discovery and management across providers."""
        from src.ai.service import AIService

        service = AIService()

        # Configure multiple providers with different models
        provider_configs = {
            'openai': {
                'api_key': 'test-openai-key',
                'models': ['gpt-4o-mini', 'gpt-3.5-turbo']
            },
            'deepseek': {
                'api_key': 'test-deepseek-key',
                'models': ['deepseek-chat', 'deepseek-coder']
            }
        }

        for provider, config in provider_configs.items():
            await service.configure_provider(provider, config)

        # Test model listing
        all_models = await service.list_all_models()
        assert 'openai' in all_models
        assert 'deepseek' in all_models
        assert len(all_models['openai']['chat']) >= 2
        assert len(all_models['deepseek']['chat']) >= 2

        # Test model compatibility checking
        compatible = await service.check_model_compatibility('gpt-4o-mini', ['openai'])
        assert compatible['compatible']
        assert 'openai' in compatible['available_providers']

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_error_recovery(self):
        """Test provider error recovery and retry logic."""
        from src.ai.service import AIService

        service = AIService()
        await service.configure_provider('openai', {'api_key': 'test-openai-key'})

        # Mock API failure with retry success
        call_count = 0
        async def mock_api_call(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("API temporarily unavailable")
            return {"response": "Success after retry"}

        with patch.object(service, '_make_api_call', side_effect=mock_api_call):
            result = await service.generate_response("test message")

            assert result['success'] is True
            assert call_count == 3  # Should have retried 2 times

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_load_balancing(self):
        """Test load balancing across multiple providers."""
        from src.ai.service import AIService

        service = AIService()

        # Configure multiple providers
        providers = ['openai', 'deepseek', 'anthropic']
        for provider in providers:
            await service.configure_provider(provider, {
                'api_key': f'test-{provider}-key',
                'weight': 1.0 / len(providers)  # Equal weight
            })

        # Enable load balancing
        service.enable_load_balancing(True)

        # Test multiple requests are distributed
        provider_usage = {}
        for _ in range(10):
            result = await service.generate_response("test message")
            provider = result['provider_used']
            provider_usage[provider] = provider_usage.get(provider, 0) + 1

        # Should distribute requests across providers
        assert len(provider_usage) > 1
        for provider in providers:
            assert provider in provider_usage

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_configuration_persistence(self):
        """Test that provider configurations persist across sessions."""
        from src.ai.service import AIService
        from src.data.configuration_manager import ConfigurationManager

        # Initialize service and configure provider
        service1 = AIService()
        await service1.configure_provider('openai', {
            'api_key': 'test-openai-key',
            'model': 'gpt-4o-mini',
            'temperature': 0.7
        })

        # Save configuration
        config_manager = ConfigurationManager()
        await config_manager.save_provider_configs(service1.get_provider_configs())

        # Create new service instance and load configuration
        service2 = AIService()
        loaded_configs = await config_manager.load_provider_configs()
        await service2.load_provider_configs(loaded_configs)

        # Verify configuration persistence
        openai_config = service2.get_provider_config('openai')
        assert openai_config['model'] == 'gpt-4o-mini'
        assert openai_config['temperature'] == 0.7

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_rate_limiting(self):
        """Test provider rate limiting and quota management."""
        from src.ai.service import AIService

        service = AIService()
        await service.configure_provider('openai', {
            'api_key': 'test-openai-key',
            'rate_limit': {
                'requests_per_minute': 10,
                'tokens_per_minute': 10000
            }
        })

        # Test rate limiting enforcement
        responses = []
        for i in range(15):  # Exceed rate limit
            result = await service.generate_response(f"test message {i}")
            responses.append(result)

            # Some requests should be rate limited
            if i > 10:
                if not result['success']:
                    assert 'rate_limit' in result['error']['code'].lower()

        # Verify rate limiting worked
        successful_requests = sum(1 for r in responses if r['success'])
        rate_limited_requests = sum(1 for r in responses if not r['success'])

        assert successful_requests <= 10  # Should not exceed rate limit
        assert rate_limited_requests >= 5   # Some should be rate limited

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_cost_tracking(self):
        """Test cost tracking across providers."""
        from src.ai.service import AIService
        from src.data.token_usage_tracker import TokenUsageTracker

        service = AIService()
        token_tracker = TokenUsageTracker()

        # Configure providers with different pricing
        provider_configs = {
            'openai': {
                'api_key': 'test-openai-key',
                'pricing': {'input_tokens': 0.0005, 'output_tokens': 0.0015}
            },
            'deepseek': {
                'api_key': 'test-deepseek-key',
                'pricing': {'input_tokens': 0.0001, 'output_tokens': 0.0002}
            }
        }

        for provider, config in provider_configs.items():
            await service.configure_provider(provider, config)

        # Generate responses and track costs
        for provider in provider_configs.keys():
            await service.switch_provider(provider)
            result = await service.generate_response("test message", max_tokens=100)

            if result['success']:
                await token_tracker.record_usage({
                    'provider': provider,
                    'model': result['model'],
                    'input_tokens': result['usage']['input_tokens'],
                    'output_tokens': result['usage']['output_tokens'],
                    'cost': result['usage']['cost']
                })

        # Verify cost tracking
        cost_report = await token_tracker.get_cost_report()
        assert len(cost_report['by_provider']) == 2
        assert 'total_cost' in cost_report
        assert cost_report['total_cost'] > 0

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_concurrent_requests(self):
        """Test handling concurrent requests to multiple providers."""
        from src.ai.service import AIService

        service = AIService()

        # Configure multiple providers
        providers = ['openai', 'deepseek']
        for provider in providers:
            await service.configure_provider(provider, {'api_key': f'test-{provider}-key'})

        # Test concurrent requests
        async def make_request(provider, message):
            await service.switch_provider(provider)
            return await service.generate_response(message)

        # Launch concurrent requests
        tasks = []
        for i, provider in enumerate(providers):
            for j in range(3):
                task = make_request(provider, f"test message {i}-{j}")
                tasks.append(task)

        # Wait for all requests to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Verify all requests completed
        successful_results = [r for r in results if isinstance(r, dict) and r.get('success')]
        assert len(successful_results) == len(tasks)  # All should succeed

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_fallback_mechanism(self):
        """Test automatic fallback to backup providers."""
        from src.ai.service import AIService

        service = AIService()

        # Configure primary and backup providers
        await service.configure_provider('openai', {'api_key': 'test-openai-key'})
        await service.configure_provider('deepseek', {'api_key': 'test-deepseek-key'})

        # Configure fallback order
        service.set_fallback_order(['openai', 'deepseek'])

        # Mock primary provider failure
        with patch.object(service, '_call_provider_api') as mock_api:
            def side_effect(provider, *args, **kwargs):
                if provider == 'openai':
                    raise Exception("OpenAI API unavailable")
                return {"response": "Response from backup provider"}

            mock_api.side_effect = side_effect

            # Test automatic fallback
            result = await service.generate_response_with_fallback("test message")

            assert result['success'] is True
            assert result['provider_used'] == 'deepseek'
            assert 'fallback' in result['metadata']

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_model_switching(self):
        """Test switching models within the same provider."""
        from src.ai.service import AIService

        service = AIService()
        await service.configure_provider('openai', {
            'api_key': 'test-openai-key',
            'models': ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4']
        })

        # Test model switching
        models = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4']
        for model in models:
            result = await service.switch_model(model)
            assert result['success'] is True
            assert service.get_current_model() == model

            # Test generation with new model
            response = await service.generate_response("test message")
            assert response['success'] is True
            assert response['model'] == model

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_performance_monitoring(self):
        """Test performance monitoring for providers."""
        from src.ai.service import AIService

        service = AIService()
        await service.configure_provider('openai', {'api_key': 'test-openai-key'})

        # Generate multiple requests to collect performance data
        for _ in range(5):
            await service.generate_response("test message")

        # Get performance metrics
        metrics = await service.get_performance_metrics()

        assert 'average_response_time' in metrics
        assert 'success_rate' in metrics
        assert 'total_requests' in metrics
        assert metrics['total_requests'] == 5
        assert metrics['success_rate'] == 1.0  # All should succeed
        assert metrics['average_response_time'] > 0

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_authentication_flow(self):
        """Test complete authentication flow for providers."""
        from src.ai.service import AIService

        service = AIService()

        # Test authentication with valid API key
        auth_result = await service.authenticate_provider('openai', 'valid-api-key')
        assert auth_result['success'] is True
        assert 'authenticated_at' in auth_result['metadata']

        # Test authentication with invalid API key
        auth_result = await service.authenticate_provider('openai', 'invalid-api-key')
        assert auth_result['success'] is False
        assert 'authentication_failed' in auth_result['error']['code']

        # Test token refresh (for providers that use it)
        refresh_result = await service.refresh_provider_token('openai')
        if refresh_result['success']:
            assert 'token_refreshed_at' in refresh_result['metadata']

    @pytest.mark.integration
    @pytest.mark.provider
    async def test_provider_capability_detection(self):
        """Test automatic detection of provider capabilities."""
        from src.ai.service import AIService

        service = AIService()

        # Configure different providers with varying capabilities
        provider_capabilities = {
            'openai': {
                'api_key': 'test-openai-key',
                'supports_streaming': True,
                'supports_functions': True,
                'max_tokens': 4096,
                'supports_vision': True
            },
            'deepseek': {
                'api_key': 'test-deepseek-key',
                'supports_streaming': False,
                'supports_functions': False,
                'max_tokens': 8192,
                'supports_vision': False
            }
        }

        for provider, config in provider_capabilities.items():
            await service.configure_provider(provider, config)

        # Test capability detection
        capabilities = await service.detect_all_provider_capabilities()

        assert 'openai' in capabilities
        assert 'deepseek' in capabilities
        assert capabilities['openai']['supports_streaming'] is True
        assert capabilities['openai']['supports_functions'] is True
        assert capabilities['deepseek']['supports_streaming'] is False
        assert capabilities['deepseek']['supports_functions'] is False

        # Test capability-based provider selection
        streaming_capable = await service.get_providers_with_capability('streaming')
        assert 'openai' in streaming_capable
        assert 'deepseek' not in streaming_capable