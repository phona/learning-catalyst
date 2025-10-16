"""
Tests for ConfigManager provider management utility methods.

These tests verify the functionality of provider management methods that were
added to fix the configuration structure bug.
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, mock_open

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestProviderManagement:
    """Test provider management functionality in ConfigManager."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary directory for configuration files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def config_with_providers(self):
        """Return a configuration with multiple providers."""
        return {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 4096,
                "providers": {
                    "openai": {
                        "api_key": "sk-openai-key",
                        "base_url": "https://api.openai.com/v1",
                        "models": {
                            "chat": ["gpt-4o-mini", "gpt-3.5-turbo"],
                            "embedding": ["text-embedding-3-small"]
                        }
                    },
                    "deepseek": {
                        "api_key": "sk-deepseek-key",
                        "base_url": "https://api.deepseek.com"
                    },
                    "anthropic": {
                        "api_key": "sk-anthropic-key",
                        "base_url": "https://api.anthropic.com"
                    }
                }
            },
            "ui": {
                "theme": "dark",
                "show_token_usage": True,
                "display_format": "detailed",
                "session_duration": 45
            },
            "learning": {
                "auto_save": True,
                "session_timeout_minutes": 120,
                "difficulty": "adaptive"
            },
            "privacy": {
                "store_conversations": True,
                "retention_days": 30
            },
            "performance": {
                "cache_size_mb": 100,
                "enable_caching": True
            }
        }

    @pytest.mark.unit
    def test_get_configured_providers(self, temp_config_dir, config_with_providers):
        """Test getting list of configured provider names."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)
        providers = config_manager.get_configured_providers()

        assert isinstance(providers, list)
        assert len(providers) == 3
        assert "openai" in providers
        assert "deepseek" in providers
        assert "anthropic" in providers

    @pytest.mark.unit
    def test_get_configured_providers_empty(self, temp_config_dir):
        """Test getting configured providers when none exist."""
        config_manager = ConfigManager(config_dir=temp_config_dir)
        providers = config_manager.get_configured_providers()

        assert isinstance(providers, list)
        assert len(providers) == 0

    @pytest.mark.unit
    def test_get_configured_providers_single(self, temp_config_dir):
        """Test getting configured providers with only one provider."""
        config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {
                        "api_key": "sk-test-key"
                    }
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)
        providers = config_manager.get_configured_providers()

        assert len(providers) == 1
        assert "openai" in providers

    @pytest.mark.unit
    def test_has_provider_config_existing(self, temp_config_dir, config_with_providers):
        """Test checking if provider exists for existing providers."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        assert config_manager.has_provider_config("openai") is True
        assert config_manager.has_provider_config("deepseek") is True
        assert config_manager.has_provider_config("anthropic") is True

    @pytest.mark.unit
    def test_has_provider_config_nonexistent(self, temp_config_dir, config_with_providers):
        """Test checking if provider exists for non-existent providers."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        assert config_manager.has_provider_config("nonexistent") is False
        assert config_manager.has_provider_config("custom_provider") is False
        assert config_manager.has_provider_config("") is False

    @pytest.mark.unit
    def test_has_provider_config_empty_providers(self, temp_config_dir):
        """Test checking if provider exists when no providers are configured."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        assert config_manager.has_provider_config("any_provider") is False

    @pytest.mark.unit
    def test_add_provider_config_new(self, temp_config_dir):
        """Test adding a new provider configuration."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        provider_config = {
            "api_key": "sk-new-provider-key",
            "base_url": "https://new-provider.example.com",
            "timeout": 30,
            "custom_setting": "custom_value"
        }

        config_manager.add_provider_config("new_provider", provider_config)

        # Verify provider was added
        assert config_manager.has_provider_config("new_provider") is True
        assert config_manager.get_provider_config("new_provider") == provider_config

        # Verify config was saved to file
        config_file = temp_config_dir / "config.json"
        assert config_file.exists()

        with open(config_file, 'r') as f:
            saved_config = json.load(f)
            assert "new_provider" in saved_config["ai"]["providers"]
            assert saved_config["ai"]["providers"]["new_provider"]["api_key"] == "sk-new-provider-key"

    @pytest.mark.unit
    def test_add_provider_config_update_existing(self, temp_config_dir, config_with_providers):
        """Test updating an existing provider configuration."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Update openai provider
        updated_config = {
            "api_key": "sk-updated-key",
            "base_url": "https://updated.openai.com/v2",
            "new_field": "new_value"
        }

        config_manager.add_provider_config("openai", updated_config)

        # Verify provider was updated
        assert config_manager.get_provider_config("openai") == updated_config

        # Verify other providers are unchanged
        assert config_manager.get_provider_config("deepseek") == {
            "api_key": "sk-deepseek-key",
            "base_url": "https://api.deepseek.com"
        }

    @pytest.mark.unit
    def test_add_provider_config_creates_missing_sections(self, temp_config_dir):
        """Test adding provider config when ai or providers sections don't exist."""
        # Create config without ai section
        minimal_config = {
            "ui": {"theme": "dark"}
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(minimal_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        provider_config = {"api_key": "sk-test-key"}
        config_manager.add_provider_config("test_provider", provider_config)

        # Verify sections were created and provider added
        assert config_manager.has_provider_config("test_provider") is True
        assert config_manager.get("ai.providers.test_provider.api_key") == "sk-test-key"

    @pytest.mark.unit
    def test_add_provider_config_validation_error_rollback(self, temp_config_dir):
        """Test that validation errors trigger rollback on add provider."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # First add a valid provider
        valid_config = {"api_key": "sk-valid-key"}
        config_manager.add_provider_config("valid_provider", valid_config)

        assert config_manager.has_provider_config("valid_provider") is True

        # Try to add provider with invalid configuration (e.g., invalid ai section)
        with pytest.raises(ValidationError):
            # This should trigger validation and rollback
            config_manager.set("ai.temperature", 5.0)  # Invalid temperature

        # Verify original provider configuration is still there after rollback
        assert config_manager.has_provider_config("valid_provider") is True
        assert config_manager.get_provider_config("valid_provider") == valid_config

    @pytest.mark.unit
    def test_get_provider_config_existing(self, temp_config_dir, config_with_providers):
        """Test getting configuration for existing provider."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        openai_config = config_manager.get_provider_config("openai")
        assert openai_config is not None
        assert openai_config["api_key"] == "sk-openai-key"
        assert openai_config["base_url"] == "https://api.openai.com/v1"
        assert "models" in openai_config

        deepseek_config = config_manager.get_provider_config("deepseek")
        assert deepseek_config is not None
        assert deepseek_config["api_key"] == "sk-deepseek-key"

    @pytest.mark.unit
    def test_get_provider_config_nonexistent(self, temp_config_dir, config_with_providers):
        """Test getting configuration for non-existent provider."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        result = config_manager.get_provider_config("nonexistent")
        assert result is None

        result = config_manager.get_provider_config("")
        assert result is None

    @pytest.mark.unit
    def test_get_provider_config_no_ai_section(self, temp_config_dir):
        """Test getting provider config when no ai section exists."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        result = config_manager.get_provider_config("any_provider")
        assert result is None

    @pytest.mark.unit
    def test_remove_provider_config_existing(self, temp_config_dir, config_with_providers):
        """Test removing an existing provider configuration."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Remove deepseek provider
        result = config_manager.remove_provider_config("deepseek")

        assert result is True
        assert config_manager.has_provider_config("deepseek") is False
        assert config_manager.has_provider_config("openai") is True
        assert config_manager.has_provider_config("anthropic") is True

        # Verify change was saved to file
        with open(config_file, 'r') as f:
            saved_config = json.load(f)
            assert "deepseek" not in saved_config["ai"]["providers"]
            assert "openai" in saved_config["ai"]["providers"]

    @pytest.mark.unit
    def test_remove_provider_config_nonexistent(self, temp_config_dir, config_with_providers):
        """Test removing a non-existent provider configuration."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_providers, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Try to remove non-existent provider
        result = config_manager.remove_provider_config("nonexistent")
        assert result is False

        # Verify existing providers are unchanged
        assert config_manager.has_provider_config("openai") is True
        assert config_manager.has_provider_config("deepseek") is True

    @pytest.mark.unit
    def test_remove_provider_config_empty_providers(self, temp_config_dir):
        """Test removing provider when no providers exist."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        result = config_manager.remove_provider_config("any_provider")
        assert result is False

    @pytest.mark.unit
    def test_remove_provider_config_last_provider(self, temp_config_dir):
        """Test removing the last provider configuration."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Add a single provider
        config_manager.add_provider_config("single_provider", {"api_key": "sk-test-key"})

        assert config_manager.has_provider_config("single_provider") is True

        # Remove the only provider
        result = config_manager.remove_provider_config("single_provider")

        assert result is True
        assert config_manager.has_provider_config("single_provider") is False
        assert len(config_manager.get_configured_providers()) == 0

        # Verify providers section still exists but is empty
        providers = config_manager.get("ai.providers")
        assert isinstance(providers, dict)
        assert len(providers) == 0

    @pytest.mark.unit
    def test_provider_config_persistence(self, temp_config_dir):
        """Test that provider configurations persist across manager instances."""
        # Add providers with first manager instance
        config_manager1 = ConfigManager(config_dir=temp_config_dir)

        config_manager1.add_provider_config("provider1", {"api_key": "key1"})
        config_manager1.add_provider_config("provider2", {"api_key": "key2", "timeout": 30})

        # Create new manager instance (simulates app restart)
        config_manager2 = ConfigManager(config_dir=temp_config_dir)

        # Verify configurations persisted
        assert config_manager2.has_provider_config("provider1") is True
        assert config_manager2.has_provider_config("provider2") is True

        config1 = config_manager2.get_provider_config("provider1")
        config2 = config_manager2.get_provider_config("provider2")

        assert config1 == {"api_key": "key1"}
        assert config2 == {"api_key": "key2", "timeout": 30}

    @pytest.mark.unit
    def test_provider_management_with_special_characters(self, temp_config_dir):
        """Test provider management with special characters in provider names."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Provider names with special characters
        special_providers = {
            "provider-with-dash": {"api_key": "key1"},
            "provider_with_underscore": {"api_key": "key2"},
            "provider.with.dots": {"api_key": "key3"},
            "provider123": {"api_key": "key4"}
        }

        for provider_name, config in special_providers.items():
            config_manager.add_provider_config(provider_name, config)

        # Verify all providers were added
        for provider_name in special_providers.keys():
            assert config_manager.has_provider_config(provider_name) is True

        # Verify provider list contains all names
        providers = config_manager.get_configured_providers()
        for provider_name in special_providers.keys():
            assert provider_name in providers

        # Test removal
        config_manager.remove_provider_config("provider-with-dash")
        assert config_manager.has_provider_config("provider-with-dash") is False
        assert config_manager.has_provider_config("provider_with_underscore") is True

    @pytest.mark.unit
    def test_provider_management_case_sensitivity(self, temp_config_dir):
        """Test that provider management is case sensitive."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        config_manager.add_provider_config("OpenAI", {"api_key": "key1"})
        config_manager.add_provider_config("openai", {"api_key": "key2"})

        # Should be treated as different providers
        assert config_manager.has_provider_config("OpenAI") is True
        assert config_manager.has_provider_config("openai") is True
        assert config_manager.has_provider_config("OPENAI") is False

        providers = config_manager.get_configured_providers()
        assert "OpenAI" in providers
        assert "openai" in providers
        assert len(providers) == 2

    @pytest.mark.unit
    def test_provider_management_integration_with_dot_notation(self, temp_config_dir):
        """Test that provider management works with dot notation methods."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Add provider using dedicated method
        config_manager.add_provider_config("test_provider", {
            "api_key": "sk-test-key",
            "timeout": 30
        })

        # Should be accessible via dot notation
        assert config_manager.get("ai.providers.test_provider.api_key") == "sk-test-key"
        assert config_manager.get("ai.providers.test_provider.timeout") == 30

        # Update via dot notation
        config_manager.set("ai.providers.test_provider.timeout", 60)

        # Verify change
        config = config_manager.get_provider_config("test_provider")
        assert config["timeout"] == 60

        # Remove via dedicated method
        config_manager.remove_provider_config("test_provider")

        # Should no longer be accessible
        assert config_manager.get("ai.providers.test_provider") is None