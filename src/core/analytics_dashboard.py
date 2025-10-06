"""
Analytics Dashboard interface
"""

from abc import ABC, abstractmethod
from typing import Dict, List

from src.data.models.extended_models import AnalyticsExport, ProgressReport, TrendData


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
