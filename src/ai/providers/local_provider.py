"""
Local provider implementation
"""
from typing import Optional

from src.ai.abstraction import Model
from .base_provider import BaseProvider, BaseChatModel, BaseEmbeddingModel, BaseRerankModel


class LocalModelProvider(BaseProvider):
    """Provider class for interacting with local models via HTTP API."""

    def __init__(self, api_key: str, base_url: str):
        super().__init__(api_key, base_url)

    @property
    def name(self) -> str:
        """Get the name of the provider"""
        return "local"

    def _create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "chat" in model_id.lower() or "llm" in model_id.lower():
            return LocalChatModel(self, model_id)
        elif "embedding" in model_id.lower():
            return LocalEmbeddingModel(self, model_id)
        elif "rerank" in model_id.lower():
            return LocalRerankModel(self, model_id)
        return None


class LocalChatModel(BaseChatModel):
    def __init__(self, provider: LocalModelProvider, model_id: str):
        super().__init__(provider, model_id)


class LocalEmbeddingModel(BaseEmbeddingModel):
    def __init__(self, provider: LocalModelProvider, model_id: str):
        super().__init__(provider, model_id)


class LocalRerankModel(BaseRerankModel):
    def __init__(self, provider: LocalModelProvider, model_id: str):
        super().__init__(provider, model_id)
