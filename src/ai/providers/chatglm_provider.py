"""
ChatGLM provider implementation for Learning Catalyst.

Implementation using OpenAI library with ChatGLM API compatibility.
ChatGLM API follows OpenAI API format, making it compatible with OpenAI library.
"""

import asyncio
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

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


class ChatGLMChatModel(ChatModel):
    """ChatGLM chat model implementation."""

    def __init__(self, model_id: str, provider: 'ChatGLMProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'ChatGLMProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        enable_thinking: bool = True
    ):
        """Send message to ChatGLM model using OpenAI library."""
        logger = get_logger("chatglm_provider")

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

            # Add thinking support for GLM models
            if enable_thinking:
                completion_params["extra_body"] = {
                    "thinking": {
                        "type": "enabled"
                    }
                }

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
            logger.error(f"Authentication failed for ChatGLM: {e}")
            raise AuthenticationError("chatglm", "Invalid API key")
        except openai.NotFoundError as e:
            logger.error(f"Model not found: {self.model_id}")
            raise ModelError(f"Model {self.model_id} not found")
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded for ChatGLM")
            raise ProviderError("chatglm", "Rate limit exceeded")
        except openai.APIConnectionError as e:
            logger.error(f"Connection error: {e}")
            raise ProviderConnectionError("chatglm", f"Connection error: {str(e)}")
        except openai.APITimeoutError as e:
            logger.error(f"Request timeout: {e}")
            raise ProviderConnectionError("chatglm", f"Request timeout: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in ChatGLM: {e}")
            raise ProviderError("chatglm", f"Unexpected error: {str(e)}")


class ChatGLMProvider(AIProvider):
    """ChatGLM provider implementation using OpenAI library."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.logger = get_logger("chatglm_provider")

        if not self.config.base_url:
            self.config.base_url = "https://open.bigmodel.cn/api/paas/v4"

        # Set default timeout if not configured
        if not self.config.timeout:
            self.config.timeout = 30.0

        # Create OpenAI client once and reuse
        self._client = openai.AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout
        )

        self.logger.info(f"ChatGLM provider initialized with base_url: {self.config.base_url}")

    @property
    def name(self) -> str:
        return "chatglm"

    def create_chat_model(self, model_id: str) -> ChatGLMChatModel:
        """
        Create a chat model instance for any model ID.

        Args:
            model_id: The model identifier

        Returns:
            ChatGLMChatModel instance
        """
        return ChatGLMChatModel(model_id, self)

    async def list_available_models(self) -> ModelList:
        """List available ChatGLM models."""
        # Common ChatGLM models
        chat_models = [
            ChatGLMChatModel("glm-4", self),
            ChatGLMChatModel("glm-4-plus", self),
            ChatGLMChatModel("glm-4-0520", self),
            ChatGLMChatModel("glm-4-air", self),
            ChatGLMChatModel("glm-4.5-air", self),
            ChatGLMChatModel("glm-4-airx", self),
            ChatGLMChatModel("glm-4-long", self),
            ChatGLMChatModel("glm-4-flashx", self),
            ChatGLMChatModel("glm-4-flash", self),
        ]

        return {
            "chat": chat_models,
            "embedding": [],  # ChatGLM doesn't have embedding models
            "rerank": []     # ChatGLM doesn't have rerank models
        }

    async def health_check(self) -> bool:
        """Check if ChatGLM API is accessible using OpenAI library."""
        try:
            # Test with a simple API call - try to list models
            await self._client.models.list()
            return True
        except:
            return False