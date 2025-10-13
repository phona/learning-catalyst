"""
Integration tests for Configuration Management Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of configuration management based on real-world usage patterns from docs/examples/integration.md.
Tests cover configuration persistence, real-time updates, validation, and provider management.
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from tests.test_helpers import (
    assert_valid_config_structure,
    measure_async_performance,
    assert_async_performance_under,
    create_temp_config_file,
    cleanup_temp_file
)


class TestConfigurationIntegration:
    """Integration tests for configuration management functionality."""

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_persistence_workflow(self):
        """Test complete configuration persistence workflow."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Create initial configuration
        initial_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 4096
            },
            "learning": {
                "difficulty": "adaptive",
                "pace": "moderate",
                "auto_save": True,
                "session_timeout_minutes": 120
            },
            "ui": {
                "theme": "dark",
                "show_token_usage": True,
                "display_format": "detailed"
            }
        }

        # Step 2: Save configuration
        save_result = await config_manager.save_configuration(initial_config)
        assert save_result['success'] is True
        assert 'config_path' in save_result['data']

        # Step 3: Load configuration
        load_result = await config_manager.load_configuration()
        assert load_result['success'] is True
        assert_valid_config_structure(load_result['data'])

        # Step 4: Verify configuration integrity
        assert load_result['data']['ai']['default_provider'] == "openai"
        assert load_result['data']['learning']['difficulty'] == "adaptive"
        assert load_result['data']['ui']['theme'] == "dark"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_realtime_configuration_updates(self):
        """Test real-time configuration updates across components."""
        from src.data.configuration_manager import ConfigurationManager
        from src.ai.service import AIService
        from src.cli.main import CLIInterface

        config_manager = ConfigurationManager()
        ai_service = AIService()
        cli_interface = CLIInterface()

        # Step 1: Initialize components with configuration
        initial_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7
            }
        }

        await config_manager.save_configuration(initial_config)
        await ai_service.load_configuration(config_manager.get_current_config())
        await cli_interface.load_configuration(config_manager.get_current_config())

        # Step 2: Update configuration in real-time
        updated_config = {
            "ai": {
                "default_provider": "deepseek",
                "default_model": "deepseek-chat",
                "temperature": 0.8
            }
        }

        update_result = await config_manager.update_configuration(updated_config)
        assert update_result['success'] is True

        # Step 3: Notify components of configuration change
        await config_manager.notify_configuration_change()

        # Step 4: Verify components received updates
        ai_config = ai_service.get_current_config()
        cli_config = cli_interface.get_current_config()

        assert ai_config['ai']['default_provider'] == "deepseek"
        assert cli_config['ai']['default_provider'] == "deepseek"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_provider_configuration_workflow(self):
        """Test complete provider configuration workflow."""
        from src.data.configuration_manager import ConfigurationManager
        from src.ai.provider_manager import ProviderManager

        config_manager = ConfigurationManager()
        provider_manager = ProviderManager()

        # Step 1: Configure OpenAI provider
        openai_config = {
            "name": "openai",
            "api_key": "test-openai-key",
            "base_url": "https://api.openai.com/v1",
            "models": ["gpt-4o-mini", "gpt-3.5-turbo"],
            "rate_limits": {
                "requests_per_minute": 60,
                "tokens_per_minute": 90000
            },
            "pricing": {
                "input_tokens": 0.0005,
                "output_tokens": 0.0015
            }
        }

        openai_result = await provider_manager.configure_provider("openai", openai_config)
        assert openai_result['success'] is True

        # Step 2: Configure DeepSeek provider
        deepseek_config = {
            "name": "deepseek",
            "api_key": "test-deepseek-key",
            "base_url": "https://api.deepseek.com/v1",
            "models": ["deepseek-chat", "deepseek-coder"],
            "rate_limits": {
                "requests_per_minute": 120,
                "tokens_per_minute": 120000
            },
            "pricing": {
                "input_tokens": 0.0001,
                "output_tokens": 0.0002
            }
        }

        deepseek_result = await provider_manager.configure_provider("deepseek", deepseek_config)
        assert deepseek_result['success'] is True

        # Step 3: Save provider configurations to main config
        provider_configs = await provider_manager.get_all_provider_configs()
        await config_manager.update_configuration({"providers": provider_configs})

        # Step 4: Load and verify configurations
        loaded_config = await config_manager.load_configuration()
        assert "providers" in loaded_config['data']
        assert "openai" in loaded_config['data']['providers']
        assert "deepseek" in loaded_config['data']['providers']

        # Step 5: Test provider switching
        switch_result = await provider_manager.switch_provider("deepseek")
        assert switch_result['success'] is True
        assert provider_manager.get_current_provider() == "deepseek"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_validation_workflow(self):
        """Test configuration validation and error handling."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Test valid configuration
        valid_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": 4096
            },
            "learning": {
                "difficulty": "intermediate",
                "pace": "moderate"
            }
        }

        validation_result = await config_manager.validate_configuration(valid_config)
        assert validation_result['success'] is True
        assert validation_result['valid'] is True

        # Step 2: Test invalid configuration - missing required fields
        invalid_config = {
            "ai": {
                "default_provider": "openai"
                # Missing required fields
            }
        }

        validation_result = await config_manager.validate_configuration(invalid_config)
        assert validation_result['success'] is True
        assert validation_result['valid'] is False
        assert 'errors' in validation_result
        assert len(validation_result['errors']) > 0

        # Step 3: Test invalid configuration - invalid values
        invalid_values_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4o-mini",
                "temperature": 3.0,  # Invalid: should be 0.0-2.0
                "max_tokens": -1000  # Invalid: should be positive
            }
        }

        validation_result = await config_manager.validate_configuration(invalid_values_config)
        assert validation_result['success'] is True
        assert validation_result['valid'] is False
        assert any('temperature' in error['field'] for error in validation_result['errors'])

        # Step 4: Test configuration auto-correction
        correction_result = await config_manager.auto_correct_configuration(invalid_values_config)
        assert correction_result['success'] is True
        assert 'corrected_config' in correction_result['data']

        corrected_config = correction_result['data']['corrected_config']
        assert 0.0 <= corrected_config['ai']['temperature'] <= 2.0
        assert corrected_config['ai']['max_tokens'] > 0

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_backup_and_restore(self):
        """Test configuration backup and restore functionality."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Create multiple configuration versions
        configs = [
            {
                "version": "1.0.0",
                "ai": {"default_provider": "openai", "temperature": 0.7},
                "timestamp": "2025-01-20T10:00:00Z"
            },
            {
                "version": "1.1.0",
                "ai": {"default_provider": "deepseek", "temperature": 0.8},
                "timestamp": "2025-01-21T14:30:00Z"
            },
            {
                "version": "1.2.0",
                "ai": {"default_provider": "anthropic", "temperature": 0.6},
                "timestamp": "2025-01-22T09:15:00Z"
            }
        ]

        # Step 2: Save configurations with automatic backups
        for config in configs:
            await config_manager.save_configuration(config, create_backup=True)

        # Step 3: List backup versions
        backup_list = await config_manager.list_configuration_backups()
        assert backup_list['success'] is True
        assert len(backup_list['backups']) >= 3

        # Step 4: Restore specific backup version
        restore_result = await config_manager.restore_configuration_backup("1.1.0")
        assert restore_result['success'] is True
        assert restore_result['restored_version'] == "1.1.0"

        # Step 5: Verify restored configuration
        current_config = await config_manager.load_configuration()
        assert current_config['data']['ai']['default_provider'] == "deepseek"
        assert current_config['data']['ai']['temperature'] == 0.8

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_environment_specific_configuration(self):
        """Test environment-specific configuration management."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Create environment-specific configs
        dev_config = {
            "environment": "development",
            "ai": {
                "default_provider": "openai",
                "model": "gpt-3.5-turbo",
                "temperature": 0.9,
                "debug": True
            },
            "logging": {
                "level": "DEBUG",
                "verbose": True
            }
        }

        prod_config = {
            "environment": "production",
            "ai": {
                "default_provider": "openai",
                "model": "gpt-4o-mini",
                "temperature": 0.7,
                "debug": False
            },
            "logging": {
                "level": "INFO",
                "verbose": False
            }
        }

        # Step 2: Save environment configurations
        await config_manager.save_environment_config("development", dev_config)
        await config_manager.save_environment_config("production", prod_config)

        # Step 3: Load configuration for specific environment
        dev_result = await config_manager.load_environment_config("development")
        assert dev_result['success'] is True
        assert dev_result['data']['environment'] == "development"
        assert dev_result['data']['ai']['debug'] is True

        prod_result = await config_manager.load_environment_config("production")
        assert prod_result['success'] is True
        assert prod_result['data']['environment'] == "production"
        assert prod_result['data']['ai']['debug'] is False

        # Step 4: Set active environment
        await config_manager.set_active_environment("production")
        active_env = config_manager.get_active_environment()
        assert active_env == "production"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_user_preference_configuration(self):
        """Test user preference configuration and personalization."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()
        user_id = "test_user_123"

        # Step 1: Set user preferences
        user_preferences = {
            "learning": {
                "difficulty_preference": "gradual",
                "preferred_session_duration": 45,
                "learning_style": "visual",
                "auto_save_interval": 300
            },
            "ui": {
                "theme": "dark",
                "font_size": 14,
                "show_hints": True,
                "compact_mode": False
            },
            "ai": {
                "preferred_providers": ["openai", "anthropic"],
                "response_length": "concise",
                "include_examples": True
            }
        }

        pref_result = await config_manager.save_user_preferences(user_id, user_preferences)
        assert pref_result['success'] is True

        # Step 2: Load user preferences
        loaded_prefs = await config_manager.load_user_preferences(user_id)
        assert loaded_prefs['success'] is True
        assert loaded_prefs['data']['ui']['theme'] == "dark"
        assert loaded_prefs['data']['learning']['difficulty_preference'] == "gradual"

        # Step 3: Merge with base configuration
        base_config = {
            "ai": {"default_provider": "openai", "temperature": 0.7},
            "ui": {"theme": "light"}  # Will be overridden by user preference
        }

        merged_config = await config_manager.merge_user_preferences(user_id, base_config)
        assert merged_config['success'] is True
        assert merged_config['data']['ui']['theme'] == "dark"  # User preference wins
        assert merged_config['data']['learning']['difficulty_preference'] == "gradual"

        # Step 4: Update specific preference
        update_result = await config_manager.update_user_preference(
            user_id,
            "ui.theme",
            "light"
        )
        assert update_result['success'] is True

        updated_prefs = await config_manager.load_user_preferences(user_id)
        assert updated_prefs['data']['ui']['theme'] == "light"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_migration_workflow(self):
        """Test configuration migration between versions."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Create old version configuration
        old_config = {
            "version": "1.0.0",
            "ai_provider": "openai",  # Old field name
            "ai_model": "gpt-3.5-turbo",  # Old field name
            "ai_temperature": 0.7,  # Old field name
            "ui_theme": "dark"  # Old field name
        }

        # Step 2: Define migration rules
        migration_rules = {
            "1.0.0_to_1.1.0": {
                "field_mappings": {
                    "ai_provider": "ai.default_provider",
                    "ai_model": "ai.default_model",
                    "ai_temperature": "ai.temperature",
                    "ui_theme": "ui.theme"
                },
                "default_values": {
                    "ai.max_tokens": 4096,
                    "learning.difficulty": "adaptive"
                }
            }
        }

        await config_manager.set_migration_rules(migration_rules)

        # Step 3: Migrate configuration
        migration_result = await config_manager.migrate_configuration(old_config, "1.1.0")
        assert migration_result['success'] is True
        assert migration_result['migrated_from'] == "1.0.0"
        assert migration_result['migrated_to'] == "1.1.0"

        # Step 4: Verify migrated configuration
        migrated_config = migration_result['migrated_config']
        assert "ai" in migrated_config
        assert migrated_config["ai"]["default_provider"] == "openai"
        assert migrated_config["ai"]["temperature"] == 0.7
        assert migrated_config["ai"]["max_tokens"] == 4096  # Added default value
        assert "ui" in migrated_config
        assert migrated_config["ui"]["theme"] == "dark"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_template_system(self):
        """Test configuration template system."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Define configuration templates
        templates = {
            "beginner": {
                "description": "Configuration for beginners",
                "config": {
                    "ai": {
                        "default_provider": "openai",
                        "default_model": "gpt-3.5-turbo",
                        "temperature": 0.8,
                        "max_tokens": 2048
                    },
                    "learning": {
                        "difficulty": "beginner",
                        "pace": "slow",
                        "show_hints": True,
                        "detailed_explanations": True
                    },
                    "ui": {
                        "theme": "light",
                        "show_progress_bar": True,
                        "display_format": "simple"
                    }
                }
            },
            "advanced": {
                "description": "Configuration for advanced users",
                "config": {
                    "ai": {
                        "default_provider": "anthropic",
                        "default_model": "claude-3-opus",
                        "temperature": 0.5,
                        "max_tokens": 8192
                    },
                    "learning": {
                        "difficulty": "advanced",
                        "pace": "fast",
                        "show_hints": False,
                        "detailed_explanations": False
                    },
                    "ui": {
                        "theme": "dark",
                        "show_progress_bar": False,
                        "display_format": "detailed"
                    }
                }
            }
        }

        # Step 2: Save templates
        for template_name, template_data in templates.items():
            await config_manager.save_configuration_template(template_name, template_data)

        # Step 3: List available templates
        template_list = await config_manager.list_configuration_templates()
        assert template_list['success'] is True
        assert len(template_list['templates']) == 2
        assert "beginner" in template_list['templates']
        assert "advanced" in template_list['templates']

        # Step 4: Apply template
        apply_result = await config_manager.apply_configuration_template("beginner")
        assert apply_result['success'] is True
        assert apply_result['template_applied'] == "beginner"

        # Step 5: Verify applied template
        current_config = await config_manager.load_configuration()
        assert current_config['data']['learning']['difficulty'] == "beginner"
        assert current_config['data']['ui']['theme'] == "light"

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_security_workflow(self):
        """Test configuration security and sensitive data handling."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Create configuration with sensitive data
        config_with_secrets = {
            "ai": {
                "default_provider": "openai",
                "api_key": "sk-1234567890abcdef",  # Sensitive
                "api_secret": "secret_key_123",     # Sensitive
                "temperature": 0.7
            },
            "database": {
                "connection_string": "postgresql://user:password@localhost/db",  # Sensitive
                "encryption_key": "encryption_key_456"  # Sensitive
            }
        }

        # Step 2: Save configuration with encryption
        save_result = await config_manager.save_configuration_encrypted(
            config_with_secrets,
            encryption_key="test_encryption_key"
        )
        assert save_result['success'] is True

        # Step 3: Load and decrypt configuration
        load_result = await config_manager.load_configuration_encrypted(
            encryption_key="test_encryption_key"
        )
        assert load_result['success'] is True
        assert load_result['data']['ai']['api_key'] == "sk-1234567890abcdef"

        # Step 4: Export configuration without sensitive data
        safe_export = await config_manager.export_safe_configuration()
        assert safe_export['success'] is True
        assert 'api_key' not in safe_export['data']['ai']
        assert 'api_secret' not in safe_export['data']['ai']
        assert 'connection_string' not in safe_export['data']['database']

        # Step 5: Test configuration integrity verification
        integrity_result = await config_manager.verify_configuration_integrity()
        assert integrity_result['success'] is True
        assert integrity_result['integrity_verified'] is True

    @pytest.mark.integration
    @pytest.mark.configuration
    async def test_configuration_performance_workflow(self):
        """Test configuration performance under load."""
        from src.data.configuration_manager import ConfigurationManager

        config_manager = ConfigurationManager()

        # Step 1: Test rapid configuration updates
        async def rapid_config_updates():
            for i in range(100):
                config = {
                    "ai": {
                        "default_provider": f"provider_{i % 5}",
                        "temperature": 0.5 + (i % 10) * 0.1,
                        "max_tokens": 2048 + i * 100
                    }
                }
                await config_manager.update_configuration(config)

        # Measure performance
        async with measure_async_performance() as perf:
            await rapid_config_updates()

        # Should complete 100 updates within reasonable time
        assert perf.execution_time < 10.0

        # Step 2: Test concurrent configuration access
        async def concurrent_access():
            tasks = []
            for i in range(50):
                task = config_manager.load_configuration()
                tasks.append(task)
            results = await asyncio.gather(*tasks)
            return results

        async with measure_async_performance() as perf:
            results = await concurrent_access()

        # Verify all concurrent reads succeeded
        assert len(results) == 50
        assert all(result['success'] for result in results)
        assert perf.execution_time < 5.0

        # Step 3: Test configuration cache performance
        await config_manager.enable_caching(True)

        # First load (cache miss)
        first_load = await config_manager.load_configuration()
        load_time_1 = first_load['load_time_ms']

        # Second load (cache hit)
        second_load = await config_manager.load_configuration()
        load_time_2 = second_load['load_time_ms']

        # Cache hit should be faster
        assert load_time_2 < load_time_1

        # Step 4: Get cache statistics
        cache_stats = await config_manager.get_cache_statistics()
        assert cache_stats['hits'] > 0
        assert cache_stats['misses'] > 0
        assert cache_stats['hit_rate'] > 0.5