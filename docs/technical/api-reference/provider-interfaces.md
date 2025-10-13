# Provider Interface API Reference

---
title: Learning Catalyst Provider Interface API Reference
description: Python abstract classes and interfaces for AI provider integration and management
version: 1.0.0
last_updated: 2025-10-12
difficulty: "Advanced"
estimated_time: "60 minutes"
---

## Overview

This document provides comprehensive API reference for Learning Catalyst's provider interface system, defining Python abstract classes and interfaces for AI provider integration and model discovery. The interfaces enable seamless integration with multiple AI providers while maintaining consistent interactions within the CLI application.

**For detailed architectural patterns and design principles, see the [Provider Integration Architecture](../system-architecture/provider-integration.md) document.**

## Provider Interface Architecture

### Core Provider Interfaces

The provider system is built around a hierarchy of abstract classes that define contracts for AI providers, models, and management operations. All providers must implement these interfaces to ensure consistent behavior and seamless integration.

**Design Principles:**
- **Abstract Base Classes**: All provider interfaces inherit from `abc.ABC` with clear method contracts
- **Type Safety**: Comprehensive type hints using Python's `typing` module
- **Async-First Design**: All operations are asynchronous to maintain CLI responsiveness
- **Error Handling**: Structured exception hierarchy for different failure modes
- **Configuration-Driven**: Provider behavior controlled through configuration objects
- **Simplified Interface**: Focused on model discovery rather than lifecycle management

## Core Provider Interfaces

### Base Provider Interface

The foundation of the provider system is the `AIProvider` abstract class that defines the contract for all AI providers:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union, TypedDict
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import asyncio


@dataclass
class ProviderConfig:
    """Configuration object for AI providers"""
    name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit: Optional[int] = None
    custom_headers: Dict[str, str] = None
    additional_config: Dict[str, Any] = None

class ModelList(TypedDict, total=False):
    """TypedDict containing available models by type"""
    chat: List['ChatModel']
    embedding: List['EmbeddingModel']
    rerank: List['RerankModel']

class AIProvider(ABC):
    """Abstract base class for all AI providers"""

    def __init__(self, config: ProviderConfig):
        """Initialize provider with configuration"""
        self.config = config

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name"""
        pass

    @abstractmethod
    async def list_available_models(self) -> ModelList:
        """
        Get list of available model instances for this provider.

        Returns:
            ModelList TypedDict with model instances organized by type:
            {
                "chat": [ChatModel(...), ChatModel(...)],
                "embedding": [EmbeddingModel(...)],
                "rerank": [RerankModel(...)]
            }

        Raises:
            ProviderConnectionError: If unable to connect to provider
            AuthenticationError: If authentication fails
        """
        pass

    
```

### Model Interface Hierarchy

The model interface hierarchy provides specialized abstract classes for different types of AI models:

```python
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass
from enum import Enum

class ModelType(Enum):
    """Supported model types"""
    CHAT = "chat"
    EMBEDDING = "embedding"
    RERANK = "rerank"


class AIModel(ABC):
    """Abstract base class for all AI models"""

    def __init__(self, model_id: str, provider: 'AIProvider'):
        self.model_id = model_id
        self.provider = provider

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Return the model ID"""
        pass

    
    @abstractmethod
    async def get_provider(self) -> 'AIProvider':
        """Get the provider instance"""
        pass

```

#### Chat Model Interface

```python
from typing import List, Optional, Dict, Any, AsyncGenerator
from dataclasses import dataclass

@dataclass
class Message:
    """Message for chat interactions"""
    role: str  # "user", "assistant", "system"
    content: str
    name: Optional[str] = None
    function_call: Optional[Dict[str, Any]] = None

@dataclass
class ChatResponse:
    """Response from chat model"""
    content: str
    finish_reason: str
    usage: Dict[str, int]
    model: str
    timestamp: float

class ChatModel(AIModel):
    """Abstract base class for chat models"""

    @abstractmethod
    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[ChatResponse, AsyncGenerator[ChatResponse, None]]:
        """
        Send messages to the chat model and get response.

        Args:
            messages: List of messages in conversation
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream response

        Returns:
            ChatResponse or AsyncGenerator of ChatResponse if streaming

        Raises:
            ModelError: If model request fails
            ValidationError: If input is invalid
        """
        pass

```

#### Embedding Model Interface

```python
import numpy as np
from typing import List

