"""
Concrete provider implementations for Learning Catalyst.

This module contains provider implementations for various AI services.
"""

# Base classes and interfaces
from .base import AIProvider, AIModel, ChatModel, EmbeddingModel, RerankModel

# Built-in provider implementations
from .openai_provider import OpenAIProvider
from .deepseek_provider import DeepSeekProvider
from .siliconflow_provider import SiliconFlowProvider
from .chatglm_provider import ChatGLMProvider

# Custom/OpenAI-compatible provider implementations
from .openai_compatible import (
    OpenAICompatibleProvider, CustomProviderFactory,
    CustomChatModel, CustomEmbeddingModel
)

__all__ = [
    # Base classes
    'AIProvider', 'AIModel', 'ChatModel', 'EmbeddingModel', 'RerankModel',

    # Built-in providers
    'OpenAIProvider', 'DeepSeekProvider', 'SiliconFlowProvider', 'ChatGLMProvider',

    # Custom providers
    'OpenAICompatibleProvider', 'CustomProviderFactory',
    'CustomChatModel', 'CustomEmbeddingModel'
]