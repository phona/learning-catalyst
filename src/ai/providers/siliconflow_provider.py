"""
SiliconFlow provider implementation
"""

from typing import Optional

from src.ai.abstraction import Model
from .base_provider import BaseProvider, BaseChatModel, BaseEmbeddingModel, BaseRerankModel


class SiliconFlowProvider(BaseProvider):
    """SiliconFlow provider implementation"""

    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.siliconflow.cn/v1"):
        super().__init__(api_key, base_url)

    @property
    def name(self) -> str:
        """Get the name of the provider"""
        return "siliconflow"

    def _create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "embedding" in model_id.lower():
            return SiliconFlowEmbeddingModel(self, model_id)
        else:
            return SiliconFlowChatModel(self, model_id)


class SiliconFlowChatModel(BaseChatModel):
    """SiliconFlow chat model implementation"""

    def __init__(self, provider: SiliconFlowProvider, model_id: str):
        super().__init__(provider, model_id)


class SiliconFlowEmbeddingModel(BaseEmbeddingModel):
    """SiliconFlow embedding model implementation"""

    def __init__(self, provider: SiliconFlowProvider, model_id: str):
        super().__init__(provider, model_id)


class SiliconFlowRerankModel(BaseRerankModel):
    """SiliconFlow rerank model implementation"""

    def __init__(self, provider: SiliconFlowProvider, model_id: str):
        super().__init__(provider, model_id)
