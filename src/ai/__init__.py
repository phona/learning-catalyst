"""
AI provider integration for Learning Catalyst.

Support for multiple AI providers with unified interface and multi-agent learning.
"""

from .registry import ProviderRegistry
from .models import AIModel, ChatModel, EmbeddingModel, RerankModel
from .factory import ModelFactory
from .types import (
    ModelCapability, ModelCapabilities, ProviderType, ProviderCapabilities,
    AuthenticationType, AuthenticationConfig
)

# Import all provider-related components from the providers module
from .providers import (
    # Base classes and interfaces
    AIProvider,

    # Built-in providers
    OpenAIProvider, DeepSeekProvider, SiliconFlowProvider, ChatGLMProvider,

    # Custom/OpenAI-compatible providers
    OpenAICompatibleProvider, CustomProviderFactory,
    CustomChatModel, CustomEmbeddingModel
)

# Import multi-agent system
from .integration import AIIntegration
from .agents import AgentCoordinator, AgentType
from .context import ContextManager
from .tools import ToolRegistry

__all__ = [
    # Core interfaces
    'AIProvider', 'ProviderRegistry', 'AIModel', 'ChatModel',
    'EmbeddingModel', 'RerankModel', 'ModelFactory',

    # Built-in providers
    'OpenAIProvider', 'DeepSeekProvider', 'SiliconFlowProvider', 'ChatGLMProvider',

    # Custom provider infrastructure
    'OpenAICompatibleProvider', 'CustomProviderFactory',
    'CustomChatModel', 'CustomEmbeddingModel',

    # Types and capabilities
    'ModelCapability', 'ModelCapabilities', 'ProviderType', 'ProviderCapabilities',
    'AuthenticationType', 'AuthenticationConfig',

    # Multi-agent system
    'AIIntegration', 'AgentCoordinator', 'AgentType', 'ContextManager', 'ToolRegistry'
]