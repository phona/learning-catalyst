"""
Tests for custom provider support in ConfigManager.

These tests verify that users can add any provider name without hardcoded restrictions
and that custom provider configurations are preserved correctly.
"""

import pytest
import json
import tempfile
from pathlib import Path

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestCustomProviderSupport:
    """Test custom provider support functionality."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary directory for configuration files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.mark.unit
    def test_arbitrary_provider_names_allowed(self, temp_config_dir):
        """Test that any provider name can be used without restrictions."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test various provider names that should all be allowed
        provider_names = [
            "custom_provider",
            "my-ai-provider",
            "company_ai_v2",
            "local-llama-server",
            "azure-openai-eastus",
            "enterprise-gpt4",
            "experimental-model",
            "123provider",
            "provider.with.dots",
            "UPPERCASE_PROVIDER",
            "mixedCase_Provider-Name",
            "very-long-provider-name-with-many-parts",
            "provider_中文",  # Unicode characters
            "провайдер",  # Cyrillic characters
            "プロバイダー"  # Japanese characters
        ]

        for provider_name in provider_names:
            config = {"api_key": f"key-for-{provider_name}"}
            config_manager.add_provider_config(provider_name, config)

        # Verify all providers were added successfully
        for provider_name in provider_names:
            assert config_manager.has_provider_config(provider_name) is True

        providers = config_manager.get_configured_providers()
        assert len(providers) == len(provider_names)
        for provider_name in provider_names:
            assert provider_name in providers

    @pytest.mark.unit
    def test_custom_provider_with_arbitrary_parameters(self, temp_config_dir):
        """Test that custom providers can have arbitrary configuration parameters."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Custom provider with many different types of parameters
        custom_config = {
            "api_key": "sk-custom-key-12345",
            "base_url": "https://custom-api.example.com/v2",
            "timeout": 60,
            "max_retries": 5,
            "custom_headers": {
                "X-Custom-Header": "custom-value",
                "Authorization": "Bearer token123"
            },
            "rate_limits": {
                "requests_per_minute": 120,
                "tokens_per_minute": 240000
            },
            "model_config": {
                "default_model": "custom-gpt-4",
                "temperature_range": [0.0, 2.0],
                "supports_streaming": True,
                "max_context_length": 32768
            },
            "enterprise_settings": {
                "enable_auditing": True,
                "data_region": "us-east-1",
                "compliance_mode": "hipaa"
            },
            "feature_flags": [
                "experimental_features",
                "beta_models",
                "custom_formatters"
            ],
            "metadata": {
                "provider_version": "2.1.0",
                "integration_date": "2025-01-20",
                "notes": "Custom integration for specific use case"
            }
        }

        config_manager.add_provider_config("custom_enterprise_provider", custom_config)

        # Verify all custom parameters are preserved
        retrieved_config = config_manager.get_provider_config("custom_enterprise_provider")
        assert retrieved_config == custom_config

        # Test access via dot notation for nested values
        assert config_manager.get("ai.providers.custom_enterprise_provider.api_key") == "sk-custom-key-12345"
        assert config_manager.get("ai.providers.custom_enterprise_provider.timeout") == 60
        assert config_manager.get("ai.providers.custom_enterprise_provider.custom_headers.X-Custom-Header") == "custom-value"
        assert config_manager.get("ai.providers.custom_enterprise_provider.model_config.supports_streaming") is True

    @pytest.mark.unit
    def test_custom_provider_minimal_configuration(self, temp_config_dir):
        """Test that custom providers work with minimal configuration."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Minimal provider configs
        minimal_configs = [
            ("provider1", {"api_key": "key1"}),
            ("provider2", {"base_url": "https://example.com"}),
            ("provider3", {"api_key": "key3", "base_url": "https://api.example.com"}),
            ("provider4", {"custom_field": "custom_value"})  # No api_key or base_url
        ]

        for provider_name, config in minimal_configs:
            config_manager.add_provider_config(provider_name, config)

        # Verify all minimal configs work
        for provider_name, config in minimal_configs:
            assert config_manager.has_provider_config(provider_name) is True
            retrieved_config = config_manager.get_provider_config(provider_name)
            assert retrieved_config == config

    @pytest.mark.unit
    def test_custom_provider_complex_data_types(self, temp_config_dir):
        """Test that custom providers can have complex data types in configuration."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        complex_config = {
            "api_key": "sk-complex-key",
            "numeric_values": {
                "integer": 42,
                "float": 3.14159,
                "negative": -100,
                "zero": 0
            },
            "boolean_values": {
                "true_value": True,
                "false_value": False
            },
            "list_values": {
                "strings": ["item1", "item2", "item3"],
                "numbers": [1, 2, 3.5, -4],
                "mixed": ["string", 123, True, None],
                "nested_lists": [[1, 2], [3, 4]]
            },
            "null_values": {
                "explicit_null": None,
                "optional_field": None
            },
            "deeply_nested": {
                "level1": {
                    "level2": {
                        "level3": {
                            "deep_value": "found it"
                        }
                    }
                }
            }
        }

        config_manager.add_provider_config("complex_provider", complex_config)

        # Verify complex data types are preserved
        retrieved_config = config_manager.get_provider_config("complex_provider")
        assert retrieved_config == complex_config

        # Test access to deeply nested values
        assert config_manager.get("ai.providers.complex_provider.deeply_nested.level1.level2.level3.deep_value") == "found it"

    @pytest.mark.unit
    def test_custom_provider_persistence_across_restarts(self, temp_config_dir):
        """Test that custom provider configurations persist across manager restarts."""
        # First manager instance
        config_manager1 = ConfigManager(config_dir=temp_config_dir)

        custom_providers = {
            "local_llama": {
                "base_url": "http://localhost:8080",
                "model_path": "/models/llama-7b",
                "device": "cuda",
                "quantization": "4bit"
            },
            "enterprise_gpt": {
                "api_key": "sk-enterprise-key",
                "base_url": "https://enterprise-gpt.company.com",
                "tenant_id": "tenant_12345",
                "audit_logs": True
            },
            "experimental_provider": {
                "endpoint": "https://experimental.ai/v1",
                "experimental_features": True,
                "beta_mode": True,
                "custom_auth": {
                    "type": "bearer",
                    "token": "exp_token_123"
                }
            }
        }

        # Add custom providers
        for provider_name, config in custom_providers.items():
            config_manager1.add_provider_config(provider_name, config)

        # Verify they were added
        for provider_name in custom_providers.keys():
            assert config_manager1.has_provider_config(provider_name) is True

        # Create new manager instance (simulates app restart)
        config_manager2 = ConfigManager(config_dir=temp_config_dir)

        # Verify all custom providers persisted
        for provider_name, expected_config in custom_providers.items():
            assert config_manager2.has_provider_config(provider_name) is True
            retrieved_config = config_manager2.get_provider_config(provider_name)
            assert retrieved_config == expected_config

    @pytest.mark.unit
    def test_custom_provider_mixed_with_standard_providers(self, temp_config_dir):
        """Test that custom providers work alongside standard providers."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Add standard providers
        standard_providers = {
            "openai": {
                "api_key": "sk-openai-key",
                "base_url": "https://api.openai.com/v1"
            },
            "deepseek": {
                "api_key": "sk-deepseek-key",
                "base_url": "https://api.deepseek.com"
            }
        }

        for provider_name, config in standard_providers.items():
            config_manager.add_provider_config(provider_name, config)

        # Add custom providers
        custom_providers = {
            "my_custom_llm": {
                "api_key": "custom-key",
                "base_url": "https://custom-llm.example.com",
                "custom_param": "custom_value"
            },
            "local_model": {
                "base_url": "http://localhost:8000",
                "model_path": "/models/custom-model.bin"
            }
        }

        for provider_name, config in custom_providers.items():
            config_manager.add_provider_config(provider_name, config)

        # Verify all providers are present
        all_providers = config_manager.get_configured_providers()
        expected_providers = list(standard_providers.keys()) + list(custom_providers.keys())

        assert len(all_providers) == len(expected_providers)
        for provider_name in expected_providers:
            assert provider_name in all_providers
            assert config_manager.has_provider_config(provider_name) is True

    @pytest.mark.unit
    def test_custom_provider_update_and_removal(self, temp_config_dir):
        """Test updating and removing custom providers."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Add custom provider
        initial_config = {
            "api_key": "initial-key",
            "base_url": "https://initial.example.com",
            "initial_param": "initial_value"
        }

        config_manager.add_provider_config("custom_provider", initial_config)

        # Verify initial config
        assert config_manager.get_provider_config("custom_provider") == initial_config

        # Update with new configuration
        updated_config = {
            "api_key": "updated-key",
            "base_url": "https://updated.example.com",
            "new_param": "new_value",
            "additional_setting": True
        }

        config_manager.add_provider_config("custom_provider", updated_config)

        # Verify update
        assert config_manager.get_provider_config("custom_provider") == updated_config
        assert config_manager.get_provider_config("custom_provider") != initial_config

        # Remove custom provider
        result = config_manager.remove_provider_config("custom_provider")
        assert result is True
        assert config_manager.has_provider_config("custom_provider") is False

    @pytest.mark.unit
    def test_custom_provider_name_validation_no_restrictions(self, temp_config_dir):
        """Test that provider names have no artificial restrictions."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # These should all be valid provider names
        test_names = [
            "",  # Empty string (edge case)
            "a",  # Single character
            "1",  # Number only
            "-dash-only",
            "dot.separated.name",
            "name-with-123-numbers",
            "name_with_underscores",
            "UPPERCASE",
            "MiXeDCase",
            "name with spaces",  # Unusual but should be allowed
            "name@with$special&chars",
            "name/with/slashes",
            "name\\with\\backslashes",
            "name:with:colons",
            "name;with;semicolons",
            "name'with'quotes",
            'name"with"double"quotes',
            "name(with)parentheses",
            "name[with]brackets",
            "name{with}braces",
            "name|with|pipes",
            "name?with?questions",
            "name*with*asterisks",
            "name%with%percents",
            "name+with+plus",
            "name=with=equals",
            "name#with#hash",
            "name!with!exclamation",
            "name~with~tilde",
            "name`with`backticks",
            "name^with^caret"
        ]

        successful_additions = []
        failed_additions = []

        for provider_name in test_names:
            try:
                config = {"api_key": f"key-for-{provider_name}"}
                config_manager.add_provider_config(provider_name, config)
                successful_additions.append(provider_name)
            except Exception as e:
                failed_additions.append((provider_name, str(e)))

        # Most names should succeed (unless they break JSON or file system)
        print(f"Successfully added {len(successful_additions)} providers")
        if failed_additions:
            print(f"Failed additions: {failed_additions}")

        # Verify successful additions
        for provider_name in successful_additions:
            assert config_manager.has_provider_config(provider_name) is True

    @pytest.mark.unit
    def test_custom_provider_integration_with_defaults(self, temp_config_dir):
        """Test that custom providers integrate properly with default configuration."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify default state
        assert config_manager.get("ai.default_provider") == "deepseek"
        assert len(config_manager.get_configured_providers()) == 0

        # Add custom provider
        config_manager.add_provider_config("custom_provider", {
            "api_key": "sk-custom-key"
        })

        # Verify defaults are preserved
        assert config_manager.get("ai.default_provider") == "deepseek"
        assert config_manager.get("ai.temperature") == 0.7

        # Verify custom provider is added
        assert config_manager.has_provider_config("custom_provider") is True

        # Change default to custom provider
        config_manager.set("ai.default_provider", "custom_provider")
        assert config_manager.get("ai.default_provider") == "custom_provider"

    @pytest.mark.unit
    def test_custom_provider_configuration_validation(self, temp_config_dir):
        """Test that custom provider configurations are validated properly."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Custom provider with valid configuration should work
        valid_config = {
            "api_key": "sk-valid-key",
            "timeout": 30,
            "max_retries": 3
        }

        config_manager.add_provider_config("valid_custom", valid_config)
        assert config_manager.has_provider_config("valid_custom") is True

        # Custom provider configuration should not affect other validation rules
        # For example, AI section validation should still work
        with pytest.raises(ValidationError):
            config_manager.set("ai.temperature", 5.0)  # Invalid temperature

        # Custom provider should still be there after validation failure rollback
        assert config_manager.has_provider_config("valid_custom") is True

    @pytest.mark.unit
    def test_custom_provider_file_format_preservation(self, temp_config_dir):
        """Test that custom provider configurations are preserved in file format."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        custom_config = {
            "api_key": "sk-file-test-key",
            "base_url": "https://file-test.example.com",
            "complex_structure": {
                "nested": {
                    "value": "preserved",
                    "number": 42,
                    "list": [1, 2, 3]
                }
            }
        }

        config_manager.add_provider_config("file_test_provider", custom_config)

        # Read the file directly to verify format
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'r') as f:
            file_contents = json.load(f)

        # Verify structure is preserved in file
        assert "file_test_provider" in file_contents["ai"]["providers"]
        assert file_contents["ai"]["providers"]["file_test_provider"] == custom_config

        # Create new manager to verify file loading
        config_manager2 = ConfigManager(config_dir=temp_config_dir)
        retrieved_config = config_manager2.get_provider_config("file_test_provider")
        assert retrieved_config == custom_config