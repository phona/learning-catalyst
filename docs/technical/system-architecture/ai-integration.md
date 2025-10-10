# AI Integration Architecture

---
title: Learning Catalyst AI Integration Architecture
description: AI provider abstraction, integration patterns, and communication protocols
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This document covers Learning Catalyst's AI integration architecture, including provider abstraction, communication patterns, error handling, and performance optimization. The system is designed to support multiple AI providers while maintaining a consistent interface and enabling seamless switching between models.

## AI Integration Architecture Overview

### High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    CLI Interface Layer                      │
│                 User interactions with AI                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Catalyst Agent                           │
│                 AI context management                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Model Abstraction Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  OpenAI         │  │  Anthropic      │  │  Custom       │  │
│  │  Provider       │  │  Provider       │  │  Providers    │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External AI APIs                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ OpenAI API      │  │ Anthropic API   │  │ Custom APIs   │  │
│  │                 │  │                 │  │              │  │
│  │ • GPT-4         │  │ • Claude-3       │  │ • Local LLMs  │  │
│  │ • GPT-3.5       │  │ • Claude-2       │  │ • Custom      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Provider Abstraction Layer

### Core Provider Interface

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncGenerator
from dataclasses import dataclass
import asyncio

@dataclass
class AIResponse:
    content: str
    model: str
    provider: str
    tokens_used: Dict[str, int]  # input, output, total
    response_time: float
    metadata: Dict[str, Any]

@dataclass
class AIRequest:
    prompt: str
    model: str
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    context: Optional[Dict[str, Any]] = None
    stream: bool = False

class AIProvider(ABC):
    """Abstract base class for AI providers"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config.get('api_key')
        self.base_url = config.get('base_url')
        self.timeout = config.get('timeout', 30)
        self.max_retries = config.get('max_retries', 3)

    @abstractmethod
    async def generate_response(self, request: AIRequest) -> AIResponse:
        """Generate AI response for the given request"""
        pass

    @abstractmethod
    async def generate_streaming_response(
        self,
        request: AIRequest
    ) -> AsyncGenerator[str, None]:
        """Generate streaming AI response"""
        pass

    @abstractmethod
    def validate_api_key(self) -> bool:
        """Validate API key and connectivity"""
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        pass

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on provider"""
        try:
            is_valid = self.validate_api_key()
            models = self.get_available_models() if is_valid else []

            return {
                'provider': self.__class__.__name__,
                'status': 'healthy' if is_valid else 'unhealthy',
                'models_available': len(models),
                'response_time': await self._test_response_time(),
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'provider': self.__class__.__name__,
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }

    async def _test_response_time(self) -> float:
        """Test API response time"""
        start_time = time.time()
        try:
            test_request = AIRequest(
                prompt="Hello, respond with just 'OK'",
                model=self.get_available_models()[0] if self.get_available_models() else "default"
            )
            await self.generate_response(test_request)
            return time.time() - start_time
        except Exception:
            return -1.0
```

### OpenAI Provider Implementation

```python
import openai
from openai import AsyncOpenAI

