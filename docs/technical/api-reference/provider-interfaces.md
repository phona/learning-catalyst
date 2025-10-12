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

This document provides comprehensive API reference for Learning Catalyst's provider interface system, defining Python abstract classes and interfaces for AI provider integration, model management, and provider lifecycle management. The interfaces enable seamless integration with multiple AI providers while maintaining consistent interactions within the CLI application.

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

## Core Provider Interfaces

### Base Provider Interface

The foundation of the provider system is the `AIProvider` abstract class that defines the contract for all AI providers:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import asyncio

class ProviderStatus(Enum):
    """Provider operational status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    MAINTENANCE = "maintenance"

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

class AIProvider(ABC):
    """Abstract base class for all AI providers"""

    def __init__(self, config: ProviderConfig):
        """Initialize provider with configuration"""
        self.config = config
        self._status = ProviderStatus.INACTIVE
        self._models_cache: Optional[Dict[str, Any]] = None

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name"""
        pass

    @property
    @abstractmethod
    def supported_model_types(self) -> List[str]:
        """Return list of supported model types (chat, embedding, rerank)"""
        pass

    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the provider and validate connectivity.

        Returns:
            bool: True if initialization successful, False otherwise

        Raises:
            ProviderInitializationError: If provider cannot be initialized
            AuthenticationError: If authentication fails
        """
        pass

    @abstractmethod
    async def list_available_models(self) -> Dict[str, List[str]]:
        """
        Get list of available models for this provider.

        Returns:
            Dict with model types as keys and lists of model IDs as values:
            {
                "chat": ["model1", "model2"],
                "embedding": ["model3"],
                "rerank": ["model4"]
            }

        Raises:
            ProviderConnectionError: If unable to connect to provider
            AuthenticationError: If authentication fails
        """
        pass

    @abstractmethod
    async def create_model(self, model_id: str) -> 'AIModel':
        """
        Create a model instance for the specified model ID.

        Args:
            model_id: Unique identifier for the model

        Returns:
            AIModel instance

        Raises:
            ModelNotFoundError: If model_id is not available
            ModelCreationError: If model cannot be created
        """
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """
        Test connectivity to the provider.

        Returns:
            bool: True if connection successful, False otherwise
        """
        pass

    async def get_status(self) -> ProviderStatus:
        """Get current provider status"""
        return self._status

    async def shutdown(self) -> None:
        """Shutdown provider and cleanup resources"""
        self._status = ProviderStatus.INACTIVE
        self._models_cache = None
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

@dataclass
class ModelCapabilities:
    """Model capability description"""
    supports_streaming: bool = False
    supports_function_calling: bool = False
    supports_vision: bool = False
    max_tokens: Optional[int] = None
    max_input_length: Optional[int] = None

class AIModel(ABC):
    """Abstract base class for all AI models"""

    def __init__(self, model_id: str, provider: 'AIProvider'):
        self.model_id = model_id
        self.provider = provider
        self._capabilities: Optional[ModelCapabilities] = None

    @property
    @abstractmethod
    def model_type(self) -> ModelType:
        """Return the model type"""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> ModelCapabilities:
        """Return model capabilities"""
        pass

    @abstractmethod
    async def get_provider(self) -> 'AIProvider':
        """Get the provider instance"""
        pass

    @abstractmethod
    async def validate_model_access(self) -> bool:
        """
        Validate that the model is accessible and functional.

        Returns:
            bool: True if model is accessible, False otherwise
        """
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

    @property
    def model_type(self) -> ModelType:
        return ModelType.CHAT

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

    @abstractmethod
    async def count_tokens(self, messages: List[Message]) -> int:
        """
        Count tokens in the provided messages.

        Args:
            messages: List of messages to count

        Returns:
            int: Number of tokens
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

    @property
    def model_type(self) -> ModelType:
        return ModelType.EMBEDDING

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

    @abstractmethod
    async def get_similarity(
        self,
        text1: str,
        text2: str
    ) -> float:
        """
        Get similarity score between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            float: Similarity score (0.0 to 1.0)
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

    @property
    def model_type(self) -> ModelType:
        return ModelType.RERANK

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

## Provider Management Interfaces

### Provider Registry Interface

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Type
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
    async def get_active_provider(self) -> Optional[AIProvider]:
        """
        Get the currently active provider.

        Returns:
            Active AIProvider instance or None
        """
        pass

    @abstractmethod
    async def set_active_provider(self, provider_name: str) -> bool:
        """
        Set the active provider.

        Args:
            provider_name: Name of provider to activate

        Returns:
            bool: True if activation successful
        """
        pass
```

### Provider Manager Interface

```python
@dataclass
class ProviderHealthStatus:
    """Health status information for a provider"""
    provider_name: str
    is_healthy: bool
    last_check: float
    response_time: Optional[float]
    error_message: Optional[str]

class ProviderManager(ABC):
    """Abstract interface for provider lifecycle management"""

    @abstractmethod
    async def initialize_provider(self, config: ProviderConfig) -> AIProvider:
        """
        Initialize and configure a provider.

        Args:
            config: Provider configuration

        Returns:
            Initialized AIProvider instance

        Raises:
            ProviderInitializationError: If initialization fails
        """
        pass

    @abstractmethod
    async def test_provider_health(self, provider: AIProvider) -> ProviderHealthStatus:
        """
        Test provider health and connectivity.

        Args:
            provider: Provider to test

        Returns:
            ProviderHealthStatus with health information
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

