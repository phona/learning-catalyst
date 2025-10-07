"""
ChatGLM provider implementation
"""

from datetime import datetime
from typing import Dict, List, Optional

import httpx

from src.ai.abstraction import Model
from src.data.models.extended_models import AIResponse, EmbeddingResponse, Message

from .base_provider import BaseChatModel, BaseEmbeddingModel, BaseProvider, BaseRerankModel


class ChatGLMProvider(BaseProvider):
    """Provider class for interacting with ChatGLM API."""

    # Class attributes
    name = "chatglm"
    description = "Zhipu AI (ChatGLM) - Chinese language models, good for multilingual content"

    def __init__(self, api_key: str, base_url: str = "https://open.bigmodel.cn/api/paas/v4"):
        super().__init__(api_key, base_url)

    def create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "glm" in model_id.lower():
            if "embedding" in model_id.lower():
                return ChatGLMEmbeddingModel(self, model_id)
            return ChatGLMChatModel(self, model_id)
        return None

    async def list_available_models(self) -> Dict[str, List[Model]]:
        """Get list of available ChatGLM models grouped by type"""
        # Return empty lists since models should be chosen by users
        # Users can specify any model ID when creating model instances
        return {"chat": [], "embedding": [], "rerank": []}


class ChatGLMChatModel(BaseChatModel):
    """ChatGLM chat model implementation."""

    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)

    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to ChatGLM and get response"""
        try:
            # Convert Message objects to dict format
            message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]

            payload = {
                "model": self._model_id,
                "messages": message_dicts,
                "temperature": temperature,
                "max_tokens": 1000,  # Add max_tokens to prevent extremely long responses
            }

            result = await self._provider.make_request("chat/completions", payload)  # type: ignore

            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=self._model_id,
                provider=self._provider.__class__.name,
                usage=self._extract_usage(result),
                timestamp=datetime.now().isoformat(),
            )
        except (httpx.RequestError, httpx.TimeoutException, KeyError, ValueError) as e:
            # Return error response with more specific error handling
            return AIResponse(
                content=f"Error: {str(e)}",
                model=self._model_id,
                provider=self._provider.__class__.name,
                usage={},
                timestamp=datetime.now().isoformat(),
            )


class ChatGLMEmbeddingModel(BaseEmbeddingModel):
    """ChatGLM embedding model implementation."""

    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)

    async def get_embeddings(self, texts: List[str], dimensions: Optional[int] = None) -> EmbeddingResponse:
        """Get embeddings for texts using ChatGLM"""
        try:
            return await super().get_embeddings(texts, dimensions)
        except (httpx.RequestError, httpx.TimeoutException, KeyError, ValueError) as e:
            return EmbeddingResponse(
                embeddings=[], model=self._model_id, provider=self._provider.__class__.name, usage={}, error=str(e)
            )


class ChatGLMRerankModel(BaseRerankModel):
    """ChatGLM rerank model implementation."""

    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)
