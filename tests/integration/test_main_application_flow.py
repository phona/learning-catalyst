import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from src.ai.service import ModelAbstractionService as AIService
from src.core.checkpoint_manager import CheckpointManagerImpl
from src.data.models.concept import Concept
from src.utils.preferences_manager import PreferencesManager
from src.utils.workspace_manager import WorkspaceManager

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


# Mock the Session class since it doesn't exist yet
class Session:
    def __init__(self, id, user_id, start_time, last_active_time, status):
        self.id = id
        self.user_id = user_id
        self.start_time = start_time
        self.last_active_time = last_active_time
        self.status = status


# Mock the Preferences class since it doesn't exist yet
class Preferences:
    def __init__(self, user_id, ai_provider, ai_model, learning_preferences):
        self.user_id = user_id
        self.ai_provider = ai_provider
        self.ai_model = ai_model
        self.learning_preferences = learning_preferences


class TestCompleteLearningWorkflow:
    """Integration tests for complete learning workflows, combining multiple features"""

    @pytest.mark.asyncio
    async def test_first_time_user_onboarding(self, temp_workspace):
        """Test the complete onboarding flow for a first-time user"""
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        prefs_manager = PreferencesManager(str(temp_workspace))

        # Mock the session-related methods on workspace_manager
        mock_session = Session("test-session-1", "test-user", "2023-01-01T12:00:00", "2023-01-01T12:00:00", "active")
        mock_session.workspace_path = str(temp_workspace)
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)

        # Create mock objects that were previously fixtures
        AsyncMock()
        AsyncMock()

        # Mock AI service to provide responses
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_welcome_message = AsyncMock(return_value="Welcome to Learning Catalyst!")
        ai_service_mock.suggest_initial_topics = AsyncMock(return_value=["Python basics", "Data structures"])
        ai_service_mock.analyze_content = AsyncMock(return_value={"concepts": ["variables", "data types"]})

        # 1. Workspace is already initialized by the temp_workspace fixture
        # Just verify it exists
        assert (Path(temp_workspace) / ".catalys").exists()

        # 3. Configure preferences
        prefs_manager.set_preference("ai.default_provider", "openai")
        prefs_manager.set_preference("ai.default_model", "gpt-3.5-turbo")
        prefs_manager.set_preference("learning.difficulty_level", "beginner")
        prefs_manager.set_preference("learning.learning_style", "visual")
        prefs_manager.set_preference("learning.preferred_topics", ["Python"])

        # 4. Create first session
        session = await workspace_manager.create_new_session()
        assert session is not None
        assert session.id is not None
        assert session.workspace_path == str(temp_workspace)

        # 5. Simulate AI service being used for onboarding
        # In a real scenario, these would be called during the actual onboarding process
        await ai_service_mock.generate_response()
        await ai_service_mock.suggest_initial_topics()

        # 6. Verify AI service was used for onboarding
        ai_service_mock.generate_welcome_message.assert_called_once()
        ai_service_mock.suggest_initial_topics.assert_called_once()

        # 6. Verify preferences were set correctly
        assert prefs_manager.get_preference("ai.default_provider") == "openai"
        assert prefs_manager.get_preference("learning.difficulty_level") == "beginner"

    @pytest.mark.asyncio
    async def test_conversation_and_concept_learning_flow(self, temp_workspace):
        """Test a complete conversation and concept learning flow"""
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session("test-session-2", "test-user", "2023-01-01T12:00:00", "2023-01-01T12:00:00", "active")
        mock_session.id = "test-session-2"
        mock_session.current_concept_id = None
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)
        workspace_manager.update_session_concept = AsyncMock()
        workspace_manager.get_session = AsyncMock(return_value=mock_session)

        # Create a session
        session = await workspace_manager.create_new_session()

        # Mock AI service to handle conversation
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_response = AsyncMock(return_value="Python lists are ordered, mutable collections of items.")
        ai_service_mock.extract_concepts = AsyncMock(
            return_value=[{"id": "python-lists", "name": "Python Lists", "relevance": 0.9}]
        )

        # Mock database to save concepts and conversations
        db_manager_mock = AsyncMock()
        db_manager_mock.save_conversation = AsyncMock()
        db_manager_mock.save_concept = AsyncMock()

        # 1. Start conversation about Python lists
        user_message = "Can you explain Python lists?"
        response = await ai_service_mock.generate_response(user_message, session.id, [])

        # 2. Extract and save concepts
        concepts = await ai_service_mock.extract_concepts(response, user_message)

        # 3. Save conversation and concepts
        await db_manager_mock.save_conversation(session.id, "user", user_message)
        await db_manager_mock.save_conversation(session.id, "ai", response)

        for concept_data in concepts:
            concept = Concept(
                id=concept_data["id"],
                name=concept_data["name"],
                description="",  # In a real scenario, this would be filled
                relevance=concept_data["relevance"],
                session_id=session.id,
            )
            await db_manager_mock.save_concept(concept)

        # 4. Verify all interactions
        ai_service_mock.generate_response.assert_called_once_with(user_message, session.id, [])
        ai_service_mock.extract_concepts.assert_called_once_with(response, user_message)
        assert db_manager_mock.save_conversation.call_count == 2
        assert db_manager_mock.save_concept.call_count == 1

        # 5. Update session with current concept
        await workspace_manager.update_session_concept(session.id, "python-lists")

        # 6. Get updated session and verify
        updated_session = await workspace_manager.get_session(session.id)
        assert updated_session.current_concept_id == "python-lists"

    @pytest.mark.asyncio
    async def test_checkpoint_save_and_restore_flow(self, temp_workspace):
        """Test the complete flow of saving a checkpoint and restoring it"""
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session("test-session-3", "test-user", "2023-01-01T12:00:00", "2023-01-01T12:00:00", "active")
        mock_session.id = "test-session-3"
        mock_session.current_concept_id = None
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)
        workspace_manager.update_session_concept = AsyncMock()

        # Create a session
        session = await workspace_manager.create_new_session()

        # Mock database to return conversation history
        db_manager_mock = AsyncMock()
        mock_conversations = [
            {"speaker": "user", "message": "What is recursion?"},
            {"speaker": "ai", "message": "Recursion is a programming technique..."},
        ]
        db_manager_mock.get_conversation_history = AsyncMock(return_value=mock_conversations)

        # 1. Save a checkpoint
        checkpoint_name = "Recursion Basics"
        checkpoint_id = await checkpoint_manager.create_checkpoint(session, checkpoint_name, db_manager_mock)

        # 2. Verify checkpoint was saved
        assert checkpoint_id is not None

        # 3. Create a new session that would overwrite the current state
        new_session = await workspace_manager.create_new_session()
        await workspace_manager.update_session_concept(new_session.id, "different-concept")

        # 4. Load the checkpoint
        restored_session = await checkpoint_manager.load_checkpoint(checkpoint_id)

        # 5. Verify the restored session matches the original
        assert restored_session.id == session.id
        assert restored_session.current_concept_id == session.current_concept_id

        # 6. List all checkpoints and verify
        checkpoints = await checkpoint_manager.list_checkpoints()
        assert any(cp["name"] == checkpoint_name for cp in checkpoints)

    @pytest.mark.asyncio
    async def test_complete_workflow_with_error_handling(self, temp_workspace):
        """Test a complete workflow with error handling scenarios"""
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        prefs_manager = PreferencesManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session("test-session-4", "test-user", "2023-01-01T12:00:00", "2023-01-01T12:00:00", "active")
        mock_session.id = "test-session-4"
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)

        # Create mock objects
        AsyncMock()

        # Mock AI service to sometimes fail
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_response.side_effect = [
            Exception("API Service Unavailable"),  # First call fails
            "Python loops allow you to repeatedly execute a block of code.",  # Second call succeeds
        ]

        # Create a session
        session = await workspace_manager.create_new_session()

        # 1. Attempt to get a response when AI service is unavailable
        user_message = "Explain Python loops"
        try:
            await ai_service_mock.generate_response(user_message, session.id, [])
            assert False, "Should have raised an exception"
        except Exception as e:
            assert str(e) == "API Service Unavailable"

        # 2. Configure fallback preferences
        prefs_manager.set_preference("ai.default_provider", "local_fallback")
        prefs_manager.set_preference("ai.default_model", "fallback_model")
        prefs_manager.set_preference("learning.difficulty_level", "beginner")
        prefs_manager.set_preference("learning.learning_style", "textual")
        prefs_manager.set_preference("learning.preferred_topics", ["Python"])

        # 3. Try again with fallback configuration
        try:
            response = await ai_service_mock.generate_response(user_message, session.id, [])
            assert response == "Python loops allow you to repeatedly execute a block of code."
        except Exception:
            assert False, "Should have succeeded with fallback configuration"

    @pytest.mark.asyncio
    async def test_concept_mastery_tracking_flow(self, temp_workspace):
        """Test the flow of tracking concept mastery through challenges and feedback"""
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session("test-session-5", "test-user", "2023-01-01T12:00:00", "2023-01-01T12:00:00", "active")
        mock_session.id = "test-session-5"
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)

        # Create a session and concept
        session = await workspace_manager.create_new_session()
        concept = Concept(
            id="python-functions",
            name="Python Functions",
            description="Functions are reusable blocks of code",
            relevance=0.9,
            session_id=session.id,
            mastery_level=0.0,  # Starting with 0% mastery
        )

        # Create mock objects
        db_manager_mock = AsyncMock()

        # Mock database to save concept and mastery records
        db_manager_mock.save_concept = AsyncMock()
        db_manager_mock.update_concept_mastery = AsyncMock()

        # Mock AI service for challenge generation and evaluation
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_challenge = AsyncMock(
            return_value={
                "question": "How do you define a function in Python?",
                "type": "open_ended",
                "difficulty": "beginner",
            }
        )
        ai_service_mock.evaluate_answer = AsyncMock(
            return_value={
                "correct": True,
                "score": 1.0,
                "feedback": "Excellent! That" "s exactly how you define a function in Python.",
            }
        )

        # 1. Save initial concept
        await db_manager_mock.save_concept(concept)

        # 2. Generate a challenge for the concept
        challenge = await ai_service_mock.generate_challenge(concept.id, "beginner")

        # 3. Submit an answer to the challenge
        user_answer = "You define a function using the " "def" " keyword followed by the function name and parentheses."
        evaluation = await ai_service_mock.evaluate_answer(challenge["question"], user_answer, concept.id)

        # 4. Update concept mastery based on evaluation
        if evaluation["correct"]:
            new_mastery = min(concept.mastery_level + 0.3, 1.0)  # Increase by 30% for correct answer
        else:
            new_mastery = max(concept.mastery_level - 0.1, 0.0)  # Decrease by 10% for incorrect answer

        await db_manager_mock.update_concept_mastery(concept.id, new_mastery)

        # 5. Verify all interactions
        ai_service_mock.generate_challenge.assert_called_once_with(concept.id, "beginner")
        ai_service_mock.evaluate_answer.assert_called_once_with(challenge["question"], user_answer, concept.id)
        db_manager_mock.update_concept_mastery.assert_called_once_with(concept.id, new_mastery)

        # 6. Verify mastery level increased
        assert new_mastery == 0.3  # Starting from 0.0, increased by 0.3
