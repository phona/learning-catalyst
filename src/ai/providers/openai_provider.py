"""
OpenAI provider implementation for Learning Catalyst.

Minimal async implementation of OpenAI API integration with streaming support.
"""

import asyncio
import time
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


class OpenAIChatModel(ChatModel):
    """OpenAI chat model implementation using OpenAI library."""

    def __init__(self, model_id: str, provider: 'OpenAIProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'OpenAIProvider':
        """Get the provider instance."""
        return self._provider

    async def send_message(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ):
        """Send message to OpenAI model using OpenAI library."""
        logger = get_logger("openai_provider")

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
            logger.error(f"Authentication failed for OpenAI: {e}")
            raise AuthenticationError("openai", "Invalid API key")
        except openai.NotFoundError as e:
            logger.error(f"Model not found: {self.model_id}")
            raise ModelError(f"Model {self.model_id} not found")
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded for OpenAI")
            raise ProviderError("openai", "Rate limit exceeded")
        except openai.APIConnectionError as e:
            logger.error(f"Connection error: {e}")
            raise ProviderConnectionError("openai", f"Connection error: {str(e)}")
        except openai.APITimeoutError as e:
            logger.error(f"Request timeout: {e}")
            raise ProviderConnectionError("openai", f"Request timeout: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in OpenAI: {e}")
            raise ProviderError("openai", f"Unexpected error: {str(e)}")


class OpenAIEmbeddingModel(EmbeddingModel):
    """OpenAI embedding model implementation."""

    def __init__(self, model_id: str, provider: 'OpenAIProvider'):
        super().__init__(model_id, provider)

    async def get_provider(self) -> 'OpenAIProvider':
        """Get the provider instance."""
        return self._provider

    async def get_embeddings(
        self,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings from OpenAI using OpenAI library."""
        logger = get_logger("openai_provider")

        if not texts:
            raise ValidationError("texts", texts, "cannot be empty")

        try:
            # Use the provider's client
            client = self._provider._client

            # Prepare embedding parameters
            embedding_params = {
                "model": self.model_id,
                "input": texts
            }

            if dimensions:
                embedding_params["dimensions"] = dimensions

            # Create embeddings
            response = await client.embeddings.create(**embedding_params)

            logger.info(f"Embeddings created for {len(texts)} texts using {self.model_id}")

            return EmbeddingResponse(
                embeddings=[item.embedding for item in response.data],
                usage=response.usage.model_dump() if response.usage else {},
                model=response.model,
                dimensions=len(response.data[0].embedding)
            )

        except openai.AuthenticationError as e:
            logger.error(f"Authentication failed for OpenAI embeddings: {e}")
            raise AuthenticationError("openai", "Invalid API key")
        except openai.NotFoundError as e:
            logger.error(f"Embedding model not found: {self.model_id}")
            raise ModelError(f"Model {self.model_id} not found")
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded for OpenAI embeddings")
            raise ProviderError("openai", "Rate limit exceeded")
        except openai.APIConnectionError as e:
            logger.error(f"Connection error: {e}")
            raise ProviderConnectionError("openai", f"Connection error: {str(e)}")
        except openai.APITimeoutError as e:
            logger.error(f"Request timeout: {e}")
            raise ProviderConnectionError("openai", f"Request timeout: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in OpenAI embeddings: {e}")
            raise ProviderError("openai", f"Unexpected error: {str(e)}")


class OpenAIProvider(AIProvider):
    """OpenAI provider implementation using OpenAI library."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.logger = get_logger("openai_provider")

        if not self.config.base_url:
            self.config.base_url = "https://api.openai.com/v1"

        # Set default timeout if not configured
        if not self.config.timeout:
            self.config.timeout = 30.0

        # Create OpenAI client once and reuse
        self._client = openai.AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout
        )

        self.logger.info(f"OpenAI provider initialized with base_url: {self.config.base_url}")

    @property
    def name(self) -> str:
        return "openai"

    def create_chat_model(self, model_id: str) -> OpenAIChatModel:
        """
        Create a chat model instance for any model ID.

        Args:
            model_id: The model identifier

        Returns:
            OpenAIChatModel instance
        """
        return OpenAIChatModel(model_id, self)

    async def list_available_models(self) -> ModelList:
        """List available OpenAI models by fetching from the API."""
        # Fetch models from API
        models_list = await self._client.models.list()
        models = models_list.data

        # Filter and categorize models
        chat_models = []
        embedding_models = []

        # Known model patterns
        chat_patterns = ["gpt-4", "gpt-3.5", "o1"]
        embedding_patterns = ["text-embedding"]

        for model in models:
            model_id = model.id

            # Check if it's a chat model
            if any(pattern in model_id for pattern in chat_patterns):
                if not any(exclude in model_id for exclude in ["-vision", "-audio"]):
                    chat_models.append(OpenAIChatModel(model_id, self))

            # Check if it's an embedding model
            elif any(pattern in model_id for pattern in embedding_patterns):
                embedding_models.append(OpenAIEmbeddingModel(model_id, self))

        # Sort by model name (newest/most capable first)
        chat_models.sort(key=lambda m: m.model_id, reverse=True)
        embedding_models.sort(key=lambda m: m.model_id, reverse=True)

        return ModelList(
            chat=chat_models,
            embedding=embedding_models,
            rerank=[]  # OpenAI doesn't have rerank models
        )

    async def health_check(self) -> bool:
        """Check if OpenAI API is accessible using OpenAI library."""
        try:
            # Test with a simple API call - try to list models
            await self._client.models.list()
            return True
        except:
            return False