"""
Unit tests for Manual State Checkpointing (Story 7) functionality
"""

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from src.core.checkpoint_manager import CheckpointManagerImpl

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))


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


class TestCheckpointManagement:
    @pytest.mark.asyncio
    async def test_checkpoint_saving(self, temp_workspace, db_manager):
        """Test that checkpoints can be saved successfully"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock session
        session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
        )

        # Mock database manager to return conversation history
        mock_conversations = [
            Conversation(
                id="conv-1",
                session_id="test-session-1",
                role="user",
                content="Can you explain Python lists?",
                timestamp="2023-05-10 14:01:00",
            ),
            Conversation(
                id="conv-2",
                session_id="test-session-1",
                role="ai",
                content="Python lists are ordered, mutable collections of items...",
                timestamp="2023-05-10 14:01:30",
            ),
        ]
        db_manager.get_conversation_history = AsyncMock(return_value=mock_conversations)

        # Save a checkpoint
        state = {
            "session": {
                "id": session.id,
                "workspace_path": session.workspace_path,
                "current_concept_id": session.current_concept_id,
                "start_time": session.start_time,
            },
            "conversations": [
                {
                    "id": conv.id,
                    "session_id": conv.session_id,
                    "role": conv.role,
                    "content": conv.content,
                    "timestamp": conv.timestamp,
                }
                for conv in mock_conversations
            ],
            "current_topic": "Understanding Python Lists and Recursion",
        }
        checkpoint_id = await checkpoint_manager.create_checkpoint(state)

        # Verify the checkpoint was saved
        assert checkpoint_id is not None
        assert isinstance(checkpoint_id, str)

        # Note: The new checkpoint API doesn't call get_conversation_history
        # as it receives the state directly

    @pytest.mark.asyncio
    async def test_checkpoint_listing(self, temp_workspace):
        """Test that saved checkpoints can be listed"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create some test checkpoints
        state1 = {"session": {"id": "session-1"}, "current_topic": "Chapter 1 Review"}
        state2 = {"session": {"id": "session-2"}, "current_topic": "Understanding Python Lists"}

        checkpoint_id1 = await checkpoint_manager.create_checkpoint(state1)
        checkpoint_id2 = await checkpoint_manager.create_checkpoint(state2)

        # List checkpoints
        checkpoints = await checkpoint_manager.list_checkpoints()

        # Verify the checkpoints are listed correctly
        assert len(checkpoints) == 2
        assert checkpoints[0]["id"] == checkpoint_id2  # Most recent first
        assert checkpoints[1]["id"] == checkpoint_id1
        assert "created_at" in checkpoints[0]
        assert "created_at" in checkpoints[1]

    @pytest.mark.asyncio
    async def test_checkpoint_loading(self, temp_workspace):
        """Test that checkpoints can be loaded successfully"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a checkpoint with session data
        session_data = {
            "id": "test-session-1",
            "workspace_path": str(temp_workspace),
            "current_concept_id": "python-lists",
            "start_time": "2023-05-10 14:00:00",
        }

        checkpoint_id = await checkpoint_manager.create_checkpoint(session_data)

        # Load the checkpoint
        loaded_session = await checkpoint_manager.load_checkpoint(checkpoint_id)

        # Verify the session was loaded correctly
        assert loaded_session["id"] == "test-session-1"
        assert loaded_session["workspace_path"] == str(temp_workspace)
        assert loaded_session["current_concept_id"] == "python-lists"

    @pytest.mark.asyncio
    async def test_named_checkpoint_saving(self, temp_workspace, db_manager):
        """Test that named checkpoints are saved with the specified name"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock session
        session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
        )

        # Mock database manager to return empty conversation history
        db_manager.get_conversation_history = AsyncMock(return_value=[])

        # Save a checkpoint with a specific name (included in state)
        checkpoint_name = "Chapter 4 Review"
        state = {
            "session": {
                "id": session.id,
                "workspace_path": session.workspace_path,
                "current_concept_id": session.current_concept_id,
                "start_time": session.start_time,
            },
            "checkpoint_name": checkpoint_name,
            "description": "Checkpoint for chapter 4 review",
        }
        checkpoint_id = await checkpoint_manager.create_checkpoint(state)

        # Verify the checkpoint was created and has the correct data
        loaded_state = await checkpoint_manager.load_checkpoint(checkpoint_id)
        assert loaded_state["checkpoint_name"] == checkpoint_name
        assert loaded_state["description"] == "Checkpoint for chapter 4 review"

    @pytest.mark.asyncio
    async def test_invalid_checkpoint_loading(self, temp_workspace):
        """Test that loading an invalid checkpoint raises an appropriate error"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Attempt to load a non-existent checkpoint
        with pytest.raises(FileNotFoundError):
            await checkpoint_manager.load_checkpoint("non-existent-checkpoint")

    @pytest.mark.asyncio
    async def test_checkpoint_storage_format(self, temp_workspace, db_manager):
        """Test that checkpoints are stored in the correct format and location"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock session
        session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
        )

        # Mock database manager to return empty conversation history
        db_manager.get_conversation_history = AsyncMock(return_value=[])

        # Get the expected checkpoint directory
        checkpoints_dir = Path(temp_workspace) / ".catalyst" / "checkpoints"

        # Save a checkpoint
        state = {
            "session": {
                "id": session.id,
                "workspace_path": session.workspace_path,
                "current_concept_id": session.current_concept_id,
                "start_time": session.start_time,
            },
            "test_checkpoint": True,
        }
        checkpoint_id = await checkpoint_manager.create_checkpoint(state)

        # Verify the checkpoint file exists in the correct location
        checkpoint_file = checkpoints_dir / f"{checkpoint_id}.json"
        assert checkpoint_file.exists()

        # Verify the checkpoint file contains valid JSON
        import json

        with open(checkpoint_file, "r") as f:
            checkpoint_data = json.load(f)

        # Verify the checkpoint data has all required fields
        assert "id" in checkpoint_data
        assert "created_at" in checkpoint_data
        assert "state" in checkpoint_data
        assert checkpoint_data["state"]["test_checkpoint"] is True
        assert checkpoint_data["state"]["session"]["id"] == "test-session-1"
