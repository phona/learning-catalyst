"""
DeepSeek provider implementation for Learning Catalyst.

Minimal async implementation of DeepSeek API integration.
"""

import asyncio
from typing import List, Dict, Any, Optional

from ...core.models import (
    ProviderConfig, ModelList, Message, ChatResponse,
    EmbeddingResponse, RerankResponse, RerankResult
)
from ...core.exceptions import (
    ProviderError, AuthenticationError, ModelError,
    ProviderConnectionError, ValidationError
)
from ...core.logging import get_logger
from ..models import AIModel, ChatModel, EmbeddingModel, RerankModel
from .base import AIProvider

# Import OpenAI library
import openai


class DeepSeekChatModel(ChatModel):
    """DeepSeek chat model implementation using OpenAI library."""

    def __init__(self, model_id: str, provider: 'DeepSeekProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'DeepSeekProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ):
        """Send message to DeepSeek model using OpenAI library."""
        logger = get_logger("deepseek_provider")

        if not 0.0 <= temperature <= 2.0:
            raise ValidationError("temperature", temperature, "must be between 0.0 and 2.0")

        logger.debug(f"Sending message to {self.model_id}: {len(messages)} messages")

        # Convert Message objects to OpenAI format
        openai_messages = []
        for msg in messages:
            openai_msg = {"role": msg.role, "content": msg.content}
            if msg.name:
                openai_msg["name"] = msg.name
            if msg.function_call:
                openai_msg["function_call"] = msg.function_call
            openai_messages.append(openai_msg)

        try:
            # Use the provider's client
            client = self._provider._client

            # Prepare completion parameters
            completion_params = {
                "model": self.model_id,
                "messages": openai_messages,
                "temperature": temperature,
                "stream": stream
            }

            if max_tokens:
                completion_params["max_tokens"] = max_tokens

            if stream:
                # Handle streaming response - return ChatResponse wrapper
                response = await client.chat.completions.create(**completion_params)
                return ChatResponse.from_stream(response)
            else:
                # Handle non-streaming response
                response = await client.chat.completions.create(**completion_params)

                logger.info(f"Response received from {self.model_id}")
                return ChatResponse.from_complete(response)

        except openai.AuthenticationError as e:
            logger.error(f"Authentication failed for DeepSeek: {e}")
            raise AuthenticationError("deepseek", "Invalid API key")
        except openai.NotFoundError as e:
            logger.error(f"Model not found: {self.model_id}")
            raise ModelError(f"Model {self.model_id} not found")
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded for DeepSeek")
            raise ProviderError("deepseek", "Rate limit exceeded")
        except openai.APIConnectionError as e:
            logger.error(f"Connection error: {e}")
            raise ProviderConnectionError("deepseek", f"Connection error: {str(e)}")
        except openai.APITimeoutError as e:
            logger.error(f"Request timeout: {e}")
            raise ProviderConnectionError("deepseek", f"Request timeout: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in DeepSeek: {e}")
            raise ProviderError("deepseek", f"Unexpected error: {str(e)}")


class DeepSeekProvider(AIProvider):
    """DeepSeek provider implementation using OpenAI library."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.logger = get_logger("deepseek_provider")

        if not self.config.base_url:
            self.config.base_url = "https://api.deepseek.com"

        # Set default timeout if not configured
        if not self.config.timeout:
            self.config.timeout = 30.0

        # Create OpenAI client once and reuse
        self._client = openai.AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout
        )

        self.logger.info(f"DeepSeek provider initialized with base_url: {self.config.base_url}")

    @property
    def name(self) -> str:
        return "deepseek"

    def create_chat_model(self, model_id: str) -> DeepSeekChatModel:
        """
        Create a chat model instance for any model ID.

        Args:
            model_id: The model identifier

        Returns:
            DeepSeekChatModel instance
        """
        return DeepSeekChatModel(model_id, self)

    async def list_available_models(self) -> ModelList:
        """List available DeepSeek models by fetching from the API."""
        # Fetch models from API
        models_list = await self._client.models.list()
        models = models_list.data

        # Filter chat models
        chat_models = []
        for model in models:
            model_id = model.id
            # DeepSeek chat models typically contain "deepseek"
            if "deepseek" in model_id.lower():
                chat_models.append(DeepSeekChatModel(model_id, self))

        # Sort by model name
        chat_models.sort(key=lambda m: m.model_id, reverse=True)

        return ModelList(
            chat=chat_models,
            embedding=[],  # DeepSeek doesn't have embedding models
            rerank=[]     # DeepSeek doesn't have rerank models
        )

    async def health_check(self) -> bool:
        """Check if DeepSeek API is accessible using OpenAI library."""
        try:
            # Test with a simple API call - try to list models
            await self._client.models.list()
            return True
        except:
            return False