"""
Unit tests for analytics components
"""
import pytest
from unittest.mock import patch, MagicMock
from src.core.basic_analytics_dashboard import BasicAnalyticsDashboard
from src.core.basic_assessment_engine import BasicAssessmentEngine
from src.core.trend_analyzer import TrendAnalyzer
from src.core.weak_area_identifier import WeakAreaIdentifier
from src.core.export_service import ExportService
from src.core.token_usage_analytics import TokenUsageAnalytics
from datetime import datetime, timedelta


class TestBasicAnalyticsDashboard:
    def test_generate_progress_report(self, analytics_dashboard, db_manager):
        """Test generating a progress report"""
        # Mock the database manager to return concepts
        with patch.object(db_manager, 'get_all_concepts', return_value=[]):
            time_period = {
                "start": "2023-01-01T00:00:00",
                "end": "2023-01-31T23:59:59"
            }
            
            report = analytics_dashboard.generate_progress_report("user123", time_period)
            
            # Verify the report structure
            assert report.user_id == "user123"
            assert report.total_concepts >= 0
            assert 0 <= report.overall_score <= 100
            assert isinstance(report.weak_areas, list)

    def test_identify_weak_areas(self, analytics_dashboard):
        """Test identifying weak areas"""
        weak_areas = analytics_dashboard.identify_weak_areas("user123")
        
        # Verify it returns a list
        assert isinstance(weak_areas, list)

    def test_generate_trend_data(self, analytics_dashboard):
        """Test generating trend data"""
        time_period = {
            "start": "2023-01-01T00:00:00",
            "end": "2023-01-31T23:59:59"
        }
        
        trends = analytics_dashboard.generate_trend_data("user123", "accuracy", time_period)
        
        # Verify it returns a list
        assert isinstance(trends, list)

    def test_export_analytics_json(self, analytics_dashboard):
        """Test exporting analytics in JSON format"""
        export = analytics_dashboard.export_analytics("user123", "json")
        
        # Verify the export structure
        assert export.report_type == "progress"
        assert export.format == "json"
        assert export.content.startswith('{')  # JSON should start with '{'

    def test_export_analytics_csv(self, analytics_dashboard):
        """Test exporting analytics in CSV format"""
        export = analytics_dashboard.export_analytics("user123", "csv")
        
        # Verify the export structure
        assert export.report_type == "progress"
        assert export.format == "csv"
        assert "user_id,concepts_mastered," in export.content  # CSV header


class TestBasicAssessmentEngine:
    def test_analyze_performance(self, assessment_engine):
        """Test analyzing performance"""
        time_period = {
            "start": "2023-01-01T00:00:00",
            "end": "2023-01-31T23:59:59"
        }
        
        analysis = assessment_engine.analyze_performance("user123", time_period)
        
        # Verify the structure of the analysis
        assert "user_id" in analysis
        assert "time_period" in analysis
        assert "accuracy_rate" in analysis or "total_challenges" in analysis

    def test_update_competency_profile(self, assessment_engine, sample_user_profile):
        """Test updating competency profile"""
        from src.data.models.extended_models import CompetencyProfile
        
        # Create a competency profile
        profile = CompetencyProfile(
            user_id="user123",
            skills={"math": 0.8, "science": 0.6},
            learning_style="visual",
            strengths=["math"],
            weaknesses=["writing"],
            last_updated=datetime.now().isoformat()
        )
        
        updated_profile = assessment_engine.update_competency_profile(profile)
        
        # Verify the profile is returned
        assert updated_profile.user_id == "user123"
        assert isinstance(updated_profile.skills, dict)

    def test_determine_adaptive_difficulty(self, assessment_engine):
        """Test determining adaptive difficulty"""
        difficulty = assessment_engine.determine_adaptive_difficulty("user123", "concept123")
        
        # Verify it returns an integer
        assert isinstance(difficulty, int)
        assert 1 <= difficulty <= 10  # Assuming difficulty is on a 1-10 scale

    def test_generate_recommendations(self, assessment_engine):
        """Test generating recommendations"""
        from src.data.models.extended_models import CompetencyProfile
        
        # Create a competency profile
        profile = CompetencyProfile(
            user_id="user123",
            skills={"math": 0.8, "science": 0.6},
            learning_style="visual",
            strengths=["math"],
            weaknesses=["writing"],
            last_updated=datetime.now().isoformat()
        )
        
        recommendations = assessment_engine.generate_recommendations(profile)
        
        # Verify the recommendations structure
        assert recommendations.user_id == "user123"
        assert isinstance(recommendations.next_concepts, list)


class TestTrendAnalyzer:
    def test_generate_trend_data(self, db_manager):
        """Test generating trend data"""
        analyzer = TrendAnalyzer(db_manager)
        
        time_period = {
            "start": (datetime.now() - timedelta(days=7)).isoformat(),
            "end": datetime.now().isoformat()
        }
        
        trends = analyzer.generate_trend_data("user123", "accuracy", time_period)
        
        # Verify it returns a list
        assert isinstance(trends, list)

    def test_analyze_trend_direction(self, db_manager):
        """Test analyzing trend direction"""
        analyzer = TrendAnalyzer(db_manager)
        
        # Create mock trend data
        from src.data.models.extended_models import TrendData, TimePeriod
        
        mock_trend_data = [
            TrendData(
                metric="accuracy",
                values=[{"date": "2023-01-01", "value": 0.7}, {"date": "2023-01-02", "value": 0.8}],
                period=TimePeriod(start_date="2023-01-01", end_date="2023-01-31")
            )
        ]
        
        direction = analyzer.analyze_trend_direction(mock_trend_data)
        
        # Verify it returns a string
        assert direction in ["improving", "declining", "neutral"]

    def test_get_performance_insights(self, db_manager):
        """Test getting performance insights"""
        analyzer = TrendAnalyzer(db_manager)
        
        time_period = {
            "start": (datetime.now() - timedelta(days=30)).isoformat(),
            "end": datetime.now().isoformat()
        }
        
        insights = analyzer.get_performance_insights("user123", time_period)
        
        # Verify the structure of insights
        assert "accuracy_trend" in insights
        assert "completion_trend" in insights
        assert "time_spent_trend" in insights
        assert "recommendations" in insights
        assert isinstance(insights["recommendations"], list)


