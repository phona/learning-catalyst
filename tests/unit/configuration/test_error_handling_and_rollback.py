"""
Tests for error handling and rollback functionality in ConfigManager.

These tests verify that configuration validation errors trigger proper rollback
mechanisms and that the system maintains consistency.
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestErrorHandlingAndRollback:
    """Test error handling and rollback mechanisms in ConfigManager."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary directory for configuration files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def valid_initial_config(self):
        """Return a valid initial configuration for testing."""
        return {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 4096,
                "providers": {
                    "openai": {
                        "api_key": "sk-original-key",
                        "base_url": "https://api.openai.com/v1"
                    },
                    "deepseek": {
                        "api_key": "sk-deepseek-original"
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
    def test_configuration_rollback_on_validation_error(self, temp_config_dir, valid_initial_config):
        """Test that configuration is rolled back on validation errors."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Get original values
        original_temperature = config_manager.get("ai.temperature")
        original_theme = config_manager.get("ui.theme")
        original_providers = config_manager.get_configured_providers()

        # Try to make invalid changes
        with pytest.raises(ValidationError):
            # Invalid temperature value
            config_manager.set("ai.temperature", 5.0)

        # Verify rollback - original values should be preserved
        assert config_manager.get("ai.temperature") == original_temperature
        assert config_manager.get("ui.theme") == original_theme
        assert config_manager.get_configured_providers() == original_providers

    @pytest.mark.unit
    def test_multiple_changes_rollback_on_first_error(self, temp_config_dir, valid_initial_config):
        """Test that all changes are rolled back when first error occurs."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Get original state
        original_temp = config_manager.get("ai.temperature")
        original_theme = config_manager.get("ui.theme")
        original_timeout = config_manager.get("learning.session_timeout_minutes")

        # Try to make multiple changes where the last one is invalid
        with pytest.raises(ValidationError):
            config_manager.set("ai.temperature", 0.8)  # Valid
            config_manager.set("ui.theme", "light")  # Valid
            config_manager.set("learning.session_timeout_minutes", 500)  # Invalid - should trigger rollback

        # All changes should be rolled back
        assert config_manager.get("ai.temperature") == original_temp
        assert config_manager.get("ui.theme") == original_theme
        assert config_manager.get("learning.session_timeout_minutes") == original_timeout

    @pytest.mark.unit
    def test_provider_addition_rollback_on_validation_error(self, temp_config_dir, valid_initial_config):
        """Test rollback when adding provider causes validation error."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        original_providers = config_manager.get_configured_providers()

        # Add valid provider first
        config_manager.add_provider_config("valid_provider", {"api_key": "sk-valid-key"})
        assert config_manager.has_provider_config("valid_provider") is True

        # Now try to add a provider and then make an invalid change
        with pytest.raises(ValidationError):
            config_manager.add_provider_config("another_provider", {"api_key": "sk-another-key"})
            # This should trigger rollback
            config_manager.set("ai.temperature", 10.0)  # Invalid

        # Both new providers should be rolled back
        assert config_manager.has_provider_config("valid_provider") is False
        assert config_manager.has_provider_config("another_provider") is False
        assert config_manager.get_configured_providers() == original_providers

    @pytest.mark.unit
    def test_section_update_rollback_on_validation_error(self, temp_config_dir, valid_initial_config):
        """Test rollback when updating section causes validation error."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        original_ui_config = config_manager.get_section("ui")

        # Try to update section with invalid data
        invalid_updates = {
            "theme": "light",  # Valid
            "session_duration": 300  # Invalid - should trigger rollback
        }

        with pytest.raises(ValidationError):
            config_manager.update_section("ui", invalid_updates)

        # UI section should be rolled back to original state
        current_ui_config = config_manager.get_section("ui")
        assert current_ui_config == original_ui_config
        assert config_manager.get("ui.theme") == "dark"  # Original value
        assert config_manager.get("ui.session_duration") == 45  # Original value

    @pytest.mark.unit
    def test_misplaced_provider_detection_rollback(self, temp_config_dir, valid_initial_config):
        """Test rollback when misplaced provider configuration is detected."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        original_ai_config = config_manager.get_section("ai")

        # Try to set a misplaced provider configuration
        with pytest.raises(ValidationError) as exc_info:
            config_manager.set("ai.misplaced_provider", {"api_key": "sk-test-key"})

        assert "Provider configurations found at wrong level" in str(exc_info.value)

        # AI section should be rolled back to original state
        current_ai_config = config_manager.get_section("ai")
        assert current_ai_config == original_ai_config

        # Verify no misplaced provider was added
        assert config_manager.get("ai.misplaced_provider") is None

    @pytest.mark.unit
    def test_file_save_error_rollback(self, temp_config_dir, valid_initial_config):
        """Test rollback when file save operation fails."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        original_values = {
            "temperature": config_manager.get("ai.temperature"),
            "theme": config_manager.get("ui.theme"),
            "providers": config_manager.get_configured_providers()
        }

        # Mock file save to raise an exception
        with patch('builtins.open', side_effect=IOError("Disk full")):
            with pytest.raises(ValidationError) as exc_info:
                config_manager.set("ai.temperature", 0.9)

            assert "Could not save config" in str(exc_info.value)

        # Values should be rolled back
        assert config_manager.get("ai.temperature") == original_values["temperature"]
        assert config_manager.get("ui.theme") == original_values["theme"]
        assert config_manager.get_configured_providers() == original_values["providers"]

    @pytest.mark.unit
    def test_partial_file_corruption_handling(self, temp_config_dir, valid_initial_config):
        """Test handling of partially corrupted configuration files."""
        config_file = temp_config_dir / "config.json"

        # Create valid initial config
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Make some changes
        config_manager.set("ai.temperature", 0.8)
        config_manager.set("ui.theme", "light")
        config_manager.add_provider_config("new_provider", {"api_key": "sk-new-key"})

        # Simulate partial file corruption by truncating the file
        with open(config_file, 'r+') as f:
            content = f.read()
            f.seek(0)
            f.truncate()
            f.write(content[:len(content)//2])  # Write only first half

        # Create new config manager - should handle corruption gracefully
        config_manager2 = ConfigManager(config_dir=temp_config_dir)

        # Should fall back to defaults or last known good state
        assert config_manager2.get("ai.default_provider") in ["deepseek", "openai"]
        assert config_manager2.get("ai.temperature") in [0.7, 0.8]  # Either default or saved value

    @pytest.mark.unit
    def test_concurrent_modification_detection(self, temp_config_dir, valid_initial_config):
        """Test detection and handling of concurrent modifications."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager1 = ConfigManager(config_dir=temp_config_dir)

        # Start making changes with first manager
        original_temp = config_manager1.get("ai.temperature")

        # Simulate external modification
        external_config = valid_initial_config.copy()
        external_config["ai"]["temperature"] = 0.99
        external_config["ai"]["default_provider"] = "deepseek"

        with open(config_file, 'w') as f:
            json.dump(external_config, f, indent=2)

        # Try to save changes from first manager
        with pytest.raises(Exception):  # Could be various exceptions
            config_manager1.set("ai.temperature", 0.8)

        # Create new manager - should load externally modified config
        config_manager2 = ConfigManager(config_dir=temp_config_dir)
        assert config_manager2.get("ai.temperature") == 0.99
        assert config_manager2.get("ai.default_provider") == "deepseek"

    @pytest.mark.unit
    def test_memory_error_handling(self, temp_config_dir, valid_initial_config):
        """Test handling of memory errors during configuration operations."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Mock memory error during configuration operation
        with patch('json.dump', side_effect=MemoryError("Out of memory")):
            with pytest.raises(Exception):  # Could be MemoryError or ValidationError
                config_manager.set("ai.temperature", 0.8)

        # Configuration should remain in original state
        assert config_manager.get("ai.temperature") == 0.7

    @pytest.mark.unit
    def test_validation_error_with_detailed_messages(self, temp_config_dir):
        """Test that validation errors provide detailed, helpful messages."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test multiple validation errors at once
        config_file = temp_config_dir / "config.json"
        invalid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 5.0,  # Invalid
                "max_tokens": 0,  # Invalid
                "providers": "not_a_dict",  # Invalid
                "misplaced_provider": {  # Misplaced
                    "api_key": "sk-test-key"
                }
            },
            "ui": {
                "theme": "invalid_theme",  # Invalid
                "session_duration": 500  # Invalid
            }
        }

        with open(config_file, 'w') as f:
            json.dump(invalid_config, f, indent=2)

        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        error_message = str(exc_info.value)

        # Should contain multiple error messages
        assert "temperature must be between 0.0 and 2.0" in error_message
        assert "max_tokens must be between 1 and 32768" in error_message
        assert "providers section must be a dictionary" in error_message
        assert "Provider configurations found at wrong level" in error_message
        assert "theme must be one of: light, dark, auto" in error_message
        assert "Session duration must be between 15 and 180 minutes" in error_message

    @pytest.mark.unit
    def test_rollback_preserves_file_state(self, temp_config_dir, valid_initial_config):
        """Test that rollback preserves the original file state."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        # Read original file content
        with open(config_file, 'r') as f:
            original_content = f.read()

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Try to make invalid changes
        with pytest.raises(ValidationError):
            config_manager.set("ai.temperature", 10.0)

        # File content should be unchanged
        with open(config_file, 'r') as f:
            current_content = f.read()

        assert current_content == original_content

    @pytest.mark.unit
    def test_nested_validation_error_rollback(self, temp_config_dir, valid_initial_config):
        """Test rollback for deeply nested validation errors."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Create nested provider configuration
        nested_provider_config = {
            "api_key": "sk-nested-key",
            "nested_config": {
                "level1": {
                    "level2": {
                        "level3": {
                            "value": "deep_value"
                        }
                    }
                }
            }
        }

        config_manager.add_provider_config("nested_provider", nested_provider_config)

        # Verify nested provider was added
        assert config_manager.has_provider_config("nested_provider") is True
        deep_value = config_manager.get("ai.providers.nested_provider.nested_config.level1.level2.level3.value")
        assert deep_value == "deep_value"

        # Now try to make an invalid change
        with pytest.raises(ValidationError):
            config_manager.set("ai.temperature", 5.0)

        # Nested provider should be preserved (rollback only affects the failed operation)
        assert config_manager.has_provider_config("nested_provider") is True
        deep_value = config_manager.get("ai.providers.nested_provider.nested_config.level1.level2.level3.value")
        assert deep_value == "deep_value"

    @pytest.mark.unit
    def test_provider_removal_rollback_on_save_error(self, temp_config_dir, valid_initial_config):
        """Test rollback when provider removal fails during save."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        original_providers = config_manager.get_configured_providers()

        # Mock save error during provider removal
        with patch.object(config_manager, 'save_config', side_effect=IOError("Save failed")):
            with pytest.raises(IOError):
                config_manager.remove_provider_config("openai")

        # Provider should not be removed due to save error
        assert config_manager.has_provider_config("openai") is True
        assert config_manager.get_configured_providers() == original_providers

    @pytest.mark.unit
    def test_batch_operations_rollback(self, temp_config_dir, valid_initial_config):
        """Test rollback for multiple operations in sequence."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Store original state
        original_state = {
            "temperature": config_manager.get("ai.temperature"),
            "theme": config_manager.get("ui.theme"),
            "timeout": config_manager.get("learning.session_timeout_minutes"),
            "providers": set(config_manager.get_configured_providers())
        }

        # Perform multiple operations, with the last one invalid
        try:
            config_manager.set("ai.temperature", 0.8)  # Valid
            config_manager.set("ui.theme", "light")  # Valid
            config_manager.add_provider_config("test_provider", {"api_key": "sk-test"})  # Valid
            config_manager.set("learning.session_timeout_minutes", 1000)  # Invalid - should cause rollback
        except ValidationError:
            pass  # Expected

        # Verify complete rollback to original state
        assert config_manager.get("ai.temperature") == original_state["temperature"]
        assert config_manager.get("ui.theme") == original_state["theme"]
        assert config_manager.get("learning.session_timeout_minutes") == original_state["timeout"]
        assert set(config_manager.get_configured_providers()) == original_state["providers"]

    @pytest.mark.unit
    def test_rollback_with_complex_data_types(self, temp_config_dir, valid_initial_config):
        """Test rollback preservation of complex data types."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(valid_initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Add complex provider configuration
        complex_config = {
            "api_key": "sk-complex-key",
            "complex_data": {
                "list": [1, 2, 3, "string", True],
                "dict": {"nested": "value", "number": 42},
                "null_value": None
            }
        }

        config_manager.add_provider_config("complex_provider", complex_config)

        # Verify complex data was added
        retrieved_config = config_manager.get_provider_config("complex_provider")
        assert retrieved_config == complex_config

        # Try invalid operation
        with pytest.raises(ValidationError):
            config_manager.set("ai.temperature", 5.0)

        # Complex data should be preserved
        retrieved_config_after_rollback = config_manager.get_provider_config("complex_provider")
        assert retrieved_config_after_rollback == complex_config