class OpenAIProvider(AIProvider):
    """OpenAI API provider implementation"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url or "https://api.openai.com/v1",
            timeout=self.timeout
        )

    async def generate_response(self, request: AIRequest) -> AIResponse:
        """Generate response using OpenAI API"""
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=request.model,
                messages=[{"role": "user", "content": request.prompt}],
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=False
            )

            end_time = time.time()
            content = response.choices[0].message.content

            return AIResponse(
                content=content,
                model=response.model,
                provider="openai",
                tokens_used={
                    "input": response.usage.prompt_tokens,
                    "output": response.usage.completion_tokens,
                    "total": response.usage.total_tokens
                },
                response_time=end_time - start_time,
                metadata={
                    "finish_reason": response.choices[0].finish_reason,
                    "created": response.created
                }
            )

        except openai.APIError as e:
            raise AIProviderError(f"OpenAI API error: {e}")
        except Exception as e:
            raise AIProviderError(f"Unexpected error: {e}")

    async def generate_streaming_response(
        self,
        request: AIRequest
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response using OpenAI API"""
        try:
            stream = await self.client.chat.completions.create(
                model=request.model,
                messages=[{"role": "user", "content": request.prompt}],
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=True
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except openai.APIError as e:
            raise AIProviderError(f"OpenAI streaming error: {e}")

    def validate_api_key(self) -> bool:
        """Validate OpenAI API key"""
        try:
            # Test with a simple API call
            client = openai.OpenAI(api_key=self.api_key)
            models = client.models.list()
            return True
        except Exception:
            return False

    def get_available_models(self) -> List[str]:
        """Get available OpenAI models"""
        default_models = [
            "gpt-4",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
            "gpt-4-32k"
        ]

        # Try to get actual available models from API
        try:
            client = openai.OpenAI(api_key=self.api_key)
            models_response = client.models.list()

            available_models = []
            for model in models_response.data:
                if model.id.startswith(("gpt-", "text-", "davinci", "curie", "babbage", "ada")):
                    available_models.append(model.id)

            return available_models if available_models else default_models
        except Exception:
            return default_models
```

### Anthropic Provider Implementation

```python
import anthropic

class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider implementation"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client = anthropic.AsyncAnthropic(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.timeout
        )

    async def generate_response(self, request: AIRequest) -> AIResponse:
        """Generate response using Anthropic API"""
        start_time = time.time()

        try:
            response = await self.client.messages.create(
                model=request.model,
                max_tokens=request.max_tokens or 2000,
                temperature=request.temperature,
                messages=[{"role": "user", "content": request.prompt}]
            )

            end_time = time.time()
            content = response.content[0].text

            return AIResponse(
                content=content,
                model=response.model,
                provider="anthropic",
                tokens_used={
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens,
                    "total": response.usage.input_tokens + response.usage.output_tokens
                },
                response_time=end_time - start_time,
                metadata={
                    "stop_reason": response.stop_reason,
                    "id": response.id
                }
            )

        except anthropic.APIError as e:
            raise AIProviderError(f"Anthropic API error: {e}")
        except Exception as e:
            raise AIProviderError(f"Unexpected error: {e}")

    def validate_api_key(self) -> bool:
        """Validate Anthropic API key"""
        try:
            # Test with a simple API call
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return True
        except Exception:
            return False

    def get_available_models(self) -> List[str]:
        """Get available Anthropic models"""
        return [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2"
        ]
```

## Model Abstraction Manager

### Central Model Manager

```python
from typing import Dict, List, Optional
import asyncio
from enum import Enum

class ProviderStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"

