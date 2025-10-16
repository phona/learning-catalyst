"""
Fixed tests for ConfigManager with correct imports and updated method names.

These tests have been updated to match the actual ConfigManager implementation
in src.core.config and focus on testing the actual available functionality.
"""

import pytest
import json
import tempfile
from pathlib import Path
from typing import Dict, Any
from unittest.mock import patch

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestConfigManagerFixed:
    """Test cases for ConfigManager with correct implementation."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary directory for configuration files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def sample_config_data(self):
        """Sample configuration data for testing."""
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
    def test_config_manager_initialization_with_custom_dir(self, temp_config_dir):
        """Test that config manager can be initialized with custom directory."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Should load defaults
        assert config_manager.get("ai.default_provider") == "deepseek"
        assert config_manager.get("ai.temperature") == 0.7
        assert config_manager.get("ui.theme") == "dark"

        # Config file should not exist initially (defaults are in memory)
        config_file = temp_config_dir / "config.json"
        assert not config_file.exists()

    @pytest.mark.unit
    def test_config_manager_default_initialization(self):
        """Test that config manager can be initialized with default directory."""
        config_manager = ConfigManager()
        config = config_manager.get_all()

        # Should have all required sections
        assert "ai" in config
        assert "learning" in config
        assert "ui" in config
        assert "privacy" in config
        assert "performance" in config

        # Should have sensible defaults
        assert config["ai"]["default_provider"] == "deepseek"
        assert config["learning"]["difficulty"] == "adaptive"
        assert config["ui"]["theme"] == "dark"

    @pytest.mark.unit
    def test_config_manager_get_section(self, temp_config_dir, sample_config_data):
        """Test that config manager can retrieve specific configuration sections."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test getting AI configuration
        ai_config = config_manager.get_section("ai")
        assert ai_config == sample_config_data["ai"]
        assert ai_config["default_provider"] == "openai"

        # Test getting learning configuration
        learning_config = config_manager.get_section("learning")
        assert learning_config == sample_config_data["learning"]
        assert learning_config["difficulty"] == "adaptive"

        # Test invalid section (should return empty dict)
        invalid_section = config_manager.get_section("invalid_section")
        assert invalid_section == {}

    @pytest.mark.unit
    def test_config_manager_get_dot_notation(self, temp_config_dir, sample_config_data):
        """Test that config manager can get values using dot notation."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test nested access
        assert config_manager.get("ai.default_provider") == "openai"
        assert config_manager.get("ai.temperature") == 0.7
        assert config_manager.get("learning.difficulty") == "adaptive"
        assert config_manager.get("ui.theme") == "dark"

        # Test default value for missing key
        assert config_manager.get("ai.nonexistent", "default") == "default"
        assert config_manager.get("nonexistent.path", "default") == "default"

    @pytest.mark.unit
    def test_config_manager_set_dot_notation(self, temp_config_dir, sample_config_data):
        """Test that config manager can set values using dot notation."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test setting nested values
        config_manager.set("ai.temperature", 0.9)
        assert config_manager.get("ai.temperature") == 0.9

        config_manager.set("learning.difficulty", "advanced")
        assert config_manager.get("learning.difficulty") == "advanced"

        # Test creating new nested paths
        config_manager.set("ai.new_field", "new_value")
        assert config_manager.get("ai.new_field") == "new_value"

        config_manager.set("new_section.new_field", "value")
        assert config_manager.get("new_section.new_field") == "value"

    @pytest.mark.unit
    def test_config_manager_update_section(self, temp_config_dir, sample_config_data):
        """Test that config manager can update entire configuration sections."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Update AI section
        new_ai_config = {
            "default_provider": "deepseek",
            "temperature": 0.5,
            "max_tokens": 2048,
            "new_setting": "test_value"
        }

        config_manager.update_section("ai", new_ai_config)

        updated_ai = config_manager.get_section("ai")
        assert updated_ai["default_provider"] == "deepseek"
        assert updated_ai["temperature"] == 0.5
        assert updated_ai["max_tokens"] == 2048
        assert updated_ai["new_setting"] == "test_value"

    @pytest.mark.unit
    def test_config_manager_validation_on_update(self, temp_config_dir, sample_config_data):
        """Test that config manager validates configuration on updates."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Store original values
        original_temp = config_manager.get("ai.temperature")
        original_timeout = config_manager.get("learning.session_timeout_minutes")

        # Test invalid temperature update
        with pytest.raises(ValidationError) as exc_info:
            config_manager.set("ai.temperature", 3.0)

        assert "AI temperature must be between 0.0 and 2.0" in str(exc_info.value)

        # Test invalid session timeout
        with pytest.raises(ValidationError) as exc_info:
            config_manager.set("learning.session_timeout_minutes", 500)

        assert "Session timeout must be between 5 and 480 minutes" in str(exc_info.value)

        # Original values should be preserved
        assert config_manager.get("ai.temperature") == original_temp
        assert config_manager.get("learning.session_timeout_minutes") == original_timeout

    @pytest.mark.unit
    def test_config_manager_file_persistence(self, temp_config_dir, sample_config_data):
        """Test that config manager can persist configuration to files."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Add provider configuration
        config_manager.add_provider_config("test_provider", {
            "api_key": "sk-test-key",
            "base_url": "https://test.example.com"
        })

        # Modify some settings
        config_manager.set("ai.temperature", 0.9)
        config_manager.set("ui.theme", "light")

        # Save configuration
        config_manager.save_config()

        config_file = temp_config_dir / "config.json"
        assert config_file.exists()
        assert config_file.stat().st_size > 0

        # Verify file content
        with open(config_file, 'r') as f:
            saved_data = json.load(f)

        assert saved_data["ai"]["temperature"] == 0.9
        assert saved_data["ui"]["theme"] == "light"
        assert "test_provider" in saved_data["ai"]["providers"]

    @pytest.mark.unit
    def test_config_manager_file_loading(self, temp_config_dir, sample_config_data):
        """Test that config manager can load configuration from files."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        # Load configuration
        config_manager = ConfigManager(config_dir=temp_config_dir)

        assert config_manager.get("ai.default_provider") == "openai"
        assert config_manager.get("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_config_manager_environment_override(self, temp_config_dir, monkeypatch):
        """Test that config manager applies environment variable overrides."""
        # Set environment variables
        monkeypatch.setenv("CATALYST_AI_PROVIDER", "openai")
        monkeypatch.setenv("CATALYST_AI_TEMPERATURE", "0.9")
        monkeypatch.setenv("CATALYST_UI_THEME", "light")
        monkeypatch.setenv("CATALYST_SESSION_DURATION", "60")

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Environment variables should override defaults
        assert config_manager.get("ai.default_provider") == "openai"
        assert config_manager.get("ai.temperature") == 0.9
        assert config_manager.get("ui.theme") == "light"
        assert config_manager.get("ui.session_duration") == 60

    @pytest.mark.unit
    def test_config_manager_provider_operations(self, temp_config_dir):
        """Test provider management operations."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test empty providers
        assert config_manager.get_configured_providers() == []
        assert not config_manager.has_provider_config("any_provider")

        # Add provider
        provider_config = {
            "api_key": "sk-test-key",
            "base_url": "https://test.example.com",
            "timeout": 30
        }

        config_manager.add_provider_config("test_provider", provider_config)

        # Verify provider was added
        assert config_manager.has_provider_config("test_provider") is True
        assert config_manager.get_configured_providers() == ["test_provider"]
        assert config_manager.get_provider_config("test_provider") == provider_config

        # Update provider
        updated_config = {
            "api_key": "sk-updated-key",
            "base_url": "https://updated.example.com"
        }

        config_manager.add_provider_config("test_provider", updated_config)
        assert config_manager.get_provider_config("test_provider") == updated_config

        # Remove provider
        result = config_manager.remove_provider_config("test_provider")
        assert result is True
        assert not config_manager.has_provider_config("test_provider")
        assert config_manager.get_configured_providers() == []

        # Try to remove non-existent provider
        result = config_manager.remove_provider_config("nonexistent")
        assert result is False

    @pytest.mark.unit
    def test_config_manager_get_all(self, temp_config_dir, sample_config_data):
        """Test getting complete configuration dictionary."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)
        all_config = config_manager.get_all()

        # Should return complete configuration
        assert "ai" in all_config
        assert "ui" in all_config
        assert "learning" in all_config
        assert "privacy" in all_config
        assert "performance" in all_config

        # Should be a copy (modifying returned config shouldn't affect internal state)
        all_config["ai"]["temperature"] = 999
        assert config_manager.get("ai.temperature") != 999

    @pytest.mark.unit
    def test_config_manager_merge_functionality(self, temp_config_dir, sample_config_data):
        """Test configuration merge functionality through _merge_config."""
        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Create file with additional configuration
        additional_config = {
            "ai": {
                "temperature": 0.9,  # Override existing
                "new_field": "new_value"  # Add new
            },
            "new_section": {  # Add new section
                "field1": "value1"
            }
        }

        with open(config_file, 'w') as f:
            # Merge existing and new config
            merged_config = sample_config_data.copy()
            config_manager._merge_config(merged_config, additional_config)
            json.dump(merged_config, f, indent=2)

        # Reload and verify merge worked
        config_manager2 = ConfigManager(config_dir=temp_config_dir)

        assert config_manager2.get("ai.temperature") == 0.9  # Overridden
        assert config_manager2.get("ai.new_field") == "new_value"  # Added
        assert config_manager2.get("ai.default_provider") == "openai"  # Preserved
        assert config_manager2.get("new_section.field1") == "value1"  # New section

    @pytest.mark.unit
    def test_config_manager_validation_comprehensive(self, temp_config_dir):
        """Test comprehensive validation of configuration values."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Test valid values that should pass
        valid_updates = [
            ("ai.temperature", 0.0),
            ("ai.temperature", 2.0),
            ("ai.temperature", 1.5),
            ("ai.max_tokens", 1),
            ("ai.max_tokens", 32768),
            ("ui.theme", "light"),
            ("ui.theme", "dark"),
            ("ui.theme", "auto"),
            ("learning.difficulty", "beginner"),
            ("learning.difficulty", "intermediate"),
            ("learning.difficulty", "advanced"),
            ("learning.difficulty", "adaptive"),
        ]

        for key, value in valid_updates:
            config_manager.set(key, value)
            assert config_manager.get(key) == value

        # Test invalid values that should fail
        invalid_updates = [
            ("ai.temperature", -0.1),
            ("ai.temperature", 2.1),
            ("ai.max_tokens", 0),
            ("ai.max_tokens", 32769),
            ("ui.theme", "invalid"),
            ("learning.difficulty", "invalid"),
        ]

        for key, value in invalid_updates:
            with pytest.raises(ValidationError):
                config_manager.set(key, value)

    @pytest.mark.unit
    def test_config_manager_missing_sections_handling(self, temp_config_dir):
        """Test handling of missing configuration sections."""
        # Create config with missing sections
        partial_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7
                # Missing providers section
            }
            # Missing other sections
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(partial_config, f, indent=2)

        # Should raise validation error for missing providers section
        with pytest.raises(ValidationError) as exc_info:
            ConfigManager(config_dir=temp_config_dir)

        assert "must contain a 'providers' section" in str(exc_info.value)

    @pytest.mark.unit
    def test_config_manager_concurrent_access_simulation(self, temp_config_dir):
        """Test simulation of concurrent access scenarios."""
        config_file = temp_config_dir / "config.json"

        # Create initial config
        config_manager1 = ConfigManager(config_dir=temp_config_dir)
        config_manager1.add_provider_config("concurrent_test", {"api_key": "sk-key1"})

        # Create second manager
        config_manager2 = ConfigManager(config_dir=temp_config_dir)

        # Both should see the provider
        assert config_manager1.has_provider_config("concurrent_test") is True
        assert config_manager2.has_provider_config("concurrent_test") is True

        # Make changes with first manager
        config_manager1.set("ai.temperature", 0.8)
        config_manager1.add_provider_config("another_provider", {"api_key": "sk-key2"})

        # Second manager should still see old state until reload
        assert config_manager2.get("ai.temperature") == 0.7  # Default value

        # Reload second manager
        config_manager2_reloaded = ConfigManager(config_dir=temp_config_dir)
        assert config_manager2_reloaded.get("ai.temperature") == 0.8
        assert config_manager2_reloaded.has_provider_config("another_provider") is True