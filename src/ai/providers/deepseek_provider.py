"""
DeepSeek provider implementation
"""
from typing import Optional

from src.ai.abstraction import Model
from .base_provider import BaseProvider, BaseChatModel, BaseEmbeddingModel, BaseRerankModel


class DeepSeekProvider(BaseProvider):
    def __init__(self, api_key: str, base_url: str):
        super().__init__(api_key, base_url)

    @property
    def name(self) -> str:
        """Get the name of the provider"""
        return "deepseek"

    def _create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "deepseek" in model_id.lower():
            if "embedding" in model_id.lower():
                return DeepSeekEmbeddingModel(self, model_id)
            else:
                return DeepSeekChatModel(self, model_id)
        return None


class DeepSeekChatModel(BaseChatModel):
    def __init__(self, provider: DeepSeekProvider, model_id: str):
        super().__init__(provider, model_id)


class DeepSeekEmbeddingModel(BaseEmbeddingModel):
    def __init__(self, provider: DeepSeekProvider, model_id: str):
        super().__init__(provider, model_id)


class DeepSeekRerankModel(BaseRerankModel):
    def __init__(self, provider: DeepSeekProvider, model_id: str):
        super().__init__(provider, model_id)