@dataclass
class EmbeddingResponse:
    """Response from embedding model"""
    embeddings: List[List[float]]
    usage: Dict[str, int]
    model: str
    dimensions: int

class EmbeddingModel(AIModel):
    """Abstract base class for embedding models"""

    @abstractmethod
    async def get_embeddings(
        self,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """
        Get embeddings for the provided texts.

        Args:
            texts: List of texts to embed
            dimensions: Optional embedding dimensions

        Returns:
            EmbeddingResponse with embedding vectors

        Raises:
            ModelError: If embedding generation fails
            ValidationError: If input is invalid
        """
        pass
```

#### Rerank Model Interface

```python
@dataclass
class RerankResult:
    """Single rerank result"""
    index: int
    score: float
    document: str

@dataclass
class RerankResponse:
    """Response from rerank model"""
    results: List[RerankResult]
    model: str
    usage: Dict[str, int]

class RerankModel(AIModel):
    """Abstract base class for rerank models"""

    @abstractmethod
    async def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = 10
    ) -> RerankResponse:
        """
        Rerank documents based on query relevance.

        Args:
            query: Search query
            documents: List of documents to rank
            top_k: Number of top results to return

        Returns:
            RerankResponse with ranked results

        Raises:
            ModelError: If reranking fails
            ValidationError: If input is invalid
        """
        pass
```

## Provider Management Interface

### Provider Registry Interface

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Type
from dataclasses import dataclass
import asyncio

class ProviderRegistry(ABC):
    """Abstract interface for provider registration and management"""

    @abstractmethod
    async def register_provider(
        self,
        provider_class: Type[AIProvider],
        config: ProviderConfig
    ) -> bool:
        """
        Register a new provider instance.

        Args:
            provider_class: Provider class to register
            config: Provider configuration

        Returns:
            bool: True if registration successful

        Raises:
            ProviderRegistrationError: If registration fails
        """
        pass

    @abstractmethod
    async def unregister_provider(self, provider_name: str) -> bool:
        """
        Unregister a provider.

        Args:
            provider_name: Name of provider to unregister

        Returns:
            bool: True if unregistration successful
        """
        pass

    @abstractmethod
    async def get_provider(self, provider_name: str) -> Optional[AIProvider]:
        """
        Get registered provider by name.

        Args:
            provider_name: Name of provider

        Returns:
            AIProvider instance or None if not found
        """
        pass

    @abstractmethod
    async def list_providers(self) -> List[str]:
        """
        List all registered provider names.

        Returns:
            List of provider names
        """
        pass

    @abstractmethod
    async def get_provider_metrics(self, provider_name: str) -> Dict[str, Any]:
        """
        Get usage metrics for a provider.

        Args:
            provider_name: Name of provider

        Returns:
            Dictionary with metrics (requests, errors, latency, etc.)
        """
        pass

    @abstractmethod
    async def switch_provider(
        self,
        from_provider: str,
        to_provider: str
    ) -> bool:
        """
        Switch from one provider to another.

        Args:
            from_provider: Current provider name
            to_provider: Target provider name

        Returns:
            bool: True if switch successful

        Raises:
            ProviderSwitchError: If switch fails
        """
        pass
```

## Exception Hierarchy

```python
class ProviderError(Exception):
    """Base exception for all provider-related errors"""
    pass

class AuthenticationError(ProviderError):
    """Raised when authentication fails"""
    def __init__(self, provider_name: str, details: str = ""):
        self.provider_name = provider_name
        self.details = details
        super().__init__(f"Authentication failed for provider '{provider_name}': {details}")

class ModelError(ProviderError):
    """Base exception for model-related errors"""
    pass

class ModelNotFoundError(ModelError):
    """Raised when requested model is not available"""
    def __init__(self, model_id: str, provider_name: str):
        self.model_id = model_id
        self.provider_name = provider_name
        super().__init__(f"Model '{model_id}' not found in provider '{provider_name}'")


class ProviderConnectionError(ProviderError):
    """Raised when provider connection fails"""
    def __init__(self, provider_name: str, details: str = ""):
        self.provider_name = provider_name
        self.details = details
        super().__init__(f"Connection failed for provider '{provider_name}': {details}")

class ProviderRegistrationError(ProviderError):
    """Raised when provider registration fails"""
    def __init__(self, provider_name: str, reason: str):
        self.provider_name = provider_name
        self.reason = reason
        super().__init__(f"Failed to register provider '{provider_name}': {reason}")

class ValidationError(ProviderError):
    """Raised when input validation fails"""
    def __init__(self, field: str, value: Any, reason: str):
        self.field = field
        self.value = value
        self.reason = reason
        super().__init__(f"Validation failed for field '{field}': {reason}")

class ProviderSwitchError(ProviderError):
    """Raised when provider switching fails"""
    def __init__(self, from_provider: str, to_provider: str, reason: str):
        self.from_provider = from_provider
        self.to_provider = to_provider
        self.reason = reason
        super().__init__(f"Failed to switch from '{from_provider}' to '{to_provider}': {reason}")
```

