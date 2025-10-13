"""
TDD tests for Configuration Manager.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Configuration Manager before implementation. Tests cover configuration validation,
hierarchical management, file operations, and real-time updates.
"""

import pytest
import json
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from unittest.mock import Mock, patch
from tests.test_helpers import (
    assert_valid_config_structure,
    generate_mock_config,
    generate_edge_case_configs,
    assert_raises_specific_error,
    create_temp_config_file,
    create_temp_workspace
)


class TestConfigManager:
    """Test cases for Configuration Manager following TDD principles."""

    @pytest.mark.unit
    def test_config_manager_initialization(self, sample_config_data):
        """Test that config manager can be initialized with valid data (TDD: Red phase)."""
        # This test will initially fail until ConfigManager is implemented
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        assert config_manager.get_all_configuration() == sample_config_data
        assert_valid_config_structure(config_manager.get_all_configuration())

    @pytest.mark.unit
    def test_config_manager_default_initialization(self):
        """Test that config manager can be initialized with defaults."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager()
        config = config_manager.get_all_configuration()

        # Should have all required sections
        assert "ai" in config
        assert "learning" in config
        assert "ui" in config
        assert "privacy" in config
        assert "performance" in config

        # Should have sensible defaults
        assert config["ai"]["default_provider"] == "openai"
        assert config["learning"]["difficulty"] == "adaptive"
        assert config["ui"]["theme"] == "dark"

    @pytest.mark.unit
    def test_config_manager_get_configuration_section(self, sample_config_data):
        """Test that config manager can retrieve specific configuration sections."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Test getting AI configuration
        ai_config = config_manager.get_configuration_section("ai")
        assert ai_config == sample_config_data["ai"]
        assert ai_config["default_provider"] == "openai"

        # Test getting learning configuration
        learning_config = config_manager.get_configuration_section("learning")
        assert learning_config == sample_config_data["learning"]
        assert learning_config["difficulty"] == "adaptive"

        # Test invalid section
        with pytest.raises(ValueError, match="Invalid configuration section"):
            config_manager.get_configuration_section("invalid_section")

    @pytest.mark.unit
    def test_config_manager_get_preference_dot_notation(self, sample_config_data):
        """Test that config manager can get preferences using dot notation."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Test nested access
        assert config_manager.get_preference("ai.default_provider") == "openai"
        assert config_manager.get_preference("ai.temperature") == 0.7
        assert config_manager.get_preference("learning.difficulty") == "adaptive"
        assert config_manager.get_preference("ui.theme") == "dark"

        # Test default value for missing key
        assert config_manager.get_preference("ai.nonexistent", "default") == "default"
        assert config_manager.get_preference("nonexistent.path", "default") == "default"

    @pytest.mark.unit
    def test_config_manager_set_preference_dot_notation(self, sample_config_data):
        """Test that config manager can set preferences using dot notation."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Test setting nested values
        config_manager.set_preference("ai.temperature", 0.9)
        assert config_manager.get_preference("ai.temperature") == 0.9

        config_manager.set_preference("learning.difficulty", "advanced")
        assert config_manager.get_preference("learning.difficulty") == "advanced"

        # Test creating new nested paths
        config_manager.set_preference("ai.new_field", "new_value")
        assert config_manager.get_preference("ai.new_field") == "new_value"

        config_manager.set_preference("new_section.new_field", "value")
        assert config_manager.get_preference("new_section.new_field") == "value"

    @pytest.mark.unit
    def test_config_manager_update_configuration_section(self, sample_config_data):
        """Test that config manager can update entire configuration sections."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Update AI section
        new_ai_config = {
            "default_provider": "deepseek",
            "temperature": 0.5,
            "max_tokens": 2048,
            "new_setting": "test_value"
        }

        config_manager.update_configuration_section("ai", new_ai_config)

        updated_ai = config_manager.get_configuration_section("ai")
        assert updated_ai["default_provider"] == "deepseek"
        assert updated_ai["temperature"] == 0.5
        assert updated_ai["max_tokens"] == 2048
        assert updated_ai["new_setting"] == "test_value"

    @pytest.mark.unit
    def test_config_manager_validation_on_update(self, sample_config_data):
        """Test that config manager validates configuration on updates."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Test invalid temperature update
        with pytest.raises(ValueError, match="AI temperature must be between 0.0 and 2.0"):
            config_manager.set_preference("ai.temperature", 3.0)

        # Test invalid session timeout
        with pytest.raises(ValueError, match="Session timeout must be between 5 and 480 minutes"):
            config_manager.set_preference("learning.session_timeout_minutes", 500)

        # Original values should be preserved
        assert config_manager.get_preference("ai.temperature") == 0.7
        assert config_manager.get_preference("learning.session_timeout_minutes") == 120

    @pytest.mark.unit
    def test_config_manager_file_persistence(self, sample_config_data, config_dir):
        """Test that config manager can persist configuration to files."""
        from src.core.configuration.config_manager import ConfigManager

        config_file = config_dir / "config.json"
        config_manager = ConfigManager(sample_config_data, config_file=config_file)

        # Save configuration
        config_manager.save_configuration()

        assert config_file.exists()
        assert config_file.stat().st_size > 0

        # Verify file content
        with open(config_file, 'r') as f:
            saved_data = json.load(f)

        assert saved_data["ai"]["default_provider"] == "openai"
        assert saved_data["learning"]["difficulty"] == "adaptive"

    @pytest.mark.unit
    def test_config_manager_file_loading(self, sample_config_data, config_dir):
        """Test that config manager can load configuration from files."""
        from src.core.configuration.config_manager import ConfigManager

        # Create config file
        config_file = config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(sample_config_data, f, indent=2)

        # Load configuration
        config_manager = ConfigManager.load_from_file(config_file)

        assert config_manager.get_preference("ai.default_provider") == "openai"
        assert config_manager.get_preference("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_config_manager_hot_reload(self, sample_config_data, config_dir):
        """Test that config manager can hot-reload configuration changes."""
        from src.core.configuration.config_manager import ConfigManager
        import time

        config_file = config_dir / "config.json"
        config_manager = ConfigManager(sample_config_data, config_file=config_file)
        config_manager.save_configuration()

        # Modify file externally
        modified_data = sample_config_data.copy()
        modified_data["ai"]["temperature"] = 0.99
        modified_data["learning"]["difficulty"] = "expert"

        with open(config_file, 'w') as f:
            json.dump(modified_data, f, indent=2)

        # Hot reload should detect changes
        time.sleep(0.01)  # Ensure file timestamp changes
        reloaded = config_manager.reload_configuration()

        assert reloaded.get_preference("ai.temperature") == 0.99
        assert reloaded.get_preference("learning.difficulty") == "expert"

    @pytest.mark.unit
    def test_config_manager_environment_override(self, monkeypatch):
        """Test that config manager applies environment variable overrides."""
        from src.core.configuration.config_manager import ConfigManager

        # Set environment variables
        monkeypatch.setenv("LEARNING_CATALYST_AI_PROVIDER", "deepseek")
        monkeypatch.setenv("LEARNING_CATALYST_AI_TEMPERATURE", "0.9")
        monkeypatch.setenv("LEARNING_CATALYST_LEARNING_DIFFICULTY", "advanced")
        monkeypatch.setenv("LEARNING_CATALYST_UI_THEME", "light")

        config_manager = ConfigManager()
        config_manager.apply_environment_overrides()

        # Environment variables should override defaults
        assert config_manager.get_preference("ai.default_provider") == "deepseek"
        assert config_manager.get_preference("ai.temperature") == 0.9
        assert config_manager.get_preference("learning.difficulty") == "advanced"
        assert config_manager.get_preference("ui.theme") == "light"

    @pytest.mark.unit
    def test_config_manager_change_tracking(self, sample_config_data):
        """Test that config manager tracks configuration changes."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Track initial state
        initial_changes = config_manager.get_changes_since_start()
        assert len(initial_changes) == 0

        # Make changes
        config_manager.set_preference("ai.temperature", 0.8)
        config_manager.set_preference("learning.difficulty", "advanced")
        config_manager.set_preference("ui.new_setting", "test")

        # Get changes
        changes = config_manager.get_changes_since_start()

        assert len(changes) == 3
        assert any(change["path"] == "ai.temperature" and change["new_value"] == 0.8 for change in changes)
        assert any(change["path"] == "learning.difficulty" and change["new_value"] == "advanced" for change in changes)
        assert any(change["path"] == "ui.new_setting" and change["new_value"] == "test" for change in changes)

    @pytest.mark.unit
    def test_config_manager_checkpoint_rollback(self, sample_config_data):
        """Test that config manager can create checkpoints and rollback."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Create checkpoint
        checkpoint = config_manager.create_checkpoint("test_checkpoint")
        assert checkpoint["name"] == "test_checkpoint"
        assert checkpoint["timestamp"] is not None
        assert "configuration_snapshot" in checkpoint

        # Make changes
        config_manager.set_preference("ai.temperature", 1.0)
        config_manager.set_preference("learning.difficulty", "expert")
        config_manager.set_preference("ui.new_field", "test")

        # Verify changes
        assert config_manager.get_preference("ai.temperature") == 1.0
        assert config_manager.get_preference("learning.difficulty") == "expert"
        assert config_manager.get_preference("ui.new_field") == "test"

        # Rollback to checkpoint
        config_manager.rollback_to_checkpoint("test_checkpoint")

        # Should have original values
        assert config_manager.get_preference("ai.temperature") == 0.7
        assert config_manager.get_preference("learning.difficulty") == "adaptive"
        assert config_manager.get_preference("ui.new_field") is None

    @pytest.mark.unit
    def test_config_manager_backup_restore(self, sample_config_data, config_dir):
        """Test that config manager can backup and restore configuration."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Create backup
        backup_file = config_dir / "backup.json"
        config_manager.create_backup(backup_file)

        assert backup_file.exists()

        # Modify configuration
        config_manager.set_preference("ai.temperature", 1.0)
        config_manager.set_preference("learning.difficulty", "expert")

        # Restore from backup
        config_manager.restore_from_backup(backup_file)

        # Should have original values
        assert config_manager.get_preference("ai.temperature") == 0.7
        assert config_manager.get_preference("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_config_manager_encryption_sensitive_data(self, sample_config_data):
        """Test that config manager can encrypt sensitive configuration data."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Add sensitive data
        config_manager.set_preference("ai.api_key", "sk-sensitive-key-12345")
        config_manager.set_preference("ai.secret_token", "token-secret-67890")

        # Encrypt sensitive fields
        config_manager.encrypt_sensitive_fields()

        # Check that sensitive fields are encrypted
        api_key = config_manager.get_preference("ai.api_key")
        secret_token = config_manager.get_preference("ai.secret_token")

        assert api_key != "sk-sensitive-key-12345"
        assert secret_token != "token-secret-67890"
        assert "encrypted:" in api_key
        assert "encrypted:" in secret_token

        # Decrypt and verify
        config_manager.decrypt_sensitive_fields()
        assert config_manager.get_preference("ai.api_key") == "sk-sensitive-key-12345"
        assert config_manager.get_preference("ai.secret_token") == "token-secret-67890"

    @pytest.mark.unit
    def test_config_manager_schema_validation(self, sample_config_data):
        """Test that config manager validates configuration against schema."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Valid configuration should pass
        validation_result = config_manager.validate_configuration()
        assert validation_result["is_valid"] is True
        assert len(validation_result["errors"]) == 0

        # Add invalid configuration
        config_manager.set_preference("ai.temperature", 3.0)  # Invalid
        config_manager.set_preference("learning.session_timeout_minutes", 500)  # Invalid

        validation_result = config_manager.validate_configuration()
        assert validation_result["is_valid"] is False
        assert len(validation_result["errors"]) == 2

    @pytest.mark.unit
    def test_config_manager_import_export(self, sample_config_data, config_dir):
        """Test that config manager can import and export configuration."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Export to JSON
        json_file = config_dir / "export.json"
        config_manager.export_to_file(json_file, format="json")
        assert json_file.exists()

        # Export to YAML
        yaml_file = config_dir / "export.yaml"
        config_manager.export_to_file(yaml_file, format="yaml")
        assert yaml_file.exists()

        # Import from JSON
        imported_manager = ConfigManager.import_from_file(json_file, format="json")
        assert imported_manager.get_preference("ai.default_provider") == "openai"

        # Import from YAML
        imported_yaml_manager = ConfigManager.import_from_file(yaml_file, format="yaml")
        assert imported_yaml_manager.get_preference("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_config_manager_merge_configuration(self, sample_config_data):
        """Test that config manager can merge configuration updates."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Merge updates
        merge_data = {
            "ai": {
                "temperature": 0.9,  # Update existing
                "top_p": 0.95,        # Add new
                "frequency_penalty": 0.1  # Add new
            },
            "learning": {
                "new_setting": "value"  # Add new to learning
            },
            "new_section": {
                "field1": "value1",
                "field2": "value2"
            }
        }

        config_manager.merge_configuration(merge_data)

        # Check merged values
        assert config_manager.get_preference("ai.temperature") == 0.9
        assert config_manager.get_preference("ai.top_p") == 0.95
        assert config_manager.get_preference("ai.frequency_penalty") == 0.1
        assert config_manager.get_preference("learning.new_setting") == "value"
        assert config_manager.get_preference("new_section.field1") == "value1"

        # Check preserved values
        assert config_manager.get_preference("ai.default_provider") == "openai"
        assert config_manager.get_preference("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_config_manager_reset_configuration(self, sample_config_data):
        """Test that config manager can reset configuration to defaults."""
        from src.core.configuration.config_manager import ConfigManager

        config_manager = ConfigManager(sample_config_data)

        # Modify configuration
        config_manager.set_preference("ai.temperature", 1.0)
        config_manager.set_preference("learning.difficulty", "expert")
        config_manager.set_preference("new_section.field", "value")

        # Reset AI section
        config_manager.reset_configuration_section("ai")

        # AI section should be reset to defaults
        assert config_manager.get_preference("ai.temperature") == 0.7
        assert config_manager.get_preference("ai.default_provider") == "openai"

        # Other sections should be preserved
        assert config_manager.get_preference("learning.difficulty") == "expert"
        assert config_manager.get_preference("new_section.field") == "value"

        # Reset all configuration
        config_manager.reset_all_configuration()

        # Everything should be reset to defaults
        assert config_manager.get_preference("ai.temperature") == 0.7
        assert config_manager.get_preference("learning.difficulty") == "adaptive"
        assert config_manager.get_preference("new_section.field") is None

    @pytest.mark.unit
    def test_config_manager_concurrent_access(self, sample_config_data):
        """Test that config manager handles concurrent access safely."""
        from src.core.configuration.config_manager import ConfigManager
        import threading
        import time

        config_manager = ConfigManager(sample_config_data)

        def update_config(thread_id):
            for i in range(10):
                config_manager.set_preference(f"thread_{thread_id}.value", i)
                time.sleep(0.001)

        # Create multiple threads updating configuration
        threads = []
        for i in range(3):
            thread = threading.Thread(target=update_config, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All updates should be applied
        for thread_id in range(3):
            for i in range(10):
                value = config_manager.get_preference(f"thread_{thread_id}.value")
                assert value is not None

    @pytest.mark.unit
    def test_config_manager_watch_file_changes(self, sample_config_data, config_dir):
        """Test that config manager can watch for file changes."""
        from src.core.configuration.config_manager import ConfigManager
        import time

        config_file = config_dir / "config.json"
        config_manager = ConfigManager(sample_config_data, config_file=config_file)

        # Enable file watching
        change_detected = False
        def on_change(changes):
            nonlocal change_detected
            change_detected = True

        config_manager.watch_file_changes(on_change)

        # Modify file
        modified_data = sample_config_data.copy()
        modified_data["ai"]["temperature"] = 0.99

        with open(config_file, 'w') as f:
            json.dump(modified_data, f, indent=2)

        # Wait for change detection
        time.sleep(0.1)

        assert change_detected is True

    @pytest.mark.unit
    def test_config_manager_edge_cases(self, generate_edge_case_configs):
        """Test that config manager handles edge case configurations."""
        from src.core.configuration.config_manager import ConfigManager

        for edge_config in generate_edge_case_configs():
            # Should handle edge cases gracefully
            config_manager = ConfigManager(edge_config)
            config = config_manager.get_all_configuration()
            assert_valid_config_structure(config)