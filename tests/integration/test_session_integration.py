"""
Integration tests for Session Management Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of session management based on real-world usage patterns from docs/examples/advanced.md.
Tests cover session lifecycle, persistence, resumption, and state management.
"""

import pytest
import asyncio
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from tests.test_helpers import (
    assert_valid_session_structure,
    measure_async_performance,
    assert_async_performance_under,
    generate_mock_session
)


class TestSessionIntegration:
    """Integration tests for session management functionality."""

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_lifecycle_workflow(self):
        """Test complete session lifecycle from creation to termination."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()

        # Step 1: Create new session
        session_result = await session_manager.create_session(
            user_id="test_user",
            topic="python programming",
            preferences={
                "difficulty": "intermediate",
                "pace": "moderate"
            }
        )
        assert session_result['success'] is True
        session_id = session_result['session_id']

        # Step 2: Activate session
        activate_result = await session_manager.activate_session(session_id)
        assert activate_result['success'] is True
        assert activate_result['session']['is_active'] is True

        # Step 3: Update session state
        await session_manager.update_session_progress(
            session_id,
            current_concept="python functions",
            progress=0.3,
            interaction_count=5
        )

        # Step 4: Pause session
        pause_result = await session_manager.pause_session(session_id)
        assert pause_result['success'] is True
        assert pause_result['session']['is_active'] is False

        # Step 5: Resume session
        resume_result = await session_manager.resume_session(session_id)
        assert resume_result['success'] is True
        assert resume_result['session']['is_active'] is True

        # Step 6: Terminate session
        terminate_result = await session_manager.terminate_session(session_id)
        assert terminate_result['success'] is True
        assert terminate_result['session']['status'] == 'terminated'

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_persistence_workflow(self):
        """Test session persistence and recovery."""
        from src.core.session_manager import SessionManager
        from src.data.database_manager import DatabaseManager

        session_manager = SessionManager()
        db_manager = DatabaseManager()

        # Step 1: Create and configure session
        session_result = await session_manager.create_session(
            user_id="test_user",
            topic="machine learning basics"
        )
        session_id = session_result['session_id']

        # Step 2: Add session data
        await session_manager.add_learning_material(
            session_id,
            concept="linear regression",
            content="Linear regression is a fundamental ML algorithm...",
            difficulty=3
        )

        await session_manager.record_interaction(
            session_id,
            interaction_type="question",
            content="What is the difference between linear and logistic regression?",
            response="Linear regression predicts continuous values..."
        )

        # Step 3: Save session to database
        save_result = await session_manager.save_session(session_id)
        assert save_result['success'] is True

        # Step 4: Verify database storage
        stored_session = await db_manager.get_session(session_id)
        assert stored_session is not None
        assert stored_session['user_id'] == "test_user"
        assert stored_session['topic'] == "machine learning basics"

        # Step 5: Create new session manager instance
        new_session_manager = SessionManager()

        # Step 6: Load session from database
        load_result = await new_session_manager.load_session(session_id)
        assert load_result['success'] is True
        assert load_result['session']['session_id'] == session_id
        assert len(load_result['session']['learning_materials']) > 0

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_checkpoint_workflow(self):
        """Test checkpoint creation and restoration within sessions."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()

        # Step 1: Create session
        session_result = await session_manager.create_session(
            user_id="test_user",
            topic="web development"
        )
        session_id = session_result['session_id']

        # Step 2: Progress through learning
        checkpoints = []
        learning_concepts = ["HTML basics", "CSS styling", "JavaScript fundamentals"]

        for i, concept in enumerate(learning_concepts):
            await session_manager.update_session_progress(
                session_id,
                current_concept=concept,
                progress=(i + 1) / len(learning_concepts),
                interaction_count=5
            )

            # Create checkpoint
            checkpoint_result = await session_manager.create_checkpoint(
                session_id,
                name=f"checkpoint_{i+1}",
                description=f"Completed {concept}"
            )
            assert checkpoint_result['success'] is True
            checkpoints.append(checkpoint_result['checkpoint_id'])

        # Step 3: Restore to earlier checkpoint
        restore_result = await session_manager.restore_checkpoint(
            session_id,
            checkpoints[1]  # Restore to second checkpoint
        )
        assert restore_result['success'] is True
        assert restore_result['checkpoint']['name'] == "checkpoint_2"
        assert restore_result['checkpoint']['description'] == "Completed CSS styling"

        # Step 4: List all checkpoints
        list_result = await session_manager.list_checkpoints(session_id)
        assert list_result['success'] is True
        assert len(list_result['checkpoints']) == 3

    @pytest.mark.integration
    @pytest.mark.session
    async def test_multi_session_management(self):
        """Test managing multiple concurrent sessions."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()
        user_id = "test_user"

        # Step 1: Create multiple sessions
        session_topics = ["python programming", "data science", "web development"]
        session_ids = []

        for topic in session_topics:
            session_result = await session_manager.create_session(
                user_id=user_id,
                topic=topic
            )
            session_ids.append(session_result['session_id'])

        # Step 2: List all user sessions
        list_result = await session_manager.list_user_sessions(user_id)
        assert list_result['success'] is True
        assert len(list_result['sessions']) == 3

        # Step 3: Activate different sessions
        for i, session_id in enumerate(session_ids):
            activate_result = await session_manager.activate_session(session_id)
            assert activate_result['success'] is True

            # Verify only one session is active at a time
            active_sessions = await session_manager.get_active_sessions(user_id)
            assert len(active_sessions) == 1
            assert active_sessions[0]['session_id'] == session_id

        # Step 4: Get session summary
        summary_result = await session_manager.get_user_session_summary(user_id)
        assert summary_result['success'] is True
        assert summary_result['summary']['total_sessions'] == 3
        assert summary_result['summary']['active_sessions'] == 1

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_collaboration_workflow(self):
        """Test session sharing and collaboration features."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()
        owner_id = "owner_user"
        collaborator_id = "collaborator_user"

        # Step 1: Create session
        session_result = await session_manager.create_session(
            user_id=owner_id,
            topic="team project planning",
            collaboration_enabled=True
        )
        session_id = session_result['session_id']

        # Step 2: Add some content
        await session_manager.add_learning_material(
            session_id,
            concept="project requirements",
            content="Key requirements for our project..."
        )

        # Step 3: Generate share link
        share_result = await session_manager.generate_share_link(
            session_id,
            permissions=["view", "comment"],
            expires_in_hours=24
        )
        assert share_result['success'] is True
        share_link = share_result['share_link']

        # Step 4: Join session via share link
        join_result = await session_manager.join_session_via_link(
            share_link,
            collaborator_id
        )
        assert join_result['success'] is True

        # Step 5: Collaborator adds comment
        comment_result = await session_manager.add_comment(
            session_id,
            user_id=collaborator_id,
            content="This looks good, but we should consider timeline constraints."
        )
        assert comment_result['success'] is True

        # Step 6: Owner views collaboration activity
        activity_result = await session_manager.get_collaboration_activity(session_id)
        assert activity_result['success'] is True
        assert len(activity_result['activity']) > 0
        assert any('comment' in activity['type'].lower() for activity in activity_result['activity'])

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_analytics_workflow(self):
        """Test session analytics and progress tracking."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()
        user_id = "analytics_user"

        # Step 1: Create session
        session_result = await session_manager.create_session(
            user_id=user_id,
            topic="advanced mathematics"
        )
        session_id = session_result['session_id']

        # Step 2: Simulate learning activity
        learning_activities = [
            {"concept": "calculus basics", "duration": 300, "interactions": 8},
            {"concept": "linear algebra", "duration": 450, "interactions": 12},
            {"concept": "probability theory", "duration": 380, "interactions": 10}
        ]

        for activity in learning_activities:
            await session_manager.record_learning_activity(
                session_id,
                concept=activity["concept"],
                duration_seconds=activity["duration"],
                interaction_count=activity["interactions"],
                completion_rate=0.8
            )

            await session_manager.update_session_progress(
                session_id,
                current_concept=activity["concept"],
                progress=0.6,
                interaction_count=activity["interactions"]
            )

        # Step 3: Get session analytics
        analytics_result = await session_manager.get_session_analytics(session_id)
        assert analytics_result['success'] is True

        analytics = analytics_result['analytics']
        assert 'total_time_spent' in analytics
        assert 'total_interactions' in analytics
        assert 'concepts_covered' in analytics
        assert analytics['total_time_spent'] > 0
        assert analytics['total_interactions'] > 0
        assert len(analytics['concepts_covered']) == 3

        # Step 4: Get progress trend
        trend_result = await session_manager.get_progress_trend(session_id)
        assert trend_result['success'] is True
        assert 'trend_data' in trend_result['data']
        assert len(trend_result['data']['trend_data']) > 0

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_context_management(self):
        """Test session context and memory management."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()

        # Step 1: Create session
        session_result = await session_manager.create_session(
            user_id="context_user",
            topic="software engineering",
            context_limit=4000  # tokens
        )
        session_id = session_result['session_id']

        # Step 2: Add context items
        context_items = [
            {"type": "concept", "content": "Software design patterns are reusable solutions..."},
            {"type": "example", "content": "Here's an example of the Singleton pattern..."},
            {"type": "question", "content": "What's the difference between Factory and Abstract Factory?"},
            {"type": "answer", "content": "Factory pattern creates objects without specifying..."}
        ]

        for item in context_items:
            await session_manager.add_context_item(session_id, item)

        # Step 3: Check context size
        context_result = await session_manager.get_session_context(session_id)
        assert context_result['success'] is True
        assert 'context_items' in context_result['data']
        assert len(context_result['data']['context_items']) == 4
        assert 'total_tokens' in context_result['data']

        # Step 4: Trigger context compression
        compress_result = await session_manager.compress_context(session_id)
        assert compress_result['success'] is True
        assert 'compression_ratio' in compress_result['data']

        # Step 5: Verify compressed context
        compressed_context = await session_manager.get_session_context(session_id)
        assert compressed_context['success'] is True
        assert compressed_context['data']['total_tokens'] < context_result['data']['total_tokens']

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_personalization_workflow(self):
        """Test session personalization and adaptation."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()

        # Step 1: Create session with user preferences
        session_result = await session_manager.create_session(
            user_id="personalized_user",
            topic="data science",
            preferences={
                "learning_style": "visual",
                "difficulty_preference": "gradual",
                "session_duration": 45,  # minutes
                "preferred_response_length": "concise"
            }
        )
        session_id = session_result['session_id']

        # Step 2: Simulate learning patterns
        learning_patterns = [
            {"concept": "data preprocessing", "time_spent": 600, "questions_asked": 3},
            {"concept": "feature engineering", "time_spent": 480, "questions_asked": 7},
            {"concept": "model selection", "time_spent": 720, "questions_asked": 5}
        ]

        for pattern in learning_patterns:
            await session_manager.record_learning_pattern(
                session_id,
                concept=pattern["concept"],
                time_spent_seconds=pattern["time_spent"],
                questions_asked=pattern["questions_asked"],
                success_rate=0.8
            )

        # Step 3: Get personalization recommendations
        recommendations_result = await session_manager.get_personalization_recommendations(
            session_id
        )
        assert recommendations_result['success'] is True
        recommendations = recommendations_result['recommendations']

        assert 'difficulty_adjustment' in recommendations
        assert 'content_suggestions' in recommendations
        assert 'learning_path_modifications' in recommendations

        # Step 4: Apply personalization
        apply_result = await session_manager.apply_personalization(
            session_id,
            recommendations
        )
        assert apply_result['success'] is True

        # Step 5: Verify adapted session
        adapted_session = await session_manager.get_session(session_id)
        assert adapted_session['success'] is True
        assert 'personalization_applied' in adapted_session['session']

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_error_recovery_workflow(self):
        """Test session error handling and recovery."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()

        # Step 1: Create session
        session_result = await session_manager.create_session(
            user_id="recovery_user",
            topic="error handling testing"
        )
        session_id = session_result['session_id']

        # Step 2: Add session data
        await session_manager.add_learning_material(
            session_id,
            concept="exception handling",
            content="Python provides robust exception handling mechanisms..."
        )

        # Step 3: Simulate session corruption
        with patch.object(session_manager, '_validate_session_integrity') as mock_validate:
            mock_validate.return_value = False

            # Detect corruption
            integrity_result = await session_manager.check_session_integrity(session_id)
            assert integrity_result['success'] is False
            assert 'corruption_detected' in integrity_result['error']['code']

        # Step 4: Attempt recovery
        recovery_result = await session_manager.recover_session(session_id)
        assert recovery_result['success'] is True
        assert 'recovered_from_backup' in recovery_result['data']

        # Step 5: Verify recovered session
        recovered_session = await session_manager.get_session(session_id)
        assert recovered_session['success'] is True
        assert recovered_session['session']['status'] == 'active'

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_performance_workflow(self):
        """Test session performance under load."""
        from src.core.session_manager import SessionManager

        session_manager = SessionManager()

        # Step 1: Create multiple sessions
        session_count = 10
        session_ids = []

        async with measure_async_performance() as perf:
            for i in range(session_count):
                session_result = await session_manager.create_session(
                    user_id=f"perf_user_{i}",
                    topic=f"test_topic_{i}"
                )
                session_ids.append(session_result['session_id'])

        # Verify performance under load
        assert perf.execution_time < 5.0  # Should complete within 5 seconds

        # Step 2: Concurrent session operations
        async def simulate_session_activity(session_id):
            await session_manager.activate_session(session_id)
            await session_manager.update_session_progress(
                session_id,
                current_concept="test concept",
                progress=0.5,
                interaction_count=3
            )
            return session_id

        async with measure_async_performance() as perf:
            tasks = [simulate_session_activity(sid) for sid in session_ids]
            results = await asyncio.gather(*tasks)

        # Verify concurrent performance
        assert perf.execution_time < 3.0  # Should complete within 3 seconds
        assert len(results) == session_count

    @pytest.mark.integration
    @pytest.mark.session
    async def test_session_integration_with_other_components(self):
        """Test session integration with other system components."""
        from src.core.session_manager import SessionManager
        from src.ai.service import AIService
        from src.data.knowledge_manager import KnowledgeManager

        session_manager = SessionManager()
        ai_service = AIService()
        knowledge_manager = KnowledgeManager()

        # Step 1: Create session
        session_result = await session_manager.create_session(
            user_id="integration_user",
            topic="system integration"
        )
        session_id = session_result['session_id']

        # Step 2: Integrate with AI service
        ai_result = await ai_service.generate_response(
            "Explain system integration patterns",
            session_context=session_manager.get_session_context_summary(session_id)
        )
        assert ai_result['success'] is True

        # Step 3: Store AI interaction in session
        await session_manager.record_ai_interaction(
            session_id,
            prompt="Explain system integration patterns",
            response=ai_result['response'],
            tokens_used=ai_result['usage']['total_tokens']
        )

        # Step 4: Integrate with knowledge manager
        knowledge_result = await knowledge_manager.get_related_concepts(
            "system integration",
            max_depth=2
        )
        assert knowledge_result['success'] is True

        # Step 5: Store knowledge map in session
        await session_manager.update_knowledge_map(
            session_id,
            knowledge_result['concepts']
        )

        # Step 6: Get integrated session data
        integrated_session = await session_manager.get_integrated_session_data(session_id)
        assert integrated_session['success'] is True
        assert 'ai_interactions' in integrated_session['data']
        assert 'knowledge_map' in integrated_session['data']
        assert len(integrated_session['data']['ai_interactions']) > 0
        assert len(integrated_session['data']['knowledge_map']) > 0