class TestWeakAreaIdentifier:
    def test_identify_weak_areas(self, db_manager):
        """Test identifying weak areas"""
        identifier = WeakAreaIdentifier(db_manager)
        
        weak_areas = identifier.identify_weak_areas("user123")
        
        # Verify it returns a list
        assert isinstance(weak_areas, list)

    def test_get_targeted_practice(self, db_manager):
        """Test getting targeted practice"""
        identifier = WeakAreaIdentifier(db_manager)
        
        practice = identifier.get_targeted_practice("user123")
        
        # Verify it returns a list of recommendations
        assert isinstance(practice, list)
        if practice:
            assert "concept_id" in practice[0]
            assert "recommended_sessions" in practice[0]

    def test_analyze_performance_patterns(self, db_manager):
        """Test analyzing performance patterns"""
        identifier = WeakAreaIdentifier(db_manager)
        
        patterns = identifier.analyze_performance_patterns("user123")
        
        # Verify the structure of patterns
        assert "best_performance_time" in patterns
        assert "challenging_concept_types" in patterns
        assert "learning_patterns" in patterns
        assert "suggested_improvements" in patterns

    def test_update_competency_profile_with_weak_areas(self, db_manager):
        """Test updating competency profile with weak areas"""
        identifier = WeakAreaIdentifier(db_manager)
        
        from src.data.models.extended_models import CompetencyProfile
        
        # Create a competency profile
        profile = CompetencyProfile(
            user_id="user123",
            skills={"math": 0.8, "science": 0.6},
            learning_style="visual",
            strengths=["math"],
            weaknesses=["writing"],
            last_updated=datetime.now().isoformat()
        )
        
        updated_profile = identifier.update_competency_profile_with_weak_areas("user123", profile)
        
        # Verify the profile is returned with updated weaknesses
        assert updated_profile.user_id == "user123"
        assert isinstance(updated_profile.weaknesses, list)


class TestExportService:
    def test_export_progress_report(self, temp_workspace, db_manager):
        """Test exporting progress report"""
        export_service = ExportService(str(temp_workspace), db_manager)
        
        export_result = export_service.export_analytics("user123", "json", "progress")
        
        # Verify the export structure
        assert export_result.report_type == "progress"
        assert export_result.format == "json"
        assert export_result.content.endswith('.json')

    def test_export_token_usage_report(self, temp_workspace, db_manager):
        """Test exporting token usage report"""
        export_service = ExportService(str(temp_workspace), db_manager)
        
        export_result = export_service.export_analytics("user123", "json", "token_usage")
        
        # Verify the export structure
        assert export_result.report_type == "token_usage"
        assert export_result.format == "json"
        assert export_result.content.endswith('.json')

    def test_export_performance_report(self, temp_workspace, db_manager):
        """Test exporting performance report"""
        export_service = ExportService(str(temp_workspace), db_manager)
        
        export_result = export_service.export_analytics("user123", "json", "performance")
        
        # Verify the export structure
        assert export_result.report_type == "performance"
        assert export_result.format == "json"
        assert export_result.content.endswith('.json')

    def test_calculate_cost(self, temp_workspace, db_manager):
        """Test cost calculation"""
        export_service = ExportService(str(temp_workspace), db_manager)
        
        token_usage = {
            "input_tokens": 1000,
            "output_tokens": 2000,
            "total_tokens": 3000
        }
        
        cost = export_service._calculate_cost(token_usage)
        
        # Verify it returns a positive float
        assert isinstance(cost, float)
        assert cost >= 0


class TestTokenUsageAnalytics:
    def test_get_detailed_usage_summary(self, db_manager):
        """Test getting detailed usage summary"""
        analytics = TokenUsageAnalytics(db_manager)
        
        summary = analytics.get_detailed_usage_summary("user123", 30)
        
        # Verify the structure of the summary
        assert "period" in summary
        assert "summary" in summary
        assert "detailed_usage" in summary
        assert isinstance(summary["summary"], dict)

    def test_get_provider_comparison(self, db_manager):
        """Test getting provider comparison"""
        analytics = TokenUsageAnalytics(db_manager)
        
        comparison = analytics.get_provider_comparison("user123", 30)
        
        # Verify it returns a dict
        assert isinstance(comparison, dict)

    def test_get_model_comparison(self, db_manager):
        """Test getting model comparison"""
        analytics = TokenUsageAnalytics(db_manager)
        
        comparison = analytics.get_model_comparison("user123", 30)
        
        # Verify it returns a dict
        assert isinstance(comparison, dict)

    def test_get_context_based_analysis(self, db_manager):
        """Test getting context-based analysis"""
        analytics = TokenUsageAnalytics(db_manager)
        
        analysis = analytics.get_context_based_analysis("user123", 30)
        
        # Verify it returns a dict
        assert isinstance(analysis, dict)

    def test_generate_cost_optimization_suggestions(self, db_manager):
        """Test generating cost optimization suggestions"""
        analytics = TokenUsageAnalytics(db_manager)
        
        suggestions = analytics.generate_cost_optimization_suggestions("user123", 30)
        
        # Verify it returns a list
        assert isinstance(suggestions, list)


if __name__ == "__main__":
    pytest.main([__file__])