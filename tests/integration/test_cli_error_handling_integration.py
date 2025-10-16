"""
Integration tests for CLI error handling and timeout functionality.

These tests specifically cover the issues identified and fixed during the debugging session:
- Rich console input handling errors
- Natural language processing timeouts and hangs
- AI model discovery timeout handling
- User experience during configuration errors
- Session resilience and error recovery
"""

import pytest
import asyncio
import tempfile
import json
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from io import StringIO
import sys

from src.core.config import ConfigManager
from src.core.exceptions import (
    ValidationError, AuthenticationError, ProviderRegistrationError,
    ModelNotFoundError, ProviderError
)
from src.cli.interface import CLIInterface
from src.cli.state import CLIState


class TestCLIErrorHandlingIntegration:
    """Integration tests for CLI error handling scenarios."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create temporary configuration directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def invalid_config_manager(self, temp_config_dir):
        """Create configuration manager with invalid AI settings."""
        config_file = temp_config_dir / "config.json"

        test_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4-custom-experimental",
                "providers": {
                    "openai": {
                        "api_key": "fake_invalid_key_12345"
                    }
                }
            },
            "ui": {
                "theme": "dark",
                "show_token_usage": True
            }
        }

        with open(config_file, 'w') as f:
            json.dump(test_config, f)

        return ConfigManager(temp_config_dir)

    @pytest.fixture
    def cli_interface(self, invalid_config_manager):
        """Create CLI interface with invalid configuration."""
        interface = CLIInterface(invalid_config_manager)

        # Capture outputs for testing
        interface.captured_responses = []
        interface.captured_errors = []
        interface.captured_info = []

        def capture_response(msg):
            interface.captured_responses.append(msg)

        def capture_error(msg):
            interface.captured_errors.append(msg)

        def capture_info(msg):
            interface.captured_info.append(msg)

        interface.set_output_handler("response", capture_response)
        interface.set_output_handler("error", capture_error)
        interface.set_output_handler("info", capture_info)

        return interface

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_natural_language_with_invalid_ai_configuration(self, cli_interface):
        """Test natural language input handling when AI is not properly configured."""
        # This was the main issue reported by the user - getting stuck on natural language

        # Process natural language input
        session_continues = await cli_interface.process_input("What is machine learning?")

        # Session should continue (not crash or hang)
        assert session_continues is True
        assert cli_interface.state.session_active is True

        # Should show helpful error message
        assert len(cli_interface.captured_responses) > 0
        error_message = cli_interface.captured_responses[0]

        # Verify error message content
        assert "AI Configuration Issue" in error_message
        assert "What is machine learning?" in error_message
        assert "/config" in error_message
        assert "provider openai" in error_message
        assert "💡 Let's get you set up" in error_message

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_multiple_natural_language_errors_recovery(self, cli_interface):
        """Test recovery from multiple consecutive natural language errors."""
        user_inputs = [
            "First question about Python",
            "Second question about AI",
            "Third question about coding"
        ]

        for user_input in user_inputs:
            session_continues = await cli_interface.process_input(user_input)

            # Each should continue the session
            assert session_continues is True
            assert cli_interface.state.session_active is True

        # Should have handled all errors
        assert len(cli_interface.captured_responses) == len(user_inputs)

        # Each error message should acknowledge the specific user input
        for i, user_input in enumerate(user_inputs):
            error_message = cli_interface.captured_responses[i]
            assert user_input in error_message
            assert "AI Configuration Issue" in error_message

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_commands_work_despite_ai_configuration_errors(self, cli_interface):
        """Test that CLI commands continue to work even when AI is not configured."""
        # Mock successful command processing
        mock_result = Mock()
        mock_result.success = True
        mock_result.message = "Help command executed successfully"
        mock_result.data = None

        with patch.object(cli_interface.command_processor, 'process_command', return_value=mock_result):
            # Process command input
            session_continues = await cli_interface.process_input("/help")

            # Should work normally
            assert session_continues is True
            assert len(cli_interface.captured_responses) == 1
            assert "Help command executed successfully" in cli_interface.captured_responses[0]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_mixed_command_and_natural_language_workflow(self, cli_interface):
        """Test mixed workflow with both commands and natural language."""
        # Mock successful command processing
        mock_result = Mock()
        mock_result.success = True
        mock_result.message = "Command successful"
        mock_result.data = None

        with patch.object(cli_interface.command_processor, 'process_command', return_value=mock_result):
            # Test mixed sequence
            interactions = [
                "/help",  # Command - should work
                "What is Python?",  # Natural language - should show error
                "/config",  # Command - should work
                "Explain neural networks",  # Natural language - should show error
                "/quit"  # Command - should exit
            ]

            for interaction in interactions:
                session_continues = await cli_interface.process_input(interaction)

                if interaction == "/quit":
                    assert session_continues is False  # Should exit
                else:
                    assert session_continues is True  # Should continue

            # Verify responses
            # Should have 2 command responses + 2 error messages = 4 total responses
            assert len(cli_interface.captured_responses) == 4

            # Commands should be successful
            assert cli_interface.captured_responses[0] == "Command successful"  # /help
            assert cli_interface.captured_responses[2] == "Command successful"  # /config

            # Natural language should show configuration errors
            assert "AI Configuration Issue" in cli_interface.captured_responses[1]
            assert "What is Python?" in cli_interface.captured_responses[1]
            assert "AI Configuration Issue" in cli_interface.captured_responses[3]
            assert "Explain neural networks" in cli_interface.captured_responses[3]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_ai_model_discovery_timeout_handling(self, cli_interface):
        """Test timeout handling during AI model discovery."""
        # Mock provider with hanging model discovery
        mock_provider = Mock()
        mock_provider.list_available_models = AsyncMock()

        # Make list_available_models hang longer than our 5-second timeout
        async def hanging_models():
            await asyncio.sleep(10)  # Hang longer than timeout
            return Mock(chat=[])

        mock_provider.list_available_models.side_effect = hanging_models
        mock_provider.create_chat_model = Mock(return_value=Mock())

        with patch('src.cli.interface.ModelFactory.get_provider_instance', return_value=mock_provider):
            # Should not hang despite model discovery timeout
            result = await cli_interface._initialize_ai()
            assert result is True
            mock_provider.create_chat_model.assert_called_once_with("gpt-4-custom-experimental")

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_ai_response_timeout_handling(self, cli_interface):
        """Test timeout handling during AI response generation."""
        # Mock successful AI initialization but hanging response
        mock_model = Mock()
        mock_model.send_message = AsyncMock()

        # Make send_message hang longer than our 10-second timeout
        async def hanging_response(*args, **kwargs):
            await asyncio.sleep(15)  # Hang longer than timeout

        mock_model.send_message.side_effect = hanging_response

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface.process_input("This will timeout")

        # Should show timeout error message
        assert len(cli_interface.captured_responses) == 1
        error_message = cli_interface.captured_responses[0]
        assert "AI Response Timed Out" in error_message
        assert "This will timeout" in error_message
        assert "internet connection" in error_message

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_session_history_preserved_despite_errors(self, cli_interface):
        """Test that conversation history is preserved even when AI responses fail."""
        user_inputs = [
            "First question",
            "Second question",
            "Third question"
        ]

        for user_input in user_inputs:
            await cli_interface.process_input(user_input)

        # Should have preserved conversation history
        assert len(cli_interface.state.conversation_history) == len(user_inputs) * 2  # user + assistant for each

        # Verify history content
        for i, user_input in enumerate(user_inputs):
            user_message = cli_interface.state.conversation_history[i * 2]
            assistant_message = cli_interface.state.conversation_history[i * 2 + 1]

            assert user_message["role"] == "user"
            assert user_message["content"] == user_input

            assert assistant_message["role"] == "assistant"
            # Assistant message should contain the helpful error response
            assert "AI Configuration Issue" in assistant_message["content"]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_keyboard_interrupt_during_natural_language_processing(self, cli_interface):
        """Test keyboard interrupt handling during natural language processing."""
        # Mock input to raise KeyboardInterrupt
        cli_interface.set_input_handler(AsyncMock(side_effect=KeyboardInterrupt()))

        # Should handle KeyboardInterrupt gracefully
        with patch('builtins.print') as mock_print:
            result = await cli_interface.run_interactive_loop()
            # Should have printed goodbye message
            mock_print.assert_called_with("\n👋 Goodbye!")

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_various_ai_exception_types_handled_gracefully(self, cli_interface):
        """Test that different types of AI exceptions are handled with appropriate messages."""
        exception_scenarios = [
            (AuthenticationError("openai", "Invalid API key"), "Authentication or Model Issue"),
            (ModelNotFoundError("gpt-5", "openai"), "Authentication or Model Issue"),
            (ProviderError("openai", "Connection failed"), "Provider Configuration Issue"),
            (ValidationError("temperature", 3.0, "Too high"), "Provider Configuration Issue"),
            (Exception("Unexpected error"), "Technical Issue Encountered")
        ]

        for exception, expected_error_type in exception_scenarios:
            # Clear previous outputs
            cli_interface.captured_responses.clear()

            # Mock AI model to raise specific exception
            mock_model = Mock()
            mock_model.send_message = AsyncMock(side_effect=exception)

            cli_interface._ai_provider = Mock()
            cli_interface._ai_model = mock_model

            # Process natural language input
            await cli_interface.process_input("Test question")

            # Should show appropriate error message
            assert len(cli_interface.captured_responses) == 1
            error_message = cli_interface.captured_responses[0]
            assert expected_error_type in error_message
            assert "Test question" in error_message

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_rich_console_input_handling(self):
        """Test Rich console input handling fixes."""
        temp_dir = Path(tempfile.mkdtemp())
        config_manager = ConfigManager(temp_dir)
        cli_interface = CLIInterface(config_manager)

        # Test custom input handler
        custom_input = AsyncMock(return_value="test input")
        cli_interface.set_input_handler(custom_input)

        result = await cli_interface.get_user_input("Prompt: ")
        assert result == "test input"
        custom_input.assert_called_once_with("Prompt: ")

        # Test fallback to default input
        cli_interface._input_handler = None
        with patch('builtins.input', return_value="fallback input") as mock_input:
            result = await cli_interface.get_user_input("Prompt: ")
            assert result == "fallback input"
            mock_input.assert_called_once_with("Prompt: ")

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_configuration_provider_switch_workflow(self, cli_interface):
        """Test provider configuration and switching workflow."""
        # Mock successful command processing for configuration commands
        mock_result = Mock()
        mock_result.success = True
        mock_result.message = "Configuration updated"
        mock_result.data = None

        with patch.object(cli_interface.command_processor, 'process_command', return_value=mock_result):
            # Test provider configuration workflow
            config_commands = [
                "/config provider deepseek",
                "/config model deepseek-chat",
                "/config"
            ]

            for command in config_commands:
                session_continues = await cli_interface.process_input(command)
                assert session_continues is True

            # Should have processed all configuration commands successfully
            assert len(cli_interface.captured_responses) == len(config_commands)
            for response in cli_interface.captured_responses:
                assert response == "Configuration updated"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_user_experience_error_recovery_guidance(self, cli_interface):
        """Test that error messages provide clear guidance for recovery."""
        await cli_interface.process_input("How do I learn React?")

        error_message = cli_interface.captured_responses[0]

        # Verify error message contains actionable guidance
        guidance_elements = [
            "AI Configuration Issue",  # Clear problem identification
            "How do I learn React?",  # Acknowledges user input
            "1️⃣",  # Numbered steps
            "Check current setup",  # Clear first step
            "/config",  # Specific command to run
            "Configure a provider",  # Clear second step
            "provider openai",  # Concrete example
            "Select a model",  # Clear third step
            "Try your question again",  # Clear final step
            "💡"  # Helpful emoji indicator
        ]

        for element in guidance_elements:
            assert element in error_message, f"Missing guidance element: {element}"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_session_resilience_after_configuration_fix(self, cli_interface):
        """Test session resilience after AI configuration is fixed."""
        # Initially, natural language should fail
        await cli_interface.process_input("Initial question")
        assert len(cli_interface.captured_responses) == 1
        assert "AI Configuration Issue" in cli_interface.captured_responses[0]

        # Mock successful AI configuration fix
        mock_model = Mock()
        mock_model.send_message = AsyncMock(return_value=Mock(
            content="Python is a programming language...",
            finish_reason="stop",
            usage={},
            model="gpt-4",
            timestamp=1234567890
        ))

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Clear previous responses
        cli_interface.captured_responses.clear()

        # Now natural language should work
        await cli_interface.process_input("What is Python?")

        # Should get successful AI response
        assert len(cli_interface.captured_responses) == 1
        response = cli_interface.captured_responses[0]
        assert "Python is a programming language" in response

    @pytest.mark.integration
    def test_cli_interface_import_organization(self):
        """Test that imports are properly organized at file headers."""
        # This test verifies the fix for import organization issue
        from src.cli.interface import CLIInterface

        # Should be able to import without errors
        assert CLIInterface is not None

        # Test that the module has expected attributes
        import inspect
        source = inspect.getsource(CLIInterface)

        # Check that imports are at the top of the file (not inline)
        lines = source.split('\n')
        import_lines = [line for line in lines if line.strip().startswith('import ') or line.strip().startswith('from ')]

        # Should have imports at the beginning of the file
        assert len(import_lines) > 0
        # First non-comment, non-docstring line should be an import
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith('"""') and not stripped.startswith('#'):
                assert stripped.startswith('import ') or stripped.startswith('from '), f"First line should be import: {stripped}"
                break