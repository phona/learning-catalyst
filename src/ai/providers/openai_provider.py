"""
OpenAI provider implementation
"""
from typing import Optional

from src.ai.abstraction import Model
from .base_provider import BaseProvider, BaseChatModel, BaseEmbeddingModel, BaseRerankModel


class OpenAIProvider(BaseProvider):
    """OpenAI provider implementation"""
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.openai.com/v1"):
        super().__init__(api_key, base_url)
    
    @property
    def name(self) -> str:
        """Get the name of the provider"""
        return "openai"
    
    def _create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "gpt" in model_id.lower():
            if "embedding" in model_id.lower():
                return OpenAIEmbeddingModel(self, model_id)
            else:
                return OpenAIChatModel(self, model_id)
        return None


class OpenAIChatModel(BaseChatModel):
    """OpenAI chat model implementation"""
    def __init__(self, provider: OpenAIProvider, model_id: str):
        super().__init__(provider, model_id)


class OpenAIEmbeddingModel(BaseEmbeddingModel):
    """OpenAI embedding model implementation"""
    def __init__(self, provider: OpenAIProvider, model_id: str):
        super().__init__(provider, model_id)


class OpenAIRerankModel(BaseRerankModel):
    """OpenAI rerank model implementation"""
    def __init__(self, provider: OpenAIProvider, model_id: str):
        super().__init__(provider, model_id)
