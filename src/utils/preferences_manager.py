"""
Preferences manager implementation with key-value support (like npm config)
"""
import json
from pathlib import Path
from typing import Any, Dict, Union


class PreferencesManager:
    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.preferences_path = self.workspace_path / ".catalyst" / "preferences.json"
        self.preferences_path.parent.mkdir(exist_ok=True)

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
                "max_context_tokens": 4096
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

            return True
        except (KeyError, TypeError, ValueError) as e:
            print(f"Error setting preference: {e}")
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
            print(f"Error getting preference: {e}")
            return None
