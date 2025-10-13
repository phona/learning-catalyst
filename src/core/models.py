"""
Core data models for Learning Catalyst.

Essential models matching the API reference documentation.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Union, AsyncGenerator
from datetime import datetime
from enum import Enum


class ModelType(Enum):
    """Supported model types."""
    CHAT = "chat"
    EMBEDDING = "embedding"
    RERANK = "rerank"


@dataclass
class Message:
    """Message for chat interactions."""
    role: str  # "user", "assistant", "system"
    content: str
    name: Optional[str] = None
    function_call: Optional[Dict[str, Any]] = None


@dataclass
class ChatResponse:
    """Response from chat model."""
    content: str
    finish_reason: str
    usage: Dict[str, int]
    model: str
    timestamp: float


@dataclass
class EmbeddingResponse:
    """Response from embedding model."""
    embeddings: List[List[float]]
    usage: Dict[str, int]
    model: str
    dimensions: int


@dataclass
class RerankResult:
    """Single rerank result."""
    index: int
    score: float
    document: str


@dataclass
class RerankResponse:
    """Response from rerank model."""
    results: List[RerankResult]
    model: str
    usage: Dict[str, int]


@dataclass
class ProviderConfig:
    """Configuration object for AI providers."""
    name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit: Optional[int] = None
    custom_headers: Optional[Dict[str, str]] = None
    organization_id: Optional[str] = None
    additional_config: Optional[Dict[str, Any]] = None


from typing import TypedDict, List


class ModelList(TypedDict, total=False):
    """TypedDict containing available models by type."""
    chat: List['ChatModel']
    embedding: List['EmbeddingModel']
    rerank: List['RerankModel']