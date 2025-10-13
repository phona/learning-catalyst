"""
Simple configuration management for Learning Catalyst.

Minimal configuration system that handles JSON-based configuration
with basic validation and environment variable support.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass, asdict

from .exceptions import ValidationError


@dataclass
class ConfigDefaults:
    """Default configuration values."""

    # AI Configuration
    DEFAULT_PROVIDER: str = "deepseek"
    DEFAULT_MODEL: str = "deepseek-chat"
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 4096

    # UI Configuration
    THEME: str = "dark"
    SHOW_TOKEN_USAGE: bool = True
    DISPLAY_FORMAT: str = "detailed"
    SESSION_DURATION: int = 45  # minutes

    # Learning Configuration
    AUTO_SAVE: bool = True
    SESSION_TIMEOUT_MINUTES: int = 120
    DIFFICULTY: str = "adaptive"

    # Privacy Configuration
    STORE_CONVERSATIONS: bool = True
    RETENTION_DAYS: int = 30

    # Performance Configuration
    CACHE_SIZE_MB: int = 100
    ENABLE_CACHING: bool = True


class ConfigManager:
    """Simple configuration manager."""

    def __init__(self, config_dir: Optional[Path] = None):
        """
        Initialize configuration manager.

        Args:
            config_dir: Configuration directory path
        """
        self.config_dir = config_dir or Path.home() / ".catalyst"
        self.config_file = self.config_dir / "config.json"
        self._config: Dict[str, Any] = {}
        self._defaults = ConfigDefaults()

        # Ensure config directory exists
        self.config_dir.mkdir(exist_ok=True)

        # Load configuration
        self.load_config()

    def load_config(self) -> None:
        """Load configuration from file with defaults."""
        # Start with defaults
        self._config = {
            "ai": {
                "default_provider": self._defaults.DEFAULT_PROVIDER,
                "default_model": self._defaults.DEFAULT_MODEL,
                "temperature": self._defaults.TEMPERATURE,
                "max_tokens": self._defaults.MAX_TOKENS,
                "providers": {}
            },
            "ui": {
                "theme": self._defaults.THEME,
                "show_token_usage": self._defaults.SHOW_TOKEN_USAGE,
                "display_format": self._defaults.DISPLAY_FORMAT,
                "session_duration": self._defaults.SESSION_DURATION
            },
            "learning": {
                "auto_save": self._defaults.AUTO_SAVE,
                "session_timeout_minutes": self._defaults.SESSION_TIMEOUT_MINUTES,
                "difficulty": self._defaults.DIFFICULTY
            },
            "privacy": {
                "store_conversations": self._defaults.STORE_CONVERSATIONS,
                "retention_days": self._defaults.RETENTION_DAYS
            },
            "performance": {
                "cache_size_mb": self._defaults.CACHE_SIZE_MB,
                "enable_caching": self._defaults.ENABLE_CACHING
            }
        }

        # Load from file if exists
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    file_config = json.load(f)
                    self._merge_config(self._config, file_config)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config file: {e}")

        # Override with environment variables
        self._load_env_overrides()

        # Validate configuration
        self.validate_config()

    def _merge_config(self, base: Dict[str, Any], override: Dict[str, Any]) -> None:
        """Recursively merge configuration dictionaries."""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._merge_config(base[key], value)
            else:
                base[key] = value

    def _load_env_overrides(self) -> None:
        """Load configuration overrides from environment variables."""
        env_mappings = {
            "CATALYST_AI_PROVIDER": ("ai", "default_provider"),
            "CATALYST_AI_MODEL": ("ai", "default_model"),
            "CATALYST_AI_TEMPERATURE": ("ai", "temperature"),
            "CATALYST_AI_MAX_TOKENS": ("ai", "max_tokens"),
            "CATALYST_UI_THEME": ("ui", "theme"),
            "CATALYST_SHOW_TOKENS": ("ui", "show_token_usage"),
            "CATALYST_SESSION_DURATION": ("ui", "session_duration"),
            "CATALYST_AUTO_SAVE": ("learning", "auto_save"),
            "CATALYST_DIFFICULTY": ("learning", "difficulty"),
            "CATALYST_STORE_CONVERSATIONS": ("privacy", "store_conversations"),
            "CATALYST_RETENTION_DAYS": ("privacy", "retention_days"),
        }

        for env_var, (section, key) in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                # Type conversion
                if key in ["temperature", "session_duration", "retention_days"]:
                    try:
                        value = float(value) if key == "temperature" else int(value)
                    except ValueError:
                        continue
                elif key in ["show_token_usage", "auto_save", "store_conversations"]:
                    value = value.lower() in ("true", "1", "yes", "on")

                self._config[section][key] = value

    def validate_config(self) -> None:
        """Validate configuration values."""
        errors = []

        # AI configuration validation
        ai_config = self._config["ai"]
        if not (0.0 <= ai_config["temperature"] <= 2.0):
            errors.append("AI temperature must be between 0.0 and 2.0")
        if not (1 <= ai_config["max_tokens"] <= 32768):
            errors.append("AI max_tokens must be between 1 and 32768")

        # UI configuration validation
        ui_config = self._config["ui"]
        if ui_config["theme"] not in ["light", "dark", "auto"]:
            errors.append("UI theme must be one of: light, dark, auto")
        if not (15 <= ui_config["session_duration"] <= 180):
            errors.append("Session duration must be between 15 and 180 minutes")

        # Learning configuration validation
        learning_config = self._config["learning"]
        if learning_config["difficulty"] not in ["beginner", "intermediate", "advanced", "adaptive"]:
            errors.append("Difficulty must be one of: beginner, intermediate, advanced, adaptive")
        if not (5 <= learning_config["session_timeout_minutes"] <= 480):
            errors.append("Session timeout must be between 5 and 480 minutes")

        # Privacy configuration validation
        privacy_config = self._config["privacy"]
        if not (1 <= privacy_config["retention_days"] <= 3650):
            errors.append("Retention days must be between 1 and 3650")

        # Performance configuration validation
        perf_config = self._config["performance"]
        if not (10 <= perf_config["cache_size_mb"] <= 1024):
            errors.append("Cache size must be between 10 and 1024 MB")

        if errors:
            raise ValidationError("config", self._config, "; ".join(errors))

    def save_config(self) -> None:
        """Save configuration to file."""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self._config, f, indent=2)
        except IOError as e:
            raise ValidationError("config_file", str(self.config_file), f"Could not save config: {e}")

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation.

        Args:
            key: Configuration key (e.g., "ai.temperature")
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        keys = key.split('.')
        value = self._config

        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default

    def set(self, key: str, value: Any) -> None:
        """
        Set configuration value using dot notation.

        Args:
            key: Configuration key (e.g., "ai.temperature")
            value: Value to set
        """
        keys = key.split('.')
        config = self._config

        # Navigate to the parent of the target key
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]

        # Set the value
        config[keys[-1]] = value

        # Validate after setting
        try:
            self.validate_config()
            self.save_config()
        except ValidationError as e:
            # Rollback the change
            self.load_config()
            raise e

    def get_section(self, section: str) -> Dict[str, Any]:
        """
        Get entire configuration section.

        Args:
            section: Section name (e.g., "ai", "ui")

        Returns:
            Configuration section dictionary
        """
        return self._config.get(section, {}).copy()

    def update_section(self, section: str, updates: Dict[str, Any]) -> None:
        """
        Update multiple values in a configuration section.

        Args:
            section: Section name
            updates: Dictionary of updates
        """
        if section not in self._config:
            self._config[section] = {}

        self._config[section].update(updates)

        # Validate and save
        try:
            self.validate_config()
            self.save_config()
        except ValidationError as e:
            # Rollback
            self.load_config()
            raise e

    def get_all(self) -> Dict[str, Any]:
        """Get complete configuration dictionary."""
        return self._config.copy()

    def add_provider_config(self, provider_name: str, config: Dict[str, Any]) -> None:
        """
        Add or update provider configuration.

        Args:
            provider_name: Name of the provider
            config: Provider configuration
        """
        if "ai" not in self._config:
            self._config["ai"] = {}
        if "providers" not in self._config["ai"]:
            self._config["ai"]["providers"] = {}

        self._config["ai"]["providers"][provider_name] = config
        self.save_config()

    def get_provider_config(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """
        Get provider configuration.

        Args:
            provider_name: Name of the provider

        Returns:
            Provider configuration or None if not found
        """
        return self._config.get("ai", {}).get("providers", {}).get(provider_name)

    def remove_provider_config(self, provider_name: str) -> bool:
        """
        Remove provider configuration.

        Args:
            provider_name: Name of the provider

        Returns:
            True if provider was removed, False if not found
        """
        providers = self._config.get("ai", {}).get("providers", {})
        if provider_name in providers:
            del providers[provider_name]
            self.save_config()
            return True
        return False