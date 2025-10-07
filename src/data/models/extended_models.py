"""
Additional data models for Learning Catalyst application
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class KnowledgeMap:
    """Represents a knowledge map with concepts and their relationships."""

    concepts: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]


@dataclass
class UserProgress:
    """Tracks a user's progress on a specific concept."""

    concept_id: str
    completed: bool
    score: float


@dataclass
class Evaluation:
    """Represents the evaluation of a user's answer."""

    correctness: bool
    feedback: str
    score: float


@dataclass
class Context:
    """Contains the context information for a learning session."""

    user_profile: Dict[str, Any]
    current_concept: str
    learning_history: List[Dict[str, Any]]
    preferences: Dict[str, Any]


@dataclass
class UserAnswer:
    """Represents a user's answer to a challenge."""

    challenge_id: str
    answer_text: str
    timestamp: str


@dataclass
class ChallengeResult:
    """Represents the result of a challenge attempt."""

    challenge_id: str
    user_answer: str
    evaluation: Evaluation
    timestamp: str


@dataclass
class ApplicationState:
    """Represents the current state of the application."""

    current_concept: str
    user_progress: List[UserProgress]
    checkpoint_id: Optional[str]
    context: Context


@dataclass
class Checkpoint:
    """Represents a saved checkpoint of the application state."""

    id: str
    user_id: str
    state_data: Dict[str, Any]
    created_at: str
    description: str


@dataclass
class Message:
    """Represents a message in a conversation."""

    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class AIResponse:
    """Represents a response from an AI model."""

    content: str
    model: str
    provider: str
    usage: Dict[str, int]  # tokens used
    timestamp: str


@dataclass
class Credentials:
    """Represents API credentials for a provider."""

    provider: str  # "chatglm", "siliconflow", "deepseek", "openai-compatible", "embedding", "rerank"
    api_key: str
    base_url: Optional[str] = None
    additional_config: Optional[Dict[str, Any]] = None


@dataclass
class EmbeddingResponse:
    """Represents a response from an embedding model."""

    embeddings: List[List[float]]
    model: str
    provider: str
    usage: Dict[str, int]  # tokens used
    error: Optional[str] = None


@dataclass
class RerankResponse:
    """Represents a response from a rerank model."""

    results: List[Dict[str, Any]]  # with document and relevance score
    model: str
    provider: str
    usage: Dict[str, int]  # tokens used
    error: Optional[str] = None


@dataclass
class ProviderCapabilities:
    """Represents the capabilities of a provider."""

    supports_streaming: bool
    max_tokens: int
    supported_models: List[str]
    input_cost_per_token: float
    output_cost_per_token: float
    supports_embeddings: bool
    supports_rerank: bool


@dataclass
class ModelInfo:
    """Contains information about a model."""

    name: str
    provider: str
    capabilities: ProviderCapabilities


@dataclass
class TokenUsageSummary:
    """Represents a summary of token usage over a period."""

    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    period_start: str
    period_end: str


@dataclass
class TimePeriod:
    """Represents a time period."""

    start_date: str
    end_date: str


@dataclass
class ProgressReport:
    """Represents a progress report for a user."""

    user_id: str
    concepts_mastered: int
    total_concepts: int
    overall_score: float
    time_period: TimePeriod
    weak_areas: List[str]


@dataclass
class TrendData:
    """Represents trend data for a metric over time."""

    metric: str
    values: List[Dict[str, Any]]
    period: TimePeriod


@dataclass
class AnalyticsExport:
    """Represents an exported analytics report."""

    report_type: str
    content: str
    format: str  # "json", "csv", "pdf"
    timestamp: str


@dataclass
class InteractionHistory:
    """Represents the interaction history of a user."""

    user_id: str
    interactions: List[Dict[str, Any]]
    timestamp: str


@dataclass
class AnalysisResult:
    """Represents the result of an analysis."""

    metric: str
    value: Any
    interpretation: str
    timestamp: str


@dataclass
class CompetencyProfile:
    """Represents a user's competency profile."""

    user_id: str
    skills: Dict[str, float]  # skill name to proficiency level (0-1)
    learning_style: str
    strengths: List[str]
    weaknesses: List[str]
    last_updated: str


@dataclass
class Recommendations:
    """Represents learning recommendations for a user."""

    user_id: str
    next_concepts: List[str]
    learning_path: List[str]
    resources: List[str]
    timestamp: str