## Usage Examples

### Basic Provider Usage

```python
import asyncio
from learning_catalyst.providers import OpenAIProvider, ProviderConfig

async def example_provider_usage():
    # Create provider configuration
    config = ProviderConfig(
        name="openai",
        api_key="sk-your-api-key-here",
        base_url="https://api.openai.com/v1",
        timeout=30,
        max_retries=3
    )

    # Initialize provider
    provider = OpenAIProvider(config)

    try:
        # List available models
        models = await provider.list_available_models()
        print(f"Available models: {models}")

        # Access model instances directly by type
        if models.get("chat"):
            print(f"Chat models available: {len(models['chat'])} models")
            for chat_model in models["chat"]:
                print(f"  - {chat_model.model_id}")

    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
    except ProviderConnectionError as e:
        print(f"Connection failed: {e}")
    except ModelError as e:
        print(f"Model error: {e}")

# Run the example
asyncio.run(example_provider_usage())
```

### Provider Management

```python
from learning_catalyst.providers import ProviderRegistry

async def example_provider_management():
    # Initialize unified registry
    registry = ProviderRegistry()

    # Configure multiple providers
    openai_config = ProviderConfig(
        name="openai",
        api_key="sk-openai-key"
    )

    deepseek_config = ProviderConfig(
        name="deepseek",
        api_key="sk-deepseek-key"
    )

    # Register providers
    await registry.register_provider(OpenAIProvider, openai_config)
    await registry.register_provider(DeepSeekProvider, deepseek_config)

    # Switch providers if needed
    try:
        await registry.switch_provider("openai", "deepseek")
        print("Successfully switched to DeepSeek provider")
    except ProviderSwitchError as e:
        print(f"Failed to switch providers: {e}")
```

## Integration Patterns

### CLI Integration

```python
from learning_catalyst.cli.commands import BaseCommand
from learning_catalyst.providers import ProviderRegistry, ProviderConfig

class ProviderCommand(BaseCommand):
    """CLI command for provider management"""

    def __init__(self):
        self.registry = ProviderRegistry()

    async def handle_config_provider(self, args):
        """Handle /config provider command"""
        if args.action == "list":
            providers = await self.registry.list_providers()
            for provider_name in providers:
                provider = await self.registry.get_provider(provider_name)
                print(f"{provider_name}: Available")

        elif args.action == "switch":
            # Provider switching would be handled by a higher-level component
            # This example shows the concept without implementing the actual switching logic
            provider = await self.registry.get_provider(args.provider_name)
            if provider:
                print(f"Switched to {args.provider_name}")
            else:
                print(f"Provider {args.provider_name} not found")

        elif args.action == "add":
            # Interactive provider setup
            config = await self._interactive_provider_setup(args.provider_name)
            provider_class = self._get_provider_class(args.provider_name)

            try:
                await self.registry.register_provider(provider_class, config)
                print(f"Successfully added {args.provider_name}")
            except ProviderRegistrationError as e:
                print(f"Failed to add provider: {e}")
```

### Session Integration

