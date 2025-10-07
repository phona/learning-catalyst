"""
Trend analysis implementation
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

from src.data.database_manager import DatabaseManager
from src.data.models.extended_models import TimePeriod, TrendData


class TrendAnalyzer:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    def generate_trend_data(self, user_id: str, metric: str, time_period: Dict[str, str]) -> List[TrendData]:
        """Generate trend data for the specified metric and time period"""
        # Based on the time period, decide the granularity of the trend data
        start_date = datetime.fromisoformat(time_period["start"].replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(time_period["end"].replace("Z", "+00:00"))

        # Calculate appropriate interval based on the time span
        days_diff = (end_date - start_date).days
        if days_diff <= 7:
            # Daily data for up to a week
            data_points = self._get_daily_data(user_id, metric, start_date, end_date)
        elif days_diff <= 30:
            # Daily data for up to a month
            data_points = self._get_daily_data(user_id, metric, start_date, end_date)
        else:
            # Weekly data for longer periods
            data_points = self._get_weekly_data(user_id, metric, start_date, end_date)

        # Create TrendData objects
        trends = []
        for date_str, value in data_points:
            trend = TrendData(
                metric=metric,
                values=[{"date": date_str, "value": value}],
                period=TimePeriod(start_date=time_period["start"], end_date=time_period["end"]),
            )
            trends.append(trend)

        return trends

    def _get_daily_data(self, user_id: str, metric: str, start_date: datetime, end_date: datetime) -> List[tuple]:
        """Get daily data points for the specified metric"""
        # This would query the database for daily metrics
        # For now, return a simple simulated dataset
        data_points = []
        current_date = start_date
        value = 50  # Starting value

        while current_date <= end_date:
            # Simulate some trend data
            data_points.append((current_date.date().isoformat(), value))
            value += (hash(f"{user_id}-{current_date.date().isoformat()}") % 21) - 10  # Random fluctuation
            value = max(0, min(100, value))  # Keep between 0 and 100
            current_date += timedelta(days=1)

        return data_points

    def _get_weekly_data(self, user_id: str, metric: str, start_date: datetime, end_date: datetime) -> List[tuple]:
        """Get weekly data points for the specified metric"""
        # This would query the database for weekly aggregated metrics
        # For now, return a simple simulated dataset
        data_points = []
        current_date = start_date
        value = 50  # Starting value

        while current_date <= end_date:
            # Simulate some trend data
            data_points.append((current_date.date().isoformat(), value))
            value += (hash(f"{user_id}-week-{current_date.isocalendar()[1]}") % 21) - 10  # Weekly fluctuation
            value = max(0, min(100, value))  # Keep between 0 and 100
            current_date += timedelta(weeks=1)

        return data_points

    def analyze_trend_direction(self, trend_data: List[TrendData]) -> str:
        """Analyze the overall direction of the trend"""
        if not trend_data:
            return "neutral"

        # Extract values from trend data
        values = []
        for trend in trend_data:
            for val in trend.values:
                if "value" in val:
                    values.append(val["value"])

        if len(values) < 2:
            return "neutral"

        # Calculate the trend using linear regression slope
        n = len(values)
        x = list(range(n))

        # Calculate slope
        slope = self._calculate_slope(x, values)

        if slope > 0.1:
            return "improving"
        elif slope < -0.1:
            return "declining"
        else:
            return "neutral"

    def _calculate_slope(self, x: List[int], y: List[float]) -> float:
        """Calculate the slope of the trend using simple linear regression"""
        n = len(x)
        if n == 0:
            return 0

        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(xi * xi for xi in x)

        # Calculate slope (m) using formula: m = (n*sum_xy - sum_x*sum_y) / (n*sum_x2 - sum_x^2)
        denominator = n * sum_x2 - sum_x * sum_x
        if denominator == 0:
            return 0

        slope = (n * sum_xy - sum_x * sum_y) / denominator
        return slope

    def get_performance_insights(self, user_id: str, time_period: Dict[str, str]) -> Dict[str, Any]:
        """Get performance insights based on trend analysis"""
        # Generate trend data for key metrics
        accuracy_trends = self.generate_trend_data(user_id, "accuracy", time_period)
        completion_trends = self.generate_trend_data(user_id, "completion_rate", time_period)
        time_spent_trends = self.generate_trend_data(user_id, "time_spent", time_period)

        insights = {
            "accuracy_trend": self.analyze_trend_direction(accuracy_trends),
            "completion_trend": self.analyze_trend_direction(completion_trends),
            "time_spent_trend": self.analyze_trend_direction(time_spent_trends),
            "recommendations": [],
        }

        # Generate recommendations based on trends
        if insights["accuracy_trend"] == "declining":
            insights["recommendations"].append("Focus on reviewing previously learned concepts to strengthen understanding.")
        elif insights["accuracy_trend"] == "improving":
            insights["recommendations"].append("Keep up the good work! Your accuracy is improving.")

        if insights["completion_trend"] == "declining":
            insights["recommendations"].append("Try to maintain a consistent learning schedule to improve completion rates.")
        elif insights["completion_trend"] == "improving":
            insights["recommendations"].append("Your consistency in completing challenges is improving.")

        return insights