class ProviderInitializationError(ProviderError):
    """Raised when provider initialization fails"""
    def __init__(self, provider_name: str, reason: str):
        self.provider_name = provider_name
        self.reason = reason
        super().__init__(f"Failed to initialize provider '{provider_name}': {reason}")

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

class ModelCreationError(ModelError):
    """Raised when model creation fails"""
    def __init__(self, model_id: str, reason: str):
        self.model_id = model_id
        self.reason = reason
        super().__init__(f"Failed to create model '{model_id}': {reason}")

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
        # Initialize provider
        success = await provider.initialize()
        if not success:
            print("Failed to initialize provider")
            return

        # List available models
        models = await provider.list_available_models()
        print(f"Available models: {models}")

        # Create chat model
        if models.get("chat"):
            chat_model = await provider.create_model(models["chat"][0])

            # Send message
            messages = [
                Message(role="user", content="Explain machine learning")
            ]

            response = await chat_model.send_message(messages, temperature=0.7)
            print(f"Response: {response.content}")

    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
    except ProviderConnectionError as e:
        print(f"Connection failed: {e}")
    except ModelError as e:
        print(f"Model error: {e}")
    finally:
        await provider.shutdown()

# Run the example
asyncio.run(example_provider_usage())
```

### Provider Management

```python
from learning_catalyst.providers import ProviderRegistry, ProviderManager

async def example_provider_management():
    # Initialize registry and manager
    registry = ProviderRegistry()
    manager = ProviderManager()

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

    # Test provider health
    openai_provider = await registry.get_provider("openai")
    health_status = await manager.test_provider_health(openai_provider)

    if health_status.is_healthy:
        print(f"OpenAI provider is healthy (response time: {health_status.response_time}ms)")
    else:
        print(f"OpenAI provider is unhealthy: {health_status.error_message}")

    # Switch providers if needed
    try:
        await manager.switch_provider("openai", "deepseek")
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
                status = await provider.get_status()
                print(f"{provider_name}: {status.value}")

        elif args.action == "switch":
            success = await self.registry.set_active_provider(args.provider_name)
            if success:
                print(f"Switched to {args.provider_name}")
            else:
                print(f"Failed to switch to {args.provider_name}")

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

        # Get provider and model
        provider = await self.provider_registry.get_provider(provider_name)
        model = await provider.create_model(model_id)

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
                health = await self.provider_manager.test_provider_health(provider)

                if health.is_healthy:
                    # Switch to alternative provider
                    await self.provider_manager.switch_provider(
                        current_provider.name,
                        provider_name
                    )

                    # Update session
                    session.set_provider(provider)

                    # Recreate model with same capabilities
                    current_model = session.get_model()
                    if current_model.model_type == ModelType.CHAT:
                        new_model = await provider.create_model(
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

    @property
    def supported_model_types(self) -> List[str]:
        return ["chat", "embedding"]

    async def initialize(self) -> bool:
        """Initialize custom provider"""
        # Custom initialization logic
        self._status = ProviderStatus.ACTIVE
        return True

    async def list_available_models(self) -> Dict[str, List[str]]:
        """List available models"""
        return {
            "chat": ["custom-model-1", "custom-model-2"],
            "embedding": ["custom-embedding-1"]
        }

    async def create_model(self, model_id: str) -> AIModel:
        """Create model instance"""
        if model_id.startswith("custom-model"):
            return CustomChatModel(model_id, self)
        elif model_id.startswith("custom-embedding"):
            return CustomEmbeddingModel(model_id, self)
        else:
            raise ModelNotFoundError(model_id, self.name)

    async def test_connection(self) -> bool:
        """Test connectivity"""
        # Custom connection test logic
        return True

class CustomChatModel(ChatModel):
    """Custom chat model implementation"""

    @property
    def capabilities(self) -> ModelCapabilities:
        return ModelCapabilities(
            supports_streaming=True,
            supports_function_calling=False,
            max_tokens=4096
        )

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

    async def test_provider_initialization(self):
        """Test provider initialization"""
        success = await self.provider.initialize()
        self.assertTrue(success)
        self.assertEqual(await self.provider.get_status(), ProviderStatus.ACTIVE)

    async def test_model_creation(self):
        """Test model creation"""
        await self.provider.initialize()

        chat_model = await self.provider.create_model("custom-model-1")
        self.assertIsInstance(chat_model, ChatModel)
        self.assertEqual(chat_model.model_id, "custom-model-1")

    async def test_invalid_model_creation(self):
        """Test invalid model creation raises error"""
        await self.provider.initialize()

        with self.assertRaises(ModelNotFoundError):
            await self.provider.create_model("invalid-model")
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

---

*Last updated: October 12, 2025*
*Version: 1.0.0*
*Category: Provider Interface API Reference*