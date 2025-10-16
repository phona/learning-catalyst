"""
Integration tests for ConfigManager with real file system operations.

These tests verify that ConfigManager works correctly with actual file operations,
including reading, writing, updating, and handling file system edge cases.
"""

import pytest
import json
import tempfile
import shutil
import time
import os
from pathlib import Path
from unittest.mock import patch

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestConfigManagerFileSystemIntegration:
    """Test ConfigManager integration with real file system operations."""

    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace for testing."""
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)
            # Create .catalyst directory structure
            catalyst_dir = workspace / ".catalyst"
            catalyst_dir.mkdir()
            yield workspace

    @pytest.fixture
    def initial_config_file(self, temp_workspace):
        """Create an initial configuration file."""
        config_file = temp_workspace / ".catalyst" / "config.json"
        initial_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 4096,
                "providers": {
                    "openai": {
                        "api_key": "sk-initial-key",
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

        with open(config_file, 'w') as f:
            json.dump(initial_config, f, indent=2)

        return config_file

    @pytest.mark.integration
    def test_full_configuration_lifecycle(self, temp_workspace):
        """Test complete configuration lifecycle: create, read, update, delete."""
        catalyst_dir = temp_workspace / ".catalyst"

        # Phase 1: Create new configuration
        config_manager = ConfigManager(config_dir=catalyst_dir)

        # Verify defaults are loaded
        assert config_manager.get("ai.default_provider") == "deepseek"
        assert config_manager.get("ai.temperature") == 0.7

        # Add custom provider
        config_manager.add_provider_config("test_provider", {
            "api_key": "sk-test-key",
            "base_url": "https://test.example.com"
        })

        # Modify some settings
        config_manager.set("ai.temperature", 0.9)
        config_manager.set("ui.theme", "light")
        config_manager.set("learning.difficulty", "advanced")

        # Verify changes are applied
        assert config_manager.get("ai.temperature") == 0.9
        assert config_manager.get("ui.theme") == "light"
        assert config_manager.get("learning.difficulty") == "advanced"
        assert config_manager.has_provider_config("test_provider") is True

        # Verify file was created
        config_file = catalyst_dir / "config.json"
        assert config_file.exists()

        # Phase 2: Read existing configuration
        config_manager2 = ConfigManager(config_dir=catalyst_dir)

        # Verify all changes were persisted
        assert config_manager2.get("ai.temperature") == 0.9
        assert config_manager2.get("ui.theme") == "light"
        assert config_manager2.get("learning.difficulty") == "advanced"
        assert config_manager2.has_provider_config("test_provider") is True

        # Phase 3: Update configuration
        config_manager2.add_provider_config("another_provider", {
            "api_key": "sk-another-key"
        })
        config_manager2.set("ai.temperature", 0.5)

        # Phase 4: Delete configuration elements
        config_manager2.remove_provider_config("test_provider")
        assert config_manager2.has_provider_config("test_provider") is False
        assert config_manager2.has_provider_config("another_provider") is True

        # Phase 5: Final verification
        config_manager3 = ConfigManager(config_dir=catalyst_dir)
        assert config_manager3.get("ai.temperature") == 0.5
        assert config_manager3.has_provider_config("test_provider") is False
        assert config_manager3.has_provider_config("another_provider") is True

    @pytest.mark.integration
    def test_concurrent_file_access_safety(self, temp_workspace, initial_config_file):
        """Test that multiple ConfigManager instances handle concurrent access safely."""
        catalyst_dir = temp_workspace / ".catalyst"

        # Create multiple config managers
        manager1 = ConfigManager(config_dir=catalyst_dir)
        manager2 = ConfigManager(config_dir=catalyst_dir)

        # Both should load the same initial state
        assert manager1.get("ai.temperature") == manager2.get("ai.temperature")

        # Make changes with first manager
        manager1.set("ai.temperature", 0.8)
        manager1.add_provider_config("concurrent_provider", {
            "api_key": "sk-concurrent-key"
        })

        # Second manager should still see old state until it reloads
        manager2_new = ConfigManager(config_dir=catalyst_dir)
        assert manager2_new.get("ai.temperature") == 0.8
        assert manager2_new.has_provider_config("concurrent_provider") is True

    @pytest.mark.integration
    def test_config_file_format_preservation(self, temp_workspace):
        """Test that configuration file format and structure are preserved."""
        catalyst_dir = temp_workspace / ".catalyst"
        config_file = catalyst_dir / "config.json"

        # Create configuration with complex structure
        config_manager = ConfigManager(config_dir=catalyst_dir)

        complex_config = {
            "api_key": "sk-complex-key",
            "base_url": "https://complex.example.com",
            "settings": {
                "timeout": 30,
                "retries": 3,
                "advanced": {
                    "feature_flags": ["beta", "experimental"],
                    "metadata": {
                        "version": "2.1.0",
                        "created": "2025-01-20"
                    }
                }
            },
            "list_data": [1, 2, 3, "string", True, None]
        }

        config_manager.add_provider_config("complex_provider", complex_config)

        # Read file directly to verify format
        with open(config_file, 'r') as f:
            file_content = json.load(f)

        assert "complex_provider" in file_content["ai"]["providers"]
        assert file_content["ai"]["providers"]["complex_provider"] == complex_config

        # Verify indentation and formatting
        with open(config_file, 'r') as f:
            raw_content = f.read()

        # Should have proper JSON formatting with indentation
        assert '"complex_provider": {' in raw_content
        assert '"api_key": "sk-complex-key"' in raw_content

    @pytest.mark.integration
    def test_file_permissions_handling(self, temp_workspace):
        """Test handling of file permission scenarios."""
        catalyst_dir = temp_workspace / ".catalyst"
        config_file = catalyst_dir / "config.json"

        # Create initial configuration
        config_manager = ConfigManager(config_dir=catalyst_dir)
        config_manager.add_provider_config("permission_test", {"api_key": "sk-test-key"})

        # Make file read-only
        os.chmod(config_file, 0o444)

        # Try to modify configuration
        with pytest.raises(ValidationError) as exc_info:
            config_manager.set("ai.temperature", 0.9)

        assert "Could not save config" in str(exc_info.value)

        # Restore write permissions
        os.chmod(config_file, 0o644)

        # Should work again
        config_manager.set("ai.temperature", 0.8)
        assert config_manager.get("ai.temperature") == 0.8

    @pytest.mark.integration
    def test_config_directory_creation(self, temp_workspace):
        """Test that configuration directory is created automatically."""
        # Remove .catalyst directory
        catalyst_dir = temp_workspace / ".catalyst"
        if catalyst_dir.exists():
            shutil.rmtree(catalyst_dir)

        assert not catalyst_dir.exists()

        # Create ConfigManager - should create directory automatically
        config_manager = ConfigManager(config_dir=catalyst_dir)

        assert catalyst_dir.exists()
        assert catalyst_dir.is_dir()

        # Should be able to save configuration
        config_manager.add_provider_config("directory_test", {"api_key": "sk-test-key"})

        config_file = catalyst_dir / "config.json"
        assert config_file.exists()

    @pytest.mark.integration
    def test_config_file_backup_and_recovery(self, temp_workspace, initial_config_file):
        """Test backup and recovery scenarios."""
        catalyst_dir = temp_workspace / ".catalyst"
        config_file = catalyst_dir / "config.json"
        backup_file = catalyst_dir / "config.json.backup"

        # Create configuration and make changes
        config_manager = ConfigManager(config_dir=catalyst_dir)
        config_manager.set("ai.temperature", 0.9)
        config_manager.add_provider_config("backup_test", {"api_key": "sk-backup-key"})

        # Create backup
        shutil.copy2(config_file, backup_file)
        assert backup_file.exists()

        # Make more changes
        config_manager.set("ai.temperature", 0.3)
        config_manager.remove_provider_config("backup_test")

        # Restore from backup
        shutil.copy2(backup_file, config_file)

        # Load restored configuration
        restored_manager = ConfigManager(config_dir=catalyst_dir)

        assert restored_manager.get("ai.temperature") == 0.9
        assert restored_manager.has_provider_config("backup_test") is True

    @pytest.mark.integration
    def test_large_configuration_file_handling(self, temp_workspace):
        """Test handling of large configuration files."""
        catalyst_dir = temp_workspace / ".catalyst"

        config_manager = ConfigManager(config_dir=catalyst_dir)

        # Add many providers with large configurations
        for i in range(50):
            provider_name = f"large_provider_{i}"
            large_config = {
                "api_key": f"sk-large-key-{i}",
                "base_url": f"https://provider-{i}.example.com",
                "large_data": "x" * 1000,  # 1KB per provider
                "large_list": list(range(100)),  # 100 items per provider
                "nested": {
                    "level1": {
                        "level2": {
                            "data": f"provider_{i}_nested_data" * 50
                        }
                    }
                }
            }
            config_manager.add_provider_config(provider_name, large_config)

        # Verify all providers were added
        providers = config_manager.get_configured_providers()
        assert len(providers) == 50

        # Check file size (should be substantial)
        config_file = catalyst_dir / "config.json"
        file_size = config_file.stat().st_size
        assert file_size > 50000  # Should be > 50KB

        # Verify data integrity
        for i in range(50):
            provider_name = f"large_provider_{i}"
            assert config_manager.has_provider_config(provider_name) is True

            provider_config = config_manager.get_provider_config(provider_name)
            assert len(provider_config["large_data"]) == 1000
            assert len(provider_config["large_list"]) == 100

    @pytest.mark.integration
    def test_config_file_corruption_recovery(self, temp_workspace, initial_config_file):
        """Test recovery from corrupted configuration files."""
        catalyst_dir = temp_workspace / ".catalyst"
        config_file = catalyst_dir / "config.json"

        # Create valid configuration first
        config_manager = ConfigManager(config_dir=catalyst_dir)
        config_manager.set("ai.temperature", 0.85)
        config_manager.add_provider_config("corruption_test", {"api_key": "sk-corruption-key"})

        # Corrupt the file by writing invalid JSON
        with open(config_file, 'w') as f:
            f.write('{"ai": {"default_provider": "openai", "temperature": 0.7')  # Invalid JSON

        # ConfigManager should handle corruption gracefully
        corrupted_manager = ConfigManager(config_dir=catalyst_dir)

        # Should fall back to defaults
        assert corrupted_manager.get("ai.default_provider") == "deepseek"
        assert corrupted_manager.get("ai.temperature") == 0.7

        # Should not have the corrupted data
        assert corrupted_manager.has_provider_config("corruption_test") is False

    @pytest.mark.integration
    def test_config_file_external_modification(self, temp_workspace, initial_config_file):
        """Test handling of external file modifications."""
        catalyst_dir = temp_workspace / ".catalyst"
        config_file = catalyst_dir / "config.json"

        # Load initial configuration
        config_manager = ConfigManager(config_dir=catalyst_dir)
        initial_temp = config_manager.get("ai.temperature")

        # Modify file externally
        with open(config_file, 'r') as f:
            config_data = json.load(f)

        config_data["ai"]["temperature"] = 0.99
        config_data["ai"]["external_field"] = "externally_added"
        config_data["ai"]["providers"]["external_provider"] = {
            "api_key": "sk-external-key"
        }

        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)

        # New ConfigManager should detect external changes
        new_manager = ConfigManager(config_dir=catalyst_dir)

        assert new_manager.get("ai.temperature") == 0.99
        assert new_manager.get("ai.external_field") == "externally_added"
        assert new_manager.has_provider_config("external_provider") is True

    @pytest.mark.integration
    def test_config_file_atomic_operations(self, temp_workspace):
        """Test that file operations are atomic and don't leave partial files."""
        catalyst_dir = temp_workspace / ".catalyst"
        config_file = catalyst_dir / "config.json"

        config_manager = ConfigManager(config_dir=catalyst_dir)

        # Add complex configuration
        config_manager.add_provider_config("atomic_test", {
            "api_key": "sk-atomic-key",
            "complex_structure": {
                "nested": {
                    "data": "important_data"
                }
            }
        })

        # Verify file exists and is valid
        assert config_file.exists()

        # File should be valid JSON
        with open(config_file, 'r') as f:
            file_data = json.load(f)

        assert "atomic_test" in file_data["ai"]["providers"]
        assert file_data["ai"]["providers"]["atomic_test"]["complex_structure"]["nested"]["data"] == "important_data"

        # File should not be truncated or corrupted
        assert config_file.stat().st_size > 100

    @pytest.mark.integration
    def test_config_file_unicode_handling(self, temp_workspace):
        """Test handling of Unicode content in configuration files."""
        catalyst_dir = temp_workspace / ".catalyst"

        config_manager = ConfigManager(config_dir=catalyst_dir)

        # Add Unicode content
        unicode_config = {
            "api_key": "sk-unicode-key",
            "description": "测试中文字符",
            "russian_text": "Тест на русском",
            "emoji": "🚀🔥💡",
            "special_chars": "ñáéíóú"
        }

        config_manager.add_provider_config("unicode_provider", unicode_config)

        # Verify file contains Unicode correctly
        config_file = catalyst_dir / "config.json"
        with open(config_file, 'r', encoding='utf-8') as f:
            content = f.read()

        assert "测试中文字符" in content
        assert "Тест на русском" in content
        assert "🚀🔥💡" in content
        assert "ñáéíóú" in content

        # Reload and verify Unicode is preserved
        new_manager = ConfigManager(config_dir=catalyst_dir)
        loaded_config = new_manager.get_provider_config("unicode_provider")
        assert loaded_config == unicode_config

    @pytest.mark.integration
    def test_config_file_path_handling(self, temp_workspace):
        """Test handling of different file path scenarios."""
        catalyst_dir = temp_workspace / ".catalyst"

        # Test with relative path
        os.chdir(temp_workspace)
        relative_manager = ConfigManager(config_dir=Path(".catalyst"))
        relative_manager.add_provider_config("relative_test", {"api_key": "sk-relative-key"})

        assert (catalyst_dir / "config.json").exists()

        # Test with absolute path
        absolute_manager = ConfigManager(config_dir=catalyst.absolute())
        absolute_manager.add_provider_config("absolute_test", {"api_key": "sk-absolute-key"})

        # Both should work and create the same file
        final_manager = ConfigManager(config_dir=catalyst)
        assert final_manager.has_provider_config("relative_test") is True
        assert final_manager.has_provider_config("absolute_test") is True

    @pytest.mark.integration
    def test_config_file_environment_integration(self, temp_workspace, monkeypatch):
        """Test integration with environment variables."""
        catalyst_dir = temp_workspace / ".catalyst"

        # Set environment variables
        monkeypatch.setenv("CATALYST_AI_PROVIDER", "openai")
        monkeypatch.setenv("CATALYST_AI_TEMPERATURE", "0.9")
        monkeypatch.setenv("CATALYST_UI_THEME", "light")
        monkeypatch.setenv("CATALYST_SESSION_DURATION", "60")

        config_manager = ConfigManager(config_dir=catalyst_dir)

        # Environment variables should override defaults
        assert config_manager.get("ai.default_provider") == "openai"
        assert config_manager.get("ai.temperature") == 0.9
        assert config_manager.get("ui.theme") == "light"
        assert config_manager.get("ui.session_duration") == 60

        # Should still be able to save configuration
        config_manager.add_provider_config("env_test", {"api_key": "sk-env-key"})

        # Reload and verify environment overrides are still applied
        new_manager = ConfigManager(config_dir=catalyst_dir)
        assert new_manager.get("ai.default_provider") == "openai"
        assert new_manager.has_provider_config("env_test") is True

    @pytest.mark.integration
    def test_config_file_multiple_directories(self, temp_workspace):
        """Test that multiple config directories work independently."""
        dir1 = temp_workspace / "config1"
        dir2 = temp_workspace / "config2"

        dir1.mkdir()
        dir2.mkdir()

        # Create configurations in different directories
        manager1 = ConfigManager(config_dir=dir1)
        manager2 = ConfigManager(config_dir=dir2)

        manager1.add_provider_config("dir1_provider", {"api_key": "sk-dir1-key"})
        manager1.set("ai.temperature", 0.8)

        manager2.add_provider_config("dir2_provider", {"api_key": "sk-dir2-key"})
        manager2.set("ai.temperature", 0.3)

        # Verify they are independent
        manager1_reloaded = ConfigManager(config_dir=dir1)
        manager2_reloaded = ConfigManager(config_dir=dir2)

        assert manager1_reloaded.has_provider_config("dir1_provider") is True
        assert manager1_reloaded.has_provider_config("dir2_provider") is False
        assert manager1_reloaded.get("ai.temperature") == 0.8

        assert manager2_reloaded.has_provider_config("dir2_provider") is True
        assert manager2_reloaded.has_provider_config("dir1_provider") is False
        assert manager2_reloaded.get("ai.temperature") == 0.3