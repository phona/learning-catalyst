"""
Comprehensive Analytics Dashboard for Learning Catalyst
Provides text-based visualization, proficiency tracking, trend analysis, and export functionality
"""

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from src.core.basic_assessment_engine import BasicAssessmentEngine
from src.core.trend_analyzer import TrendAnalyzer
from src.core.weak_area_identifier import WeakAreaIdentifier
from src.data.database_manager import DatabaseManager
from src.data.models.extended_models import (
    AnalyticsExport,
    CompetencyProfile,
    ProgressReport,
    Recommendations,
    TimePeriod,
    TrendData,
)


class AnalyticsDashboard:
    """Comprehensive analytics dashboard with visualization and reporting capabilities."""

    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.trend_analyzer = TrendAnalyzer(db_manager)
        self.weak_area_identifier = WeakAreaIdentifier(db_manager)
        self.assessment_engine = BasicAssessmentEngine(db_manager)

    def generate_progress_report(self, user_id: str, time_period: Dict[str, str]) -> ProgressReport:
        """Generate a comprehensive progress report for the user."""
        # Get all concepts
        all_concepts = self.db_manager.get_all_concepts()
        total_concepts = len(all_concepts)

        # Get user progress data
        user_progress = self._get_user_progress(user_id, time_period)
        concepts_mastered = sum(1 for p in user_progress if p.get("score", 0) >= 0.8)

        # Calculate overall score
        overall_score = sum(p.get("score", 0) for p in user_progress) / len(user_progress) if user_progress else 0

        # Identify weak areas
        weak_areas = self.weak_area_identifier.identify_weak_areas(user_id)

        time_period_obj = TimePeriod(
            start_date=time_period.get("start", ""),
            end_date=time_period.get("end", "")
        )

        return ProgressReport(
            user_id=user_id,
            concepts_mastered=concepts_mastered,
            total_concepts=total_concepts,
            overall_score=overall_score,
            time_period=time_period_obj,
            weak_areas=weak_areas,
        )

    def render_text_dashboard(self, user_id: str, time_period: Optional[Dict[str, str]] = None) -> str:
        """Render a comprehensive text-based analytics dashboard."""
        if not time_period:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            time_period = {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }

        lines = []
        lines.append("╔══════════════════════════════════════════════════════════════╗")
        lines.append("║                    LEARNING ANALYTICS DASHBOARD             ║")
        lines.append("╚══════════════════════════════════════════════════════════════╝")
        lines.append("")

        # Progress Overview
        progress_report = self.generate_progress_report(user_id, time_period)
        lines.extend(self._render_progress_overview(progress_report))

        # Proficiency Visualization
        competency_profile = self._get_competency_profile(user_id)
        lines.extend(self._render_proficiency_visualization(competency_profile))

        # Trend Analysis
        lines.extend(self._render_trend_analysis(user_id, time_period))

        # Weak Areas Analysis
        lines.extend(self._render_weak_areas_analysis(user_id))

        # Knowledge Graph Progress
        lines.extend(self._render_knowledge_graph_progress(user_id))

        # Recommendations
        lines.extend(self._render_recommendations(user_id))

        # Performance Metrics
        lines.extend(self._render_performance_metrics(user_id, time_period))

        return "\n".join(lines)

    def _render_progress_overview(self, report: ProgressReport) -> List[str]:
        """Render progress overview section."""
        lines = []
        lines.append("📊 PROGRESS OVERVIEW")
        lines.append("├" + "─" * 58 + "┤")

        # Progress bar
        progress_pct = (report.concepts_mastered / report.total_concepts * 100) if report.total_concepts > 0 else 0
        filled = int(progress_pct / 5)
        bar = "█" * filled + "░" * (20 - filled)

        lines.append(f"│ Overall Progress: [{bar}] {progress_pct:.1f}%")
        lines.append(f"│ Concepts Mastered: {report.concepts_mastered}/{report.total_concepts}")
        lines.append(f"│ Overall Score: {report.overall_score:.1f}%")
        lines.append(f"│ Period: {report.time_period.start_date[:10]} to {report.time_period.end_date[:10]}")
        lines.append("└" + "─" * 58 + "┘")
        lines.append("")
        return lines

    def _render_proficiency_visualization(self, profile: CompetencyProfile) -> List[str]:
        """Render proficiency visualization section."""
        lines = []
        lines.append("🎯 PROFICIENCY BREAKDOWN")
        lines.append("├" + "─" * 58 + "┤")

        if not profile.skills:
            lines.append("│ No proficiency data available yet.")
        else:
            # Sort skills by proficiency level
            sorted_skills = sorted(profile.skills.items(), key=lambda x: x[1], reverse=True)

            for skill_name, proficiency in sorted_skills[:10]:  # Top 10 skills
                # Create proficiency bar
                bar_length = int(proficiency * 20)
                bar = "█" * bar_length + "░" * (20 - bar_length)

                # Determine proficiency level
                if proficiency >= 0.8:
                    level = "Expert"
                    emoji = "🏆"
                elif proficiency >= 0.6:
                    level = "Advanced"
                    emoji = "🥈"
                elif proficiency >= 0.4:
                    level = "Intermediate"
                    emoji = "🥉"
                else:
                    level = "Beginner"
                    emoji = "🌱"

                lines.append(f"│ {emoji} {skill_name[:20]:20} [{bar}] {proficiency:.1%} ({level})")

        lines.append("└" + "─" * 58 + "┘")
        lines.append("")
        return lines

    def _render_trend_analysis(self, user_id: str, time_period: Dict[str, str]) -> List[str]:
        """Render trend analysis section."""
        lines = []
        lines.append("📈 PERFORMANCE TRENDS")
        lines.append("├" + "─" * 58 + "┤")

        insights = self.trend_analyzer.get_performance_insights(user_id, time_period)

        # Accuracy trend
        accuracy_trend = insights.get("accuracy_trend", "neutral")
        accuracy_emoji = {"improving": "📈", "declining": "📉", "neutral": "➡️"}.get(accuracy_trend, "➡️")
        lines.append(f"│ {accuracy_emoji} Accuracy Trend: {accuracy_trend.title()}")

        # Completion trend
        completion_trend = insights.get("completion_trend", "neutral")
        completion_emoji = {"improving": "📈", "declining": "📉", "neutral": "➡️"}.get(completion_trend, "➡️")
        lines.append(f"│ {completion_emoji} Completion Trend: {completion_trend.title()}")

        # Time spent trend
        time_trend = insights.get("time_spent_trend", "neutral")
        time_emoji = {"improving": "⏰", "declining": "⏱️", "neutral": "➡️"}.get(time_trend, "➡️")
        lines.append(f"│ {time_emoji} Learning Time Trend: {time_trend.title()}")

        lines.append("└" + "─" * 58 + "┘")
        lines.append("")
        return lines

    def _render_weak_areas_analysis(self, user_id: str) -> List[str]:
        """Render weak areas analysis section."""
        lines = []
        lines.append("⚠️  WEAK AREAS ANALYSIS")
        lines.append("├" + "─" * 58 + "┤")

        weak_areas = self.weak_area_identifier.identify_weak_areas(user_id)

        if not weak_areas:
            lines.append("│ 🎉 No weak areas identified! Keep up the great work!")
        else:
            lines.append(f"│ Found {len(weak_areas)} areas needing attention:")
            for i, area in enumerate(weak_areas[:5], 1):  # Top 5 weak areas
                lines.append(f"│ {i}. {area}")

            # Get targeted practice recommendations
            practice_recommendations = self.weak_area_identifier.get_targeted_practice(user_id)
            if practice_recommendations:
                lines.append("│")
                lines.append("│ Recommended practice:")
                for rec in practice_recommendations[:3]:
                    lines.append(f"│ • {rec.get('concept_id', 'Unknown')}: {rec.get('estimated_time', '10-15 min')}")

        lines.append("└" + "─" * 58 + "┘")
        lines.append("")
        return lines

    def _render_knowledge_graph_progress(self, user_id: str) -> List[str]:
        """Render knowledge graph progress section."""
        lines = []
        lines.append("🕸️  KNOWLEDGE GRAPH PROGRESS")
        lines.append("├" + "─" * 58 + "┤")

        # Get knowledge graph statistics
        user_progress = self._get_user_progress(user_id, {"start": "", "end": ""})
        completed_concepts = {p.get("concept_id") for p in user_progress if p.get("score", 0) >= 0.8}

        if completed_concepts:
            lines.append(f"│ Concepts Completed: {len(completed_concepts)}")
            lines.append(f"│ Ready to Learn: {len(self._get_ready_concepts(completed_concepts))}")
            lines.append(f"│ Prerequisites Met: {self._calculate_prerequisites_met(completed_concepts)}")
        else:
            lines.append("│ Start your learning journey to see knowledge graph progress!")

        lines.append("└" + "─" * 58 + "┘")
        lines.append("")
        return lines

    def _render_recommendations(self, user_id: str) -> List[str]:
        """Render personalized recommendations section."""
        lines = []
        lines.append("💡 PERSONALIZED RECOMMENDATIONS")
        lines.append("├" + "─" * 58 + "┤")

        # Get recommendations from various sources
        insights = self.trend_analyzer.get_performance_insights(user_id, {
            "start": (datetime.now() - timedelta(days=30)).isoformat(),
            "end": datetime.now().isoformat()
        })

        recommendations = insights.get("recommendations", [])

        # Add weak area recommendations
        weak_areas = self.weak_area_identifier.identify_weak_areas(user_id)
        if weak_areas:
            recommendations.append("Focus on strengthening weak areas identified above.")

        # Add knowledge graph recommendations
        user_progress = self._get_user_progress(user_id, {"start": "", "end": ""})
        completed_concepts = {p.get("concept_id") for p in user_progress if p.get("score", 0) >= 0.8}
        ready_concepts = self._get_ready_concepts(completed_concepts)

        if ready_concepts:
            recommendations.append(f"Try these ready concepts: {', '.join(ready_concepts[:3])}")
        elif not completed_concepts:
            recommendations.append("Start with basic concepts to build your foundation.")

        if not recommendations:
            recommendations.append("Continue your current learning path - you're doing great!")

        for i, rec in enumerate(recommendations[:5], 1):
            lines.append(f"│ {i}. {rec}")

        lines.append("└" + "─" * 58 + "┘")
        lines.append("")
        return lines

    def _render_performance_metrics(self, user_id: str, time_period: Dict[str, str]) -> List[str]:
        """Render detailed performance metrics section."""
        lines = []
        lines.append("📋 PERFORMANCE METRICS")
        lines.append("├" + "─" * 58 + "┤")

        # Calculate various metrics
        user_progress = self._get_user_progress(user_id, time_period)

        if user_progress:
            # Basic metrics
            total_attempts = len(user_progress)
            successful_attempts = sum(1 for p in user_progress if p.get("score", 0) >= 0.6)
            success_rate = (successful_attempts / total_attempts * 100) if total_attempts > 0 else 0

            avg_score = sum(p.get("score", 0) for p in user_progress) / len(user_progress) if user_progress else 0

            # Time metrics (simulated)
            avg_time_per_challenge = 5.2  # minutes
            total_learning_time = avg_time_per_challenge * total_attempts

            lines.append(f"│ Total Attempts: {total_attempts}")
            lines.append(f"│ Success Rate: {success_rate:.1f}%")
            lines.append(f"│ Average Score: {avg_score:.1f}%")
            lines.append(f"│ Est. Learning Time: {total_learning_time:.1f} minutes")
            lines.append(f"│ Avg Time per Challenge: {avg_time_per_challenge:.1f} minutes")
        else:
            lines.append("│ No performance data available for the selected period.")

        lines.append("└" + "─" * 58 + "┘")
        return lines

    def _get_user_progress(self, user_id: str, time_period: Dict[str, str]) -> List[Dict[str, Any]]:
        """Get user progress data from database."""
        # This would query the actual database for user progress
        # For now, return simulated data
        return []

    def _get_competency_profile(self, user_id: str) -> CompetencyProfile:
        """Get user's competency profile."""
        # This would query the actual database for competency profile
        # For now, return a simulated profile
        return CompetencyProfile(
            user_id=user_id,
            skills={
                "Problem Solving": 0.75,
                "Critical Thinking": 0.68,
                "Memory Retention": 0.82,
                "Concept Understanding": 0.71,
                "Application Skills": 0.65
            },
            learning_style="visual",
            strengths=["Memory Retention", "Problem Solving"],
            weaknesses=["Application Skills"],
            last_updated=datetime.now().isoformat()
        )

    def _get_ready_concepts(self, completed_concepts: Set[str]) -> List[str]:
        """Get concepts that are ready to learn based on completed prerequisites."""
        # This would use the knowledge graph to determine ready concepts
        # For now, return simulated data
        all_concepts = self.db_manager.get_all_concepts()
        ready = []

        for concept in all_concepts:
            if concept.id not in completed_concepts:
                prereqs_met = all(prereq in completed_concepts for prereq in concept.prerequisites)
                if prereqs_met:
                    ready.append(concept.id)

        return ready[:5]  # Return top 5 ready concepts

    def _calculate_prerequisites_met(self, completed_concepts: Set[str]) -> int:
        """Calculate how many prerequisite relationships are satisfied."""
        all_concepts = self.db_manager.get_all_concepts()
        total_prereqs = sum(len(c.prerequisites) for c in all_concepts)
        met_prereqs = sum(
            1 for concept in all_concepts
            for prereq in concept.prerequisites
            if prereq in completed_concepts
        )

        return met_prereqs

    def export_analytics(self, user_id: str, export_format: str = "json", time_period: Optional[Dict[str, str]] = None) -> AnalyticsExport:
        """Export analytics data in various formats."""
        if not time_period:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            time_period = {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }

        # Generate comprehensive report
        progress_report = self.generate_progress_report(user_id, time_period)
        competency_profile = self._get_competency_profile(user_id)
        insights = self.trend_analyzer.get_performance_insights(user_id, time_period)
        weak_areas = self.weak_area_identifier.identify_weak_areas(user_id)

        if export_format.lower() == "json":
            content = json.dumps({
                "progress_report": {
                    "user_id": progress_report.user_id,
                    "concepts_mastered": progress_report.concepts_mastered,
                    "total_concepts": progress_report.total_concepts,
                    "overall_score": progress_report.overall_score,
                    "weak_areas": progress_report.weak_areas,
                    "time_period": {
                        "start": progress_report.time_period.start_date,
                        "end": progress_report.time_period.end_date
                    }
                },
                "competency_profile": {
                    "user_id": competency_profile.user_id,
                    "skills": competency_profile.skills,
                    "learning_style": competency_profile.learning_style,
                    "strengths": competency_profile.strengths,
                    "weaknesses": competency_profile.weaknesses,
                    "last_updated": competency_profile.last_updated
                },
                "performance_insights": insights,
                "weak_areas": weak_areas,
                "export_timestamp": datetime.now().isoformat()
            }, indent=2)

        elif export_format.lower() == "csv":
            # CSV format with key metrics
            content = f"""metric,value,category
Concepts Mastered,{progress_report.concepts_mastered},Progress
Total Concepts,{progress_report.total_concepts},Progress
Overall Score,{progress_report.overall_score:.2f},Progress
Weak Areas,{len(progress_report.weak_areas)},Progress
Learning Style,{competency_profile.learning_style},Profile
Strengths,{len(competency_profile.strengths)},Profile
Weaknesses,{len(competency_profile.weaknesses)},Profile
Export Date,{datetime.now().strftime('%Y-%m-%d')},Metadata"""

        else:  # text format
            content = self.render_text_dashboard(user_id, time_period)

        return AnalyticsExport(
            report_type="comprehensive",
            content=content,
            format=export_format.lower(),
            timestamp=datetime.now().isoformat()
        )

    def generate_learning_recommendations(self, user_id: str) -> Recommendations:
        """Generate personalized learning recommendations."""
        # Get current competency profile
        profile = self._get_competency_profile(user_id)

        # Get weak areas
        weak_areas = self.weak_area_identifier.identify_weak_areas(user_id)

        # Get ready concepts
        user_progress = self._get_user_progress(user_id, {"start": "", "end": ""})
        completed_concepts = {p.get("concept_id") for p in user_progress if p.get("score", 0) >= 0.8}
        ready_concepts = self._get_ready_concepts(completed_concepts)

        # Generate learning path based on knowledge graph
        learning_path = self._generate_learning_path(completed_concepts, ready_concepts)

        # Get resources for recommended concepts
        resources = self._get_learning_resources(ready_concepts[:5])

        return Recommendations(
            user_id=user_id,
            next_concepts=ready_concepts[:3],
            learning_path=learning_path,
            resources=resources,
            timestamp=datetime.now().isoformat()
        )

    def _generate_learning_path(self, completed_concepts: Set[str], ready_concepts: List[str]) -> List[str]:
        """Generate an optimal learning path based on knowledge graph."""
        # This would use the knowledge graph to generate an optimal path
        # For now, return ready concepts sorted by difficulty
        all_concepts = self.db_manager.get_all_concepts()
        concept_difficulty = {c.id: c.difficulty_level for c in all_concepts}

        # Sort ready concepts by difficulty (easier first)
        sorted_concepts = sorted(ready_concepts, key=lambda x: concept_difficulty.get(x, 5))
        return sorted_concepts

    def _get_learning_resources(self, concept_ids: List[str]) -> List[str]:
        """Get learning resources for specified concepts."""
        # This would provide actual learning resources
        # For now, return generic resource suggestions
        resources = []
        for concept_id in concept_ids:
            resources.extend([
                f"Practice exercises for {concept_id}",
                f"Reading materials for {concept_id}",
                f"Video tutorials for {concept_id}"
            ])
        return resources[:10]  # Limit to 10 resources

    def get_analytics_summary(self, user_id: str) -> Dict[str, Any]:
        """Get a quick summary of key analytics metrics."""
        progress_report = self.generate_progress_report(user_id, {
            "start": (datetime.now() - timedelta(days=7)).isoformat(),
            "end": datetime.now().isoformat()
        })

        competency_profile = self._get_competency_profile(user_id)
        weak_areas = self.weak_area_identifier.identify_weak_areas(user_id)

        return {
            "overall_progress": progress_report.overall_score,
            "concepts_mastered": progress_report.concepts_mastered,
            "total_concepts": progress_report.total_concepts,
            "weak_areas_count": len(weak_areas),
            "strengths_count": len(competency_profile.strengths),
            "learning_style": competency_profile.learning_style,
            "last_updated": datetime.now().isoformat()
        }