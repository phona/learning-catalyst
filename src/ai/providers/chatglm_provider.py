"""
ChatGLM provider implementation
"""

from typing import Optional, List
from datetime import datetime

from src.ai.abstraction import ModelProvider, ChatModel, EmbeddingModel, RerankModel, Model
from src.data.models.extended_models import AIResponse, Credentials, EmbeddingResponse, Message, RerankResponse
from .base_provider import BaseProvider, BaseChatModel, BaseEmbeddingModel, BaseRerankModel


class ChatGLMProvider(BaseProvider):
    """Provider class for interacting with ChatGLM API."""

    def __init__(self, api_key: str, base_url: str = "https://open.bigmodel.cn/api/paas/v4"):
        super().__init__(api_key, base_url)

    @property
    def name(self) -> str:
        """Get the name of the provider"""
        return "chatglm"

    def _get_headers(self, credentials: Optional[Credentials] = None) -> dict:
        """Get headers for ChatGLM API requests"""
        headers = {"Content-Type": "application/json"}
        
        api_key = credentials.api_key if credentials else self.api_key
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        return headers

    def _create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "glm" in model_id.lower():
            if "embedding" in model_id.lower():
                return ChatGLMEmbeddingModel(self, model_id)
            else:
                return ChatGLMChatModel(self, model_id)
        return None

    async def list_available_models(self) -> List[Model]:
        """Get list of available ChatGLM models"""
        models = []
        
        # Chat models
        models.append(ChatGLMChatModel(self, "glm-4"))
        models.append(ChatGLMChatModel(self, "glm-3-turbo"))
        
        # Embedding models
        models.append(ChatGLMEmbeddingModel(self, "embedding-2"))
        
        return models


class ChatGLMChatModel(BaseChatModel):
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
                "max_tokens": 1000  # Add max_tokens to prevent extremely long responses
            }
            
            result = await self._provider._make_request("chat/completions", payload)
            
            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=self._model_id,
                provider=self._provider.name,
                usage=self._extract_usage(result),
                timestamp=datetime.now().isoformat(),
            )
        except Exception as e:
            # Return error response with more specific error handling
            return AIResponse(
                content=f"Error: {str(e)}",
                model=self._model_id,
                provider=self._provider.name,
                usage={},
                timestamp=datetime.now().isoformat(),
            )

    def _extract_usage(self, result: dict) -> dict:
        """Extract usage information from API response"""
        return {
            "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
            "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
            "total_tokens": result.get("usage", {}).get("total_tokens", 0),
        }


class ChatGLMEmbeddingModel(BaseEmbeddingModel):
    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)

    async def get_embeddings(self, texts: List[str], dimensions: Optional[int] = None) -> EmbeddingResponse:
        """Get embeddings for texts using ChatGLM"""
        try:
            payload = {"model": self._model_id, "input": texts}
            
            if dimensions:
                payload["dimensions"] = dimensions
            
            result = await self._provider._make_request("embeddings", payload)
            
            return EmbeddingResponse(
                embeddings=[item["embedding"] for item in result["data"]],
                model=self._model_id,
                provider=self._provider.name,
                usage=self._extract_usage(result),
            )
        except Exception as e:
            return EmbeddingResponse(
                embeddings=[],
                model=self._model_id,
                provider=self._provider.name,
                usage={},
                error=str(e)
            )

    def _extract_usage(self, result: dict) -> dict:
        """Extract usage information from API response"""
        return {
            "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
            "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
            "total_tokens": result.get("usage", {}).get("total_tokens", 0),
        }


class ChatGLMRerankModel(BaseRerankModel):
    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)
