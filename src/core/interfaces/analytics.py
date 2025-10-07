"""
Analytics-related interfaces for Learning Catalyst application
"""

from abc import ABC, abstractmethod
from typing import Any, Dict

from src.data.models.extended_models import AnalyticsExport, CompetencyProfile, ProgressReport, Recommendations, TrendData


class AnalyticsDashboard(ABC):
    @abstractmethod
    async def get_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """Get dashboard data for user"""

    @abstractmethod
    async def generate_report(self, user_id: str, report_type: str) -> ProgressReport:
        """Generate analytics report"""

    @abstractmethod
    async def get_trends(self, user_id: str, period: str) -> TrendData:
        """Get learning trends"""


class AssessmentEngine(ABC):
    @abstractmethod
    async def assess_concept_mastery(self, user_id: str, concept_id: str) -> CompetencyProfile:
        """Assess user's mastery of a concept"""

    @abstractmethod
    async def generate_recommendations(self, user_id: str) -> Recommendations:
        """Generate personalized learning recommendations"""

    @abstractmethod
    async def export_analytics(self, user_id: str, format: str) -> AnalyticsExport:
        """Export user analytics data"""
