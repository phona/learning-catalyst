"""
Encryption utilities for securing sensitive data like API keys
"""

import base64
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

    _cryptography_available = True
except ImportError:
    # Fallback for when cryptography is not available
    Fernet = None  # type: ignore
    hashes = None  # type: ignore
    PBKDF2HMAC = None  # type: ignore
    default_backend = None  # type: ignore
    _cryptography_available = False
from src.utils.error_handler import ConfigurationError, FileOperationError, handle_errors


class EncryptionManager:
    """Manages encryption and decryption of sensitive data"""

    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.catalyst_path = self.workspace_path / ".catalyst"
        self.key_file = self.catalyst_path / ".encryption_key"
        self.salt_file = self.catalyst_path / ".encryption_salt"

        # Ensure directories exist
        self.catalyst_path.mkdir(exist_ok=True)

        # Initialize or load encryption key
        self._init_encryption_key()

    def _init_encryption_key(self) -> None:
        """Initialize or load encryption key"""
        if not _cryptography_available:
            raise ConfigurationError("Cryptography library is not available")

        try:
            if self.key_file.exists() and self.salt_file.exists():
                # Load existing key and salt
                with open(self.key_file, "rb") as f:
                    self.key = f.read()
                with open(self.salt_file, "rb") as f:
                    self.salt = f.read()
            else:
                # Generate new key and salt
                self.salt = os.urandom(16)
                self.key = Fernet.generate_key()  # type: ignore

                # Save key and salt
                with open(self.key_file, "wb") as f:
                    f.write(self.key)
                with open(self.salt_file, "wb") as f:
                    f.write(self.salt)

                # Set file permissions (read/write for owner only)
                os.chmod(self.key_file, 0o600)
                os.chmod(self.salt_file, 0o600)

            self.cipher = Fernet(self.key)  # type: ignore

        except (OSError, ValueError, RuntimeError, ImportError) as e:
            raise ConfigurationError("Failed to initialize encryption") from e

    def derive_key_from_password(self, password: str) -> bytes:
        """Derive encryption key from user password"""
        if not _cryptography_available:
            raise ConfigurationError("Cryptography library is not available")

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),  # type: ignore
            length=32,
            salt=self.salt,
            iterations=100000,
            backend=default_backend(),  # type: ignore
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    @handle_errors(reraise=True)
    def encrypt(self, data: str) -> str:
        """Encrypt string data"""
        if not data:
            raise ValueError("Data to encrypt cannot be empty")

        if not _cryptography_available:
            raise ConfigurationError("Cryptography library is not available")

        try:
            encrypted_data = self.cipher.encrypt(data.encode())  # type: ignore
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except (ValueError, RuntimeError, TypeError) as e:
            raise FileOperationError("Failed to encrypt data") from e

    @handle_errors(reraise=True)
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt string data"""
        if not encrypted_data:
            raise ValueError("Encrypted data cannot be empty")

        if not _cryptography_available:
            raise ConfigurationError("Cryptography library is not available")

        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(decoded_data)  # type: ignore
            return decrypted_data.decode()
        except (ValueError, RuntimeError, TypeError, base64.binascii.Error) as e:
            raise FileOperationError("Failed to decrypt data") from e

    @handle_errors(reraise=True)
    def encrypt_dict(self, data: Dict[str, Any]) -> str:
        """Encrypt dictionary data"""
        if not data:
            raise ValueError("Data to encrypt cannot be empty")

        try:
            json_str = json.dumps(data)
            return self.encrypt(json_str)
        except (ValueError, RuntimeError, TypeError, json.JSONEncodeError) as e:
            raise FileOperationError("Failed to encrypt dictionary") from e

    @handle_errors(reraise=True)
    def decrypt_dict(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt dictionary data"""
        if not encrypted_data:
            raise ValueError("Encrypted data cannot be empty")

        try:
            json_str = self.decrypt(encrypted_data)
            return json.loads(json_str)
        except (ValueError, RuntimeError, TypeError, json.JSONDecodeError) as e:
            raise FileOperationError("Failed to decrypt dictionary") from e

    def rotate_key(self) -> None:
        """Rotate encryption key and re-encrypt sensitive files"""
        # This is a placeholder for key rotation functionality
        # In a production environment, you would:
        # 1. Generate new key
        # 2. Re-encrypt all sensitive data with new key
        # 3. Update key files
        # 4. Clean up old key
        raise NotImplementedError("Key rotation not yet implemented")


