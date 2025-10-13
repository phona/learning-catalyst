"""
Core exceptions for Learning Catalyst.

Simple, focused exception hierarchy matching the API reference.
"""


class ProviderError(Exception):
    """Base exception for all provider-related errors."""
    pass


class AuthenticationError(ProviderError):
    """Raised when authentication fails."""

    def __init__(self, provider_name: str, details: str = ""):
        self.provider_name = provider_name
        self.details = details
        super().__init__(f"Authentication failed for provider '{provider_name}': {details}")


class ModelError(ProviderError):
    """Base exception for model-related errors."""
    pass


class ModelNotFoundError(ModelError):
    """Raised when requested model is not available."""

    def __init__(self, model_id: str, provider_name: str):
        self.model_id = model_id
        self.provider_name = provider_name
        super().__init__(f"Model '{model_id}' not found in provider '{provider_name}'")


class ProviderConnectionError(ProviderError):
    """Raised when provider connection fails."""

    def __init__(self, provider_name: str, details: str = ""):
        self.provider_name = provider_name
        self.details = details
        super().__init__(f"Connection failed for provider '{provider_name}': {details}")


class ValidationError(ProviderError):
    """Raised when input validation fails."""

    def __init__(self, field: str, value, reason: str):
        self.field = field
        self.value = value
        self.reason = reason
        super().__init__(f"Validation failed for field '{field}': {reason}")


class ProviderRegistrationError(ProviderError):
    """Raised when provider registration fails."""

    def __init__(self, provider_name: str, reason: str):
        self.provider_name = provider_name
        self.reason = reason
        super().__init__(f"Failed to register provider '{provider_name}': {reason}")


class ProviderSwitchError(ProviderError):
    """Raised when provider switching fails."""

    def __init__(self, from_provider: str, to_provider: str, reason: str):
        self.from_provider = from_provider
        self.to_provider = to_provider
        self.reason = reason
        super().__init__(f"Failed to switch from '{from_provider}' to '{to_provider}': {reason}")