```python
from learning_catalyst.session import SessionManager

class ProviderAwareSessionManager(SessionManager):
    """Session manager with provider integration"""

    async def create_session_with_provider(
        self,
        provider_name: str,
        model_id: str
    ) -> 'Session':
        """Create session with specific provider and model"""

        # Get provider
        provider = await self.provider_registry.get_provider(provider_name)

        # Note: Model instantiation would be handled by a factory or higher-level component
        # This example assumes model creation is handled elsewhere
        model = self._get_model_instance(provider, model_id)

        # Create session
        session = await self.create_session()
        session.set_provider(provider)
        session.set_model(model)

        return session

    async def handle_provider_failure(self, session: 'Session'):
        """Handle provider failure during session"""

        # Get current provider
        current_provider = session.get_provider()

        # Find alternative provider
        providers = await self.provider_registry.list_providers()
        for provider_name in providers:
            if provider_name != current_provider.name:
                provider = await self.provider_registry.get_provider(provider_name)

                # Switch to alternative provider
                await self.provider_registry.switch_provider(
                    current_provider.name,
                    provider_name
                )

                # Update session
                session.set_provider(provider)

                # Recreate model with same type
                current_model = session.get_model()
                if isinstance(current_model, ChatModel):
                    new_model = self._get_model_instance(
                        provider,
                        await self._find_compatible_model(provider, "chat")
                    )
                    session.set_model(new_model)

                break
```

## Implementation Guidelines

### Creating Custom Providers

```python
from learning_catalyst.providers import AIProvider, ProviderConfig, ChatModel
from learning_catalyst.providers.types import ModelType, ModelCapabilities

class CustomProvider(AIProvider):
    """Example custom provider implementation"""

    @property
    def name(self) -> str:
        return "custom-provider"

  
    async def list_available_models(self) -> ModelList:
        """List available models"""
        # Note: This would typically create actual model instances
        # For documentation purposes, showing the structure
        return {
            "chat": [],  # Would contain [CustomChatModel("custom-model-1", self), ...]
            "embedding": []  # Would contain [CustomEmbeddingModel("custom-embedding-1", self), ...]
        }

    # Note: Model creation would be handled by a factory or higher-level component
    # The provider's role is primarily to list available models

    
class CustomChatModel(ChatModel):
    """Custom chat model implementation"""

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[ChatResponse, AsyncGenerator[ChatResponse, None]]:
        """Send message to custom model"""
        # Custom API call implementation
        pass
```

### Testing Provider Implementations

```python
import unittest
from unittest.mock import AsyncMock, patch
from learning_catalyst.providers import ProviderConfig

class TestCustomProvider(unittest.TestCase):
    """Test suite for custom provider"""

    async def asyncSetUp(self):
        self.config = ProviderConfig(
            name="test-provider",
            api_key="test-key"
        )
        self.provider = CustomProvider(self.config)

    async def test_model_listing(self):
        """Test provider model listing"""
        models = await self.provider.list_available_models()

        # Verify chat models are listed
        self.assertIn("chat", models)
        self.assertIsInstance(models["chat"], list)
        if models["chat"]:
            self.assertIsInstance(models["chat"][0], ChatModel)

        # Verify embedding models are listed
        self.assertIn("embedding", models)
        self.assertIsInstance(models["embedding"], list)
        if models["embedding"]:
            self.assertIsInstance(models["embedding"][0], EmbeddingModel)
```

## Related Documentation

### System Architecture Integration
- **[Provider Integration Architecture](../system-architecture/provider-integration.md)**: Complete provider architecture and integration patterns
- **[AI Integration Architecture](../system-architecture/ai-integration.md)**: Multi-agent orchestration with Microsoft AutoGen
- **[Data Layer Architecture](../system-architecture/data-layer.md)**: Data storage and management patterns

### API Reference Documentation
- **[Configuration API](configuration-api.md)**: Configuration management and settings architecture
- **[Data Models](data-models.md)**: Entity definitions, relationships, and validation constraints
- **[CLI Commands API](cli-commands.md)**: Command-line interface specifications
- **[Knowledge Management API](knowledge-management.md)**: Knowledge graph and learning systems API

### Implementation and Usage
- **[Implementation Guides](../implementation-guides/)**: Provider development and setup instructions
- **[Configuration Commands](../../commands/configuration.md)**: CLI command reference for provider management
- **[Examples](../../examples/)**: Practical provider integration examples and workflows

### Architectural Alignment
This Provider Interface API directly implements the architectural patterns described in the system architecture documentation:
- **Provider Abstraction**: Consistent interfaces across all AI providers with seamless switching capabilities
- **Configuration-Driven Design**: Provider behavior controlled through configuration objects
- **CLI Integration**: Provider interfaces designed for command-line application integration
- **Error Handling**: Structured exception hierarchy for robust error management
- **Simplified Responsibility**: Providers focus on model discovery rather than lifecycle management

---

*Last updated: October 12, 2025*
*Version: 1.0.0*
*Category: Provider Interface API Reference*