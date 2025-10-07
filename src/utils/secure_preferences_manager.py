"""
Secure preferences manager that integrates with encryption for sensitive data
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.utils.encryption import SecureConfigManager
from src.utils.error_handler import FileOperationError, handle_errors, log_error


class SecurePreferencesManager:
    """Manages preferences with secure storage for sensitive data"""

    def __init__(self, workspace_path: str) -> None:
        self.workspace_path: Path = Path(workspace_path)
        self.catalyst_path: Path = self.workspace_path / ".catalyst"
        self.preferences_file: Path = self.catalyst_path / "preferences.json"
        self.secure_config: SecureConfigManager = SecureConfigManager(workspace_path)

        # Initialize preferences file if it doesn't exist
        self._init_preferences()

    def _init_preferences(self) -> None:
        """Initialize preferences file"""
        if not self.preferences_file.exists():
            with open(self.preferences_file, "w", encoding="utf-8") as f:
                json.dump({}, f)

    @handle_errors(reraise=True)
    def set_preference(self, key: str, value: Any) -> None:
        """Set a preference value"""
        if not key:
            raise ValueError("Preference key cannot be empty")

        try:
            preferences = self._load_preferences()

            # Check if this is a sensitive key that should be encrypted
            if self._is_sensitive_key(key):
                self.secure_config.set_secure_value(key, str(value))  # type: ignore[call-arg]
                # Don't store sensitive values in plain preferences
                if key in preferences:
                    del preferences[key]
            else:
                preferences[key] = value
                self._save_preferences(preferences)

        except (ValueError, RuntimeError, OSError) as e:
            raise FileOperationError(f"Failed to set preference {key}") from e

    @handle_errors(default_return=None)
    def get_preference(self, key: str, default: Any = None) -> Any:
        """Get a preference value"""
        if not key:
            raise ValueError("Preference key cannot be empty")

        try:
            # Check if this is a sensitive key that should be decrypted
            if self._is_sensitive_key(key):
                secure_value: Optional[str] = self.secure_config.get_secure_value(key)  # type: ignore[call-arg]
                return secure_value if secure_value is not None else default  # type: ignore[return-value]

            # Get from regular preferences
            preferences = self._load_preferences()
            result: Any = preferences.get(key, default)
            return result

        except (ValueError, RuntimeError, KeyError) as e:
            log_error(f"Failed to get preference {key}", {"error": str(e)})
            return default

    @handle_errors(reraise=True)
    def delete_preference(self, key: str) -> bool:
        """Delete a preference"""
        if not key:
            raise ValueError("Preference key cannot be empty")

        try:
            preferences = self._load_preferences()
            deleted = False

            # Check regular preferences
            if key in preferences:
                del preferences[key]
                deleted = True

            # Check secure preferences
            if self._is_sensitive_key(key):
                if self.secure_config.get_secure_value(key) is not None:  # type: ignore[call-arg]
                    self.secure_config.delete_api_key(key)  # type: ignore[call-arg]  # Using delete_api_key for secure values
                    deleted = True
            if deleted:
                self._save_preferences(preferences)

            return deleted

        except (ValueError, RuntimeError, OSError) as e:
            raise FileOperationError(f"Failed to delete preference {key}") from e

    def _is_sensitive_key(self, key: str) -> bool:
        """Check if a key contains sensitive information"""
        sensitive_patterns = ["api_key", "password", "token", "secret", "credential", "auth"]

        key_lower = key.lower()
        return any(pattern in key_lower for pattern in sensitive_patterns)

    def _load_preferences(self) -> Dict[str, Any]:
        """Load preferences from file"""
        try:
            with open(self.preferences_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            log_error("Failed to load preferences, using empty dict", {"error": str(e)})
            return {}

    def _save_preferences(self, preferences: Dict[str, Any]) -> None:
        """Save preferences to file"""
        try:
            with open(self.preferences_file, "w", encoding="utf-8") as f:
                json.dump(preferences, f, indent=2)
        except (OSError, ValueError, TypeError) as e:
            raise FileOperationError("Failed to save preferences") from e

    def get_all_preferences(self) -> Dict[str, Any]:
        """Get all non-sensitive preferences"""
        try:
            preferences = self._load_preferences()
            # Filter out sensitive keys
            return {k: v for k, v in preferences.items() if not self._is_sensitive_key(k)}
        except (ValueError, RuntimeError, OSError) as e:
            log_error("Failed to get all preferences", {"error": str(e)})
            return {}

    def list_sensitive_keys(self) -> List[str]:
        """List all sensitive keys that are stored"""
        try:
            providers: List[str] = self.secure_config.list_providers_with_keys()  # type: ignore[call-arg]

            # Look for API key patterns in secure storage
            sensitive_keys: List[str] = []
            for provider in providers:
                sensitive_keys.append(f"ai.{provider}_api_key")

            return sensitive_keys
        except (ValueError, RuntimeError, KeyError) as e:
            log_error("Failed to list sensitive keys", {"error": str(e)})
            return []

    def migrate_to_secure_storage(self) -> None:
        """Migrate existing plain-text sensitive preferences to secure storage"""
        try:
            preferences = self._load_preferences()
            migrated_keys: List[str] = []

            for key, value in preferences.items():
                if self._is_sensitive_key(key):
                    # Move to secure storage
                    self.secure_config.set_secure_value(key, str(value))  # type: ignore[call-arg]
                    migrated_keys.append(key)
                    # Remove from plain preferences
                    del preferences[key]

            if migrated_keys:
                self._save_preferences(preferences)
                log_info(
                    f"Migrated {len(migrated_keys)} sensitive preferences to secure storage",
                    {"migrated_keys": migrated_keys},
                )

        except (ValueError, RuntimeError, OSError) as e:
            log_error("Failed to migrate preferences to secure storage", {"error": str(e)})


def log_info(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log informational messages with optional context"""
    logger = logging.getLogger(__name__)
    logger.info(message, extra={"context": context or {}})
