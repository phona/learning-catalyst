"""
Integration tests for Learning Workflow Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of learning workflows based on real-world usage patterns from docs/examples/basic-workflows.md
and docs/examples/advanced.md. Tests cover complete learning journeys, adaptive learning,
knowledge progression, and personalized learning paths.
"""

import pytest
import asyncio
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from tests.test_helpers import (
    measure_async_performance,
    assert_async_performance_under,
    generate_mock_concept
)


class TestLearningWorkflowIntegration:
    """Integration tests for learning workflow functionality."""

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_complete_learning_journey_workflow(self):
        """Test complete learning journey from start to mastery."""
        from src.core.learning_engine import LearningEngine
        from src.core.session_manager import SessionManager
        from src.ai.service import AIService

        learning_engine = LearningEngine()
        session_manager = SessionManager()
        ai_service = AIService()

        # Step 1: Start learning journey
        journey_result = await learning_engine.start_learning_journey(
            user_id="learner_123",
            topic="Python Programming",
            goals=["Learn basics", "Build projects", "Get job-ready"],
            time_commitment="2 hours per week",
            current_level="beginner"
        )
        assert journey_result['success'] is True
        journey_id = journey_result['journey_id']

        # Step 2: Create learning session
        session_result = await session_manager.create_session(
            user_id="learner_123",
            topic="Python Programming",
            journey_id=journey_id
        )
        session_id = session_result['session_id']

        # Step 3: Begin with foundational concepts
        concepts = await learning_engine.get_learning_path(session_id, "Python Programming")
        assert len(concepts) > 0
        assert concepts[0]['title'] == "Python Basics"

        # Step 4: Learn first concept
        concept_result = await learning_engine.learn_concept(
            session_id,
            concept_id=concepts[0]['id'],
            learning_style="visual"
        )
        assert concept_result['success'] is True
        assert 'explanation' in concept_result['data']
        assert 'examples' in concept_result['data']

        # Step 5: Practice with exercises
        practice_result = await learning_engine.get_practice_exercises(
            session_id,
            concept_id=concepts[0]['id'],
            difficulty="beginner"
        )
        assert practice_result['success'] is True
        assert len(practice_result['data']['exercises']) > 0

        # Step 6: Submit exercise answers
        exercise_answers = [
            {"exercise_id": practice_result['data']['exercises'][0]['id'], "answer": "print('Hello')"}
        ]
        feedback_result = await learning_engine.submit_exercise_answers(
            session_id,
            exercise_answers
        )
        assert feedback_result['success'] is True
        assert 'feedback' in feedback_result['data']
        assert 'score' in feedback_result['data']

        # Step 7: Update progress
        progress_result = await learning_engine.update_learning_progress(
            session_id,
            concept_id=concepts[0]['id'],
            mastery_level=0.8,
            time_spent_minutes=30
        )
        assert progress_result['success'] is True

        # Step 8: Get personalized recommendations
        recommendations = await learning_engine.get_next_steps_recommendations(
            session_id
        )
        assert recommendations['success'] is True
        assert 'next_concepts' in recommendations['data']
        assert 'suggested_activities' in recommendations['data']

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_adaptive_learning_workflow(self):
        """Test adaptive learning that adjusts to user performance."""
        from src.core.learning_engine import LearningEngine
        from src.core.assessment_engine import AssessmentEngine

        learning_engine = LearningEngine()
        assessment_engine = AssessmentEngine()

        # Step 1: Create adaptive learning session
        session_result = await learning_engine.create_adaptive_session(
            user_id="adaptive_learner",
            topic="Data Structures",
            initial_difficulty="intermediate"
        )
        session_id = session_result['session_id']

        # Step 2: Initial assessment to determine starting point
        initial_assessment = await assessment_engine.create_assessment(
            session_id=session_id,
            assessment_type="placement",
            topic="Data Structures"
        )
        assert initial_assessment['success'] is True

        # Step 3: Simulate user taking assessment with varying performance
        questions = initial_assessment['data']['questions']
        answers = []
        for i, question in enumerate(questions):
            # Simulate varying performance (good on easy topics, struggling on hard ones)
            if question['difficulty'] in ['easy', 'beginner']:
                answers.append({
                    "question_id": question['id'],
                    "answer": "correct_answer",
                    "confidence": 0.9
                })
            else:
                answers.append({
                    "question_id": question['id'],
                    "answer": "incorrect_answer",
                    "confidence": 0.3
                })

        # Step 4: Submit assessment and get adaptive recommendations
        assessment_result = await assessment_engine.submit_assessment(
            session_id=session_id,
            assessment_id=initial_assessment['data']['assessment_id'],
            answers=answers
        )
        assert assessment_result['success'] is True

        # Step 5: Get adaptive learning path based on assessment
        adaptive_path = await learning_engine.get_adaptive_learning_path(
            session_id,
            assessment_result=assessment_result['data']
        )
        assert adaptive_path['success'] is True
        assert 'personalized_path' in adaptive_path['data']
        assert 'adjusted_difficulty' in adaptive_path['data']

        # Step 6: Learn first recommended concept
        first_concept = adaptive_path['data']['personalized_path'][0]
        learning_result = await learning_engine.learn_concept_adaptive(
            session_id,
            concept_id=first_concept['id'],
            current_performance=assessment_result['data']['performance_score']
        )
        assert learning_result['success'] is True

        # Step 7: Monitor learning and adapt difficulty in real-time
        interaction_result = await learning_engine.record_learning_interaction(
            session_id,
            concept_id=first_concept['id'],
            interaction_type="question",
            response_time_seconds=45,
            success=True
        )
        assert interaction_result['success'] is True

        # Step 8: Check if difficulty should be adjusted
        adaptation_result = await learning_engine.evaluate_difficulty_adjustment(
            session_id,
            recent_interactions=[interaction_result['data']]
        )
        assert adaptation_result['success'] is True
        assert 'difficulty_change' in adaptation_result['data']

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_knowledge_progression_workflow(self):
        """Test knowledge progression and dependency management."""
        from src.core.learning_engine import LearningEngine
        from src.data.knowledge_manager import KnowledgeManager

        learning_engine = LearningEngine()
        knowledge_manager = KnowledgeManager()

        # Step 1: Build knowledge graph for programming concepts
        concepts_data = [
            {
                "id": "variables",
                "title": "Variables and Data Types",
                "prerequisites": [],
                "difficulty": 1
            },
            {
                "id": "functions",
                "title": "Functions",
                "prerequisites": ["variables"],
                "difficulty": 2
            },
            {
                "id": "classes",
                "title": "Classes and Objects",
                "prerequisites": ["functions", "variables"],
                "difficulty": 3
            },
            {
                "id": "inheritance",
                "title": "Inheritance",
                "prerequisites": ["classes"],
                "difficulty": 4
            }
        ]

        for concept in concepts_data:
            await knowledge_manager.add_concept(concept)

        # Step 2: Create learning session
        session_result = await learning_engine.create_session(
            user_id="progression_learner",
            topic="Object-Oriented Programming"
        )
        session_id = session_result['session_id']

        # Step 3: Get optimal learning path based on dependencies
        learning_path = await learning_engine.get_dependency_aware_path(
            session_id,
            target_concept="inheritance"
        )
        assert learning_path['success'] is True
        path = learning_path['data']['path']
        assert len(path) == 4  # Should include all prerequisite concepts
        assert path[0]['id'] == "variables"  # Should start with basics

        # Step 4: Learn concepts in order, tracking mastery
        mastery_tracker = {}
        for concept_step in path:
            # Learn concept
            learn_result = await learning_engine.learn_concept(
                session_id,
                concept_id=concept_step['id']
            )
            assert learn_result['success'] is True

            # Practice and assess mastery
            practice_result = await learning_engine.practice_concept(
                session_id,
                concept_id=concept_step['id']
            )
            assert practice_result['success'] is True

            # Record mastery (simulate good performance)
            mastery_level = 0.85 if concept_step['difficulty'] <= 2 else 0.75
            mastery_tracker[concept_step['id']] = mastery_level

            await learning_engine.record_concept_mastery(
                session_id,
                concept_id=concept_step['id'],
                mastery_level=mastery_level
            )

        # Step 5: Verify progression readiness
        progression_check = await learning_engine.check_progression_readiness(
            session_id,
            target_concept="inheritance",
            current_mastery=mastery_tracker
        )
        assert progression_check['success'] is True
        assert progression_check['data']['ready_for_advanced_concepts'] is True

        # Step 6: Learn advanced concept now that prerequisites are mastered
        advanced_result = await learning_engine.learn_concept(
            session_id,
            concept_id="inheritance"
        )
        assert advanced_result['success'] is True
        assert 'advanced' in advanced_result['data']['content_tags']

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_personalized_learning_path_workflow(self):
        """Test personalized learning path creation and execution."""
        from src.core.learning_engine import LearningEngine
        from src.core.user_profile_manager import UserProfileManager

        learning_engine = LearningEngine()
        profile_manager = UserProfileManager()

        # Step 1: Create detailed user profile
        user_profile = {
            "user_id": "personalized_learner",
            "learning_goals": [
                {"goal": "Web Development", "priority": "high", "timeline": "3 months"},
                {"goal": "Machine Learning", "priority": "medium", "timeline": "6 months"}
            ],
            "learning_preferences": {
                "style": "visual",
                "pace": "moderate",
                "preferred_session_length": 45,
                "time_of_day": "evening"
            },
            "current_knowledge": {
                "HTML": "intermediate",
                "CSS": "intermediate",
                "JavaScript": "beginner",
                "Python": "intermediate"
            },
            "available_time": {
                "weekly_hours": 8,
                "session_frequency": "3 times per week"
            }
        }

        await profile_manager.create_profile(user_profile)

        # Step 2: Generate personalized learning path
        path_result = await learning_engine.generate_personalized_path(
            user_id="personalized_learner",
            primary_goal="Web Development",
            user_profile=user_profile
        )
        assert path_result['success'] is True
        learning_path = path_result['data']['personalized_path']

        # Step 3: Verify path personalization
        assert len(learning_path) > 0
        # Should start with current knowledge gaps
        assert any("JavaScript" in step['title'] for step in learning_path[:3])
        # Should consider user's learning style
        assert all('visual_materials' in step for step in learning_path)
        # Should match time constraints
        total_estimated_time = sum(step['estimated_minutes'] for step in learning_path)
        assert total_estimated_time <= 8 * 60  # 8 hours per week

        # Step 4: Execute personalized learning session
        session_result = await learning_engine.start_personalized_session(
            user_id="personalized_learner",
            learning_path=learning_path,
            session_preferences=user_profile['learning_preferences']
        )
        session_id = session_result['session_id']

        # Step 5: Learn first personalized concept
        first_step = learning_path[0]
        learning_result = await learning_engine.learn_concept_personalized(
            session_id,
            concept_id=first_step['id'],
            user_preferences=user_profile['learning_preferences']
        )
        assert learning_result['success'] is True
        assert 'visual_materials' in learning_result['data']
        assert 'estimated_time' in learning_result['data']

        # Step 6: Record feedback to refine personalization
        feedback_result = await learning_engine.record_learning_feedback(
            session_id,
            concept_id=first_step['id'],
            feedback={
                "content_difficulty": "just_right",
                "pace_appropriate": True,
                "visual_helpful": True,
                "session_engagement": 8.5
            }
        )
        assert feedback_result['success'] is True

        # Step 7: Get updated recommendations based on feedback
        updated_recommendations = await learning_engine.get_updated_recommendations(
            session_id,
            feedback_history=[feedback_result['data']]
        )
        assert updated_recommendations['success'] is True
        assert 'refined_path' in updated_recommendations['data']

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_collaborative_learning_workflow(self):
        """Test collaborative learning and peer interaction features."""
        from src.core.learning_engine import LearningEngine
        from src.core.collaboration_manager import CollaborationManager

        learning_engine = LearningEngine()
        collaboration_manager = CollaborationManager()

        # Step 1: Create study group
        group_result = await collaboration_manager.create_study_group(
            group_name="Python Beginners Study Group",
            topic="Python Programming",
            max_members=5,
            creator_id="learner_1"
        )
        assert group_result['success'] is True
        group_id = group_result['group_id']

        # Step 2: Add members to study group
        members = ["learner_2", "learner_3", "learner_4"]
        for member in members:
            join_result = await collaboration_manager.add_member_to_group(
                group_id=group_id,
                user_id=member
            )
            assert join_result['success'] is True

        # Step 3: Create collaborative learning session
        session_result = await learning_engine.create_collaborative_session(
            group_id=group_id,
            topic="Python Functions",
            facilitator_id="learner_1"
        )
        session_id = session_result['session_id']

        # Step 4: Start collaborative concept learning
        concept_result = await learning_engine.learn_concept_collaborative(
            session_id=session_id,
            concept_id="functions",
            group_id=group_id
        )
        assert concept_result['success'] is True
        assert 'group_discussion_prompts' in concept_result['data']
        assert 'collaborative_exercises' in concept_result['data']

        # Step 5: Members participate in discussion
        for member_id in ["learner_1", "learner_2", "learner_3"]:
            discussion_result = await collaboration_manager.add_discussion_contribution(
                session_id=session_id,
                user_id=member_id,
                content=f"I think functions are important because... (from {member_id})",
                contribution_type="insight"
            )
            assert discussion_result['success'] is True

        # Step 6: Collaborative problem solving
        problem_result = await learning_engine.start_collaborative_problem(
            session_id=session_id,
            problem_type="coding_challenge",
            problem_description="Create a function that calculates factorial"
        )
        assert problem_result['success'] is True

        # Step 7: Members contribute solutions
        solutions = []
        for i, member_id in enumerate(["learner_2", "learner_3", "learner_4"]):
            solution_result = await collaboration_manager.submit_solution(
                session_id=session_id,
                user_id=member_id,
                solution=f"def factorial(n): return n * factorial(n-1) if n > 1 else 1  # Solution {i+1}"
            )
            assert solution_result['success'] is True
            solutions.append(solution_result['data'])

        # Step 8: Peer review and feedback
        for i, solution in enumerate(solutions):
            reviewer_id = ["learner_1", "learner_2", "learner_3"][i]
            review_result = await collaboration_manager.add_peer_review(
                session_id=session_id,
                reviewer_id=reviewer_id,
                solution_id=solution['id'],
                review={
                    "correctness": 0.9,
                    "efficiency": 0.8,
                    "readability": 0.9,
                    "comments": "Good solution, but could be optimized"
                }
            )
            assert review_result['success'] is True

        # Step 9: Get collaborative learning analytics
        analytics_result = await collaboration_manager.get_group_learning_analytics(
            group_id=group_id
        )
        assert analytics_result['success'] is True
        assert 'participation_metrics' in analytics_result['data']
        assert 'learning_progress' in analytics_result['data']
        assert 'collaboration_quality' in analytics_result['data']

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_mastery_assessment_workflow(self):
        """Test comprehensive mastery assessment and certification."""
        from src.core.learning_engine import LearningEngine
        from src.core.assessment_engine import AssessmentEngine
        from src.core.certification_manager import CertificationManager

        learning_engine = LearningEngine()
        assessment_engine = AssessmentEngine()
        certification_manager = CertificationManager()

        # Step 1: Create learning journey for skill mastery
        journey_result = await learning_engine.start_mastery_journey(
            user_id="mastery_learner",
            skill="Python Programming",
            mastery_level="advanced",
            certification_goal=True
        )
        journey_id = journey_result['journey_id']

        # Step 2: Complete learning modules
        modules = [
            {"id": "python_basics", "title": "Python Basics", "required_mastery": 0.9},
            {"id": "advanced_concepts", "title": "Advanced Python", "required_mastery": 0.85},
            {"id": "project_work", "title": "Project Implementation", "required_mastery": 0.8}
        ]

        module_mastery = {}
        for module in modules:
            # Simulate completing module
            session_result = await learning_engine.create_session(
                user_id="mastery_learner",
                topic=module['title'],
                journey_id=journey_id
            )
            session_id = session_result['session_id']

            # Learn and practice
            await learning_engine.complete_module(session_id, module['id'])

            # Assess mastery
            assessment_result = await assessment_engine.create_module_assessment(
                session_id=session_id,
                module_id=module['id'],
                difficulty="intermediate"
            )

            # Submit assessment (simulate good performance)
            mastery_score = 0.88 + (module['required_mastery'] - 0.8)  # Just above threshold
            module_mastery[module['id']] = mastery_score

        # Step 3: Create comprehensive mastery assessment
        comprehensive_assessment = await assessment_engine.create_comprehensive_assessment(
            user_id="mastery_learner",
            skill="Python Programming",
            journey_id=journey_id,
            module_mastery=module_mastery
        )
        assert comprehensive_assessment['success'] is True

        # Step 4: Take comprehensive assessment
        assessment_data = comprehensive_assessment['data']
        assessment_answers = []
        for question in assessment_data['questions']:
            assessment_answers.append({
                "question_id": question['id'],
                "answer": "comprehensive_answer",
                "confidence": 0.9,
                "time_taken_seconds": 120
            })

        # Step 5: Submit comprehensive assessment
        final_result = await assessment_engine.submit_comprehensive_assessment(
            user_id="mastery_learner",
            assessment_id=assessment_data['assessment_id'],
            answers=assessment_answers
        )
        assert final_result['success'] is True
        assert final_result['data']['overall_score'] >= 0.85  # Should pass
        assert 'mastery_level_achieved' in final_result['data']

        # Step 6: Generate certification if mastery achieved
        if final_result['data']['overall_score'] >= 0.85:
            certification_result = await certification_manager.generate_certification(
                user_id="mastery_learner",
                skill="Python Programming",
                mastery_level=final_result['data']['mastery_level_achieved'],
                assessment_data=final_result['data']
            )
            assert certification_result['success'] is True
            assert 'certificate_id' in certification_result['data']
            assert 'verification_code' in certification_result['data']

        # Step 7: Create learning portfolio
        portfolio_result = await learning_engine.create_learning_portfolio(
            user_id="mastery_learner",
            journey_id=journey_id,
            include_assessments=True,
            include_projects=True
        )
        assert portfolio_result['success'] is True
        assert 'portfolio_url' in portfolio_result['data']
        assert 'achievements' in portfolio_result['data']

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_learning_analytics_workflow(self):
        """Test comprehensive learning analytics and insights."""
        from src.core.learning_engine import LearningEngine
        from src.core.analytics_engine import AnalyticsEngine

        learning_engine = LearningEngine()
        analytics_engine = AnalyticsEngine()

        # Step 1: Create multiple learning sessions with different patterns
        user_id = "analytics_learner"
        sessions = []

        # Session 1: Morning learning, high engagement
        session1 = await learning_engine.create_session(
            user_id=user_id,
            topic="Python Basics"
        )
        sessions.append(session1['session_id'])
        await learning_engine.simulate_learning_session(
            session1['session_id'],
            duration_minutes=45,
            engagement_score=9.2,
            concepts_mastered=2,
            time_of_day="morning"
        )

        # Session 2: Evening learning, moderate engagement
        session2 = await learning_engine.create_session(
            user_id=user_id,
            topic="Python Functions"
        )
        sessions.append(session2['session_id'])
        await learning_engine.simulate_learning_session(
            session2['session_id'],
            duration_minutes=30,
            engagement_score=7.5,
            concepts_mastered=1,
            time_of_day="evening"
        )

        # Session 3: Weekend learning, extended session
        session3 = await learning_engine.create_session(
            user_id=user_id,
            topic="Python Classes"
        )
        sessions.append(session3['session_id'])
        await learning_engine.simulate_learning_session(
            session3['session_id'],
            duration_minutes=90,
            engagement_score=8.8,
            concepts_mastered=3,
            time_of_day="weekend"
        )

        # Step 2: Generate comprehensive learning analytics
        analytics_result = await analytics_engine.generate_comprehensive_analytics(
            user_id=user_id,
            session_ids=sessions,
            time_period="last_30_days"
        )
        assert analytics_result['success'] is True
        analytics = analytics_result['data']

        # Verify analytics components
        assert 'learning_patterns' in analytics
        assert 'performance_trends' in analytics
        assert 'engagement_metrics' in analytics
        assert 'optimal_learning_times' in analytics
        assert 'knowledge_gaps' in analytics

        # Step 3: Get personalized insights
        insights_result = await analytics_engine.generate_personalized_insights(
            user_id=user_id,
            analytics_data=analytics
        )
        assert insights_result['success'] is True
        insights = insights_result['data']

        assert 'strengths' in insights
        assert 'improvement_areas' in insights
        assert 'recommendations' in insights
        assert 'optimal_study_schedule' in insights

        # Step 4: Predict learning outcomes
        prediction_result = await analytics_engine.predict_learning_outcomes(
            user_id=user_id,
            current_progress=analytics['learning_patterns'],
            goal="Master Python Programming in 3 months"
        )
        assert prediction_result['success'] is True
        predictions = prediction_result['data']

        assert 'achievement_probability' in predictions
        assert 'estimated_completion_time' in predictions
        assert 'risk_factors' in predictions
        assert 'success_factors' in predictions

        # Step 5: Generate learning effectiveness report
        effectiveness_result = await analytics_engine.generate_effectiveness_report(
            user_id=user_id,
            sessions_data=sessions,
            learning_methods=["visual", "interactive", "project-based"]
        )
        assert effectiveness_result['success'] is True
        effectiveness = effectiveness_result['data']

        assert 'method_effectiveness' in effectiveness
        assert 'learning_velocity' in effectiveness
        assert 'retention_rate' in effectiveness
        assert 'skill_progression' in effectiveness

    @pytest.mark.integration
    @pytest.mark.learning
    async def test_multi_modal_learning_workflow(self):
        """Test multi-modal learning with different content types."""
        from src.core.learning_engine import LearningEngine
        from src.core.content_manager import ContentManager

        learning_engine = LearningEngine()
        content_manager = ContentManager()

        # Step 1: Create multi-modal learning session
        session_result = await learning_engine.create_multi_modal_session(
            user_id="multimodal_learner",
            topic="Web Development",
            preferred_modes=["visual", "interactive", "textual"]
        )
        session_id = session_result['session_id']

        # Step 2: Learn concept using multiple modalities
        concept_id = "html_basics"

        # Visual learning
        visual_content = await content_manager.get_visual_content(
            concept_id=concept_id,
            content_type="infographic"
        )
        assert visual_content['success'] is True

        visual_result = await learning_engine.learn_concept_with_modality(
            session_id=session_id,
            concept_id=concept_id,
            modality="visual",
            content=visual_content['data']
        )
        assert visual_result['success'] is True

        # Interactive learning
        interactive_content = await content_manager.get_interactive_content(
            concept_id=concept_id,
            content_type="coding_tutorial"
        )
        assert interactive_content['success'] is True

        interactive_result = await learning_engine.learn_concept_with_modality(
            session_id=session_id,
            concept_id=concept_id,
            modality="interactive",
            content=interactive_content['data']
        )
        assert interactive_result['success'] is True

        # Textual learning
        textual_content = await content_manager.get_textual_content(
            concept_id=concept_id,
            content_type="comprehensive_guide"
        )
        assert textual_content['success'] is True

        textual_result = await learning_engine.learn_concept_with_modality(
            session_id=session_id,
            concept_id=concept_id,
            modality="textual",
            content=textual_content['data']
        )
        assert textual_result['success'] is True

        # Step 3: Assess learning effectiveness across modalities
        assessment_result = await learning_engine.assess_multimodal_learning(
            session_id=session_id,
            concept_id=concept_id
        )
        assert assessment_result['success'] is True
        assessment = assessment_result['data']

        assert 'modality_effectiveness' in assessment
        assert 'retention_by_modality' in assessment
        assert 'preferred_modalities' in assessment
        assert 'comprehension_score' in assessment

        # Step 4: Get personalized modality recommendations
        recommendations_result = await learning_engine.get_modality_recommendations(
            user_id="multimodal_learner",
            learning_style=assessment['preferred_modalities'],
            effectiveness_data=assessment['modality_effectiveness']
        )
        assert recommendations_result['success'] is True
        recommendations = recommendations_result['data']

        assert 'recommended_modalities' in recommendations
        assert 'modality_sequence' in recommendations
        assert 'content_type_preferences' in recommendations

        # Step 5: Create adaptive multi-modal learning path
        adaptive_path = await learning_engine.create_adaptive_multimodal_path(
            session_id=session_id,
            topic_sequence=["html_basics", "css_styling", "javascript_fundamentals"],
            modality_preferences=recommendations['recommended_modalities']
        )
        assert adaptive_path['success'] is True
        path = adaptive_path['data']['adaptive_path']

        # Verify path incorporates multiple modalities
        for step in path:
            assert 'modalities' in step
            assert len(step['modalities']) >= 2  # Should use multiple modalities