class ModelManager:
    """Central manager for AI models and providers"""

    def __init__(self, config_manager):
        self.config_manager = config_manager
        self.providers: Dict[str, AIProvider] = {}
        self.current_provider: Optional[str] = None
        self.current_model: Optional[str] = None
        self.provider_status: Dict[str, ProviderStatus] = {}
        self.response_cache = ResponseCache()

    async def initialize_providers(self):
        """Initialize all configured providers"""
        provider_configs = self.config_manager.get("providers", {})

        for provider_name, config in provider_configs.items():
            try:
                provider = await self._create_provider(provider_name, config)
                self.providers[provider_name] = provider
                self.provider_status[provider_name] = ProviderStatus.TESTING

                # Test provider connectivity
                if await provider.validate_api_key():
                    self.provider_status[provider_name] = ProviderStatus.ACTIVE
                    print(f"✅ {provider_name}: Connected and working")
                else:
                    self.provider_status[provider_name] = ProviderStatus.ERROR
                    print(f"❌ {provider_name}: Connection failed")

            except Exception as e:
                self.provider_status[provider_name] = ProviderStatus.ERROR
                print(f"❌ {provider_name}: Failed to initialize - {e}")

        # Set default provider if none set
        if not self.current_provider:
            default_provider = self.config_manager.get("ai.default_provider")
            if default_provider and default_provider in self.providers:
                await self.set_active_provider(default_provider)

    async def _create_provider(self, provider_name: str, config: Dict[str, Any]) -> AIProvider:
        """Create provider instance based on type"""
        provider_type = config.get("type", provider_name.lower())

        if provider_type in ["openai"]:
            return OpenAIProvider(config)
        elif provider_type in ["anthropic", "claude"]:
            return AnthropicProvider(config)
        else:
            # Default to custom provider
            return CustomProvider(config)

    async def set_active_provider(self, provider_name: str) -> bool:
        """Set active AI provider"""
        if provider_name not in self.providers:
            return False

        if self.provider_status[provider_name] != ProviderStatus.ACTIVE:
            return False

        self.current_provider = provider_name

        # Set default model for provider
        available_models = self.providers[provider_name].get_available_models()
        if available_models:
            default_model = self.config_manager.get(f"providers.{provider_name}.default_model")
            if default_model and default_model in available_models:
                self.current_model = default_model
            else:
                self.current_model = available_models[0]

        return True

    async def set_active_model(self, model_name: str) -> bool:
        """Set active model for current provider"""
        if not self.current_provider:
            return False

        provider = self.providers[self.current_provider]
        available_models = provider.get_available_models()

        if model_name in available_models:
            self.current_model = model_name
            return True

        return False

    async def generate_response(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AIResponse:
        """Generate AI response using current provider and model"""
        if not self.current_provider or not self.current_model:
            raise AIProviderError("No active provider or model configured")

        # Check cache first
        cache_key = f"{self.current_provider}:{self.current_model}:{hash(prompt)}"
        cached_response = self.response_cache.get(cache_key)
        if cached_response:
            return cached_response

        provider = self.providers[self.current_provider]

        request = AIRequest(
            prompt=prompt,
            model=self.current_model,
            max_tokens=self.config_manager.get("ai.max_tokens"),
            temperature=self.config_manager.get("ai.temperature"),
            context=context
        )

        try:
            response = await provider.generate_response(request)

            # Cache successful responses
            self.response_cache.set(cache_key, response, ttl_seconds=3600)

            # Log token usage
            await self._log_token_usage(response)

            return response

        except Exception as e:
            # Try fallback providers if configured
            return await self._try_fallback_providers(prompt, context, e)

    async def _try_fallback_providers(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]],
        original_error: Exception
    ) -> AIResponse:
        """Try fallback providers if primary provider fails"""
        fallback_providers = self.config_manager.get("ai.fallback_providers", [])

        for provider_name in fallback_providers:
            if (provider_name in self.providers and
                self.provider_status[provider_name] == ProviderStatus.ACTIVE):

                try:
                    provider = self.providers[provider_name]
                    available_models = provider.get_available_models()

                    if available_models:
                        request = AIRequest(
                            prompt=prompt,
                            model=available_models[0],
                            max_tokens=self.config_manager.get("ai.max_tokens"),
                            temperature=self.config_manager.get("ai.temperature"),
                            context=context
                        )

                        response = await provider.generate_response(request)

                        # Log fallback usage
                        print(f"⚠️ Used fallback provider: {provider_name}")

                        return response

                except Exception as fallback_error:
                    continue

        # If all fallbacks fail, raise original error
        raise AIProviderError(f"All providers failed. Original error: {original_error}")

    async def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers"""
        status_report = {}

        for provider_name, provider in self.providers.items():
            health = await provider.health_check()
            health["configured"] = True
            health["is_active"] = (provider_name == self.current_provider)
            status_report[provider_name] = health

        return status_report

    async def _log_token_usage(self, response: AIResponse):
        """Log token usage for tracking"""
        # This would integrate with the database layer
        # to store usage statistics
        pass
```

## Error Handling and Resilience

### Custom Error Types

```python
class AIProviderError(Exception):
    """Base exception for AI provider errors"""
    pass

class APIKeyError(AIProviderError):
    """Invalid or missing API key"""
    pass

class ModelNotFoundError(AIProviderError):
    """Requested model not found"""
    pass

class RateLimitError(AIProviderError):
    """API rate limit exceeded"""
    pass

class QuotaExceededError(AIProviderError):
    """API quota exceeded"""
    pass

class NetworkError(AIProviderError):
    """Network connectivity issues"""
    pass
```

### Retry Mechanism

```python
import asyncio
from typing import Callable, Any
import random

class RetryManager:
    """Manage retry logic for API calls"""

    @staticmethod
    async def retry_with_backoff(
        func: Callable,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        backoff_factor: float = 2.0,
        jitter: bool = True
    ) -> Any:
        """
        Execute function with exponential backoff retry

        Args:
            func: Async function to execute
            max_retries: Maximum number of retry attempts
            base_delay: Initial delay between retries
            max_delay: Maximum delay between retries
            backoff_factor: Multiplier for delay increase
            jitter: Add random jitter to prevent thundering herd
        """
        last_exception = None

        for attempt in range(max_retries + 1):
            try:
                return await func()

            except Exception as e:
                last_exception = e

                # Don't retry on certain errors
                if isinstance(e, (APIKeyError, ModelNotFoundError)):
                    raise e

                # Check if we should retry
                if attempt == max_retries:
                    break

                # Calculate delay with exponential backoff
                delay = min(base_delay * (backoff_factor ** attempt), max_delay)

                # Add jitter if requested
                if jitter:
                    delay = delay * (0.5 + random.random() * 0.5)

                print(f"⚠️ Attempt {attempt + 1} failed: {e}")
                print(f"🔄 Retrying in {delay:.1f} seconds...")

                await asyncio.sleep(delay)

        # All retries failed
        raise last_exception

# Usage in provider implementations
class ResilientProvider(AIProvider):
    """Provider with built-in retry logic"""

    async def generate_response(self, request: AIRequest) -> AIResponse:
        """Generate response with retry logic"""
        async def _generate():
            return await self._do_generate_response(request)

        return await RetryManager.retry_with_backoff(
            _generate,
            max_retries=self.max_retries,
            base_delay=1.0,
            max_delay=30.0
        )
```

## Performance Optimization

### Response Caching

```python
import hashlib
import time
from typing import Dict, Optional, Any

class ResponseCache:
    """Cache AI responses to improve performance and reduce costs"""

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds

    def _generate_cache_key(self, provider: str, model: str, prompt: str) -> str:
        """Generate cache key for request"""
        content = f"{provider}:{model}:{prompt}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(self, provider: str, model: str, prompt: str) -> Optional[AIResponse]:
        """Get cached response"""
        cache_key = self._generate_cache_key(provider, model, prompt)

        if cache_key not in self.cache:
            return None

        cache_entry = self.cache[cache_key]

        # Check if expired
        if time.time() > cache_entry['expires_at']:
            del self.cache[cache_key]
            return None

        return cache_entry['response']

    def set(
        self,
        provider: str,
        model: str,
        prompt: str,
        response: AIResponse,
        ttl_seconds: Optional[int] = None
    ):
        """Cache response"""
        cache_key = self._generate_cache_key(provider, model, prompt)
        ttl = ttl_seconds or self.ttl_seconds

        # Remove oldest entries if cache is full
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(),
                           key=lambda k: self.cache[k]['created_at'])
            del self.cache[oldest_key]

        self.cache[cache_key] = {
            'response': response,
            'created_at': time.time(),
            'expires_at': time.time() + ttl
        }

    def clear(self):
        """Clear all cached responses"""
        self.cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_entries = len(self.cache)
        expired_entries = sum(
            1 for entry in self.cache.values()
            if time.time() > entry['expires_at']
        )

        return {
            'total_entries': total_entries,
            'active_entries': total_entries - expired_entries,
            'expired_entries': expired_entries,
            'ttl_seconds': self.ttl_seconds,
            'max_size': self.max_size
        }
```

### Batch Processing

```python
from concurrent.futures import ThreadPoolExecutor
from typing import List

class BatchProcessor:
    """Process multiple AI requests in parallel"""

    def __init__(self, model_manager: ModelManager, max_concurrent: int = 5):
        self.model_manager = model_manager
        self.max_concurrent = max_concurrent
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)

    async def process_batch(
        self,
        prompts: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> List[AIResponse]:
        """Process multiple prompts in parallel"""
        semaphore = asyncio.Semaphore(self.max_concurrent)

        async def process_single(prompt: str) -> AIResponse:
            async with semaphore:
                return await self.model_manager.generate_response(prompt, context)

        tasks = [process_single(prompt) for prompt in prompts]
        return await asyncio.gather(*tasks)

    async def process_batch_with_fallback(
        self,
        prompts: List[str],
        fallback_provider: str
    ) -> List[AIResponse]:
        """Process batch with fallback provider on failures"""
        results = []
        failed_indices = []

        # Try primary provider
        for i, prompt in enumerate(prompts):
            try:
                response = await self.model_manager.generate_response(prompt)
                results.append(response)
            except Exception as e:
                results.append(None)
                failed_indices.append(i)

        # Retry failed prompts with fallback provider
        if failed_indices:
            original_provider = self.model_manager.current_provider
            await self.model_manager.set_active_provider(fallback_provider)

            for i in failed_indices:
                try:
                    response = await self.model_manager.generate_response(prompts[i])
                    results[i] = response
                except Exception:
                    # Keep None if fallback also fails
                    pass

            # Restore original provider
            await self.model_manager.set_active_provider(original_provider)

        return results
```

## Configuration Management

### Provider Configuration

```python
@dataclass
class ProviderConfig:
    name: str
    type: str
    api_key: str
    base_url: Optional[str] = None
    default_model: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit_per_minute: int = 60
    cost_per_input_token: float = 0.0
    cost_per_output_token: float = 0.0
    context_window: int = 4096

class ProviderConfigManager:
    """Manage provider configurations"""

    def __init__(self, config_manager):
        self.config_manager = config_manager

    def add_provider(self, config: ProviderConfig) -> bool:
        """Add new provider configuration"""
        try:
            provider_data = {
                'type': config.type,
                'api_key': config.api_key,
                'base_url': config.base_url,
                'default_model': config.default_model,
                'timeout': config.timeout,
                'max_retries': config.max_retries,
                'rate_limit_per_minute': config.rate_limit_per_minute,
                'cost_per_input_token': config.cost_per_input_token,
                'cost_per_output_token': config.cost_per_output_token,
                'context_window': config.context_window
            }

            self.config_manager.set(f"providers.{config.name}", provider_data)
            return True

        except Exception as e:
            print(f"Failed to add provider {config.name}: {e}")
            return False

    def get_provider_config(self, provider_name: str) -> Optional[ProviderConfig]:
        """Get provider configuration"""
        config_data = self.config_manager.get(f"providers.{provider_name}")
        if not config_data:
            return None

        return ProviderConfig(
            name=provider_name,
            type=config_data.get('type', provider_name),
            api_key=config_data.get('api_key', ''),
            base_url=config_data.get('base_url'),
            default_model=config_data.get('default_model'),
            timeout=config_data.get('timeout', 30),
            max_retries=config_data.get('max_retries', 3),
            rate_limit_per_minute=config_data.get('rate_limit_per_minute', 60),
            cost_per_input_token=config_data.get('cost_per_input_token', 0.0),
            cost_per_output_token=config_data.get('cost_per_output_token', 0.0),
            context_window=config_data.get('context_window', 4096)
        )

    def list_providers(self) -> List[str]:
        """List all configured providers"""
        providers_config = self.config_manager.get("providers", {})
        return list(providers_config.keys())
```

## Troubleshooting AI Integration Issues

### Common Problems and Solutions

#### Issue: Provider Connection Failed
```bash
# Symptom: Provider shows as unhealthy
Learning Catalyst > /config status
OpenAI: ❌ Connection failed
Deepseek: ✅ Connected and working
SiliconFlow: ❌ Connection failed

# Solution: Test and reconfigure providers
Learning Catalyst > /config provider test openai
❌ OpenAI: Invalid API key

Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

Learning Catalyst > /config provider test openai
✅ OpenAI: Connected and working
```

#### Issue: Model Not Available
```bash
# Symptom: Model selection fails
Learning Catalyst > /config model use gpt-4-turbo
❌ Model not available: gpt-4-turbo

# Solution: Check available models and use alternatives
Learning Catalyst > /config models list
📋 Available Models:
  OpenAI: gpt-4, gpt-3.5-turbo
  Deepseek: deepseek-chat, deepseek-coder

Learning Catalyst > /config model use gpt-4
✅ Model switched to: gpt-4
```

#### Issue: Rate Limit Exceeded
```bash
# Symptom: Requests being rate limited
Learning Catalyst > explain quantum computing
⚠️ Rate limit exceeded. Please wait before making more requests.

# Solution: Check usage and switch providers if needed
Learning Catalyst > /tokens usage
📊 Token Usage:
  OpenAI: 4,999/5,000 tokens (99.9% used)
  Deepseek: 1,234/10,000 tokens (12.3% used)

Learning Catalyst > /config provider deepseek
✅ Switched to Deepseek provider
Learning Catalyst > explain quantum computing
🧠 [Response from Deepseek]
```

#### Issue: API Key Validation Failed
```bash
# Symptom: API key validation fails
Learning Catalyst > /config provider test openai
❌ OpenAI: Authentication failed: Invalid API key

# Solution: Check API key format and permissions
# 1. Verify API key starts with "sk-"
# 2. Check if key has proper permissions
# 3. Ensure account is active and has credits
# 4. Re-enter API key carefully

Learning Catalyst > /config apikey openai
🔧 Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
✅ API key updated successfully
```

### Performance Issues

#### Issue: Slow Response Times
```bash
# Symptom: AI responses taking too long
Learning Catalyst > explain machine learning
[Long delay before response]

# Solution: Optimize model selection and settings
Learning Catalyst > /config optimize speed
⚡ Speed Optimization:
  - Switched to faster model (gpt-3.5-turbo)
  - Reduced context window
  - Enabled response caching
  - Set lower temperature for quicker responses
```

#### Issue: High Token Usage
```bash
# Symptom: Unexpectedly high token consumption
Learning Catalyst > /tokens usage
📊 Token Usage:
  Current session: 2,345 tokens
  Estimated cost: $3.45

# Solution: Enable usage optimization
Learning Catalyst > /config optimize cost
💰 Cost Optimization:
  - Using more efficient model
  - Set daily token limit: 10,000
  - Enabled cost tracking alerts
  - Reduced response length
```

## Related Documentation

- **[CLI Architecture](cli-architecture.md)**: Command-line interface design
- **[Data Layer Architecture](data-layer.md)**: Data storage and management
- **[Security Architecture](security-architecture.md)**: Security considerations
- **[Performance Optimization](../performance-optimization/)**: Performance tuning strategies

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: System Architecture*