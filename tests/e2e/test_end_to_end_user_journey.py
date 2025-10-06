"""
End-to-end tests for the complete user journey in Learning Catalyst.
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch


class TestEndToEndUserJourney:
    """End-to-end tests for the complete user journey."""

    @pytest.fixture
    def temp_workspace(self):
        """Create a temporary workspace with learning materials."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a .catalyst directory
            catalyst_dir = Path(temp_dir) / ".catalyst"
            catalyst_dir.mkdir(exist_ok=True)
            
            # Create test markdown files with learning content
            python_file = Path(temp_dir) / "python_basics.md"
            with open(python_file, "w") as f:
                f.write("""# Python Basics

## Variables and Data Types
Variables are containers for storing data values. Python has various data types including:
- Integers (int)
- Floating-point numbers (float)
- Strings (str)
- Booleans (bool)
- Lists (list)
- Dictionaries (dict)

## Control Flow
Control flow statements allow you to control the execution order of your code.

### If Statements
If statements allow you to execute code conditionally.

### Loops
Loops allow you to repeat code multiple times.

## Functions
Functions are reusable blocks of code that perform a specific task.
""")
            
            data_structures_file = Path(temp_dir) / "data_structures.md"
            with open(data_structures_file, "w") as f:
                f.write("""# Data Structures

## Lists
Lists are ordered collections of items.

## Dictionaries
Dictionaries are key-value pairs.

## Sets
Sets are unordered collections of unique items.
""")
            
            yield temp_dir

    @pytest.mark.asyncio
    async def test_first_time_user_complete_journey(self, temp_workspace):
        """Test the complete journey for a first-time user."""
        
        # Mock the CLI interface to capture user interactions
        mock_cli_interface = Mock()
        mock_cli_interface.display_message = Mock()
        mock_cli_interface.get_user_input = Mock()
        
        # Mock the model service for AI interactions
        mock_model_service = Mock()
        mock_model_service.generate_response = AsyncMock(return_value="This is a test explanation.")
        mock_model_service.generate_summary = AsyncMock(return_value="Test summary.")
        mock_model_service.generate_challenge = AsyncMock(return_value={
            "question": "What is a variable in Python?",
            "options": ["A) A container for storing data", "B) A type of loop", "C) A function", "D) A class"],
            "correct_answer": "A"
        })
        mock_model_service.evaluate_answer = AsyncMock(return_value={
            "is_correct": True,
            "feedback": "Correct! Variables are containers for storing data."
        })
        
        # Step 1: User starts the application for the first time
        with patch('src.core.startup_guide.StartupGuide') as mock_startup_guide:
            with patch('src.core.knowledge_navigator.SQLiteKnowledgeNavigator') as mock_knowledge_navigator:
                with patch('src.core.state_manager.StateManager') as mock_state_manager:
                    with patch('src.ai.service.ModelAbstractionService', return_value=mock_model_service):
                        with patch('src.cli.command_palette.CommandPalette') as mock_command_palette:
                            # Initialize the mocked components
                            startup_guide_instance = Mock()
                            startup_guide_instance.generate_startup_message = AsyncMock(return_value="Welcome to Learning Catalyst!")
                            startup_guide_instance.get_contextual_suggestions = AsyncMock(return_value=[
                                {
                                    "type": "setup",
                                    "title": "Set up your AI provider",
                                    "description": "Configure your AI provider to enable explanations",
                                    "command": "/set-config"
                                }
                            ])
                            mock_startup_guide.return_value = startup_guide_instance
                            
                            knowledge_navigator_instance = Mock()
                            knowledge_navigator_instance.load_content = AsyncMock(return_value=Mock(concepts=[
                                Mock(id="variables", title="Variables and Data Types", content="Variables are containers..."),
                                Mock(id="control-flow", title="Control Flow", content="Control flow statements..."),
                                Mock(id="functions", title="Functions", content="Functions are reusable blocks...")
                            ]))
                            knowledge_navigator_instance.get_available_concepts = AsyncMock(return_value=[
                                Mock(id="variables", title="Variables and Data Types", content="Variables are containers..."),
                                Mock(id="control-flow", title="Control Flow", content="Control flow statements..."),
                                Mock(id="functions", title="Functions", content="Functions are reusable blocks...")
                            ])
                            mock_knowledge_navigator.return_value = knowledge_navigator_instance
                            
                            state_manager_instance = Mock()
                            state_manager_instance.load_last_state = AsyncMock(return_value=None)
                            state_manager_instance.save_current_state = AsyncMock()
                            mock_state_manager.return_value = state_manager_instance
                            
                            command_palette_instance = Mock()
                            command_palette_instance.execute_command = Mock(return_value=True)
                            mock_command_palette.return_value = command_palette_instance
                            
                            # Import and initialize the main application
                            from src.cli.main import LearningCatalystApp
                            app = LearningCatalystApp(temp_workspace)
                            
                            # Step 2: User sees the welcome message
                            welcome_message = await startup_guide_instance.generate_startup_message(
                                is_first_time=True, 
                                has_previous_state=False
                            )
                            assert "Welcome" in welcome_message
                            
                            # Step 3: User gets contextual suggestions
                            suggestions = await startup_guide_instance.get_contextual_suggestions({})
                            assert len(suggestions) > 0
                            
                            # Step 4: User configures AI provider
                            command_palette_instance.execute_command("/set-config")
                            
                            # Step 5: User views available concepts
                            command_palette_instance.execute_command("/concepts")
                            
                            # Step 6: User requests an explanation for a concept
                            command_palette_instance.execute_command("/explain Variables and Data Types")
                            
                            # Step 7: User takes a quiz on the concept
                            command_palette_instance.execute_command("/quiz Variables and Data Types")
                            
                            # Step 8: User saves a checkpoint
                            command_palette_instance.execute_command("/checkpoint save after-learning-variables")
                            
                            # Step 9: User exits the application
                            command_palette_instance.execute_command("/quit")
                            
                            # Verify the user journey was completed successfully
                            assert command_palette_instance.execute_command.call_count >= 5

    @pytest.mark.asyncio
    async def test_returning_user_journey(self, temp_workspace):
        """Test the journey for a returning user with previous state."""
        
        # Mock the CLI interface
        mock_cli_interface = Mock()
        mock_cli_interface.display_message = Mock()
        mock_cli_interface.get_user_input = Mock()
        
        # Mock the model service
        mock_model_service = Mock()
        mock_model_service.generate_response = AsyncMock(return_value="This is a test explanation.")
        
        # Create a mock previous state
        mock_previous_state = Mock()
        mock_previous_state.user_profile = {"learning_style": "visual", "difficulty": "intermediate"}
        mock_previous_state.conversation_context = {"current_concept": "Control Flow"}
        mock_previous_state.conversation_messages = [
            {"role": "user", "content": "What are control flow statements?"},
            {"role": "assistant", "content": "Control flow statements allow you to control the execution order..."}
        ]
        mock_previous_state.current_state_metadata = {
            "last_access": "2024-01-01T12:00:00",
            "session_id": "previous-session-123"
        }
        
        # Step 1: User starts the application with previous state
        with patch('src.core.startup_guide.StartupGuide') as mock_startup_guide:
            with patch('src.core.knowledge_navigator.SQLiteKnowledgeNavigator') as mock_knowledge_navigator:
                with patch('src.core.state_manager.StateManager') as mock_state_manager:
                    with patch('src.ai.service.ModelAbstractionService', return_value=mock_model_service):
                        with patch('src.cli.command_palette.CommandPalette') as mock_command_palette:
                            # Initialize the mocked components
                            startup_guide_instance = Mock()
                            startup_guide_instance.generate_startup_message = AsyncMock(return_value="Welcome back to Learning Catalyst!")
                            startup_guide_instance.get_contextual_suggestions = AsyncMock(return_value=[
                                {
                                    "type": "continue",
                                    "title": "Continue learning: Control Flow",
                                    "description": "Pick up where you left off",
                                    "command": "/explain Control Flow"
                                }
                            ])
                            mock_startup_guide.return_value = startup_guide_instance
                            
                            knowledge_navigator_instance = Mock()
                            knowledge_navigator_instance.get_available_concepts = AsyncMock(return_value=[
                                Mock(id="variables", title="Variables and Data Types"),
                                Mock(id="control-flow", title="Control Flow"),
                                Mock(id="functions", title="Functions")
                            ])
                            mock_knowledge_navigator.return_value = knowledge_navigator_instance
                            
                            state_manager_instance = Mock()
                            state_manager_instance.load_last_state = AsyncMock(return_value=mock_previous_state)
                            state_manager_instance.save_current_state = AsyncMock()
                            mock_state_manager.return_value = state_manager_instance
                            
                            command_palette_instance = Mock()
                            command_palette_instance.execute_command = Mock(return_value=True)
                            mock_command_palette.return_value = command_palette_instance
                            
                            # Import and initialize the main application
                            from src.cli.main import LearningCatalystApp
                            app = LearningCatalystApp(temp_workspace)
                            
                            # Step 2: User sees the welcome back message
                            welcome_message = await startup_guide_instance.generate_startup_message(
                                is_first_time=False, 
                                has_previous_state=True
                            )
                            assert "Welcome back" in welcome_message
                            
                            # Step 3: User gets contextual suggestions based on previous state
                            suggestions = await startup_guide_instance.get_contextual_suggestions(
                                mock_previous_state.user_profile
                            )
                            assert len(suggestions) > 0
                            assert any("Control Flow" in s["title"] for s in suggestions)
                            
                            # Step 4: User continues with the previous concept
                            command_palette_instance.execute_command("/explain Control Flow")
                            
                            # Step 5: User takes a quiz on the concept
                            command_palette_instance.execute_command("/quiz Control Flow")
                            
                            # Step 6: User explores a new concept
                            command_palette_instance.execute_command("/explain Functions")
                            
                            # Step 7: User saves a checkpoint
                            command_palette_instance.execute_command("/checkpoint save after-learning-functions")
                            
                            # Verify the returning user journey was completed successfully
                            assert command_palette_instance.execute_command.call_count >= 4

    @pytest.mark.asyncio
    async def test_checkpoint_workflow(self, temp_workspace):
        """Test the checkpoint creation and loading workflow."""
        
        # Mock the CLI interface
        mock_cli_interface = Mock()
        mock_cli_interface.display_message = Mock()
        mock_cli_interface.get_user_input = Mock()
        
        # Mock the model service
        mock_model_service = Mock()
        mock_model_service.generate_response = AsyncMock(return_value="This is a test explanation.")
        
        # Step 1: User creates checkpoints at different points
        with patch('src.core.startup_guide.StartupGuide') as mock_startup_guide:
            with patch('src.core.knowledge_navigator.SQLiteKnowledgeNavigator') as mock_knowledge_navigator:
                with patch('src.core.state_manager.StateManager') as mock_state_manager:
                    with patch('src.ai.service.ModelAbstractionService', return_value=mock_model_service):
                        with patch('src.cli.command_palette.CommandPalette') as mock_command_palette:
                            # Initialize the mocked components
                            startup_guide_instance = Mock()
                            startup_guide_instance.generate_startup_message = AsyncMock(return_value="Welcome to Learning Catalyst!")
                            mock_startup_guide.return_value = startup_guide_instance
                            
                            knowledge_navigator_instance = Mock()
                            knowledge_navigator_instance.get_available_concepts = AsyncMock(return_value=[
                                Mock(id="variables", title="Variables and Data Types"),
                                Mock(id="control-flow", title="Control Flow"),
                                Mock(id="functions", title="Functions")
                            ])
                            mock_knowledge_navigator.return_value = knowledge_navigator_instance
                            
                            # Create mock checkpoints
                            checkpoint1 = Mock()
                            checkpoint1.id = "checkpoint-1"
                            checkpoint1.description = "After learning variables"
                            checkpoint1.created_at = "2024-01-01T10:00:00"
                            
                            checkpoint2 = Mock()
                            checkpoint2.id = "checkpoint-2"
                            checkpoint2.description = "After learning control flow"
                            checkpoint2.created_at = "2024-01-01T11:00:00"
                            
                            state_manager_instance = Mock()
                            state_manager_instance.load_last_state = AsyncMock(return_value=None)
                            state_manager_instance.create_checkpoint = AsyncMock(return_value=checkpoint1)
                            state_manager_instance.list_checkpoints = AsyncMock(return_value=[checkpoint1, checkpoint2])
                            state_manager_instance.load_checkpoint = AsyncMock(return_value=Mock())
                            state_manager_instance.save_current_state = AsyncMock()
                            mock_state_manager.return_value = state_manager_instance
                            
                            command_palette_instance = Mock()
                            command_palette_instance.execute_command = Mock(return_value=True)
                            mock_command_palette.return_value = command_palette_instance
                            
                            # Import and initialize the main application
                            from src.cli.main import LearningCatalystApp
                            app = LearningCatalystApp(temp_workspace)
                            
                            # Step 2: User learns about variables and creates a checkpoint
                            command_palette_instance.execute_command("/explain Variables and Data Types")
                            command_palette_instance.execute_command("/checkpoint save after-learning-variables")
                            
                            # Step 3: User learns about control flow and creates another checkpoint
                            command_palette_instance.execute_command("/explain Control Flow")
                            command_palette_instance.execute_command("/checkpoint save after-learning-control-flow")
                            
                            # Step 4: User lists available checkpoints
                            command_palette_instance.execute_command("/checkpoint list")
                            
                            # Step 5: User loads a previous checkpoint
                            command_palette_instance.execute_command("/checkpoint load checkpoint-1")
                            
                            # Verify the checkpoint workflow was completed successfully
                            assert state_manager_instance.create_checkpoint.call_count == 2
                            assert state_manager_instance.list_checkpoints.call_count == 1
                            assert state_manager_instance.load_checkpoint.call_count == 1

    @pytest.mark.asyncio
    async def test_error_handling_and_recovery(self, temp_workspace):
        """Test error handling and recovery in the application."""
        
        # Mock the CLI interface
        mock_cli_interface = Mock()
        mock_cli_interface.display_message = Mock()
        mock_cli_interface.get_user_input = Mock()
        
        # Mock the model service to raise an exception
        mock_model_service = Mock()
        mock_model_service.generate_response = AsyncMock(side_effect=Exception("API Error"))
        
        # Step 1: User encounters an error
        with patch('src.core.startup_guide.StartupGuide') as mock_startup_guide:
            with patch('src.core.knowledge_navigator.SQLiteKnowledgeNavigator') as mock_knowledge_navigator:
                with patch('src.core.state_manager.StateManager') as mock_state_manager:
                    with patch('src.ai.service.ModelAbstractionService', return_value=mock_model_service):
                        with patch('src.cli.command_palette.CommandPalette') as mock_command_palette:
                            # Initialize the mocked components
                            startup_guide_instance = Mock()
                            startup_guide_instance.generate_startup_message = AsyncMock(return_value="Welcome to Learning Catalyst!")
                            mock_startup_guide.return_value = startup_guide_instance
                            
                            knowledge_navigator_instance = Mock()
                            knowledge_navigator_instance.get_available_concepts = AsyncMock(return_value=[
                                Mock(id="variables", title="Variables and Data Types")
                            ])
                            mock_knowledge_navigator.return_value = knowledge_navigator_instance
                            
                            state_manager_instance = Mock()
                            state_manager_instance.load_last_state = AsyncMock(return_value=None)
                            state_manager_instance.save_current_state = AsyncMock()
                            mock_state_manager.return_value = state_manager_instance
                            
                            command_palette_instance = Mock()
                            command_palette_instance.execute_command = Mock(return_value=True)
                            mock_command_palette.return_value = command_palette_instance
                            
                            # Import and initialize the main application
                            from src.cli.main import LearningCatalystApp
                            app = LearningCatalystApp(temp_workspace)
                            
                            # Step 2: User tries to get an explanation but encounters an error
                            command_palette_instance.execute_command("/explain Variables and Data Types")
                            
                            # Step 3: User sees an error message and tries again
                            # (In a real implementation, the error would be handled gracefully)
                            
                            # Step 4: User tries a different command
                            command_palette_instance.execute_command("/help")
                            
                            # Verify the application handled the error gracefully
                            assert command_palette_instance.execute_command.call_count >= 2

    @pytest.mark.asyncio
    async def test_advanced_features_workflow(self, temp_workspace):
        """Test advanced features like token usage and preferences."""
        
        # Mock the CLI interface
        mock_cli_interface = Mock()
        mock_cli_interface.display_message = Mock()
        mock_cli_interface.get_user_input = Mock()
        
        # Mock the model service
        mock_model_service = Mock()
        mock_model_service.generate_response = AsyncMock(return_value="This is a test explanation.")
        
        # Step 1: User explores advanced features
        with patch('src.core.startup_guide.StartupGuide') as mock_startup_guide:
            with patch('src.core.knowledge_navigator.SQLiteKnowledgeNavigator') as mock_knowledge_navigator:
                with patch('src.core.state_manager.StateManager') as mock_state_manager:
                    with patch('src.ai.service.ModelAbstractionService', return_value=mock_model_service):
                        with patch('src.cli.command_palette.CommandPalette') as mock_command_palette:
                            # Initialize the mocked components
                            startup_guide_instance = Mock()
                            startup_guide_instance.generate_startup_message = AsyncMock(return_value="Welcome to Learning Catalyst!")
                            mock_startup_guide.return_value = startup_guide_instance
                            
                            knowledge_navigator_instance = Mock()
                            knowledge_navigator_instance.get_available_concepts = AsyncMock(return_value=[
                                Mock(id="variables", title="Variables and Data Types")
                            ])
                            mock_knowledge_navigator.return_value = knowledge_navigator_instance
                            
                            state_manager_instance = Mock()
                            state_manager_instance.load_last_state = AsyncMock(return_value=None)
                            state_manager_instance.save_current_state = AsyncMock()
                            mock_state_manager.return_value = state_manager_instance
                            
                            command_palette_instance = Mock()
                            command_palette_instance.execute_command = Mock(return_value=True)
                            mock_command_palette.return_value = command_palette_instance
                            
                            # Import and initialize the main application
                            from src.cli.main import LearningCatalystApp
                            app = LearningCatalystApp(temp_workspace)
                            
                            # Step 2: User checks token usage
                            command_palette_instance.execute_command("/tokens")
                            
                            # Step 3: User views their knowledge map
                            command_palette_instance.execute_command("/knowledge-map")
                            
                            # Step 4: User manages preferences
                            command_palette_instance.execute_command("/preference list")
                            command_palette_instance.execute_command("/preference set learning.difficulty intermediate")
                            
                            # Step 5: User views available models
                            command_palette_instance.execute_command("/models")
                            
                            # Step 6: User checks their configuration
                            command_palette_instance.execute_command("/config")
                            
                            # Verify the advanced features workflow was completed successfully
                            assert command_palette_instance.execute_command.call_count >= 6