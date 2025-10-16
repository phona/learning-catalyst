"""
Edge case tests for ConfigManager configuration validation.

These tests cover unusual scenarios, boundary conditions, and edge cases
that could cause issues in production environments.
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, mock_open

from src.core.config import ConfigManager
from src.core.exceptions import ValidationError


class TestConfigManagerEdgeCases:
    """Test edge cases and unusual scenarios for ConfigManager."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create a temporary directory for configuration files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.mark.unit
    def test_empty_providers_section(self, temp_config_dir):
        """Test handling of empty providers section."""
        config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {}  # Empty section
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Should load without errors
        assert config_manager.get_configured_providers() == []
        assert config_manager.has_provider_config("any_provider") is False

    @pytest.mark.unit
    def test_provider_configuration_missing_api_keys(self, temp_config_dir):
        """Test provider configurations with missing API keys."""
        config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {
                        "base_url": "https://api.openai.com/v1"
                        # Missing api_key
                    },
                    "deepseek": {}  # Empty provider config
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        # Should load - missing API keys are not validation errors
        config_manager = ConfigManager(config_dir=temp_config_dir)

        assert config_manager.has_provider_config("openai") is True
        assert config_manager.has_provider_config("deepseek") is True

        openai_config = config_manager.get_provider_config("openai")
        assert openai_config == {"base_url": "https://api.openai.com/v1"}

        deepseek_config = config_manager.get_provider_config("deepseek")
        assert deepseek_config == {}

    @pytest.mark.unit
    def test_invalid_configuration_types(self, temp_config_dir):
        """Test invalid configuration types that should be caught."""
        # Test ai section as non-dict
        invalid_configs = [
            {
                "ai": "not_a_dict",  # String instead of dict
                "ui": {"theme": "dark"}
            },
            {
                "ai": 123,  # Number instead of dict
                "ui": {"theme": "dark"}
            },
            {
                "ai": [],  # List instead of dict
                "ui": {"theme": "dark"}
            },
            {
                "ai": None,  # None instead of dict
                "ui": {"theme": "dark"}
            },
            {
                "ui": "not_a_dict",  # UI section as string
                "ai": {
                    "default_provider": "openai",
                    "temperature": 0.7,
                    "providers": {}
                }
            },
            {
                "learning": 123,  # Learning section as number
                "ai": {
                    "default_provider": "openai",
                    "temperature": 0.7,
                    "providers": {}
                }
            }
        ]

        for invalid_config in invalid_configs:
            config_file = temp_config_dir / "config.json"
            with open(config_file, 'w') as f:
                json.dump(invalid_config, f, indent=2)

            with pytest.raises(ValidationError) as exc_info:
                ConfigManager(config_dir=temp_config_dir)

            assert "must be a dictionary" in str(exc_info.value)

    @pytest.mark.unit
    def test_boundary_values(self, temp_config_dir):
        """Test boundary values for numeric configuration parameters."""
        boundary_test_cases = [
            # Temperature boundaries
            ("ai.temperature", -0.1, False, "AI temperature must be between 0.0 and 2.0"),
            ("ai.temperature", 0.0, True, None),
            ("ai.temperature", 2.0, True, None),
            ("ai.temperature", 2.1, False, "AI temperature must be between 0.0 and 2.0"),

            # Max tokens boundaries
            ("ai.max_tokens", 0, False, "AI max_tokens must be between 1 and 32768"),
            ("ai.max_tokens", 1, True, None),
            ("ai.max_tokens", 32768, True, None),
            ("ai.max_tokens", 32769, False, "AI max_tokens must be between 1 and 32768"),

            # Session duration boundaries
            ("ui.session_duration", 14, False, "Session duration must be between 15 and 180 minutes"),
            ("ui.session_duration", 15, True, None),
            ("ui.session_duration", 180, True, None),
            ("ui.session_duration", 181, False, "Session duration must be between 15 and 180 minutes"),

            # Session timeout boundaries
            ("learning.session_timeout_minutes", 4, False, "Session timeout must be between 5 and 480 minutes"),
            ("learning.session_timeout_minutes", 5, True, None),
            ("learning.session_timeout_minutes", 480, True, None),
            ("learning.session_timeout_minutes", 481, False, "Session timeout must be between 5 and 480 minutes"),

            # Retention days boundaries
            ("privacy.retention_days", 0, False, "Retention days must be between 1 and 3650"),
            ("privacy.retention_days", 1, True, None),
            ("privacy.retention_days", 3650, True, None),
            ("privacy.retention_days", 3651, False, "Retention days must be between 1 and 3650"),

            # Cache size boundaries
            ("performance.cache_size_mb", 9, False, "Cache size must be between 10 and 1024 MB"),
            ("performance.cache_size_mb", 10, True, None),
            ("performance.cache_size_mb", 1024, True, None),
            ("performance.cache_size_mb", 1025, False, "Cache size must be between 10 and 1024 MB"),
        ]

        for key, value, should_pass, expected_error in boundary_test_cases:
            config_manager = ConfigManager(config_dir=temp_config_dir)

            if should_pass:
                # Should pass validation
                config_manager.set(key, value)
                assert config_manager.get(key) == value
            else:
                # Should fail validation
                with pytest.raises(ValidationError) as exc_info:
                    config_manager.set(key, value)
                assert expected_error in str(exc_info.value)

    @pytest.mark.unit
    def test_invalid_enum_values(self, temp_config_dir):
        """Test invalid enum values for configuration parameters."""
        enum_test_cases = [
            ("ui.theme", "invalid_theme", ["light", "dark", "auto"]),
            ("learning.difficulty", "invalid_difficulty", ["beginner", "intermediate", "advanced", "adaptive"]),
        ]

        for key, invalid_value, valid_values in enum_test_cases:
            config_manager = ConfigManager(config_dir=temp_config_dir)

            with pytest.raises(ValidationError) as exc_info:
                config_manager.set(key, invalid_value)

            assert f"must be one of: {', '.join(valid_values)}" in str(exc_info.value)

    @pytest.mark.unit
    def test_malformed_json_file(self, temp_config_dir):
        """Test handling of malformed JSON configuration files."""
        config_file = temp_config_dir / "config.json"

        malformed_jsons = [
            '{"ai": {"default_provider": "openai"',  # Missing closing brace
            '{"ai": {"default_provider": "openai",}}',  # Trailing comma
            '{"ai": "openai",}',  # Trailing comma
            'not json at all',  # Completely invalid
            '{"ai": null}',  # Null value where dict expected
            '',  # Empty file
            '{"ai": {"providers": null}}',  # Null providers section
        ]

        for malformed_json in malformed_jsons:
            with open(config_file, 'w') as f:
                f.write(malformed_json)

            # Should handle malformed JSON gracefully and fall back to defaults
            config_manager = ConfigManager(config_dir=temp_config_dir)

            # Should have default configuration
            assert config_manager.get("ai.default_provider") == "deepseek"
            assert config_manager.get("ai.temperature") == 0.7

    @pytest.mark.unit
    def test_file_permission_errors(self, temp_config_dir):
        """Test handling of file permission errors."""
        config_file = temp_config_dir / "config.json"

        # Create a valid config file first
        valid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {"api_key": "sk-test-key"}
                }
            }
        }

        with open(config_file, 'w') as f:
            json.dump(valid_config, f, indent=2)

        # Load configuration successfully
        config_manager = ConfigManager(config_dir=temp_config_dir)
        assert config_manager.get("ai.default_provider") == "openai"

        # Try to save configuration
        with patch('builtins.open', side_effect=PermissionError("Permission denied")):
            with pytest.raises(ValidationError) as exc_info:
                config_manager.set("ai.temperature", 0.8)

            assert "Could not save config" in str(exc_info.value)

    @pytest.mark.unit
    def test_concurrent_file_access(self, temp_config_dir):
        """Test handling of concurrent file access."""
        config_file = temp_config_dir / "config.json"

        # Create initial config
        initial_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "openai": {"api_key": "sk-test-key"}
                }
            }
        }

        with open(config_file, 'w') as f:
            json.dump(initial_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Simulate file being modified externally during operation
        def mock_file_operation(*args, **kwargs):
            # Modify file between read and write
            with open(config_file, 'w') as f:
                external_config = initial_config.copy()
                external_config["ai"]["temperature"] = 0.99
                json.dump(external_config, f, indent=2)
            # Then raise an error to simulate write failure
            raise IOError("Simulated write failure")

        with patch('builtins.open', side_effect=mock_file_operation):
            with pytest.raises(ValidationError):
                config_manager.set("ai.temperature", 0.8)

        # Configuration should be rolled back to original or externally modified state
        config_manager2 = ConfigManager(config_dir=temp_config_dir)
        # Should have the externally modified value or the original
        temperature = config_manager2.get("ai.temperature")
        assert temperature in [0.7, 0.99]  # Either original or externally modified

    @pytest.mark.unit
    def test_very_large_configuration(self, temp_config_dir):
        """Test handling of very large configuration files."""
        # Create a configuration with many providers and large values
        large_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {}
            }
        }

        # Add many providers with large configurations
        for i in range(100):
            provider_name = f"provider_{i}"
            large_config["ai"]["providers"][provider_name] = {
                "api_key": f"sk-key-{i}" * 100,  # Long API key
                "base_url": f"https://provider-{i}.example.com",
                "large_data": "x" * 1000,  # 1KB of data
                "large_list": list(range(1000)),  # Large list
                "nested_large": {
                    "level1": {
                        "level2": {
                            "data": "y" * 500
                        }
                    }
                }
            }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(large_config, f, indent=2)

        # Should handle large configuration without issues
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify it loaded correctly
        assert len(config_manager.get_configured_providers()) == 100
        assert config_manager.has_provider_config("provider_0") is True
        assert config_manager.has_provider_config("provider_99") is True

        # Test accessing large nested data
        large_data = config_manager.get("ai.providers.provider_0.large_data")
        assert len(large_data) == 1000

    @pytest.mark.unit
    def test_unicode_and_special_characters(self, temp_config_dir):
        """Test handling of Unicode and special characters in configuration."""
        unicode_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "中文提供者": {
                        "api_key": "sk-中文-密钥",
                        "base_url": "https://中文.example.com",
                        "description": "这是一个中文提供者"
                    },
                    "русский_провайдер": {
                        "api_key": "sk-русский-ключ",
                        "base_url": "https://русский.example.com",
                        "описание": "Русский провайдер"
                    },
                    "日本語プロバイダー": {
                        "api_key": "sk-日本語-キー",
                        "base_url": "https://日本語.example.com",
                        "説明": "日本語のプロバイダーです"
                    },
                    "emoji_provider🚀": {
                        "api_key": "sk-emoji-🔑",
                        "base_url": "https://emoji.example.com",
                        "description": "Provider with emojis 🎉✨"
                    },
                    "special_chars": {
                        "api_key": "sk-special!@#$%^&*()",
                        "base_url": "https://special-chars.example.com",
                        "data": "Special chars: !@#$%^&*()[]{}|\\:;\"'<>?,./"
                    }
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(unicode_config, f, indent=2, ensure_ascii=False)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify Unicode providers are loaded correctly
        for provider_name in unicode_config["ai"]["providers"].keys():
            assert config_manager.has_provider_config(provider_name) is True

        # Test accessing Unicode data
        chinese_config = config_manager.get_provider_config("中文提供者")
        assert chinese_config["description"] == "这是一个中文提供者"

        emoji_config = config_manager.get_provider_config("emoji_provider🚀")
        assert "🎉✨" in emoji_config["description"]

    @pytest.mark.unit
    def test_deeply_nested_configuration(self, temp_config_dir):
        """Test handling of deeply nested configuration structures."""
        # Create a configuration with very deep nesting
        deep_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "deep_provider": {
                        "level1": {
                            "level2": {
                                "level3": {
                                    "level4": {
                                        "level5": {
                                            "level6": {
                                                "level7": {
                                                    "level8": {
                                                        "level9": {
                                                            "level10": {
                                                                "deep_value": "found_at_depth_10"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(deep_config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Should handle deep nesting
        assert config_manager.has_provider_config("deep_provider") is True

        # Test deep access via dot notation
        deep_value = config_manager.get("ai.providers.deep_provider.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10.deep_value")
        assert deep_value == "found_at_depth_10"

    @pytest.mark.unit
    def test_configuration_circular_references_prevention(self, temp_config_dir):
        """Test that configuration system handles potential circular references safely."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Try to create a configuration that could lead to circular references
        # This is more of a safety test to ensure the system doesn't crash
        provider_config = {
            "api_key": "sk-test-key",
            "self_reference": None  # We'll try to make this reference itself
        }

        config_manager.add_provider_config("test_provider", provider_config)

        # Try to create a self-reference (this shouldn't be possible in JSON,
        # but we test that the system handles it gracefully)
        try:
            # Manually modify the internal config to simulate circular reference
            config_manager._config["ai"]["providers"]["test_provider"]["self_reference"] = (
                config_manager._config["ai"]["providers"]["test_provider"]
            )

            # Try to access the circular reference
            result = config_manager.get("ai.providers.test_provider.self_reference")
            # If we get here without crashing, the system handled it
            assert result is not None

        except (RecursionError, ValueError):
            # If a recursion error is raised, that's also acceptable behavior
            pass

    @pytest.mark.unit
    def test_extremely_long_keys_and_values(self, temp_config_dir):
        """Test handling of extremely long keys and values."""
        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Create very long key and value
        long_key = "x" * 1000  # 1000 character key
        long_value = "y" * 10000  # 10000 character value

        # Add provider with long key and value
        provider_config = {
            "api_key": "sk-test-key",
            long_key: long_value
        }

        config_manager.add_provider_config("long_key_provider", provider_config)

        # Verify it was stored and retrieved correctly
        assert config_manager.has_provider_config("long_key_provider") is True

        retrieved_config = config_manager.get_provider_config("long_key_provider")
        assert retrieved_config[long_key] == long_value

        # Test access via dot notation
        accessed_value = config_manager.get(f"ai.providers.long_key_provider.{long_key}")
        assert accessed_value == long_value

    @pytest.mark.unit
    def test_null_and_undefined_values(self, temp_config_dir):
        """Test handling of null and undefined values in configuration."""
        config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7,
                "providers": {
                    "null_provider": {
                        "api_key": None,
                        "base_url": None,
                        "null_field": None
                    },
                    "mixed_provider": {
                        "api_key": "sk-real-key",
                        "null_field": None,
                        "real_field": "real_value"
                    }
                }
            }
        }

        config_file = temp_config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        config_manager = ConfigManager(config_dir=temp_config_dir)

        # Verify null values are preserved
        null_config = config_manager.get_provider_config("null_provider")
        assert null_config["api_key"] is None
        assert null_config["base_url"] is None
        assert null_config["null_field"] is None

        mixed_config = config_manager.get_provider_config("mixed_provider")
        assert mixed_config["api_key"] == "sk-real-key"
        assert mixed_config["null_field"] is None
        assert mixed_config["real_field"] == "real_value"

        # Test setting null values
        config_manager.set("ai.new_null_field", None)
        assert config_manager.get("ai.new_null_field") is None