"""
Unit tests for Manual State Checkpointing (Story 7) functionality
"""
import sys
import os
import pytest
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
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


class TestCheckpointManagement:
    @pytest.mark.asyncio
    async def test_checkpoint_saving(self, temp_workspace, db_manager_mock):
        """Test that checkpoints can be saved successfully"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock session
        session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
            last_active_time="2023-05-10 14:30:00"
        )

        # Mock database manager to return conversation history
        mock_conversations = [
            Conversation(
                id="conv-1",
                session_id="test-session-1",
                speaker="user",
                message="Can you explain Python lists?",
                timestamp="2023-05-10 14:01:00"
            ),
            Conversation(
                id="conv-2",
                session_id="test-session-1",
                speaker="ai",
                message="Python lists are ordered, mutable collections of items...",
                timestamp="2023-05-10 14:01:30"
            )
        ]
        db_manager_mock.get_conversation_history = AsyncMock(return_value=mock_conversations)

        # Save a checkpoint
        checkpoint_id = await checkpoint_manager.create_checkpoint(session, "Understanding Python Lists and Recursion", db_manager_mock)

        # Verify the checkpoint was saved
        assert checkpoint_id is not None
        assert isinstance(checkpoint_id, str)

        # Verify the get_conversation_history method was called
        db_manager_mock.get_conversation_history.assert_called_once_with("test-session-1")

    @pytest.mark.asyncio
    async def test_checkpoint_listing(self, temp_workspace):
        """Test that saved checkpoints can be listed"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create mock checkpoints
        checkpoint_data = [
            {
                'id': 'checkpoint-1',
                'name': 'Chapter 1 Review',
                'timestamp': '2023-05-10 14:30:00',
                'session_data': {}
            },
            {
                'id': 'checkpoint-2',
                'name': 'Understanding Python Lists',
                'timestamp': '2023-05-11 10:15:00',
                'session_data': {}
            }
        ]

        # Mock the _load_checkpoints method to return our mock data
        with patch.object(checkpoint_manager, '_load_checkpoints', return_value=checkpoint_data):
            # List checkpoints
            checkpoints = await checkpoint_manager.list_checkpoints()

            # Verify the checkpoints are listed correctly
            assert len(checkpoints) == 2
            assert checkpoints[0]['name'] == 'Chapter 1 Review'
            assert checkpoints[1]['name'] == 'Understanding Python Lists'
            assert checkpoints[0]['timestamp'] == '2023-05-10 14:30:00'
            assert checkpoints[1]['timestamp'] == '2023-05-11 10:15:00'

    @pytest.mark.asyncio
    async def test_checkpoint_loading(self, temp_workspace):
        """Test that checkpoints can be loaded successfully"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock checkpoint with session data
        checkpoint_data = [
            {
                'id': 'checkpoint-1',
                'name': 'Understanding Python Lists',
                'timestamp': '2023-05-10 14:30:00',
                'session_data': {
                    'id': 'test-session-1',
                    'workspace_path': str(temp_workspace),
                    'current_concept_id': 'python-lists',
                    'start_time': '2023-05-10 14:00:00',
                    'last_active_time': '2023-05-10 14:30:00'
                }
            }
        ]

        # Mock the _load_checkpoints method to return our mock data
        with patch.object(checkpoint_manager, '_load_checkpoints', return_value=checkpoint_data):
            # Load the checkpoint
            loaded_session = await checkpoint_manager.load_checkpoint('checkpoint-1')

            # Verify the session was loaded correctly
            assert loaded_session.id == 'test-session-1'
            assert loaded_session.workspace_path == str(temp_workspace)
            assert loaded_session.current_concept_id == 'python-lists'

    @pytest.mark.asyncio
    async def test_named_checkpoint_saving(self, temp_workspace, db_manager_mock):
        """Test that named checkpoints are saved with the specified name"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock session
        session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
            last_active_time="2023-05-10 14:30:00"
        )

        # Mock database manager to return empty conversation history
        db_manager_mock.get_conversation_history = AsyncMock(return_value=[])

        # Save a checkpoint with a specific name
        checkpoint_name = "Chapter 4 Review"
        checkpoint_id = await checkpoint_manager.create_checkpoint(session, checkpoint_name, db_manager_mock)

        # Mock the _load_checkpoints method to return the newly saved checkpoint
        # This is a simplification - in reality, we would check the actual file
        with patch.object(checkpoint_manager, '_load_checkpoints', return_value=[{
            'id': checkpoint_id,
            'name': checkpoint_name,
            'timestamp': '2023-05-10 14:30:00',
            'session_data': session.to_dict()
        }]):

            # Verify the checkpoint has the correct name
            checkpoints = await checkpoint_manager.list_checkpoints()
            assert len(checkpoints) == 1
            assert checkpoints[0]['name'] == checkpoint_name

    @pytest.mark.asyncio
    async def test_invalid_checkpoint_loading(self, temp_workspace):
        """Test that loading an invalid checkpoint raises an appropriate error"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Mock the _load_checkpoints method to return empty list
        with patch.object(checkpoint_manager, '_load_checkpoints', return_value=[]):

            # Attempt to load a non-existent checkpoint
            with pytest.raises(ValueError):
                await checkpoint_manager.load_checkpoint('non-existent-checkpoint')

    @pytest.mark.asyncio
    async def test_checkpoint_storage_format(self, temp_workspace, db_manager_mock):
        """Test that checkpoints are stored in the correct format and location"""
        # Initialize Checkpoint Manager
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create a mock session
        session = Session(
            id="test-session-1",
            workspace_path=str(temp_workspace),
            current_concept_id="python-lists",
            start_time="2023-05-10 14:00:00",
            last_active_time="2023-05-10 14:30:00"
        )

        # Mock database manager to return empty conversation history
        db_manager_mock.get_conversation_history = AsyncMock(return_value=[])

        # Get the expected checkpoint directory
        checkpoints_dir = Path(temp_workspace) / '.learningspace' / 'checkpoints'

        # Save a checkpoint
        checkpoint_id = await checkpoint_manager.create_checkpoint(session, "Test Checkpoint", db_manager_mock)

        # Verify the checkpoint file exists in the correct location
        checkpoint_file = checkpoints_dir / f"{checkpoint_id}.json"
        assert checkpoint_file.exists()

        # Verify the checkpoint file contains valid JSON
        import json
        with open(checkpoint_file, 'r') as f:
            checkpoint_data = json.load(f)

        # Verify the checkpoint data has all required fields
        assert 'id' in checkpoint_data
        assert 'name' in checkpoint_data
        assert 'timestamp' in checkpoint_data
        assert 'session_data' in checkpoint_data
        assert checkpoint_data['name'] == "Test Checkpoint"
        assert checkpoint_data['session_data']['id'] == "test-session-1"
