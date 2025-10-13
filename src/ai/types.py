"""
AI provider types and capabilities for Learning Catalyst.

Type definitions for model capabilities, provider features, and custom provider configurations.
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass


class ModelCapability(Enum):
    """Individual model capabilities."""
    STREAMING = "streaming"
    FUNCTION_CALLING = "function_calling"
    VISION = "vision"
    AUDIO = "audio"
    MULTIMODAL = "multimodal"
    CODE_GENERATION = "code_generation"
    REASONING = "reasoning"
    MATH = "math"
    TOOL_USE = "tool_use"


@dataclass
class ModelCapabilities:
    """Model capability flags and metadata."""
    capabilities: Set[ModelCapability]
    max_context_length: Optional[int] = None
    supported_languages: List[str] = None
    specialization: Optional[str] = None
    cost_per_token: Optional[float] = None

    def has_capability(self, capability: ModelCapability) -> bool:
        """Check if model has a specific capability."""
        return capability in self.capabilities

    def add_capability(self, capability: ModelCapability) -> None:
        """Add a capability to the model."""
        self.capabilities.add(capability)

    def remove_capability(self, capability: ModelCapability) -> None:
        """Remove a capability from the model."""
        self.capabilities.discard(capability)


class ProviderType(Enum):
    """Provider types for classification."""
    BUILTIN = "builtin"
    OPENAI_COMPATIBLE = "openai_compatible"
    CUSTOM = "custom"
    LOCAL = "local"
    ENTERPRISE = "enterprise"


@dataclass
class ProviderCapabilities:
    """Provider feature support and capabilities."""
    provider_type: ProviderType
    supported_model_types: List[str]
    authentication_methods: List[str]
    features: Set[str]
    rate_limits: Optional[Dict[str, Any]] = None
    region_support: List[str] = None

    def supports_model_type(self, model_type: str) -> bool:
        """Check if provider supports a specific model type."""
        return model_type in self.supported_model_types

    def supports_auth_method(self, method: str) -> bool:
        """Check if provider supports a specific authentication method."""
        return method in self.authentication_methods

    def has_feature(self, feature: str) -> bool:
        """Check if provider has a specific feature."""
        return feature in self.features




class AuthenticationType(Enum):
    """Authentication types supported by providers."""
    API_KEY = "api_key"
    BEARER_TOKEN = "bearer_token"
    BASIC_AUTH = "basic_auth"
    OAUTH = "oauth"
    MTLS = "mtls"
    CUSTOM_HEADERS = "custom_headers"
    NONE = "none"


@dataclass
class AuthenticationConfig:
    """Authentication configuration for providers."""
    auth_type: AuthenticationType
    credentials: Dict[str, str]
    headers: Dict[str, str] = None
    additional_params: Dict[str, Any] = None

    def get_headers(self) -> Dict[str, str]:
        """Get authentication headers."""
        headers = self.headers or {}

        if self.auth_type == AuthenticationType.API_KEY:
            headers.update({
                'X-API-Key': self.credentials.get('api_key', '')
            })
        elif self.auth_type == AuthenticationType.BEARER_TOKEN:
            headers.update({
                'Authorization': f"Bearer {self.credentials.get('token', '')}"
            })
        elif self.auth_type == AuthenticationType.BASIC_AUTH:
            import base64
            credentials = f"{self.credentials.get('username', '')}:{self.credentials.get('password', '')}"
            encoded = base64.b64encode(credentials.encode()).decode()
            headers.update({
                'Authorization': f"Basic {encoded}"
            })

        return headers


# Predefined capability sets for common model types

GPT_CAPABILITIES = ModelCapabilities(
    capabilities={
        ModelCapability.STREAMING,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.VISION,
        ModelCapability.CODE_GENERATION,
        ModelCapability.REASONING,
        ModelCapability.TOOL_USE
    },
    max_context_length=128000,
    supported_languages=["en", "zh", "es", "fr", "de", "ja"],
    specialization="General purpose AI with strong reasoning"

)

CODING_MODEL_CAPABILITIES = ModelCapabilities(
    capabilities={
        ModelCapability.CODE_GENERATION,
        ModelCapability.REASONING,
        ModelCapability.MATH
    },
    max_context_length=32000,
    supported_languages=["python", "javascript", "java", "cpp", "go", "rust"],
    specialization="Programming and code generation"

)

EMBEDDING_CAPABILITIES = ModelCapabilities(
    capabilities=set(),
    max_context_length=8192,
    supported_languages=["en", "zh", "es", "fr", "de", "ja"],
    specialization="Text embeddings and semantic similarity"

)

RERANK_CAPABILITIES = ModelCapabilities(
    capabilities=set(),
    max_context_length=4096,
    supported_languages=["en", "zh", "es", "fr", "de", "ja"],
    specialization="Document ranking and relevance scoring"

)