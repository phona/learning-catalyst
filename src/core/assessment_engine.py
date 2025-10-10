"""
Advanced Assessment Engine with predictive analytics and cross-concept assessment
"""

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from src.core.interfaces.analytics import AssessmentEngine
from src.data.database_manager import DatabaseManager
from src.data.models.extended_models import (
    AnalyticsExport,
    CompetencyProfile,
    ProgressReport,
    Recommendations,
    TrendData,
)


class AdvancedAssessmentEngine(AssessmentEngine):
    """Advanced assessment engine with predictive analytics and cross-concept evaluation."""

    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        # Learning parameters for EMA and adaptive algorithms
        self.ema_alpha = 0.3  # Exponential moving average smoothing factor
        self.difficulty_adjustment_factor = 0.2
        self.predictive_window_days = 30

    async def assess_concept_mastery(self, user_id: str, concept_id: str) -> CompetencyProfile:
        """Assess user's mastery of a specific concept with detailed analysis."""
        # Get user performance data for this concept
        performance_data = await self._get_concept_performance(user_id, concept_id)

        if not performance_data:
            # No performance data yet, return initial profile
            return self._create_initial_profile(user_id, concept_id)

        # Calculate mastery metrics
        mastery_score = self._calculate_mastery_score(performance_data)
        confidence_level = self._calculate_confidence_level(performance_data)
        learning_velocity = self._calculate_learning_velocity(performance_data)
        retention_score = self._calculate_retention_score(user_id, concept_id)

        # Analyze cross-concept relationships
        cross_concept_impact = await self._analyze_cross_concept_impact(user_id, concept_id)

        # Create competency profile
        profile = CompetencyProfile(
            user_id=user_id,
            skills={
                concept_id: mastery_score,
                f"{concept_id}_confidence": confidence_level,
                f"{concept_id}_velocity": learning_velocity,
                f"{concept_id}_retention": retention_score
            },
            learning_style=self._infer_learning_style(performance_data),
            strengths=self._identify_strengths(user_id, concept_id, performance_data),
            weaknesses=self._identify_weaknesses(user_id, concept_id, performance_data),
            last_updated=datetime.now().isoformat()
        )

        # Save updated profile to database
        await self._save_competency_profile(profile)

        return profile

    async def generate_recommendations(self, user_id: str) -> Recommendations:
        """Generate personalized learning recommendations using AI-driven analysis."""
        # Get current competency profile
        current_profile = await self._get_competency_profile(user_id)

        # Get weak areas and learning gaps
        weak_areas = await self._identify_learning_gaps(user_id)

        # Get ready concepts based on knowledge graph
        ready_concepts = await self._get_ready_concepts(user_id)

        # Predict optimal learning path
        optimal_path = await self._predict_optimal_learning_path(user_id, weak_areas, ready_concepts)

        # Generate personalized resources
        resources = await self._generate_personalized_resources(user_id, optimal_path)

        return Recommendations(
            user_id=user_id,
            next_concepts=optimal_path[:3],
            learning_path=optimal_path,
            resources=resources,
            timestamp=datetime.now().isoformat()
        )

    async def export_analytics(self, user_id: str, format: str) -> AnalyticsExport:
        """Export comprehensive analytics data in specified format."""
        # Get comprehensive analytics data
        performance_history = await self._get_performance_history(user_id)
        competency_evolution = await self._get_competency_evolution(user_id)
        predictive_insights = await self._generate_predictive_insights(user_id)
        learning_patterns = await self._analyze_learning_patterns(user_id)

        analytics_data = {
            "user_id": user_id,
            "performance_history": performance_history,
            "competency_evolution": competency_evolution,
            "predictive_insights": predictive_insights,
            "learning_patterns": learning_patterns,
            "export_timestamp": datetime.now().isoformat()
        }

        if format.lower() == "json":
            content = self._export_as_json(analytics_data)
        elif format.lower() == "csv":
            content = self._export_as_csv(analytics_data)
        else:
            content = self._export_as_text(analytics_data)

        return AnalyticsExport(
            report_type="comprehensive_analytics",
            content=content,
            format=format.lower(),
            timestamp=datetime.now().isoformat()
        )

    def analyze_performance(self, user_id: str, time_period: Dict[str, str]) -> Dict[str, Any]:
        """Analyze user's performance with advanced metrics."""
        # Get performance data
        performance_data = self._get_performance_data(user_id, time_period)

        if not performance_data:
            return self._empty_performance_analysis(user_id, time_period)

        # Calculate advanced metrics
        basic_metrics = self._calculate_basic_metrics(performance_data)
        advanced_metrics = self._calculate_advanced_metrics(performance_data)
        predictive_metrics = self._calculate_predictive_metrics(user_id, performance_data)
        cross_concept_metrics = self._calculate_cross_concept_metrics(user_id, performance_data)

        return {
            "user_id": user_id,
            "time_period": time_period,
            "basic_metrics": basic_metrics,
            "advanced_metrics": advanced_metrics,
            "predictive_metrics": predictive_metrics,
            "cross_concept_metrics": cross_concept_metrics,
            "analysis_timestamp": datetime.now().isoformat()
        }

    def update_competency_profile(self, profile: CompetencyProfile) -> CompetencyProfile:
        """Update competency profile using exponential moving average for smooth learning."""
        # Get previous profile if exists
        previous_profile = self._get_previous_profile(profile.user_id)

        if previous_profile:
            # Apply EMA to skills for smooth learning progression
            updated_skills = {}
            for skill_name, new_value in profile.skills.items():
                if skill_name in previous_profile.skills:
                    # Apply exponential moving average
                    old_value = previous_profile.skills[skill_name]
                    updated_skills[skill_name] = (
                        self.ema_alpha * new_value +
                        (1 - self.ema_alpha) * old_value
                    )
                else:
                    updated_skills[skill_name] = new_value

            profile.skills = updated_skills

        # Update learning style based on recent performance patterns
        profile.learning_style = self._update_learning_style(profile)

        # Refresh strengths and weaknesses
        profile.strengths = self._refresh_strengths(profile)
        profile.weaknesses = self._refresh_weaknesses(profile)

        profile.last_updated = datetime.now().isoformat()

        return profile

    def determine_adaptive_difficulty(self, user_id: str, concept_id: str) -> int:
        """Determine adaptive difficulty using multi-factor analysis."""
        # Get user's competency for this concept
        competency_data = self._get_concept_competency(user_id, concept_id)

        if not competency_data:
            return 5  # Default difficulty for new concepts

        # Factors influencing difficulty
        mastery_level = competency_data.get("mastery", 0.5)
        recent_performance = competency_data.get("recent_performance", 0.5)
        confidence_level = competency_data.get("confidence", 0.5)
        learning_velocity = competency_data.get("velocity", 0.5)

        # Calculate adaptive difficulty score
        difficulty_score = (
            mastery_level * 0.3 +
            recent_performance * 0.25 +
            confidence_level * 0.2 +
            learning_velocity * 0.25
        )

        # Map to difficulty scale (1-10)
        adaptive_difficulty = max(1, min(10, int(difficulty_score * 10)))

        # Apply adjustment factor for gradual progression
        if self._should_increase_difficulty(user_id, concept_id):
            adaptive_difficulty = min(10, adaptive_difficulty + 1)
        elif self._should_decrease_difficulty(user_id, concept_id):
            adaptive_difficulty = max(1, adaptive_difficulty - 1)

        return adaptive_difficulty

    def predict_learning_outcomes(self, user_id: str, time_horizon_days: int = 30) -> Dict[str, Any]:
        """Predict learning outcomes using statistical models."""
        # Get historical data
        historical_data = self._get_historical_performance(user_id, days=90)

        if len(historical_data) < 5:
            return self._insufficient_data_prediction(user_id, time_horizon_days)

        # Calculate learning trends
        mastery_trend = self._calculate_mastery_trend(historical_data)
        velocity_trend = self._calculate_velocity_trend(historical_data)
        retention_trend = self._calculate_retention_trend(historical_data)

        # Predict future performance
        predicted_mastery = self._predict_future_mastery(mastery_trend, time_horizon_days)
        predicted_concepts_completed = self._predict_concepts_completed(velocity_trend, time_horizon_days)
        predicted_retention_rate = self._predict_retention_rate(retention_trend, time_horizon_days)

        # Identify potential challenges
        potential_challenges = self._identify_potential_challenges(user_id, historical_data)

        # Generate intervention recommendations
        interventions = self._generate_intervention_recommendations(
            user_id, predicted_mastery, predicted_concepts_completed, potential_challenges
        )

        return {
            "user_id": user_id,
            "prediction_horizon_days": time_horizon_days,
            "predicted_mastery_level": predicted_mastery,
            "predicted_concepts_completed": predicted_concepts_completed,
            "predicted_retention_rate": predicted_retention_rate,
            "confidence_interval": self._calculate_confidence_interval(historical_data),
            "potential_challenges": potential_challenges,
            "recommended_interventions": interventions,
            "prediction_timestamp": datetime.now().isoformat()
        }

    async def _get_concept_performance(self, user_id: str, concept_id: str) -> List[Dict[str, Any]]:
        """Get performance data for a specific concept."""
        # Query database for concept-specific performance
        return await self.db_manager.get_concept_performance(user_id, concept_id)

    def _calculate_mastery_score(self, performance_data: List[Dict[str, Any]]) -> float:
        """Calculate mastery score using weighted performance metrics."""
        if not performance_data:
            return 0.0

        # Recent performance weighted more heavily
        weights = [0.5 ** (len(performance_data) - i - 1) for i in range(len(performance_data))]
        total_weight = sum(weights)

        weighted_scores = [
            score * weight
            for score, weight in zip(
                [p.get("score", 0) for p in performance_data],
                weights
            )
        ]

        return sum(weighted_scores) / total_weight if total_weight > 0 else 0.0

    def _calculate_confidence_level(self, performance_data: List[Dict[str, Any]]) -> float:
        """Calculate confidence level based on consistency of performance."""
        if len(performance_data) < 3:
            return 0.5  # Low confidence with insufficient data

        scores = [p.get("score", 0) for p in performance_data]
        mean_score = sum(scores) / len(scores)
        variance = sum((score - mean_score) ** 2 for score in scores) / len(scores)

        # Lower variance = higher confidence
        confidence = max(0.0, 1.0 - math.sqrt(variance))
        return confidence

    def _calculate_learning_velocity(self, performance_data: List[Dict[str, Any]]) -> float:
        """Calculate learning velocity (rate of improvement)."""
        if len(performance_data) < 2:
            return 0.5

        # Calculate improvement rate between consecutive attempts
        improvement_rates = []
        for i in range(1, len(performance_data)):
            prev_score = performance_data[i-1].get("score", 0)
            curr_score = performance_data[i].get("score", 0)
            if prev_score > 0:
                improvement = (curr_score - prev_score) / prev_score
                improvement_rates.append(improvement)

        if not improvement_rates:
            return 0.5

        # Normalize to 0-1 scale
        avg_improvement = sum(improvement_rates) / len(improvement_rates)
        return max(0.0, min(1.0, 0.5 + avg_improvement))

    def _calculate_retention_score(self, user_id: str, concept_id: str) -> float:
        """Calculate retention score based on spaced repetition performance."""
        # Get performance over time with gaps
        spaced_performance = self._get_spaced_repetition_data(user_id, concept_id)

        if not spaced_performance:
            return 0.5

        # Calculate retention based on performance decay over time
        retention_scores = []
        for session in spaced_performance:
            initial_score = session.get("initial_score", 0)
            delayed_score = session.get("delayed_score", 0)
            if initial_score > 0:
                retention = delayed_score / initial_score
                retention_scores.append(min(1.0, retention))

        return sum(retention_scores) / len(retention_scores) if retention_scores else 0.5

    async def _analyze_cross_concept_impact(self, user_id: str, concept_id: str) -> Dict[str, float]:
        """Analyze how mastery of this concept impacts other related concepts."""
        # Get related concepts from knowledge graph
        related_concepts = await self._get_related_concepts(concept_id)

        cross_impact = {}
        for related_concept in related_concepts:
            # Correlate performance between concepts
            correlation = self._calculate_concept_correlation(user_id, concept_id, related_concept)
            cross_impact[related_concept] = correlation

        return cross_impact

    def _infer_learning_style(self, performance_data: List[Dict[str, Any]]) -> str:
        """Infer learning style based on performance patterns."""
        # Analyze response times, error patterns, and improvement rates
        avg_response_time = sum(p.get("response_time", 0) for p in performance_data) / len(performance_data)

        # Quick responders with good accuracy -> visual/kinesthetic
        # Slow responders with high accuracy -> reading/writing
        # Variable performance -> auditory

        if avg_response_time < 30:  # seconds
            return "visual"
        elif avg_response_time > 120:
            return "reading"
        else:
            return "auditory"

    def _identify_strengths(self, user_id: str, concept_id: str, performance_data: List[Dict[str, Any]]) -> List[str]:
        """Identify specific strengths based on performance analysis."""
        strengths = []

        if performance_data:
            avg_score = sum(p.get("score", 0) for p in performance_data) / len(performance_data)
            if avg_score > 0.8:
                strengths.append(f"high_mastery_{concept_id}")

            consistency = self._calculate_consistency(performance_data)
            if consistency > 0.8:
                strengths.append(f"consistent_performance_{concept_id}")

            speed = self._calculate_speed(performance_data)
            if speed > 0.8:
                strengths.append(f"quick_learning_{concept_id}")

        return strengths

    def _identify_weaknesses(self, user_id: str, concept_id: str, performance_data: List[Dict[str, Any]]) -> List[str]:
        """Identify specific weaknesses based on performance analysis."""
        weaknesses = []

        if performance_data:
            avg_score = sum(p.get("score", 0) for p in performance_data) / len(performance_data)
            if avg_score < 0.5:
                weaknesses.append(f"low_mastery_{concept_id}")

            consistency = self._calculate_consistency(performance_data)
            if consistency < 0.5:
                weaknesses.append(f"inconsistent_performance_{concept_id}")

            # Check for specific error patterns
            error_patterns = self._analyze_error_patterns(performance_data)
            weaknesses.extend(error_patterns)

        return weaknesses

    def _calculate_consistency(self, performance_data: List[Dict[str, Any]]) -> float:
        """Calculate performance consistency."""
        if len(performance_data) < 2:
            return 0.5

        scores = [p.get("score", 0) for p in performance_data]
        mean_score = sum(scores) / len(scores)
        variance = sum((score - mean_score) ** 2 for score in scores) / len(scores)

        # Higher consistency = lower variance
        return max(0.0, 1.0 - variance)

    def _calculate_speed(self, performance_data: List[Dict[str, Any]]) -> float:
        """Calculate learning speed relative to expectations."""
        if len(performance_data) < 2:
            return 0.5

        # Compare actual improvement rate to expected rate
        actual_improvement = self._calculate_learning_velocity(performance_data)
        expected_improvement = 0.1  # 10% improvement per session as baseline

        return min(1.0, actual_improvement / expected_improvement)

    def _analyze_error_patterns(self, performance_data: List[Dict[str, Any]]) -> List[str]:
        """Analyze specific error patterns to identify weaknesses."""
        error_patterns = []

        # This would analyze the types of errors made
        # For now, return generic patterns
        for performance in performance_data:
            if performance.get("score", 0) < 0.5:
                if performance.get("response_time", 0) < 30:
                    error_patterns.append("rushed_errors")
                else:
                    error_patterns.append("concept_gaps")

        return list(set(error_patterns))  # Remove duplicates

    # Helper methods for database operations and data retrieval
    async def _save_competency_profile(self, profile: CompetencyProfile) -> None:
        """Save competency profile to database."""
        await self.db_manager.save_competency_profile(profile)

    async def _get_competency_profile(self, user_id: str) -> CompetencyProfile:
        """Get competency profile from database."""
        return await self.db_manager.get_competency_profile(user_id)

    def _create_initial_profile(self, user_id: str, concept_id: str) -> CompetencyProfile:
        """Create initial competency profile for new concept."""
        return CompetencyProfile(
            user_id=user_id,
            skills={concept_id: 0.0},
            learning_style="unknown",
            strengths=[],
            weaknesses=[],
            last_updated=datetime.now().isoformat()
        )

    # Additional helper methods would be implemented here
    async def _identify_learning_gaps(self, user_id: str) -> List[str]:
        """Identify learning gaps for the user."""
        # Implementation would analyze performance across concepts
        return []

    async def _get_ready_concepts(self, user_id: str) -> List[str]:
        """Get concepts ready for learning based on prerequisites."""
        # Implementation would use knowledge graph
        return []

    async def _predict_optimal_learning_path(self, user_id: str, weak_areas: List[str], ready_concepts: List[str]) -> List[str]:
        """Predict optimal learning path using AI algorithms."""
        # Implementation would use ML models for path prediction
        return ready_concepts[:5]

    async def _generate_personalized_resources(self, user_id: str, learning_path: List[str]) -> List[str]:
        """Generate personalized learning resources."""
        # Implementation would match resources to learning style and needs
        return []

    def _export_as_json(self, data: Dict[str, Any]) -> str:
        """Export data as JSON."""
        import json
        return json.dumps(data, indent=2, default=str)

    def _export_as_csv(self, data: Dict[str, Any]) -> str:
        """Export data as CSV."""
        # Simplified CSV export
        return "user_id,metric,value,timestamp\n"

    def _export_as_text(self, data: Dict[str, Any]) -> str:
        """Export data as formatted text."""
        return f"Analytics Report for User {data.get('user_id', 'Unknown')}\nGenerated: {datetime.now().isoformat()}"

    def _empty_performance_analysis(self, user_id: str, time_period: Dict[str, str]) -> Dict[str, Any]:
        """Return empty performance analysis when no data available."""
        return {
            "user_id": user_id,
            "time_period": time_period,
            "message": "No performance data available for the specified period",
            "recommendations": ["Start practicing to generate performance data"]
        }

    def _insufficient_data_prediction(self, user_id: str, time_horizon_days: int) -> Dict[str, Any]:
        """Return prediction when insufficient data available."""
        return {
            "user_id": user_id,
            "prediction_horizon_days": time_horizon_days,
            "message": "Insufficient data for accurate prediction",
            "recommendation": "Complete more learning activities to improve prediction accuracy"
        }

    # Additional placeholder methods for full implementation
    def _get_performance_data(self, user_id: str, time_period: Dict[str, str]) -> List[Dict[str, Any]]:
        """Get performance data for the specified time period."""
        return []

    def _calculate_basic_metrics(self, performance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate basic performance metrics."""
        return {}

    def _calculate_advanced_metrics(self, performance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate advanced performance metrics."""
        return {}

    def _calculate_predictive_metrics(self, user_id: str, performance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate predictive metrics."""
        return {}

    def _calculate_cross_concept_metrics(self, user_id: str, performance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate cross-concept performance metrics."""
        return {}

    def _get_previous_profile(self, user_id: str) -> Optional[CompetencyProfile]:
        """Get previous competency profile."""
        return None

    def _update_learning_style(self, profile: CompetencyProfile) -> str:
        """Update learning style based on performance patterns."""
        return profile.learning_style

    def _refresh_strengths(self, profile: CompetencyProfile) -> List[str]:
        """Refresh strengths based on current skills."""
        return profile.strengths

    def _refresh_weaknesses(self, profile: CompetencyProfile) -> List[str]:
        """Refresh weaknesses based on current skills."""
        return profile.weaknesses

    def _get_concept_competency(self, user_id: str, concept_id: str) -> Dict[str, float]:
        """Get competency data for a specific concept."""
        return {}

    def _should_increase_difficulty(self, user_id: str, concept_id: str) -> bool:
        """Determine if difficulty should be increased."""
        return False

    def _should_decrease_difficulty(self, user_id: str, concept_id: str) -> bool:
        """Determine if difficulty should be decreased."""
        return False

    def _get_historical_performance(self, user_id: str, days: int) -> List[Dict[str, Any]]:
        """Get historical performance data."""
        return []

    def _calculate_mastery_trend(self, historical_data: List[Dict[str, Any]]) -> float:
        """Calculate mastery trend from historical data."""
        return 0.0

    def _calculate_velocity_trend(self, historical_data: List[Dict[str, Any]]) -> float:
        """Calculate learning velocity trend."""
        return 0.0

    def _calculate_retention_trend(self, historical_data: List[Dict[str, Any]]) -> float:
        """Calculate retention trend."""
        return 0.0

    def _predict_future_mastery(self, mastery_trend: float, days: int) -> float:
        """Predict future mastery level."""
        return 0.5

    def _predict_concepts_completed(self, velocity_trend: float, days: int) -> int:
        """Predict number of concepts to be completed."""
        return 0

    def _predict_retention_rate(self, retention_trend: float, days: int) -> float:
        """Predict future retention rate."""
        return 0.8

    def _calculate_confidence_interval(self, historical_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate confidence interval for predictions."""
        return {"lower": 0.0, "upper": 1.0}

    def _identify_potential_challenges(self, user_id: str, historical_data: List[Dict[str, Any]]) -> List[str]:
        """Identify potential learning challenges."""
        return []

    def _generate_intervention_recommendations(self, user_id: str, predicted_mastery: float, predicted_concepts: int, challenges: List[str]) -> List[str]:
        """Generate intervention recommendations."""
        return []

    def _get_spaced_repetition_data(self, user_id: str, concept_id: str) -> List[Dict[str, Any]]:
        """Get spaced repetition performance data."""
        return []

    async def _get_related_concepts(self, concept_id: str) -> List[str]:
        """Get concepts related to the specified concept."""
        return []

    def _calculate_concept_correlation(self, user_id: str, concept1: str, concept2: str) -> float:
        """Calculate performance correlation between two concepts."""
        return 0.0

    async def _get_performance_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get complete performance history for the user."""
        return []

    async def _get_competency_evolution(self, user_id: str) -> List[Dict[str, Any]]:
        """Get competency evolution over time."""
        return []

    async def _generate_predictive_insights(self, user_id: str) -> Dict[str, Any]:
        """Generate predictive insights for the user."""
        return {}

    async def _analyze_learning_patterns(self, user_id: str) -> Dict[str, Any]:
        """Analyze learning patterns and behaviors."""
        return {}