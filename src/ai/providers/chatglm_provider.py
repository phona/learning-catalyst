"""
ChatGLM provider implementation
"""
from typing import Optional

from src.ai.abstraction import Model
from .base_provider import BaseProvider, BaseChatModel, BaseEmbeddingModel, BaseRerankModel


class ChatGLMProvider(BaseProvider):
    """Provider class for interacting with ChatGLM API."""

    def __init__(self, api_key: str, base_url: str = "https://open.bigmodel.cn/api/paas/v4"):
        super().__init__(api_key, base_url)

    @property
    def name(self) -> str:
        """Get the name of the provider"""
        return "chatglm"

    def _create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "glm" in model_id.lower():
            if "embedding" in model_id.lower():
                return ChatGLMEmbeddingModel(self, model_id)
            else:
                return ChatGLMChatModel(self, model_id)
        return None


class ChatGLMChatModel(BaseChatModel):
    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)


class ChatGLMEmbeddingModel(BaseEmbeddingModel):
    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)


class ChatGLMRerankModel(BaseRerankModel):
    def __init__(self, provider: ChatGLMProvider, model_id: str):
        super().__init__(provider, model_id)
