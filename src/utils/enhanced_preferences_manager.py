"""
Enhanced Preferences manager implementation with key-value support (like npm config)
Includes AI provider configuration management
"""
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from src.cli.formatting import CLIFormatter


class EnhancedPreferencesManager:
    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.preferences_path = self.workspace_path / ".catalyst" / "preferences.json"
        self.preferences_path.parent.mkdir(exist_ok=True)
        self.formatter = CLIFormatter()

        # Initialize with default preferences if file doesn't exist
        if not self.preferences_path.exists():
            self._init_default_preferences()
        else:
            with open(self.preferences_path, 'r', encoding='utf-8') as f:
                self.preferences = json.load(f)

    def _init_default_preferences(self):
        """Initialize preferences with default values"""
        default_prefs = {
            "ui": {
                "theme": "dark",
                "font_size": 12,
                "show_line_numbers": True
            },
            "learning": {
                "difficulty_level": 5,
                "learning_style": "visual",
                "daily_goal_minutes": 30,
                "enable_audio": False
            },
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4",
                "temperature": 0.7,
                "enable_rag": True,
                "max_context_tokens": 4096,
                "providers": {
                    "openai": {
                        "api_key": "",
                        "base_url": "",
                        "models": {
                            "chat": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
                            "embedding": ["text-embedding-ada-002"]
                        }
                    },
                    "anthropic": {
                        "api_key": "",
                        "base_url": "",
                        "models": {
                            "chat": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
                        }
                    },
                    "local": {
                        "api_key": "",
                        "base_url": "http://localhost:8000",
                        "models": {
                            "chat": ["llama3", "mistral", "phi3"]
                        }
                    }
                }
            },
            "features": {
                "show_completion_percentage": True,
                "auto_save_checkpoints": True,
                "notification_settings": {
                    "enabled": True,
                    "interval_minutes": 15
                }
            }
        }

        with open(self.preferences_path, 'w', encoding='utf-8') as f:
            json.dump(default_prefs, f, indent=2)

        self.preferences = default_prefs

    def list_preferences(self) -> Dict[str, Any]:
        """List all current user preferences"""
        return self.preferences

    def set_preference(self, key: str, value: Union[str, int, float, bool, Dict[str, Any]]) -> bool:
        """Set a specific configuration preference using key-value format (like npm config)"""
        try:
            # Navigate to the parent of the final key using dot notation
            keys = key.split('.')
            current = self.preferences

            # Navigate to the parent of the final key
            for k in keys[:-1]:
                if k not in current:
                    current[k] = {}
                current = current[k]

            # Set the final value
            final_key = keys[-1]
            current[final_key] = value

            # Save back to file
            with open(self.preferences_path, 'w', encoding='utf-8') as f:
                json.dump(self.preferences, f, indent=2)

            self.formatter.format_success(f"Preference '{key}' set successfully")
            return True
        except (KeyError, TypeError, ValueError) as e:
            self.formatter.format_error(f"Error setting preference: {str(e)}")
            return False

    def get_preference(self, key: str) -> Any:
        """Get a specific configuration preference using key-value format (like npm config)"""
        try:
            # Navigate through the preference hierarchy using the key
            keys = key.split('.')
            current = self.preferences

            for k in keys:
                if isinstance(current, dict) and k in current:
                    current = current[k]
                else:
                    return None

            return current
        except (KeyError, TypeError, ValueError) as e:
            self.formatter.format_error(f"Error getting preference: {str(e)}")
            return None

    # AI Provider Configuration Methods

    def get_ai_providers(self) -> List[str]:
        """Get list of configured AI providers"""
        providers = self.get_preference("ai.providers")
        if providers:
            return list(providers.keys())
        return []

    def get_provider_config(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific AI provider"""
        return self.get_preference(f"ai.providers.{provider_name}")

    def set_provider_config(self, provider_name: str, config: Dict[str, Any]) -> bool:
        """Set configuration for a specific AI provider"""
        return self.set_preference(f"ai.providers.{provider_name}", config)

    def get_provider_api_key(self, provider_name: str) -> Optional[str]:
        """Get API key for a specific AI provider"""
        return self.get_preference(f"ai.providers.{provider_name}.api_key")

    def set_provider_api_key(self, provider_name: str, api_key: str) -> bool:
        """Set API key for a specific AI provider"""
        return self.set_preference(f"ai.providers.{provider_name}.api_key", api_key)

    def get_provider_models(self, provider_name: str, model_type: Optional[str] = None) -> List[str]:
        """Get available models for a specific AI provider"""
        models_config = self.get_preference(f"ai.providers.{provider_name}.models")
        if not models_config:
            return []

        if model_type and model_type in models_config:
            return models_config[model_type]

        # If no specific type requested, return all models
        all_models = []
        for type_models in models_config.values():
            all_models.extend(type_models)

        return all_models

    def get_default_provider(self) -> str:
        """Get the default AI provider"""
        return self.get_preference("ai.default_provider") or "openai"

    def set_default_provider(self, provider_name: str) -> bool:
        """Set the default AI provider"""
        return self.set_preference("ai.default_provider", provider_name)

    def get_default_model(self) -> str:
        """Get the default AI model"""
        return self.get_preference("ai.default_model") or "gpt-4"

    def set_default_model(self, model_name: str) -> bool:
        """Set the default AI model"""
        return self.set_preference("ai.default_model", model_name)

    def get_ai_temperature(self) -> float:
        """Get the AI temperature setting"""
        return self.get_preference("ai.temperature") or 0.7

    def set_ai_temperature(self, temperature: float) -> bool:
        """Set the AI temperature setting"""
        return self.set_preference("ai.temperature", temperature)

    def get_max_context_tokens(self) -> int:
        """Get the maximum context tokens setting"""
        return self.get_preference("ai.max_context_tokens") or 4096

    def set_max_context_tokens(self, max_tokens: int) -> bool:
        """Set the maximum context tokens setting"""
        return self.set_preference("ai.max_context_tokens", max_tokens)

    def is_rag_enabled(self) -> bool:
        """Check if RAG (Retrieval-Augmented Generation) is enabled"""
        return self.get_preference("ai.enable_rag") or True

    def set_rag_enabled(self, enabled: bool) -> bool:
        """Enable or disable RAG (Retrieval-Augmented Generation)"""
        return self.set_preference("ai.enable_rag", enabled)

    # Application Preferences Methods

    def get_ui_theme(self) -> str:
        """Get the UI theme setting"""
        return self.get_preference("ui.theme") or "dark"

    def set_ui_theme(self, theme: str) -> bool:
        """Set the UI theme setting"""
        return self.set_preference("ui.theme", theme)

    def get_font_size(self) -> int:
        """Get the font size setting"""
        return self.get_preference("ui.font_size") or 12

    def set_font_size(self, size: int) -> bool:
        """Set the font size setting"""
        return self.set_preference("ui.font_size", size)

    def get_learning_difficulty(self) -> int:
        """Get the learning difficulty level"""
        return self.get_preference("learning.difficulty_level") or 5

    def set_learning_difficulty(self, level: int) -> bool:
        """Set the learning difficulty level"""
        return self.set_preference("learning.difficulty_level", level)

    def get_daily_goal_minutes(self) -> int:
        """Get the daily learning goal in minutes"""
        return self.get_preference("learning.daily_goal_minutes") or 30

    def set_daily_goal_minutes(self, minutes: int) -> bool:
        """Set the daily learning goal in minutes"""
        return self.set_preference("learning.daily_goal_minutes", minutes)

    def is_auto_save_checkpoints(self) -> bool:
        """Check if auto-save checkpoints is enabled"""
        return self.get_preference("features.auto_save_checkpoints") or True

    def set_auto_save_checkpoints(self, enabled: bool) -> bool:
        """Enable or disable auto-save checkpoints"""
        return self.set_preference("features.auto_save_checkpoints", enabled)

    def are_notifications_enabled(self) -> bool:
        """Check if notifications are enabled"""
        return self.get_preference("features.notification_settings.enabled") or True

    def set_notifications_enabled(self, enabled: bool) -> bool:
        """Enable or disable notifications"""
        return self.set_preference("features.notification_settings.enabled", enabled)

    def get_notification_interval(self) -> int:
        """Get the notification interval in minutes"""
        return self.get_preference("features.notification_settings.interval_minutes") or 15

    def set_notification_interval(self, minutes: int) -> bool:
        """Set the notification interval in minutes"""
        return self.set_preference("features.notification_settings.interval_minutes", minutes)

    # Configuration Validation

    def validate_configuration(self) -> Dict[str, Any]:
        """Validate the current configuration and return any issues"""
        issues = {
            "errors": [],
            "warnings": [],
            "suggestions": []
        }

        # Check AI provider configuration
        default_provider = self.get_default_provider()
        if default_provider not in self.get_ai_providers():
            issues["errors"].append(f"Default provider '{default_provider}' is not configured")

        # Check API keys
        for provider in self.get_ai_providers():
            if not self.get_provider_api_key(provider):
                issues["warnings"].append(f"API key not set for provider '{provider}'")

        # Check default model
        default_model = self.get_default_model()
        provider_models = self.get_provider_models(default_provider)
        if default_model not in provider_models:
            issues["errors"].append(f"Default model '{default_model}' is not available for provider '{default_provider}'")

        # Check temperature range
        temperature = self.get_ai_temperature()
        if not (0.0 <= temperature <= 2.0):
            issues["errors"].append(f"Temperature {temperature} is outside valid range (0.0-2.0)")

        # Check max context tokens
        max_tokens = self.get_max_context_tokens()
        if max_tokens < 100 or max_tokens > 100000:
            issues["warnings"].append(f"Max context tokens {max_tokens} may be too small or too large")

        # Check learning difficulty
        difficulty = self.get_learning_difficulty()
        if not (1 <= difficulty <= 10):
            issues["errors"].append(f"Difficulty level {difficulty} is outside valid range (1-10)")

        # Check daily goal
        daily_goal = self.get_daily_goal_minutes()
        if daily_goal < 5 or daily_goal > 480:
            issues["warnings"].append(f"Daily goal {daily_goal} minutes may be too small or too large")

        # Suggestions
        if not issues["errors"] and not issues["warnings"]:
            issues["suggestions"].append("Configuration looks good!")

        return issues

    def export_configuration(self, file_path: str) -> bool:
        """Export configuration to a file"""
        try:
            export_path = Path(file_path)
            export_path.parent.mkdir(parents=True, exist_ok=True)

            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(self.preferences, f, indent=2)

            self.formatter.format_success(f"Configuration exported to {file_path}")
            return True
        except (IOError, PermissionError) as e:
            self.formatter.format_error(f"Failed to export configuration: {str(e)}")
            return False

    def import_configuration(self, file_path: str) -> bool:
        """Import configuration from a file"""
        try:
            import_path = Path(file_path)
            if not import_path.exists():
                self.formatter.format_error(f"Configuration file not found: {file_path}")
                return False

            with open(import_path, 'r', encoding='utf-8') as f:
                imported_prefs = json.load(f)

            # Validate imported configuration
            self.preferences = imported_prefs

            # Save imported configuration
            with open(self.preferences_path, 'w', encoding='utf-8') as f:
                json.dump(self.preferences, f, indent=2)

            self.formatter.format_success(f"Configuration imported from {file_path}")
            return True
        except (IOError, PermissionError, json.JSONDecodeError) as e:
            self.formatter.format_error(f"Failed to import configuration: {str(e)}")
            return False
