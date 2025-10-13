"""
TDD tests for Configuration data model.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Configuration entity before implementation. Tests cover configuration validation,
hierarchical management, and real-time updates based on the API documentation.
"""

import pytest
import json
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from tests.test_helpers import (
    assert_valid_config_structure,
    generate_mock_config,
    generate_edge_case_configs,
    assert_raises_specific_error,
    create_temp_config_file
)


class TestConfigurationModel:
    """Test cases for Configuration data model following TDD principles."""

    @pytest.mark.unit
    def test_configuration_creation_with_valid_data(self, sample_config_data):
        """Test that configuration can be created with valid data (TDD: Red phase)."""
        # This test will initially fail until Configuration model is implemented
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Validate configuration structure
        assert_valid_config_structure(config.to_dict())
        assert config.ai["default_provider"] == sample_config_data["ai"]["default_provider"]

    @pytest.mark.unit
    def test_configuration_validation_required_sections(self):
        """Test that configuration validation enforces required sections."""
        from src.data.models.configuration import Configuration

        # Test missing required sections
        with pytest.raises(ValueError, match="Missing required configuration section: ai"):
            Configuration({
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        with pytest.raises(ValueError, match="Missing required configuration section: learning"):
            Configuration({
                "ai": {"default_provider": "openai"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

    @pytest.mark.unit
    def test_ai_configuration_validation(self):
        """Test that AI configuration fields are properly validated."""
        from src.data.models.configuration import Configuration

        # Test temperature validation
        with pytest.raises(ValueError, match="AI temperature must be between 0.0 and 2.0"):
            Configuration({
                "ai": {"temperature": 2.5, "default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        with pytest.raises(ValueError, match="AI temperature must be between 0.0 and 2.0"):
            Configuration({
                "ai": {"temperature": -0.1, "default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        # Test max_tokens validation
        with pytest.raises(ValueError, match="AI max_tokens must be between 1 and 32768"):
            Configuration({
                "ai": {"max_tokens": 0, "default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        with pytest.raises(ValueError, match="AI max_tokens must be between 1 and 32768"):
            Configuration({
                "ai": {"max_tokens": 50000, "default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

    @pytest.mark.unit
    def test_learning_configuration_validation(self):
        """Test that learning configuration fields are properly validated."""
        from src.data.models.configuration import Configuration

        # Test session timeout validation
        with pytest.raises(ValueError, match="Session timeout must be between 5 and 480 minutes"):
            Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"session_timeout_minutes": 4},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        with pytest.raises(ValueError, match="Session timeout must be between 5 and 480 minutes"):
            Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"session_timeout_minutes": 500},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        # Test difficulty validation
        valid_difficulties = ["beginner", "intermediate", "advanced", "adaptive"]
        for difficulty in valid_difficulties:
            config = Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"difficulty": difficulty},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })
            assert config.learning["difficulty"] == difficulty

        # Test invalid difficulty
        with pytest.raises(ValueError, match="Invalid difficulty level"):
            Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"difficulty": "invalid"},
                "ui": {"theme": "dark"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

    @pytest.mark.unit
    def test_ui_configuration_validation(self):
        """Test that UI configuration fields are properly validated."""
        from src.data.models.configuration import Configuration

        # Test theme validation
        valid_themes = ["light", "dark", "auto"]
        for theme in valid_themes:
            config = Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": theme},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })
            assert config.ui["theme"] == theme

        # Test invalid theme
        with pytest.raises(ValueError, match="Invalid theme"):
            Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"theme": "invalid"},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

        # Test session duration validation
        with pytest.raises(ValueError, match="Session duration must be between 15 and 180 minutes"):
            Configuration({
                "ai": {"default_provider": "openai"},
                "learning": {"difficulty": "adaptive"},
                "ui": {"session_duration": 10},
                "privacy": {"store_conversations": True},
                "performance": {"cache_enabled": True}
            })

    @pytest.mark.unit
    def test_configuration_dot_notation_access(self, sample_config_data):
        """Test that configuration values can be accessed using dot notation."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Test nested access
        assert config.get("ai.default_provider") == "openai"
        assert config.get("ai.temperature") == 0.7
        assert config.get("learning.difficulty") == "adaptive"
        assert config.get("ui.theme") == "dark"

        # Test default value
        assert config.get("ai.nonexistent", "default") == "default"
        assert config.get("nonexistent.path", "default") == "default"

    @pytest.mark.unit
    def test_configuration_dot_notation_update(self, sample_config_data):
        """Test that configuration values can be updated using dot notation."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Update nested values
        config.set("ai.temperature", 0.8)
        assert config.get("ai.temperature") == 0.8

        config.set("learning.difficulty", "advanced")
        assert config.get("learning.difficulty") == "advanced"

        # Create new nested path
        config.set("ai.new_field", "new_value")
        assert config.get("ai.new_field") == "new_value"

    @pytest.mark.unit
    def test_configuration_section_retrieval(self, sample_config_data):
        """Test that configuration sections can be retrieved."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Test section retrieval
        ai_section = config.get_section("ai")
        assert "default_provider" in ai_section
        assert "temperature" in ai_section

        learning_section = config.get_section("learning")
        assert "difficulty" in learning_section
        assert "auto_save" in learning_section

        # Test invalid section
        with pytest.raises(ValueError, match="Invalid configuration section"):
            config.get_section("invalid_section")

    @pytest.mark.unit
    def test_configuration_section_update(self, sample_config_data):
        """Test that configuration sections can be updated."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Update entire section
        new_ai_config = {
            "default_provider": "deepseek",
            "temperature": 0.5,
            "max_tokens": 2048
        }
        config.set_section("ai", new_ai_config)

        updated_ai = config.get_section("ai")
        assert updated_ai["default_provider"] == "deepseek"
        assert updated_ai["temperature"] == 0.5
        assert updated_ai["max_tokens"] == 2048

    @pytest.mark.unit
    def test_configuration_merge_update(self, sample_config_data):
        """Test that configuration can be merged with updates."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Merge updates
        updates = {
            "ai": {
                "temperature": 0.9,  # Update existing
                "top_p": 0.95        # Add new
            },
            "learning": {
                "new_setting": "value"  # Add new to learning
            }
        }

        config.merge(updates)

        # Check updates
        assert config.get("ai.temperature") == 0.9
        assert config.get("ai.top_p") == 0.95
        assert config.get("learning.new_setting") == "value"

        # Check existing values are preserved
        assert config.get("ai.default_provider") == "openai"
        assert config.get("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_configuration_file_operations(self, sample_config_data, config_dir):
        """Test that configuration can be loaded from and saved to files."""
        from src.data.models.configuration import Configuration

        # Save configuration to file
        config_file = config_dir / "config.json"
        config = Configuration(sample_config_data)
        config.save_to_file(config_file)

        assert config_file.exists()
        assert config_file.stat().st_size > 0

        # Load configuration from file
        loaded_config = Configuration.load_from_file(config_file)
        assert loaded_config.ai["default_provider"] == sample_config_data["ai"]["default_provider"]
        assert loaded_config.learning["difficulty"] == sample_config_data["learning"]["difficulty"]

    @pytest.mark.unit
    def test_configuration_hot_reload(self, sample_config_data, config_dir):
        """Test that configuration can be hot-reloaded from file changes."""
        from src.data.models.configuration import Configuration
        import json
        import time

        config_file = config_dir / "config.json"
        config = Configuration(sample_config_data)
        config.save_to_file(config_file)

        # Modify file externally
        modified_data = sample_config_data.copy()
        modified_data["ai"]["temperature"] = 0.99
        modified_data["learning"]["difficulty"] = "advanced"

        with open(config_file, 'w') as f:
            json.dump(modified_data, f, indent=2)

        # Hot reload should detect changes
        time.sleep(0.01)  # Ensure file timestamp changes
        reloaded = config.reload_from_file(config_file)

        assert reloaded.get("ai.temperature") == 0.99
        assert reloaded.get("learning.difficulty") == "advanced"

    @pytest.mark.unit
    def test_configuration_validation_on_update(self, sample_config_data):
        """Test that configuration validation occurs on updates."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Attempt invalid update
        with pytest.raises(ValueError, match="AI temperature must be between 0.0 and 2.0"):
            config.set("ai.temperature", 3.0)

        # Original value should be preserved
        assert config.get("ai.temperature") == 0.7

    @pytest.mark.unit
    def test_configuration_defaults(self):
        """Test that configuration has sensible defaults."""
        from src.data.models.configuration import Configuration

        config = Configuration()  # Create with defaults

        # Should have all required sections
        assert hasattr(config, 'ai')
        assert hasattr(config, 'learning')
        assert hasattr(config, 'ui')
        assert hasattr(config, 'privacy')
        assert hasattr(config, 'performance')

        # Should have default values
        assert config.get("ai.temperature") == 0.7
        assert config.get("learning.difficulty") == "adaptive"
        assert config.get("ui.theme") == "dark"

    @pytest.mark.unit
    def test_configuration_environment_override(self, monkeypatch):
        """Test that environment variables can override configuration."""
        from src.data.models.configuration import Configuration

        # Set environment variables
        monkeypatch.setenv("LEARNING_CATALYST_AI_PROVIDER", "deepseek")
        monkeypatch.setenv("LEARNING_CATALYST_AI_TEMPERATURE", "0.9")
        monkeypatch.setenv("LEARNING_CATALYST_LEARNING_DIFFICULTY", "advanced")

        config = Configuration()
        config.apply_environment_overrides()

        # Environment variables should override defaults
        assert config.get("ai.default_provider") == "deepseek"
        assert config.get("ai.temperature") == 0.9
        assert config.get("learning.difficulty") == "advanced"

    @pytest.mark.unit
    def test_configuration_schema_validation(self):
        """Test that configuration follows defined schema."""
        from src.data.models.configuration import Configuration

        # This would load a JSON schema and validate against it
        config = Configuration()
        schema_validation = config.validate_against_schema()

        assert schema_validation["valid"] is True
        assert len(schema_validation["errors"]) == 0

    @pytest.mark.unit
    def test_configuration_change_tracking(self, sample_config_data):
        """Test that configuration changes can be tracked."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Track initial state
        initial_state = config.get_changes_since_start()

        # Make some changes
        config.set("ai.temperature", 0.8)
        config.set("learning.difficulty", "advanced")

        # Get changes
        changes = config.get_changes_since_start()

        assert len(changes) == 2
        assert any(change["path"] == "ai.temperature" and change["new_value"] == 0.8 for change in changes)
        assert any(change["path"] == "learning.difficulty" and change["new_value"] == "advanced" for change in changes)

    @pytest.mark.unit
    def test_configuration_rollback(self, sample_config_data):
        """Test that configuration can be rolled back to previous state."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Create checkpoint
        checkpoint = config.create_checkpoint()

        # Make changes
        config.set("ai.temperature", 0.9)
        config.set("learning.difficulty", "expert")

        # Rollback to checkpoint
        config.rollback_to_checkpoint(checkpoint)

        # Should have original values
        assert config.get("ai.temperature") == 0.7
        assert config.get("learning.difficulty") == "adaptive"

    @pytest.mark.unit
    def test_configuration_export_import(self, sample_config_data):
        """Test that configuration can be exported and imported."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Export to different formats
        json_export = config.export_json()
        yaml_export = config.export_yaml()

        # Import from JSON
        imported_config = Configuration.import_json(json_export)
        assert imported_config.ai["default_provider"] == config.ai["default_provider"]

        # Import from YAML
        imported_yaml_config = Configuration.import_yaml(yaml_export)
        assert imported_yaml_config.learning["difficulty"] == config.learning["difficulty"]

    @pytest.mark.unit
    def test_configuration_edge_cases(self, generate_edge_case_configs):
        """Test configuration with edge case values."""
        from src.data.models.configuration import Configuration

        for edge_config in generate_edge_case_configs():
            # Should handle edge cases gracefully
            config = Configuration(edge_config)
            assert_valid_config_structure(config.to_dict())

    @pytest.mark.unit
    def test_configuration_encryption(self, sample_config_data):
        """Test that sensitive configuration data can be encrypted."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Add sensitive data
        config.set("ai.api_key", "sk-sensitive-key")

        # Encrypt sensitive fields
        encrypted_config = config.encrypt_sensitive_fields()

        # API key should be encrypted
        assert encrypted_config.get("ai.api_key") != "sk-sensitive-key"
        assert "encrypted:" in encrypted_config.get("ai.api_key", "")

        # Decrypt and verify
        decrypted_config = encrypted_config.decrypt_sensitive_fields()
        assert decrypted_config.get("ai.api_key") == "sk-sensitive-key"

    @pytest.mark.unit
    def test_configuration_backup_restore(self, sample_config_data, config_dir):
        """Test configuration backup and restore functionality."""
        from src.data.models.configuration import Configuration

        config = Configuration(sample_config_data)

        # Create backup
        backup_file = config_dir / "backup.json"
        config.create_backup(backup_file)

        # Modify configuration
        config.set("ai.temperature", 1.0)
        config.set("learning.difficulty", "expert")

        # Restore from backup
        config.restore_from_backup(backup_file)

        # Should have original values
        assert config.get("ai.temperature") == 0.7
        assert config.get("learning.difficulty") == "adaptive"