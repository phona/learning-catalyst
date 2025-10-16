"""
TDD tests for Session data model.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Session entity before implementation. Tests cover session lifecycle, state management,
and interaction tracking based on the API documentation.
"""

import pytest
from datetime import datetime, timedelta
from typing import Dict, Any, List
from tests.test_helpers import (
    assert_valid_uuid,
    assert_valid_session_structure,
    assert_datetime_within_range,
    generate_mock_session,
    generate_mock_concept,
    assert_raises_specific_error
)


class TestSessionModel:
    """Test cases for Session data model following TDD principles."""

    @pytest.mark.unit
    def test_session_creation_with_valid_data(self, sample_session_data):
        """Test that session can be created with valid data (TDD: Red phase)."""
        # This test will initially fail until Session model is implemented
        from src.data.models.session import Session

        session = Session(**sample_session_data)

        # Validate session structure
        assert_valid_session_structure(session.to_dict())
        assert session.id == sample_session_data["id"]
        assert session.is_active == sample_session_data["is_active"]

    @pytest.mark.unit
    def test_session_validation_required_fields(self):
        """Test that session validation enforces required fields."""
        from src.data.models.session import Session

        # Test missing required fields
        with pytest.raises(ValueError, match="Missing required field: id"):
            Session(started_at=datetime.now().isoformat())

        with pytest.raises(ValueError, match="Missing required field: started_at"):
            Session(id="test")

        with pytest.raises(ValueError, match="Missing required field: last_activity"):
            Session(id="test", started_at=datetime.now().isoformat())

    @pytest.mark.unit
    def test_session_datetime_validation(self):
        """Test that session datetime fields are properly validated."""
        from src.data.models.session import Session

        now = datetime.now()
        future_time = now + timedelta(hours=1)

        # Test valid datetime format
        session = Session(
            id="test",
            started_at=now.isoformat(),
            last_activity=now.isoformat(),
            is_active=True
        )
        assert session.started_at == now.isoformat()

        # Test invalid datetime format
        with pytest.raises(ValueError, match="Invalid datetime format"):
            Session(
                id="test",
                started_at="invalid-date",
                last_activity=now.isoformat(),
                is_active=True
            )

        # Test last_activity before started_at
        with pytest.raises(ValueError, match="last_activity must be after started_at"):
            Session(
                id="test",
                started_at=future_time.isoformat(),
                last_activity=now.isoformat(),
                is_active=True
            )

    @pytest.mark.unit
    def test_session_activity_tracking(self):
        """Test that session can track user activities."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # Add interaction
        interaction = {
            "id": "interaction_001",
            "timestamp": datetime.now().isoformat(),
            "type": "question",
            "content": "What is Python?",
            "response": "Python is a programming language..."
        }

        session.add_interaction(interaction)
        assert len(session.interactions) == 1
        assert session.interactions[0]["id"] == "interaction_001"

    @pytest.mark.unit
    def test_session_auto_update_last_activity(self):
        """Test that session automatically updates last_activity on interaction."""
        from src.data.models.session import Session

        start_time = datetime.now()
        session = Session(
            id="test",
            started_at=start_time.isoformat(),
            last_activity=start_time.isoformat(),
            is_active=True
        )

        # Wait a bit and add interaction
        import time
        time.sleep(0.01)

        interaction = {
            "id": "interaction_001",
            "timestamp": datetime.now().isoformat(),
            "type": "question",
            "content": "Test question"
        }

        session.add_interaction(interaction)

        # last_activity should be updated
        assert session.last_activity > session.started_at

    @pytest.mark.unit
    def test_session_checkpoint_creation(self):
        """Test that session can create and restore checkpoints."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True,
            session_data={
                "current_concept": "con_python_basics",
                "progress": 0.65,
                "interactions_count": 10
            }
        )

        # Create checkpoint
        checkpoint_name = "test_checkpoint"
        checkpoint = session.create_checkpoint(checkpoint_name)

        assert checkpoint["name"] == checkpoint_name
        assert checkpoint["session_id"] == session.id
        assert "timestamp" in checkpoint
        assert "session_data" in checkpoint
        assert checkpoint["session_data"]["current_concept"] == "con_python_basics"

    @pytest.mark.unit
    def test_session_checkpoint_restoration(self):
        """Test that session can restore from checkpoint."""
        from src.data.models.session import Session

        # Create original session
        original_session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True,
            session_data={
                "current_concept": "con_python_basics",
                "progress": 0.65
            }
        )

        # Create checkpoint
        checkpoint = original_session.create_checkpoint("test_checkpoint")

        # Create new session and restore from checkpoint
        new_session = Session.restore_from_checkpoint(checkpoint)

        assert new_session.id == original_session.id
        assert new_session.session_data["current_concept"] == "con_python_basics"
        assert new_session.session_data["progress"] == 0.65

    @pytest.mark.unit
    def test_session_duration_calculation(self):
        """Test that session can calculate duration."""
        from src.data.models.session import Session

        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=45)

        session = Session(
            id="test",
            started_at=start_time.isoformat(),
            last_activity=end_time.isoformat(),
            is_active=False
        )

        duration = session.get_duration()
        assert duration.total_seconds() == 45 * 60  # 45 minutes in seconds

    @pytest.mark.unit
    def test_session_interaction_statistics(self):
        """Test that session can calculate interaction statistics."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # Add multiple interactions
        interactions = [
            {"id": "1", "type": "question", "timestamp": datetime.now().isoformat()},
            {"id": "2", "type": "explanation", "timestamp": datetime.now().isoformat()},
            {"id": "3", "type": "assessment", "timestamp": datetime.now().isoformat()},
        ]

        for interaction in interactions:
            session.add_interaction(interaction)

        stats = session.get_interaction_statistics()
        assert stats["total_interactions"] == 3
        assert stats["question_count"] == 1
        assert stats["explanation_count"] == 1
        assert stats["assessment_count"] == 1

    @pytest.mark.unit
    def test_session_concept_progress_tracking(self):
        """Test that session can track concept progress."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # Update concept progress
        concept_id = "con_python_basics"
        session.update_concept_progress(concept_id, 0.3)
        assert session.get_concept_progress(concept_id) == 0.3

        # Update progress further
        session.update_concept_progress(concept_id, 0.7)
        assert session.get_concept_progress(concept_id) == 0.7

    @pytest.mark.unit
    def test_session_active_state_management(self):
        """Test that session active state can be managed."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # End session
        session.end_session()
        assert not session.is_active

        # Should not be able to add interactions to ended session
        with pytest.raises(ValueError, match="Cannot add interaction to inactive session"):
            session.add_interaction({
                "id": "interaction_001",
                "type": "question",
                "timestamp": datetime.now().isoformat()
            })

    @pytest.mark.unit
    def test_session_timeout_detection(self):
        """Test that session can detect timeout based on inactivity."""
        from src.data.models.session import Session

        # Create session with old activity
        old_time = datetime.now() - timedelta(hours=3)
        session = Session(
            id="test",
            started_at=old_time.isoformat(),
            last_activity=old_time.isoformat(),
            is_active=True,
            session_data={"timeout_minutes": 120}  # 2 hours
        )

        # Should detect timeout
        assert session.is_timed_out()

        # Create session with recent activity
        recent_time = datetime.now() - timedelta(minutes=30)
        active_session = Session(
            id="active",
            started_at=recent_time.isoformat(),
            last_activity=recent_time.isoformat(),
            is_active=True,
            session_data={"timeout_minutes": 120}
        )

        assert not active_session.is_timed_out()

    @pytest.mark.unit
    def test_session_context_management(self):
        """Test that session can manage learning context."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # Set context
        context = {
            "current_concept": "con_python_functions",
            "learning_objectives": ["Understand function syntax", "Create custom functions"],
            "difficulty_level": "intermediate",
            "preferred_style": "visual"
        }

        session.set_context(context)
        assert session.get_context() == context

        # Update context
        updated_context = context.copy()
        updated_context["current_concept"] = "con_python_classes"
        session.update_context({"current_concept": "con_python_classes"})

        final_context = session.get_context()
        assert final_context["current_concept"] == "con_python_classes"
        assert final_context["learning_objectives"] == context["learning_objectives"]

    @pytest.mark.unit
    def test_session_error_recovery(self):
        """Test that session can handle errors gracefully."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # Add error to session
        error_info = {
            "timestamp": datetime.now().isoformat(),
            "error_type": "ProviderError",
            "error_message": "Failed to connect to AI provider",
            "context": "During explanation request"
        }

        session.add_error(error_info)
        assert len(session.errors) == 1
        assert session.errors[0]["error_type"] == "ProviderError"

    @pytest.mark.unit
    def test_session_serialization(self, sample_session_data):
        """Test that session can be serialized and deserialized."""
        from src.data.models.session import Session
        import json

        session = Session(**sample_session_data)

        # Test dictionary serialization
        session_dict = session.to_dict()
        assert_valid_session_structure(session_dict)

        # Test JSON serialization
        json_str = session.to_json()
        parsed_session = json.loads(json_str)
        assert_valid_session_structure(parsed_session)

        # Test deserialization
        restored_session = Session.from_dict(session_dict)
        assert restored_session.id == session.id
        assert restored_session.is_active == session.is_active

    @pytest.mark.unit
    def test_session_memory_usage_optimization(self):
        """Test that session can optimize memory usage for long sessions."""
        from src.data.models.session import Session

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        # Add many interactions
        for i in range(100):
            session.add_interaction({
                "id": f"interaction_{i}",
                "type": "question",
                "timestamp": datetime.now().isoformat(),
                "content": f"Question {i}"
            })

        # Should be able to optimize memory
        original_size = len(session.interactions)
        session.optimize_memory()
        optimized_size = len(session.interactions)

        # Should still have interactions, but potentially compressed
        assert optimized_size <= original_size
        assert optimized_size > 0

    @pytest.mark.unit
    def test_session_concurrent_access_handling(self):
        """Test that session can handle concurrent access scenarios."""
        from src.data.models.session import Session
        import threading
        import time

        session = Session(
            id="test",
            started_at=datetime.now().isoformat(),
            last_activity=datetime.now().isoformat(),
            is_active=True
        )

        def add_interactions(thread_id):
            for i in range(10):
                session.add_interaction({
                    "id": f"interaction_{thread_id}_{i}",
                    "type": "question",
                    "timestamp": datetime.now().isoformat()
                })
                time.sleep(0.001)

        # Create multiple threads adding interactions
        threads = []
        for i in range(3):
            thread = threading.Thread(target=add_interactions, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Should have all interactions
        assert len(session.interactions) == 30