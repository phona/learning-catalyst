"""
Core data models for Learning Catalyst.

Essential models matching the API reference documentation.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Union, AsyncGenerator
from datetime import datetime
from enum import Enum
import time


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


class ChatResponse:
    """Unified response that works for both streaming and non-streaming responses"""

    def __init__(self, openai_response, is_streaming=False):
        self._response = openai_response
        self._is_streaming = is_streaming
        self._is_thinking = False

    def __aiter__(self):
        """Make iterable for streaming"""
        if self._is_streaming:
            return self
        else:
            raise TypeError("Non-streaming response is not iterable")

    async def __anext__(self):
        """Handle streaming iteration"""
        if not self._is_streaming:
            raise StopAsyncIteration

        try:
            # Get the next chunk from the OpenAI stream
            chunk = await self._response.__anext__()

            # Create a new ChatResponse for this chunk
            chunk_response = ChatResponse(chunk, is_streaming=True)

            # Track thinking state
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta:
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    chunk_response._is_thinking = True
                elif hasattr(delta, 'content') and delta.content:
                    chunk_response._is_thinking = False

            return chunk_response
        except StopAsyncIteration:
            self._is_streaming = False
            raise

    @property
    def is_thinking(self):
        """Current state of this chunk"""
        return self._is_thinking

    @property
    def content(self):
        """Get content from wrapped response"""
        if not self._response:
            return ""

        if self._is_streaming:
            # Streaming chunk
            return self._response.choices[0].delta.content or ""
        else:
            # Complete response
            return self._response.choices[0].message.content

    @property
    def reasoning_content(self):
        """Get reasoning content from wrapped response"""
        if not self._response:
            return None

        if self._is_streaming:
            # Streaming chunk
            return getattr(self._response.choices[0].delta, 'reasoning_content', None)
        else:
            # Complete response
            return getattr(self._response.choices[0].message, 'reasoning_content', None)

    @property
    def finish_reason(self):
        """Get finish reason from wrapped response"""
        if not self._response:
            return "stop"

        if self._is_streaming:
            return getattr(self._response.choices[0], 'finish_reason', 'stop')
        else:
            return self._response.choices[0].finish_reason

    @property
    def model(self):
        """Get model name from wrapped response"""
        return self._response.model if self._response else ""

    @property
    def usage(self):
        """Get usage information from wrapped response"""
        if self._response and hasattr(self._response, 'usage') and self._response.usage:
            return self._response.usage.model_dump()
        return {}

    @property
    def timestamp(self):
        """Get timestamp"""
        if not self._response:
            return 0
        return int(time.time())

    @classmethod
    def from_complete(cls, openai_response):
        """Create from complete OpenAI response"""
        return cls(openai_response, is_streaming=False)

    @classmethod
    def from_stream(cls, openai_stream):
        """Create from OpenAI streaming response"""
        return cls(openai_stream, is_streaming=True)


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


@dataclass
class SessionData:
    """Session data container."""
    current_concept: Optional[str] = None
    concepts_covered: List[str] = None
    learning_objectives: List[str] = None
    difficulty_level: str = "intermediate"
    preferred_style: str = "mixed"
    progress: float = 0.0
    interaction_count: int = 0

    def __post_init__(self):
        if self.concepts_covered is None:
            self.concepts_covered = []
        if self.learning_objectives is None:
            self.learning_objectives = []


@dataclass
class LearningPreferences:
    """User learning preferences."""
    learning_style: str = "mixed"  # visual, auditory, kinesthetic, reading, mixed
    difficulty_preference: str = "gradual"  # gradual, steep, adaptive
    response_format: str = "detailed"  # concise, detailed, examples, analogies, step_by_step
    preferred_response_length: str = "medium"  # short, medium, long
    session_duration: int = 45  # minutes
    topics_of_interest: List[str] = None
    learning_goals: List[str] = None
    include_code_examples: bool = True
    use_real_world_examples: bool = True
    progress_tracking: bool = True
    session_reminders: bool = True

    def __post_init__(self):
        if self.topics_of_interest is None:
            self.topics_of_interest = []
        if self.learning_goals is None:
            self.learning_goals = []

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LearningPreferences':
        """Create LearningPreferences from dictionary."""
        return cls(**data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert LearningPreferences to dictionary."""
        return {
            "learning_style": self.learning_style,
            "difficulty_preference": self.difficulty_preference,
            "response_format": self.response_format,
            "preferred_response_length": self.preferred_response_length,
            "session_duration": self.session_duration,
            "topics_of_interest": self.topics_of_interest,
            "learning_goals": self.learning_goals,
            "include_code_examples": self.include_code_examples,
            "use_real_world_examples": self.use_real_world_examples,
            "progress_tracking": self.progress_tracking,
            "session_reminders": self.session_reminders
        }