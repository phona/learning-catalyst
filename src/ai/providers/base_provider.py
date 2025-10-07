"""
Base provider implementation to reduce code duplication
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from src.ai.abstraction import ChatModel, EmbeddingModel, Model, ModelProvider, RerankModel
from src.data.models.extended_models import AIResponse, Credentials, EmbeddingResponse, Message, RerankResponse

from .utils import make_http_request


class BaseProvider(ModelProvider):
    """Base provider class with common functionality for all AI providers."""

    def __init__(self, api_key: Optional[str] = None, base_url: str = ""):
        self.api_key = api_key
        self.base_url = base_url

    # Class attributes to be overridden by subclasses
    name: str = ""
    description: str = ""

    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials"""
        try:
            headers = self._get_headers(credentials)

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{credentials.base_url or self.base_url}/models", headers=headers)
                return response.status_code == 200
        except (httpx.RequestError, httpx.TimeoutException):
            return False

    async def list_available_models(self) -> Dict[str, List[Model]]:
        """
        Get dynamic list of available model instances for this provider, grouped by model type.
        This makes an API call to get the actual available models from the provider.
        Returns Model instances grouped by type (chat, embedding, rerank).
        Returns empty dict if provider doesn't have a models API or if the call fails.
        """
        # Initialize model groups with proper type annotations
        models_by_type: Dict[str, List[Model]] = {"chat": [], "embedding": [], "rerank": []}

        # If no base_url, return empty dict (provider doesn't have models API)
        if not self.base_url:
            return models_by_type

        try:
            headers = self._get_headers()

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/models", headers=headers)
                response.raise_for_status()
                data = response.json()

                for model_data in data["data"]:
                    model_id = model_data["id"]
                    model = self.create_model_instance(model_id)
                    if model:
                        # Group models by type
                        if isinstance(model, ChatModel):
                            models_by_type["chat"].append(model)
                        elif isinstance(model, EmbeddingModel):
                            models_by_type["embedding"].append(model)
                        elif isinstance(model, RerankModel):
                            models_by_type["rerank"].append(model)

                return models_by_type
        except (httpx.RequestError, httpx.TimeoutException, KeyError, ValueError):
            # Return empty dict if API call fails or data is malformed
            return models_by_type

    async def _make_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Helper method to make HTTP requests to API"""
        headers = self._get_headers()
        return await make_http_request(self.base_url, endpoint, headers, payload)

    async def make_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Public method to make HTTP requests to API"""
        return await self._make_request(endpoint, payload)

    def _get_headers(self, credentials: Optional[Credentials] = None) -> Dict[str, str]:
        """Get headers for API requests - to be implemented by subclasses"""
        headers = {"Content-Type": "application/json"}

        api_key = credentials.api_key if credentials else self.api_key
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        return headers

    def create_model_instance(self, model_id: str) -> Optional[Model]:
        """Create appropriate model instance based on model type - to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement create_model_instance")


class BaseChatModel(ChatModel):
    """Base chat model with common functionality."""

    def __init__(self, provider: BaseProvider, model_id: str):
        self._provider = provider
        self._model_id = model_id

    async def get_provider(self) -> ModelProvider:
        return self._provider

    async def get_id(self) -> str:
        return self._model_id

    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message and get response"""
        # Convert Message objects to dict format
        message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]

        payload = {"model": self._model_id, "messages": message_dicts, "temperature": temperature}

        result = await self._provider.make_request("chat/completions", payload)  # type: ignore

        return AIResponse(
            content=result["choices"][0]["message"]["content"],
            model=self._model_id,
            provider=self._provider.name,
            usage=self._extract_usage(result),
            timestamp=datetime.now().isoformat(),
        )

    def _extract_usage(self, result: Dict[str, Any]) -> Dict[str, int]:
        """Extract usage information from API response"""
        return {
            "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
            "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
            "total_tokens": result.get("usage", {}).get("total_tokens", 0),
        }


class BaseEmbeddingModel(EmbeddingModel):
    """Base embedding model with common functionality."""

    def __init__(self, provider: BaseProvider, model_id: str):
        self._provider = provider
        self._model_id = model_id

    async def get_provider(self) -> ModelProvider:
        return self._provider

    async def get_id(self) -> str:
        return self._model_id

    async def get_embeddings(self, texts: List[str], dimensions: Optional[int] = None) -> EmbeddingResponse:
        """Get embeddings for texts"""
        payload = {"model": self._model_id, "input": texts}

        if dimensions:
            payload["dimensions"] = str(dimensions)

        result = await self._provider.make_request("embeddings", payload)  # type: ignore

        return EmbeddingResponse(
            embeddings=[item["embedding"] for item in result["data"]],
            model=self._model_id,
            provider=self._provider.name,
            usage=self._extract_usage(result),
        )

    def _extract_usage(self, result: Dict[str, Any]) -> Dict[str, int]:
        """Extract usage information from API response"""
        return {
            "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
            "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
            "total_tokens": result.get("usage", {}).get("total_tokens", 0),
        }


class BaseRerankModel(RerankModel):
    """Base rerank model with common functionality."""

    def __init__(self, provider: BaseProvider, model_id: str):
        self._provider = provider
        self._model_id = model_id

    async def get_provider(self) -> ModelProvider:
        return self._provider

    async def get_id(self) -> str:
        return self._model_id

    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> RerankResponse:
        """Rerank documents using chat completions"""
        # For now, return a simple ranking based on document order
        results: List[Dict[str, Any]] = []
        for i, doc in enumerate(documents[:top_k]):
            # Simple relevance scoring based on position (placeholder)
            relevance_score = 1.0 - (i * 0.1)
            results.append({"document": doc, "relevance_score": max(0.0, relevance_score), "index": i})

        return RerankResponse(results=results, model=self._model_id, provider=self._provider.name, usage={"total_tokens": 0})
