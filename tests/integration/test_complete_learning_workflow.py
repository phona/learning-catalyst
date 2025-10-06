"""
Integration tests for the complete learning workflow.
"""

import pytest
import tempfile
import os
from unittest.mock import Mock, AsyncMock, patch
from pathlib import Path

from src.core.startup_guide import StartupGuide
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.core.state_manager import StateManager
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.challenge_engine import ChallengeEngineImpl
from src.ai.service import ModelAbstractionService
from src.cli.command_palette import CommandPalette
from src.cli.interface import CLIInterface
from src.data.models.concept import Concept
from src.data.models.extended_models import Message


class TestCompleteLearningWorkflow:
    """Integration tests for the complete learning workflow."""

    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace for testing."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a .catalyst directory
            catalyst_dir = Path(temp_dir) / ".catalyst"
            catalyst_dir.mkdir(exist_ok=True)
            
            # Create a test markdown file
            test_file = Path(temp_dir) / "test_concepts.md"
            with open(test_file, "w") as f:
                f.write("""# Python Basics

## Variables
Variables are used to store data values.

## Data Types
Python has various data types like integers, strings, and lists.

## Control Flow
Control flow statements allow you to control the execution order of your code.
""")
            
            yield temp_dir

    @pytest.fixture
    def mock_cli_interface(self):
        """Create a mock CLI interface."""
        interface = Mock()
        interface.display_message = Mock()
        interface.clear_screen = Mock()
        interface.get_user_input = Mock(return_value="test input")
        return interface

    @pytest.fixture
    def mock_model_service(self):
        """Create a mock model service."""
        service = Mock()
        service.generate_response = AsyncMock(return_value="Test explanation")
        service.generate_summary = AsyncMock(return_value="Test summary")
        service.generate_challenge = AsyncMock(return_value={
            "question": "Test question",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A"
        })
        service.evaluate_answer = AsyncMock(return_value={
            "is_correct": True,
            "feedback": "Good job!"
        })
        return service

    @pytest.fixture
    def knowledge_navigator(self, temp_workspace):
        """Create a knowledge navigator instance."""
        db_path = Path(temp_workspace) / ".catalyst" / "data.db"
        return SQLiteKnowledgeNavigator(str(db_path))

    @pytest.fixture
    def state_manager(self, temp_workspace):
        """Create a state manager instance."""
        return StateManager(temp_workspace)

    @pytest.fixture
    def startup_guide(self, temp_workspace, knowledge_navigator, state_manager):
        """Create a startup guide instance."""
        return StartupGuide(temp_workspace, knowledge_navigator, state_manager)

    @pytest.fixture
    def catalyst_agent(self, mock_model_service, knowledge_navigator):
        """Create a catalyst agent instance."""
        return CatalystAgentImpl(mock_model_service, knowledge_navigator)

    @pytest.fixture
    def challenge_engine(self):
        """Create a challenge engine instance."""
        return ChallengeEngineImpl()

    @pytest.fixture
    def command_palette(self, mock_cli_interface):
        """Create a command palette instance."""
        return CommandPalette(mock_cli_interface)

    @pytest.mark.asyncio
    async def test_complete_learning_workflow(self, temp_workspace, knowledge_navigator, 
                                            startup_guide, catalyst_agent, challenge_engine):
        """Test the complete learning workflow from content loading to challenge completion."""
        
        # Step 1: Load content from markdown files
        knowledge_map = await knowledge_navigator.load_content(
            workspace_path=temp_workspace,
            extraction_mode="headers"
        )
        
        # Verify concepts were extracted
        assert len(knowledge_map.concepts) > 0
        assert any(concept.title == "Variables" for concept in knowledge_map.concepts)
        assert any(concept.title == "Data Types" for concept in knowledge_map.concepts)
        assert any(concept.title == "Control Flow" for concept in knowledge_map.concepts)
        
        # Step 2: Get available concepts
        concepts = await knowledge_navigator.get_available_concepts()
        assert len(concepts) > 0
        
        # Step 3: Generate startup message for first-time user
        startup_message = await startup_guide.generate_startup_message(
            is_first_time=True,
            has_previous_state=False
        )
        assert "Welcome to Learning Catalyst" in startup_message
        
        # Step 4: Generate contextual suggestions
        user_profile = {"learning_style": "visual"}
        suggestions = await startup_guide.get_contextual_suggestions(user_profile)
        assert len(suggestions) > 0
        
        # Step 5: Generate explanation for a concept
        target_concept = concepts[0]
        explanation = await catalyst_agent.generate_explanation(
            target_concept,
            {"learning_level": "beginner"}
        )
        assert explanation is not None
        
        # Step 6: Generate a challenge for the same concept
        challenge = await catalyst_agent.generate_challenge(
            target_concept,
            {"challenge_type": "multiple-choice", "difficulty": "easy"}
        )
        assert challenge is not None
        assert "question" in challenge
        
        # Step 7: Evaluate an answer to the challenge
        evaluation = await catalyst_agent.evaluate_answer(
            "A",  # User answer
            challenge.get("correct_answer", "A"),
            {"concept": target_concept.title}
        )
        assert evaluation is not None
        assert "is_correct" in evaluation

    @pytest.mark.asyncio
    async def test_session_persistence_and_resumption(self, temp_workspace, state_manager, 
                                                    knowledge_navigator, startup_guide):
        """Test session persistence and resumption functionality."""
        
        # Step 1: Create and save a session state
        from src.core.state_manager import ApplicationState
        
        original_state = ApplicationState(
            user_profile={"learning_style": "visual", "difficulty": "intermediate"},
            conversation_context={"current_concept": "Variables"},
            conversation_messages=[
                {"role": "user", "content": "What are variables?"},
                {"role": "assistant", "content": "Variables are containers for storing data values."}
            ],
            current_state_metadata={
                "last_access": "2024-01-01T12:00:00",
                "session_id": "test-session-123"
            }
        )
        
        # Save the state
        await state_manager.save_current_state(original_state)
        
        # Step 2: Load the state in a new session
        loaded_state = await state_manager.load_last_state()
        
        # Verify the state was loaded correctly
        assert loaded_state is not None
        assert loaded_state.user_profile["learning_style"] == "visual"
        assert loaded_state.conversation_context["current_concept"] == "Variables"
        assert len(loaded_state.conversation_messages) == 2
        
        # Step 3: Generate a returning user message
        startup_message = await startup_guide.generate_startup_message(
            is_first_time=False,
            has_previous_state=True
        )
        assert "Welcome back" in startup_message

    @pytest.mark.asyncio
    async def test_checkpoint_creation_and_loading(self, temp_workspace, state_manager):
        """Test checkpoint creation and loading functionality."""
        
        # Step 1: Create a session state
        from src.core.state_manager import ApplicationState
        
        session_state = ApplicationState(
            user_profile={"learning_style": "kinesthetic"},
            conversation_context={"current_concept": "Data Types"},
            conversation_messages=[
                {"role": "user", "content": "Tell me about data types"},
                {"role": "assistant", "content": "Python has several built-in data types..."}
            ],
            current_state_metadata={"session_id": "checkpoint-test-456"}
        )
        
        # Step 2: Create a checkpoint
        checkpoint = await state_manager.create_checkpoint(
            session_state,
            "Before learning about control flow"
        )
        
        # Verify the checkpoint was created
        assert checkpoint is not None
        assert checkpoint.id is not None
        assert checkpoint.description == "Before learning about control flow"
        
        # Step 3: List available checkpoints
        checkpoints = await state_manager.list_checkpoints()
        assert len(checkpoints) > 0
        assert any(cp.id == checkpoint.id for cp in checkpoints)
        
        # Step 4: Load the checkpoint
        loaded_state = await state_manager.load_checkpoint(checkpoint.id)
        
        # Verify the state was loaded correctly
        assert loaded_state is not None
        assert loaded_state.user_profile["learning_style"] == "kinesthetic"
        assert loaded_state.conversation_context["current_concept"] == "Data Types"

    def test_command_execution_workflow(self, command_palette, mock_cli_interface):
        """Test the command execution workflow."""
        
        # Step 1: Execute help command
        result = command_palette.execute_command("/help")
        assert result is True
        mock_cli_interface.display_message.assert_called()
        
        # Step 2: Execute help for a specific command
        result = command_palette.execute_command("/help concepts")
        assert result is True
        
        # Step 3: Execute an invalid command
        result = command_palette.execute_command("/invalidcommand")
        assert result is True  # Should handle the error gracefully
        
        # Step 4: Execute a non-command
        result = command_palette.execute_command("This is not a command")
        assert result is False
        
        # Step 5: Check command history
        history = command_palette.get_command_history()
        assert len(history) > 0
        assert "/help" in history

    @pytest.mark.asyncio
    async def test_concept_learning_flow(self, temp_workspace, knowledge_navigator, 
                                       catalyst_agent, startup_guide):
        """Test the complete concept learning flow."""
        
        # Step 1: Load content
        knowledge_map = await knowledge_navigator.load_content(
            workspace_path=temp_workspace,
            extraction_mode="headers"
        )
        concepts = await knowledge_navigator.get_available_concepts()
        
        # Step 2: Select a concept to learn
        target_concept = concepts[0]
        
        # Step 3: Generate explanation
        explanation = await catalyst_agent.generate_explanation(
            target_concept,
            {"learning_level": "beginner"}
        )
        
        # Step 4: Generate proactive suggestions based on the concept
        conversation_context = {"current_concept": target_concept.title}
        suggestions = await startup_guide.generate_proactive_suggestions(conversation_context)
        
        # Verify the learning flow
        assert len(concepts) > 0
        assert explanation is not None
        assert len(suggestions) > 0
        assert any(target_concept.title in s for s in suggestions)

    @pytest.mark.asyncio
    async def test_concept_relationship_building(self, temp_workspace, knowledge_navigator):
        """Test concept relationship building."""
        
        # Step 1: Load content with hierarchical structure
        knowledge_map = await knowledge_navigator.load_content(
            workspace_path=temp_workspace,
            extraction_mode="headers"
        )
        
        # Verify relationships were created
        assert len(knowledge_map.relationships) > 0
        
        # Verify parent-child relationships exist
        relationships = knowledge_map.relationships
        assert any(
            r["source"] == "python-basics" and r["target"] == "variables"
            for r in relationships
        )

    @pytest.mark.asyncio
    async def test_adaptive_difficulty_adjustment(self, mock_model_service, knowledge_navigator):
        """Test adaptive difficulty adjustment based on user performance."""
        
        # Create a catalyst agent with mock model service
        catalyst_agent = CatalystAgentImpl(mock_model_service, knowledge_navigator)
        
        # Create a test concept
        concept = Concept(
            id="test-concept",
            title="Test Concept",
            content="Test content",
            prerequisites=[],
            difficulty_level=2
        )
        
        # Simulate user performance history
        user_profile = {
            "performance_history": [
                {"concept_id": "test-concept", "score": 0.8, "timestamp": "2024-01-01T10:00:00"},
                {"concept_id": "test-concept", "score": 0.9, "timestamp": "2024-01-01T11:00:00"}
            ]
        }
        
        # Generate challenge with adaptive difficulty
        challenge = await catalyst_agent.generate_challenge(
            concept,
            {"difficulty": "adaptive", "user_profile": user_profile}
        )
        
        # Verify challenge was generated
        assert challenge is not None
        assert "question" in challenge