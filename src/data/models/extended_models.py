"""
Additional data models for Learning Catalyst application
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class KnowledgeMap:
    concepts: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]


@dataclass
class UserProgress:
    concept_id: str
    completed: bool
    score: float


@dataclass
class Evaluation:
    correctness: bool
    feedback: str
    score: float


@dataclass
class Context:
    user_profile: Dict[str, Any]
    current_concept: str
    learning_history: List[Dict[str, Any]]
    preferences: Dict[str, Any]


@dataclass
class UserAnswer:
    challenge_id: str
    answer_text: str
    timestamp: str


@dataclass
class ChallengeResult:
    challenge_id: str
    user_answer: str
    evaluation: Evaluation
    timestamp: str


@dataclass
class ApplicationState:
    current_concept: str
    user_progress: List[UserProgress]
    checkpoint_id: Optional[str]
    context: Context


@dataclass
class Checkpoint:
    id: str
    user_id: str
    state_data: Dict[str, Any]
    created_at: str
    description: str


@dataclass
class Message:
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class AIResponse:
    content: str
    model: str
    provider: str
    usage: Dict[str, int]  # tokens used
    timestamp: str


@dataclass
class Credentials:
    provider: str  # "openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local", "embedding", "rerank"
    api_key: str
    base_url: Optional[str] = None
    additional_config: Optional[Dict[str, Any]] = None


@dataclass
class EmbeddingResponse:
    embeddings: List[List[float]]
    model: str
    usage: Dict[str, int]  # tokens used


@dataclass
class RerankResponse:
    results: List[Dict[str, Any]]  # with document and relevance score
    model: str


@dataclass
class ProviderCapabilities:
    supports_streaming: bool
    max_tokens: int
    supported_models: List[str]
    input_cost_per_token: float
    output_cost_per_token: float
    supports_embeddings: bool
    supports_rerank: bool


@dataclass
class ModelInfo:
    name: str
    provider: str
    capabilities: ProviderCapabilities


@dataclass
class TokenUsageSummary:
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    period_start: str
    period_end: str


@dataclass
class TimePeriod:
    start_date: str
    end_date: str


@dataclass
class ProgressReport:
    user_id: str
    concepts_mastered: int
    total_concepts: int
    overall_score: float
    time_period: TimePeriod
    weak_areas: List[str]


@dataclass
class TrendData:
    metric: str
    values: List[Dict[str, Any]]
    period: TimePeriod


@dataclass
class AnalyticsExport:
    report_type: str
    content: str
    format: str  # "json", "csv", "pdf"
    timestamp: str


@dataclass
class InteractionHistory:
    user_id: str
    interactions: List[Dict[str, Any]]
    timestamp: str


@dataclass
class AnalysisResult:
    metric: str
    value: Any
    interpretation: str
    timestamp: str


@dataclass
class CompetencyProfile:
    user_id: str
    skills: Dict[str, float]  # skill name to proficiency level (0-1)
    learning_style: str
    strengths: List[str]
    weaknesses: List[str]
    last_updated: str


@dataclass
class Recommendations:
    user_id: str
    next_concepts: List[str]
    learning_path: List[str]
    resources: List[str]
    timestamp: str
