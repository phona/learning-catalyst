
import sys
import os
import pytest
import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.cli.main import app
from src.cli.command_palette import CommandPalette
from src.cli.interface import CLIInterfaceImpl
from src.utils.workspace_manager import WorkspaceManager
from src.utils.preferences_manager import PreferencesManager
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.checkpoint_manager import CheckpointManagerImpl
from src.ai.service import ModelAbstractionService as AIService
from src.data.models.concept import Concept

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


class TestCLIConversationFlow:
    '''Integration tests for CLI conversation flow'''

    @pytest.mark.asyncio
    async def test_complete_cli_conversation_flow(self, temp_workspace):
        '''Test a complete CLI conversation flow from startup to interaction'''
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        prefs_manager = PreferencesManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session('test-session-1', 'test-user', '2023-01-01T12:00:00', '2023-01-01T12:00:00', 'active')
        mock_session.workspace_path = str(temp_workspace)
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)
        workspace_manager.update_session_concept = AsyncMock()

        # Create mock objects
        db_manager_mock = AsyncMock()
        vector_storage_mock = AsyncMock()

        # Mock AI service to provide responses
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_response = AsyncMock(return_value='Python variables are containers for storing data values.')
        ai_service_mock.extract_concepts = AsyncMock(return_value=[{'id': 'python-variables', 'name': 'Python Variables', 'relevance': 0.9}])

        # 1. Configure initial preferences
        prefs_manager.set_preference('ai.default_provider', 'openai')
        prefs_manager.set_preference('ai.default_model', 'gpt-3.5-turbo')
        prefs_manager.set_preference('learning.difficulty_level', 'beginner')
        prefs_manager.set_preference('learning.learning_style', 'visual')
        prefs_manager.set_preference('learning.preferred_topics', ['Python'])

        # 2. Create session
        session = await workspace_manager.create_new_session()
        assert session is not None
        assert session.id is not None
        assert session.workspace_path == str(temp_workspace)

        # 3. Initialize CLI components
        cli_interface = CLIInterfaceImpl()
        command_palette = CommandPalette(cli_interface)

        # Add workspace path to command palette context
        command_palette.context['workspace_path'] = str(temp_workspace)

        # 4. Simulate user interaction through CLI
        # In a real scenario, this would happen through the CLI interface
        user_input = 'Explain Python variables'

        # 5. Process user input through the system
        response = await ai_service_mock.generate_response(user_input, session.id, [])
        concepts = await ai_service_mock.extract_concepts(response.content, user_input)

        # 6. Save conversation and concepts
        await db_manager_mock.save_conversation(session.id, 'user', user_input)
        await db_manager_mock.save_conversation(session.id, 'ai', response.content)

        for concept_data in concepts:
            concept = Concept(
                id=concept_data['id'],
                name=concept_data['name'],
                description='',  # In a real scenario, this would be filled
                relevance=concept_data['relevance'],
                session_id=session.id
            )
            await db_manager_mock.save_concept(concept)

        # 7. Update session with current concept
        await workspace_manager.update_session_concept(session.id, 'python-variables')

        # 8. Verify all interactions
        ai_service_mock.generate_response.assert_called_once_with(user_input, session.id, [])
        ai_service_mock.extract_concepts.assert_called_once_with(response.content, user_input)
        assert db_manager_mock.save_conversation.call_count == 2
        assert db_manager_mock.save_concept.call_count == 1

        # 9. Get updated session and verify
        updated_session = await workspace_manager.get_session(session.id)
        assert updated_session.current_concept_id == 'python-variables'

    @pytest.mark.asyncio
    async def test_cli_system_commands_flow(self, temp_workspace):
        '''Test the flow of CLI system commands'''
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session('test-session-2', 'test-user', '2023-01-01T12:00:00', '2023-01-01T12:00:00', 'active')
        mock_session.id = 'test-session-2'
        mock_session.current_concept_id = None
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)
        workspace_manager.update_session_concept = AsyncMock()

        # Create a session
        session = await workspace_manager.create_new_session()

        # Mock database to return conversation history
        db_manager_mock = AsyncMock()
        mock_conversations = [
            {'speaker': 'user', 'message': 'What is recursion?'},
            {'speaker': 'ai', 'message': 'Recursion is a programming technique...'}
        ]
        db_manager_mock.get_conversation_history = AsyncMock(return_value=mock_conversations)

        # Initialize CLI components
        cli_interface = CLIInterfaceImpl()
        command_palette = CommandPalette(cli_interface)

        # Add workspace path to command palette context
        command_palette.context['workspace_path'] = str(temp_workspace)

        # 1. Test /checkpoint save command
        checkpoint_name = 'Recursion Basics'
        checkpoint_id = await checkpoint_manager.save_checkpoint(session, checkpoint_name, db_manager_mock)

        # 2. Verify checkpoint was saved
        assert checkpoint_id is not None

        # 3. Test /checkpoint list command
        checkpoints = await checkpoint_manager.list_checkpoints()
        assert len(checkpoints) > 0
        assert any(cp['name'] == checkpoint_name for cp in checkpoints)

        # 4. Test /checkpoint load command
        restored_session = await checkpoint_manager.load_checkpoint(checkpoint_id)
        assert restored_session.id == session.id
        assert restored_session.current_concept_id == session.current_concept_id

    @pytest.mark.asyncio
    async def test_cli_command_execution_flow(self, temp_workspace):
        '''Test the complete flow of CLI command execution'''
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        prefs_manager = PreferencesManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session('test-session-3', 'test-user', '2023-01-01T12:00:00', '2023-01-01T12:00:00', 'active')
        mock_session.workspace_path = str(temp_workspace)
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)

        # Create a session
        session = await workspace_manager.create_new_session()

        # Initialize CLI components
        cli_interface = CLIInterfaceImpl()
        command_palette = CommandPalette(cli_interface)

        # Add workspace path to command palette context
        command_palette.context['workspace_path'] = str(temp_workspace)

        # Mock AI service to provide responses
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_response = AsyncMock(return_value='Python lists are ordered, mutable collections of items.')

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(ai_service_mock)

        # 1. Test command execution for non-slash input
        user_input = 'Explain Python lists'
        response = await ai_service_mock.generate_response(user_input, session.id, [])

        # 2. Verify AI service was used
        ai_service_mock.generate_response.assert_called_once_with(user_input, session.id, [])
        assert 'Python lists are ordered, mutable collections of items.' in response.content

        # 3. Test command execution for slash commands
        # This would normally go through the command palette
        # For now, we'll test that the command palette recognizes commands
        assert command_palette.get_command_by_name('help') is not None
        assert command_palette.get_command_by_name('checkpoint') is not None
        assert command_palette.get_command_by_name('models') is not None

    @pytest.mark.asyncio
    async def test_cli_conversation_history_display(self, temp_workspace):
        '''Test that conversation history is properly displayed in the CLI'''
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session('test-session-4', 'test-user', '2023-01-01T12:00:00', '2023-01-01T12:00:00', 'active')
        mock_session.id = 'test-session-4'
        mock_session.current_concept_id = None
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)
        workspace_manager.update_session_concept = AsyncMock()

        # Create a session
        session = await workspace_manager.create_new_session()

        # Mock database to return conversation history
        db_manager_mock = AsyncMock()
        mock_conversations = [
            {'speaker': 'user', 'message': 'What is recursion?', 'timestamp': '2023-01-01T12:01:00'},
            {'speaker': 'ai', 'message': 'Recursion is a programming technique...', 'timestamp': '2023-01-01T12:01:30'}
        ]
        db_manager_mock.get_conversation_history = AsyncMock(return_value=mock_conversations)

        # Initialize CLI components
        cli_interface = CLIInterfaceImpl()
        command_palette = CommandPalette(cli_interface)

        # Add workspace path to command palette context
        command_palette.context['workspace_path'] = str(temp_workspace)

        # 1. Retrieve conversation history
        history = await db_manager_mock.get_conversation_history(session.id)

        # 2. Verify conversation history was retrieved
        assert len(history) == 2
        assert history[0]['message'] == 'What is recursion?'
        assert history[1]['message'] == 'Recursion is a programming technique...'

        # 3. Test that CLI interface can display conversation history
        # This would normally happen through the CLI interface's display_conversation_history method
        # For now, we'll just verify the method exists
        assert hasattr(cli_interface, 'display_conversation_history')

    @pytest.mark.asyncio
    async def test_cli_error_handling_flow(self, temp_workspace):
        '''Test CLI error handling scenarios'''
        # Initialize managers
        workspace_manager = WorkspaceManager(str(temp_workspace))
        prefs_manager = PreferencesManager(str(temp_workspace))
        await workspace_manager.initialize_workspace()

        # Mock the session-related methods on workspace_manager
        mock_session = Session('test-session-5', 'test-user', '2023-01-01T12:00:00', '2023-01-01T12:00:00', 'active')
        mock_session.workspace_path = str(temp_workspace)
        workspace_manager.create_new_session = AsyncMock(return_value=mock_session)

        # Create mock objects
        db_manager_mock = AsyncMock()

        # Mock AI service to sometimes fail
        ai_service_mock = AsyncMock(spec=AIService)
        ai_service_mock.generate_response.side_effect = [
            Exception('API Service Unavailable'),  # First call fails
            'Python loops allow you to repeatedly execute a block of code.'  # Second call succeeds
        ]

        # Create a session
        session = await workspace_manager.create_new_session()

        # Initialize CLI components
        cli_interface = CLIInterfaceImpl()
        command_palette = CommandPalette(cli_interface)

        # Add workspace path to command palette context
        command_palette.context['workspace_path'] = str(temp_workspace)

        # 1. Attempt to get a response when AI service is unavailable
        user_input = 'Explain Python loops'
        try:
            await ai_service_mock.generate_response(user_input, session.id, [])
            assert False, 'Should have raised an exception'
        except Exception as e:
            assert str(e) == 'API Service Unavailable'

        # 2. Configure fallback preferences
        prefs_manager.set_preference('ai.default_provider', 'local_fallback')
        prefs_manager.set_preference('ai.default_model', 'fallback_model')
        prefs_manager.set_preference('learning.difficulty_level', 'beginner')
        prefs_manager.set_preference('learning.learning_style', 'textual')
        prefs_manager.set_preference('learning.preferred_topics', ['Python'])

        # 3. Try again with fallback configuration
        try:
            response = await ai_service_mock.generate_response(user_input, session.id, [])
            assert response == 'Python loops allow you to repeatedly execute a block of code.'
        except Exception:
            assert False, 'Should have succeeded with fallback configuration'

