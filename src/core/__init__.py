"""
Core interfaces and implementations for Learning Catalyst application
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from src.data.models.concept import Concept
from src.data.models.extended_models import (
    AnalyticsExport,
    CompetencyProfile,
    KnowledgeMap,
    ProgressReport,
    Recommendations,
    TrendData,
    UserProgress,
)


# Core interfaces
class KnowledgeNavigator(ABC):
    @abstractmethod
    async def load_content(self, file_path: str) -> KnowledgeMap:
        pass

    @abstractmethod
    async def get_available_concepts(self) -> List[Concept]:
        pass

    @abstractmethod
    def get_concept_path(self, concept_id: str) -> List[Concept]:
        pass

    @abstractmethod
    def update_progress(self, concept_id: str, progress: UserProgress) -> None:
        pass


class CatalystAgent(ABC):
    @abstractmethod
    async def generate_explanation(self, concept: Concept, context: Dict[str, Any]) -> str:
        """Generate AI-based explanation for a concept"""
        pass

    @abstractmethod
    async def generate_challenge(self, concept: Concept, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AI-based challenge for a concept"""
        pass

    @abstractmethod
    async def evaluate_answer(self, answer: str, expected: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate user's answer to a challenge"""
        pass

    @abstractmethod
    async def suggest_next_concepts(self, profile: Dict[str, Any], progress: UserProgress) -> List[Concept]:
        """Suggest next concepts based on user profile and progress"""
        pass


class ChallengeEngine(ABC):
    @abstractmethod
    def present_challenge(self, challenge: Dict[str, Any]) -> None:
        """Present a challenge to the user"""
        pass

    @abstractmethod
    async def collect_answer(self) -> str:
        """Collect answer from user"""
        pass

    @abstractmethod
    async def validate_answer(self, user_answer: str, challenge: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user's answer to a challenge"""
        pass


class CheckpointManager(ABC):
    @abstractmethod
    async def create_checkpoint(self, state: Dict[str, Any]) -> str:
        """Create a checkpoint from current application state"""
        pass

    @abstractmethod
    async def load_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """Load application state from checkpoint"""
        pass

    @abstractmethod
    async def list_checkpoints(self) -> List[Dict[str, Any]]:
        """List available checkpoints for user"""
        pass


class SystemCommandsHandler(ABC):
    @abstractmethod
    async def list_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all configured and available models"""
        pass

    @abstractmethod
    async def get_token_usage(self, period_days: int = 30) -> Dict[str, Any]:
        """Get token usage summary for specified period"""
        pass

    @abstractmethod
    async def get_detailed_token_usage(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get detailed token usage records, optionally filtered by model"""
        pass

    @abstractmethod
    async def show_model_capabilities(self, model_name: str) -> Dict[str, Any]:
        """Show detailed capabilities of a specific model"""
        pass

    @abstractmethod
    async def get_knowledge_map(self) -> KnowledgeMap:
        """Get the current knowledge map structure for display"""
        pass

    @abstractmethod
    async def list_preferences(self) -> Dict[str, Any]:
        """List all current user preferences from preferences.json"""
        pass

    @abstractmethod
    async def set_preference(self, key: str, value: Any) -> bool:
        """Set a specific configuration preference using key-value format in preferences.json
        (e.g., ui.theme, learning.difficulty_level, features.ai_enhancements)
        similar to npm config set"""
        pass


class AnalyticsDashboard(ABC):
    @abstractmethod
    def generate_progress_report(self, user_id: str, time_period: Dict[str, str]) -> ProgressReport:
        """Generate a progress report for the user within the specified time period"""
        pass

    @abstractmethod
    def identify_weak_areas(self, user_id: str) -> List[str]:
        """Identify weak areas for the user based on their performance"""
        pass

    @abstractmethod
    def generate_trend_data(self, user_id: str, metric: str, time_period: Dict[str, str]) -> List[TrendData]:
        """Generate trend data for the specified metric and time period"""
        pass

    @abstractmethod
    def export_analytics(self, user_id: str, export_format: str = "json") -> AnalyticsExport:
        """Export analytics data in the specified format"""
        pass


class AssessmentEngine(ABC):
    @abstractmethod
    def analyze_performance(self, user_id: str, time_period: Dict[str, str]) -> Dict[str, Any]:
        """Analyze user's performance within the specified time period"""
        pass

    @abstractmethod
    def update_competency_profile(self, profile: CompetencyProfile) -> CompetencyProfile:
        """Update the competency profile based on recent performance"""
        pass

    @abstractmethod
    def determine_adaptive_difficulty(self, user_id: str, concept_id: str) -> int:
        """Determine the appropriate difficulty level for a concept based on user's competency"""
        pass

    @abstractmethod
    def generate_recommendations(self, profile: CompetencyProfile) -> Recommendations:
        """Generate learning recommendations based on the competency profile"""
        pass


# Import implementations
from .basic_analytics_dashboard import BasicAnalyticsDashboard
from .basic_assessment_engine import BasicAssessmentEngine
from .catalyst_agent import CatalystAgentImpl
from .challenge_engine import ChallengeEngineImpl
from .checkpoint_manager import CheckpointManagerImpl
from .export_service import ExportService
from .knowledge_navigator import SQLiteKnowledgeNavigator
from .system_commands_handler import SystemCommandsHandlerImpl
from .token_usage_analytics import TokenUsageAnalytics
from .trend_analyzer import TrendAnalyzer
from .weak_area_identifier import WeakAreaIdentifier

__all__ = [
    # Interfaces
    "KnowledgeNavigator",
    "CatalystAgent",
    "ChallengeEngine",
    "CheckpointManager",
    "SystemCommandsHandler",
    "AnalyticsDashboard",
    "AssessmentEngine",
    # Implementations
    "SQLiteKnowledgeNavigator",
    "CatalystAgentImpl",
    "ChallengeEngineImpl",
    "CheckpointManagerImpl",
    "SystemCommandsHandlerImpl",
    "BasicAnalyticsDashboard",
    "BasicAssessmentEngine",
    "TrendAnalyzer",
    "WeakAreaIdentifier",
    "ExportService",
    "TokenUsageAnalytics",
]
