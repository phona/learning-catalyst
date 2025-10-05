"""
Assessment Engine interface
"""
from abc import ABC, abstractmethod
from typing import Any, Dict

from src.data.models.extended_models import CompetencyProfile, Recommendations


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
