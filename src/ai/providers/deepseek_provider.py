"""
DeepSeek provider implementation
"""

from typing import Optional

from src.ai.abstraction import Model

from .base_provider import BaseChatModel, BaseEmbeddingModel, BaseProvider, BaseRerankModel


class DeepSeekProvider(BaseProvider):
    """Provider class for interacting with DeepSeek API."""

    # Class attributes
    name = "deepseek"
    description = "DeepSeek - Cost-effective option with strong coding capabilities"

    def __init__(self, api_key: str, base_url: str):
        super().__init__(api_key, base_url)

    def create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "deepseek" in model_id.lower():
            if "embedding" in model_id.lower():
                return DeepSeekEmbeddingModel(self, model_id)
            return DeepSeekChatModel(self, model_id)
        return None


class DeepSeekChatModel(BaseChatModel):
    """DeepSeek chat model implementation."""

    def __init__(self, provider: DeepSeekProvider, model_id: str):
        super().__init__(provider, model_id)


class DeepSeekEmbeddingModel(BaseEmbeddingModel):
    """DeepSeek embedding model implementation."""

    def __init__(self, provider: DeepSeekProvider, model_id: str):
        super().__init__(provider, model_id)


class DeepSeekRerankModel(BaseRerankModel):
    """DeepSeek rerank model implementation."""

    def __init__(self, provider: DeepSeekProvider, model_id: str):
        super().__init__(provider, model_id)