class SecureConfigManager:
    """Manages secure configuration with encryption"""

    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.catalyst_path = self.workspace_path / ".catalyst"
        self.config_file = self.catalyst_path / "secure_config.json"
        self.encryption_manager = EncryptionManager(workspace_path)

        # Initialize config file if it doesn't exist
        self._init_config()

    def _init_config(self) -> None:
        """Initialize secure configuration file"""
        if not self.config_file.exists():
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump({}, f)
            os.chmod(self.config_file, 0o600)

    @handle_errors(reraise=True)
    def set_api_key(self, provider: str, api_key: str) -> None:
        """Securely store API key"""
        if not provider:
            raise ValueError("Provider name cannot be empty")

        if not api_key:
            raise ValueError("API key cannot be empty")

        try:
            # Load existing config
            config = self._load_config()

            # Encrypt and store API key
            encrypted_key = self.encryption_manager.encrypt(api_key)
            config["api_keys"] = config.get("api_keys", {})
            config["api_keys"][provider] = encrypted_key

            # Save config
            self._save_config(config)

        except (ValueError, RuntimeError, OSError) as e:
            raise FileOperationError(f"Failed to store API key for {provider}") from e

    @handle_errors(default_return=None)
    def get_api_key(self, provider: str) -> Optional[str]:
        """Retrieve and decrypt API key"""
        if not provider:
            raise ValueError("Provider name cannot be empty")

        try:
            config = self._load_config()
            api_keys = config.get("api_keys", {})

            if provider not in api_keys:
                return None

            encrypted_key = api_keys[provider]
            return self.encryption_manager.decrypt(encrypted_key)

        except (ValueError, RuntimeError, KeyError) as e:
            raise FileOperationError(f"Failed to retrieve API key for {provider}") from e

    @handle_errors(reraise=True)
    def delete_api_key(self, provider: str) -> bool:
        """Delete API key for provider"""
        if not provider:
            raise ValueError("Provider name cannot be empty")

        try:
            config = self._load_config()
            api_keys = config.get("api_keys", {})

            if provider in api_keys:
                del api_keys[provider]
                config["api_keys"] = api_keys
                self._save_config(config)
                return True

            return False

        except (ValueError, RuntimeError, OSError) as e:
            raise FileOperationError(f"Failed to delete API key for {provider}") from e

    @handle_errors(reraise=True)
    def set_secure_value(self, key: str, value: str) -> None:
        """Store any sensitive value securely"""
        if not key:
            raise ValueError("Key cannot be empty")

        if not value:
            raise ValueError("Value cannot be empty")

        try:
            config = self._load_config()

            # Encrypt and store value
            encrypted_value = self.encryption_manager.encrypt(value)
            config["secure_values"] = config.get("secure_values", {})
            config["secure_values"][key] = encrypted_value
            self._save_config(config)

        except (ValueError, RuntimeError, OSError) as e:
            raise FileOperationError(f"Failed to store secure value for {key}") from e

    @handle_errors(default_return=None)
    def get_secure_value(self, key: str) -> Optional[str]:
        """Retrieve and decrypt sensitive value"""
        if not key:
            raise ValueError("Key cannot be empty")

        try:
            config = self._load_config()
            secure_values = config.get("secure_values", {})

            if key not in secure_values:
                return None

            encrypted_value = secure_values[key]
            return self.encryption_manager.decrypt(encrypted_value)

        except (ValueError, RuntimeError, KeyError) as e:
            raise FileOperationError(f"Failed to retrieve secure value for {key}") from e

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            raise FileOperationError("Failed to load secure configuration") from e

    def _save_config(self, config: Dict[str, Any]) -> None:
        """Save configuration to file"""
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2)
        except (OSError, ValueError, TypeError) as e:
            raise FileOperationError("Failed to save secure configuration") from e

    def list_providers_with_keys(self) -> List[str]:
        """List providers that have stored API keys"""
        try:
            config = self._load_config()
            api_keys = config.get("api_keys", {})
            return list(api_keys.keys())
        except (OSError, ValueError, KeyError):
            return []


# Utility functions for backward compatibility
def get_secure_config_manager(workspace_path: str) -> SecureConfigManager:
    """Get secure config manager instance"""
    return SecureConfigManager(workspace_path)


def encrypt_api_key(workspace_path: str, provider: str, api_key: str) -> None:
    """Encrypt and store API key (convenience function)"""
    config_manager = get_secure_config_manager(workspace_path)
    config_manager.set_api_key(provider, api_key)


def decrypt_api_key(workspace_path: str, provider: str) -> Optional[str]:
    """Retrieve and decrypt API key (convenience function)"""
    config_manager = get_secure_config_manager(workspace_path)
    return config_manager.get_api_key(provider)
