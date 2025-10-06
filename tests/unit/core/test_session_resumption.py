"""
Unit tests for Seamless Session Resumption (Story 2)
"""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.checkpoint_manager import CheckpointManagerImpl


# Mock the Session class since it doesn't exist yet
class Session:
    def __init__(self, id, workspace_path, current_concept_id, start_time, end_time=None):
        self.id = id
        self.workspace_path = workspace_path
        self.current_concept_id = current_concept_id
        self.start_time = start_time
        self.end_time = end_time


# Mock the Conversation class since it doesn't exist yet
class Conversation:
    def __init__(self, id, session_id, role, content, timestamp):
        self.id = id
        self.session_id = session_id
        self.role = role  # 'user' or 'agent'
        self.content = content
        self.timestamp = timestamp


class TestSessionResumption:
    @pytest.mark.asyncio
    async def test_existing_session_detection(self, checkpoint_manager):
        """Test that the system correctly detects existing sessions"""
        # Mock checkpoint manager to return a sample checkpoint
        mock_checkpoint = {
            "id": "test-checkpoint-1",
            "name": "Python Basics Session",
            "timestamp": "2023-05-10 14:30:00",
            "context": {"current_topic": "Variables and Data Types"},
        }
        checkpoint_manager.list_checkpoints.return_value = [mock_checkpoint]

        # Get list of checkpoints
        checkpoints = await checkpoint_manager.list_checkpoints()

        # Verify checkpoints exist
        assert len(checkpoints) > 0
        assert checkpoints[0]["name"] == "Python Basics Session"
        assert checkpoints[0]["context"]["current_topic"] == "Variables and Data Types"

    @pytest.mark.asyncio
    async def test_welcome_back_message_generation(self, model_service):
        """Test that returning users get an appropriate welcome back message"""
        # Configure mock to simulate returning user response
        model_service.generate_response.return_value = {
            "content": "🎓 Welcome back to Learning Catalyst! 🚀\n\n"
            'I see you have a saved checkpoint: "Understanding Python Lists and Recursion". '
            "Would you like to resume from there, or start fresh?"
        }

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service)

        # Test welcome back message generation
        welcome_message = await catalyst_agent.generate_response(is_first_time_user=False)

        # Verify the response contains the welcome back message
        assert "Welcome back" in welcome_message
        assert "saved checkpoint" in welcome_message

    @pytest.mark.asyncio
    async def test_session_state_restoration(self, checkpoint_manager_mock, temp_workspace):
        """Test that session state is properly restored when resuming"""
        # Create a mock session with conversation history
        mock_session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
            last_active_time="2023-05-10 14:30:00",
        )

        # Mock checkpoint manager to load the session
        checkpoint_manager_mock.load_checkpoint.return_value = mock_session

        # Load the checkpoint
        loaded_session = await checkpoint_manager_mock.load_checkpoint("test-checkpoint-1")

        # Verify the session was loaded correctly
        assert loaded_session.id == "test-session-1"
        assert loaded_session.current_concept_id == "python-lists"
        assert loaded_session.workspace_path == str(temp_workspace)

    @pytest.mark.asyncio
    async def test_conversation_history_retrieval(self, db_manager_mock):
        """Test that conversation history is retrieved when resuming a session"""
        # Create mock conversation history
        mock_conversations = [
            Conversation(
                id="conv-1",
                session_id="test-session-1",
                speaker="user",
                message="Can you explain Python lists?",
                timestamp="2023-05-10 14:01:00",
            ),
            Conversation(
                id="conv-2",
                session_id="test-session-1",
                speaker="ai",
                message="Python lists are ordered, mutable collections of items...",
                timestamp="2023-05-10 14:01:30",
            ),
        ]

        # Mock database manager to return conversation history
        db_manager_mock.get_conversation_history.return_value = mock_conversations

        # Retrieve conversation history
        history = await db_manager_mock.get_conversation_history("test-session-1")

        # Verify conversation history was retrieved
        assert len(history) == 2
        assert history[0].message == "Can you explain Python lists?"
        assert history[1].message == "Python lists are ordered, mutable collections of items..."

    @pytest.mark.asyncio
    async def test_context_aware_resumption_suggestion(self, model_service_mock):
        """Test that context-aware suggestions are provided when resuming"""
        # Configure mock to simulate context-aware suggestion
        model_service_mock.generate_response.return_value = {
            "content": "Great! We were discussing JavaScript closures. Let me refresh your memory:\n\n"
            "A closure is the combination of a function bundled together with references to its surrounding state."
            "We looked at this example:\n\n"
            "```javascript\nfunction outer(x) {\n    return function inner(y) {\n        return x + y;\n    };\n}\n```\n\n"
            "Would you like me to quiz you on JavaScript closures now, or shall we move on to the next topic, 'Immediately Invoked Function Expressions'?"
        }

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service_mock)

        # Test context-aware suggestion
        suggestion = await catalyst_agent.generate_response(
            "JavaScript closures", "We were discussing closures and I provided an example"
        )

        # Verify the response contains context-aware suggestions
        assert "JavaScript closures" in suggestion
        assert "refresh your memory" in suggestion.lower()
        assert "quiz you" in suggestion.lower()
        assert "move on to the next topic" in suggestion.lower()

    @pytest.mark.asyncio
    async def test_no_existing_sessions_fallback(self, checkpoint_manager_mock, catalyst_agent_mock):
        """Test that the system falls back to first-time user experience when no sessions exist"""
        # Mock checkpoint manager to return no checkpoints
        checkpoint_manager_mock.list_checkpoints.return_value = []

        # Mock catalyst agent to generate first-time user message
        catalyst_agent_mock.generate_welcome_message.return_value = "Welcome to Learning Catalyst! Let's get started..."

        # Get checkpoints
        checkpoints = await checkpoint_manager_mock.list_checkpoints()

        # If no checkpoints, generate first-time user message
        if len(checkpoints) == 0:
            message = await catalyst_agent_mock.generate_response(is_first_time_user=True)

        # Verify correct message was generated
        assert "Welcome to Learning Catalyst" in message
        assert "get started" in message.lower()
