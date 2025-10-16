"""
Comprehensive tests for ConfigManager configuration structure validation.

These tests focus on the bug that was fixed where provider configurations were
at the wrong level in the JSON structure and ensure proper validation.
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestConfigurationStructureValidation:
    """Test configuration structure validation for ConfigManager."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary directory for configuration files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def valid_config(self):
        """Return a valid configuration structure."""
        return {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 4096,
                "providers": {
                    "openai": {
                        "api_key": "sk-test-key",
                        "base_url": "https://api.openai.com/v1"
                    },
                    "deepseek": {
                        "api_key": "sk-deepseek-key",
                        "base_url": "https://api.deepseek.com"
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
    def test_valid_configuration_loads_correctly(self, temp_config_dir, valid_config):
        """Test that valid configuration loads correctly."""
        config_file = temp_config_dir / "config.json"

        # Write valid configuration
        with open(config_file, 'w') as f:
            json.dump(valid_config, f, indent=2)

        # Load configuration
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify configuration loaded correctly
        assert config_manager.get("ai.default_provider") == "openai"
        assert config_manager.get("ai.temperature") == 0.7
        assert config_manager.get("ai.providers.openai.api_key") == "sk-test-key"
        assert config_manager.get("ui.theme") == "dark"
        assert config_manager.get("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_misplaced_provider_configuration_detected(self, temp_config_dir):
        """Test detection of misplaced provider configurations (the main bug)."""
        # Create configuration with providers at wrong level
        invalid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                # WRONG: Provider configs directly under ai section
                "openai": {
                    "api_key": "sk-test-key",
                    "base_url": "https://api.openai.com/v1"
                },
                "deepseek": {
                    "api_key": "sk-deepseek-key"
                },
                "providers": {}  # Empty providers section
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(invalid_config, f, indent=2)

        # Should raise ValidationError for misplaced providers
        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        assert "Provider configurations found at wrong level" in str(exc_info.value)
        assert "openai" in str(exc_info.value)
        assert "deepseek" in str(exc_info.value)
        assert "should be nested under 'ai.providers.provider_name'" in str(exc_info.value)

    @pytest.mark.unit
    def test_missing_providers_section_detected(self, temp_config_dir):
        """Test detection of missing providers section."""
        invalid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7
                # Missing providers section entirely
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(invalid_config, f, indent=2)

        # Should raise ValidationError for missing providers section
        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        assert "must contain a 'providers' section" in str(exc_info.value)

    @pytest.mark.unit
    def test_invalid_providers_type_detected(self, temp_config_dir):
        """Test detection of invalid providers section type."""
        invalid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": "not_a_dict"  # Wrong type
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(invalid_config, f, indent=2)

        # Should raise ValidationError for wrong providers type
        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        assert "providers section must be a dictionary" in str(exc_info.value)

    @pytest.mark.unit
    def test_partially_misplaced_providers_detected(self, temp_config_dir):
        """Test detection when some providers are correctly placed and others are not."""
        invalid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {
                        "api_key": "sk-test-key"
                    }
                },
                # WRONG: deepseek is at wrong level
                "deepseek": {
                    "api_key": "sk-deepseek-key"
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(invalid_config, f, indent=2)

        # Should detect only the misplaced provider
        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        assert "deepseek" in str(exc_info.value)
        assert "openai" not in str(exc_info.value)  # openai is correctly placed

    @pytest.mark.unit
    def test_custom_provider_configuration_supported(self, temp_config_dir):
        """Test that custom provider configurations are fully supported."""
        custom_config = {
            "ai": {
                "default_provider": "custom_provider",
                "temperature": 0.7,
                "providers": {
                    "custom_provider": {
                        "api_key": "custom-key-123",
                        "base_url": "https://custom-api.example.com",
                        "custom_param": "custom_value",
                        "timeout": 30,
                        "max_retries": 3
                    },
                    "another_custom": {
                        "api_key": "another-key-456",
                        "endpoint": "https://another-api.example.com/v2"
                    }
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(custom_config, f, indent=2)

        # Should load without errors
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify custom providers are loaded
        assert config_manager.get("ai.providers.custom_provider.api_key") == "custom-key-123"
        assert config_manager.get("ai.providers.custom_provider.custom_param") == "custom_value"
        assert config_manager.get("ai.providers.another_custom.endpoint") == "https://another-api.example.com/v2"

    @pytest.mark.unit
    def test_empty_providers_section_allowed(self, temp_config_dir):
        """Test that empty providers section is allowed."""
        config_with_empty_providers = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {}  # Empty but valid
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_empty_providers, f, indent=2)

        # Should load without errors
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify providers section exists but is empty
        providers = config_manager.get("ai.providers")
        assert isinstance(providers, dict)
        assert len(providers) == 0

    @pytest.mark.unit
    def test_dict_values_without_api_key_or_base_url_not_flagged(self, temp_config_dir):
        """Test that dict values without api_key or base_url are not flagged as misplaced providers."""
        config_with_other_dicts = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {
                        "api_key": "sk-test-key"
                    }
                },
                # These should NOT be flagged as misplaced providers
                "model_settings": {
                    "max_context": 4096,
                    "temperature_range": [0.0, 2.0]
                },
                "rate_limits": {
                    "requests_per_minute": 60,
                    "tokens_per_minute": 90000
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config_with_other_dicts, f, indent=2)

        # Should load without errors
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify configuration loaded correctly
        assert config_manager.get("ai.model_settings.max_context") == 4096
        assert config_manager.get("ai.rate_limits.requests_per_minute") == 60

    @pytest.mark.unit
    def test_configuration_with_mixed_scenarios(self, temp_config_dir):
        """Test configuration with mixed valid and invalid scenarios."""
        mixed_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {
                        "api_key": "sk-test-key"
                    }
                },
                # WRONG: These are misplaced
                "deepseek": {
                    "api_key": "sk-deepseek-key"
                },
                "anthropic": {
                    "api_key": "sk-anthropic-key",
                    "base_url": "https://api.anthropic.com"
                },
                # OK: These are not provider configs
                "model_config": {
                    "max_tokens": 4096
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(mixed_config, f, indent=2)

        # Should detect only the misplaced providers
        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        error_message = str(exc_info.value)
        assert "deepseek" in error_message
        assert "anthropic" in error_message
        assert "openai" not in error_message
        assert "model_config" not in error_message

    @pytest.mark.unit
    def test_default_configuration_is_valid(self, temp_config_dir):
        """Test that default configuration is valid."""
        # Create config manager without any config file
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Should load defaults without errors
        assert config_manager.get("ai.default_provider") == "deepseek"
        assert config_manager.get("ai.providers") == {}
        assert config_manager.get("ui.theme") == "dark"

    @pytest.mark.unit
    def test_configuration_validation_on_set_operation(self, temp_config_dir):
        """Test that validation catches misplaced providers during set operations."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Try to set a misplaced provider configuration
        with pytest.raises(ValidationError) as exc_info:
            config_manager.set("ai.misplaced_provider", {"api_key": "test-key"})

        assert "Provider configurations found at wrong level" in str(exc_info.value)

    @pytest.mark.unit
    def test_configuration_validation_on_update_section(self, temp_config_dir):
        """Test that validation catches misplaced providers during section updates."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Try to update AI section with misplaced providers
        invalid_update = {
            "new_provider": {
                "api_key": "test-key"
            }
        }

        with pytest.raises(ValidationError) as exc_info:
            config_manager.update_section("ai", invalid_update)

        assert "Provider configurations found at wrong level" in str(exc_info.value)