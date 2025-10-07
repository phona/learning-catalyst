"""
OpenAI Compatible provider implementation
"""

from typing import Optional

from src.ai.abstraction import Model

from .base_provider import BaseChatModel, BaseEmbeddingModel, BaseProvider, BaseRerankModel


class OpenAICompatibleModelProvider(BaseProvider):
    """Provider class for interacting with OpenAI compatible models via HTTP API."""

    # Class attributes
    name = "openai-compatible"
    description = "OpenAI Compatible - Works with any OpenAI-compatible API endpoint"

    def __init__(self, api_key: str, base_url: str):
        super().__init__(api_key, base_url)

    def create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type"""
        if "chat" in model_id.lower() or "llm" in model_id.lower() or "gpt" in model_id.lower():
            return OpenAICompatibleChatModel(self, model_id)
        if "embedding" in model_id.lower():
            return OpenAICompatibleEmbeddingModel(self, model_id)
        if "rerank" in model_id.lower():
            return OpenAICompatibleRerankModel(self, model_id)
        return None


class OpenAICompatibleChatModel(BaseChatModel):
    """OpenAI compatible chat model implementation."""

    def __init__(self, provider: OpenAICompatibleModelProvider, model_id: str):
        super().__init__(provider, model_id)


class OpenAICompatibleEmbeddingModel(BaseEmbeddingModel):
    """OpenAI compatible embedding model implementation."""

    def __init__(self, provider: OpenAICompatibleModelProvider, model_id: str):
        super().__init__(provider, model_id)


class OpenAICompatibleRerankModel(BaseRerankModel):
    """OpenAI compatible rerank model implementation."""

    def __init__(self, provider: OpenAICompatibleModelProvider, model_id: str):
        super().__init__(provider, model_id)
