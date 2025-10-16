"""
Test cases for CLI interface error handling and timeout functionality.

These tests cover the issues fixed during the CLI debugging session:
- Rich console input handling
- Natural language error handling
- AI model discovery timeouts
- User experience improvements
"""

import asyncio
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from src.cli.interface import CLIInterface
from src.cli.state import CLIState
from src.core.config import ConfigManager
from src.core.exceptions import AuthenticationError, ModelNotFoundError, ProviderError, ProviderRegistrationError, ValidationError


class TestCLIInterface:
    """Test CLI interface functionality and error handling."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock configuration manager."""
        config = Mock(spec=ConfigManager)
        config.get.side_effect = lambda key, default=None: {
            "ai.default_provider": "openai",
            "ai.default_model": "gpt-4-custom-experimental",
            "ai.providers.openai.api_key": "fake_key",
            "ui.theme": "dark",
            "ui.show_token_usage": True,
        }.get(key, default)
        return config

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create CLI interface instance."""
        return CLIInterface(config_manager)

    def test_cli_interface_initialization(self, cli_interface):
        """Test CLI interface initializes correctly."""
        assert cli_interface.config is not None
        assert cli_interface.command_processor is not None
        assert cli_interface.state is not None
        assert cli_interface._ai_provider is None
        assert cli_interface._ai_model is None

    def test_output_handler_registration(self, cli_interface):
        """Test output handlers can be registered and used."""
        # Register mock handlers
        response_handler = Mock()
        error_handler = Mock()

        cli_interface.set_output_handler("response", response_handler)
        cli_interface.set_output_handler("error", error_handler)

        # Test response output
        cli_interface.output("Test response", "response")
        response_handler.assert_called_once_with("Test response")

        # Test error output
        cli_interface.output("Test error", "error")
        error_handler.assert_called_once_with("Test error")

        # Test default fallback (print)
        with patch("builtins.print") as mock_print:
            cli_interface.output("Default message", "unknown")
            mock_print.assert_called_once_with("Default message")

    @pytest.mark.asyncio
    async def test_input_handler_registration(self, cli_interface):
        """Test input handlers can be registered and used."""
        # Register mock handler
        mock_handler = AsyncMock(return_value="test input")
        cli_interface.set_input_handler(mock_handler)

        # Test input handling
        result = await cli_interface.get_user_input("Test prompt: ")
        mock_handler.assert_called_once_with("Test prompt: ")
        assert result == "test input"

    @pytest.mark.asyncio
    async def test_process_input_exit_commands(self, cli_interface):
        """Test exit commands are processed correctly."""
        # Test various exit commands
        exit_commands = ["/quit", "/exit", "quit", "exit"]

        for command in exit_commands:
            result = await cli_interface.process_input(command)
            assert result is False, f"Command '{command}' should return False"

    @pytest.mark.asyncio
    async def test_process_input_empty_input(self, cli_interface):
        """Test empty input is handled gracefully."""
        result = await cli_interface.process_input("")
        assert result is True

        result = await cli_interface.process_input("   ")
        assert result is True

    @pytest.mark.asyncio
    async def test_process_input_command_vs_conversation(self, cli_interface):
        """Test commands vs conversation input routing."""
        # Mock the command and conversation handlers
        cli_interface._handle_command = AsyncMock()
        cli_interface._handle_conversation_input = AsyncMock()

        # Test command routing
        await cli_interface.process_input("/help")
        cli_interface._handle_command.assert_called_once_with("/help")
        cli_interface._handle_conversation_input.assert_not_called()

        # Reset mocks
        cli_interface._handle_command.reset_mock()
        cli_interface._handle_conversation_input.reset_mock()

        # Test conversation routing
        await cli_interface.process_input("What is Python?")
        cli_interface._handle_conversation_input.assert_called_once_with("What is Python?")
        cli_interface._handle_command.assert_not_called()


class TestAIInitializationTimeouts:
    """Test AI initialization timeout handling."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock configuration manager."""
        config = Mock(spec=ConfigManager)
        config.get.side_effect = lambda key, default=None: {
            "ai.default_provider": "openai",
            "ai.default_model": "gpt-4-custom-experimental",
            "ai.providers.openai.api_key": "fake_key",
        }.get(key, default)
        return config

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create CLI interface instance."""
        return CLIInterface(config_manager)

    @pytest.mark.asyncio
    async def test_ai_initialization_missing_provider(self, cli_interface, config_manager):
        """Test AI initialization fails gracefully when provider is missing."""
        config_manager.get.side_effect = lambda key, default=None: {
            "ai.default_provider": None,  # Missing provider
            "ai.default_model": "gpt-4",
        }.get(key, default)

        with pytest.raises(ValidationError):
            await cli_interface._initialize_ai()

    @pytest.mark.asyncio
    async def test_ai_initialization_missing_api_key(self, cli_interface, config_manager):
        """Test AI initialization fails gracefully when API key is missing."""
        config_manager.get.side_effect = lambda key, default=None: {
            "ai.default_provider": "openai",
            "ai.default_model": "gpt-4",
            "ai.providers.openai.api_key": None,  # Missing API key
        }.get(key, default)

        with pytest.raises(AuthenticationError):
            await cli_interface._initialize_ai()

    @pytest.mark.asyncio
    async def test_ai_initialization_model_discovery_timeout(self, cli_interface):
        """Test model discovery timeout handling."""
        # Mock provider with slow model discovery
        mock_provider = Mock()
        mock_provider.list_available_models = AsyncMock()

        # Make list_available_models hang for longer than timeout
        async def hanging_models():
            await asyncio.sleep(10)  # Hang longer than 5-second timeout
            return Mock(chat=[])

        mock_provider.list_available_models.side_effect = hanging_models
        mock_provider.create_chat_model = Mock(return_value=Mock())

        with patch("src.cli.interface.ModelFactory.get_provider_instance", return_value=mock_provider):
            # Should not raise exception despite timeout
            result = await cli_interface._initialize_ai()
            assert result is True
            mock_provider.create_chat_model.assert_called_once_with("gpt-4-custom-experimental")

    @pytest.mark.asyncio
    async def test_ai_initialization_provider_registration_failure(self, cli_interface):
        """Test provider registration failure handling."""
        with patch("src.cli.interface.ModelFactory.get_provider_instance", return_value=None):
            with pytest.raises(ProviderRegistrationError):
                await cli_interface._initialize_ai()

    @pytest.mark.asyncio
    async def test_ai_initialization_model_not_found(self, cli_interface):
        """Test model not found handling."""
        # Mock provider with no available models and no custom model support
        mock_provider = Mock()
        mock_provider.list_available_models = AsyncMock(return_value=Mock(chat=[]))
        mock_provider.create_chat_model = Mock(side_effect=NotImplementedError())

        with patch("src.cli.interface.ModelFactory.get_provider_instance", return_value=mock_provider):
            with pytest.raises(ModelNotFoundError):
                await cli_interface._initialize_ai()


class TestNaturalLanguageErrorHandling:
    """Test natural language input error handling."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock configuration manager."""
        config = Mock(spec=ConfigManager)
        config.get.side_effect = lambda key, default=None: {
            "ai.default_provider": "openai",
            "ai.default_model": "gpt-4-custom-experimental",
            "ai.providers.openai.api_key": "fake_key",
        }.get(key, default)
        return config

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create CLI interface instance."""
        interface = CLIInterface(config_manager)

        # Register output handlers for testing
        interface.responses = []
        interface.errors = []

        def capture_response(msg):
            interface.responses.append(msg)

        def capture_error(msg):
            interface.errors.append(msg)

        interface.set_output_handler("response", capture_response)
        interface.set_output_handler("error", capture_error)

        return interface

    @pytest.mark.asyncio
    async def test_natural_language_ai_configuration_issue(self, cli_interface):
        """Test helpful error message when AI is not configured."""
        # Mock _initialize_ai to raise authentication error
        cli_interface._initialize_ai = AsyncMock(side_effect=AuthenticationError("openai", "Invalid API key"))

        # Process natural language input
        await cli_interface._handle_conversation_input("What is Python?")

        # Should show helpful error message with new improved format
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "AI Response Issue" in response
        assert "What is Python?" in response
        assert "/config" in response
        assert "provider openai" in response

    @pytest.mark.asyncio
    async def test_natural_language_timeout_handling(self, cli_interface):
        """Test timeout handling during AI response."""
        # Mock successful AI initialization but hanging response
        mock_model = Mock()
        mock_model.send_message = AsyncMock()

        # Make send_message hang longer than timeout
        async def hanging_response(*args, **kwargs):
            await asyncio.sleep(15)  # Hang longer than 10-second timeout

        mock_model.send_message.side_effect = hanging_response

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface._handle_conversation_input("What is machine learning?")

        # Should show timeout error message
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "AI Response Timed Out" in response
        assert "machine learning" in response
        assert "internet connection" in response

    @pytest.mark.asyncio
    async def test_natural_language_provider_error_handling(self, cli_interface):
        """Test provider error handling during AI response."""
        # Mock successful AI initialization but provider error
        mock_model = Mock()
        mock_model.send_message = AsyncMock(side_effect=ProviderError("openai", "API connection failed"))

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface._handle_conversation_input("Explain neural networks")

        # Should show provider connection error message (new improved format)
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "Provider Connection Issue" in response
        assert "neural networks" in response

    @pytest.mark.asyncio
    async def test_natural_language_validation_error_handling(self, cli_interface):
        """Test validation error handling during AI response."""
        # Mock successful AI initialization but validation error
        mock_model = Mock()
        mock_model.send_message = AsyncMock(side_effect=ValidationError("temperature", 3.0, "must be between 0.0 and 2.0"))

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface._handle_conversation_input("Help me debug code")

        # Should show configuration validation issue (new improved format)
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "Configuration Validation Issue" in response
        assert "debug code" in response

    @pytest.mark.asyncio
    async def test_natural_language_authentication_error_handling(self, cli_interface):
        """Test authentication error handling during AI response."""
        # Mock successful AI initialization but authentication error
        mock_model = Mock()
        mock_model.send_message = AsyncMock(side_effect=AuthenticationError("openai", "Invalid API key"))

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface._handle_conversation_input("Teach me about algorithms")

        # Should show authentication error message
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "Authentication or Model Issue" in response
        assert "algorithms" in response
        assert "API key" in response

    @pytest.mark.asyncio
    async def test_natural_language_model_not_found_error_handling(self, cli_interface):
        """Test model not found error handling during AI response."""
        # Mock successful AI initialization but model error
        mock_model = Mock()
        mock_model.send_message = AsyncMock(side_effect=ModelNotFoundError("gpt-5", "openai"))

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface._handle_conversation_input("What is data science?")

        # Should show authentication/model error message
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "Authentication or Model Issue" in response
        assert "data science" in response

    @pytest.mark.asyncio
    async def test_natural_language_general_error_handling(self, cli_interface):
        """Test general error handling during AI response."""
        # Mock successful AI initialization but general error
        mock_model = Mock()
        mock_model.send_message = AsyncMock(side_effect=Exception("Unexpected error"))

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Process natural language input
        await cli_interface._handle_conversation_input("How does recursion work?")

        # Should show unexpected issue error message (new improved format)
        assert len(cli_interface.responses) == 1
        response = cli_interface.responses[0]
        assert "Unexpected Issue Encountered" in response
        assert "recursion" in response
        assert "/config" in response
        assert "/help" in response

    @pytest.mark.asyncio
    async def test_natural_language_successful_response(self, cli_interface):
        """Test successful AI response handling."""
        # Mock successful AI initialization and response
        from src.core.models import ChatResponse

        mock_response = ChatResponse(
            content="Python is a high-level programming language...",
            finish_reason="stop",
            usage={"prompt_tokens": 10, "completion_tokens": 20},
            model="gpt-4",
            timestamp=1234567890,
        )

        mock_model = Mock()
        mock_model.send_message = AsyncMock(return_value=mock_response)

        cli_interface._ai_provider = Mock()
        cli_interface._ai_model = mock_model

        # Set up a rich_panel handler to capture the Rich panel
        rich_panels = []

        def capture_rich_panel(panel):
            rich_panels.append(panel)

        cli_interface.set_output_handler("rich_panel", capture_rich_panel)

        # Process natural language input
        await cli_interface._handle_conversation_input("What is Python?")

        # Should show AI response as Rich panel
        assert len(rich_panels) == 1
        panel = rich_panels[0]
        # Check that it's a Rich panel with the expected content
        assert hasattr(panel, "title")
        assert hasattr(panel, "renderable")
        # The content should be in the panel's renderable (Markdown object)
        markdown_obj = panel.renderable
        assert hasattr(markdown_obj, "markup")
        assert "Python is a high-level programming language" in markdown_obj.markup

        # Check conversation history
        assert len(cli_interface.state.conversation_history) == 2
        assert cli_interface.state.conversation_history[0]["role"] == "user"
        assert cli_interface.state.conversation_history[0]["content"] == "What is Python?"
        assert cli_interface.state.conversation_history[1]["role"] == "assistant"
        assert "Python is a high-level programming language" in cli_interface.state.conversation_history[1]["content"]


class TestCommandProcessing:
    """Test command processing functionality."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock configuration manager."""
        return Mock(spec=ConfigManager)

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create CLI interface instance."""
        interface = CLIInterface(config_manager)

        # Register output handlers for testing
        interface.responses = []
        interface.errors = []

        def capture_response(msg):
            interface.responses.append(msg)

        def capture_error(msg):
            interface.errors.append(msg)

        interface.set_output_handler("response", capture_response)
        interface.set_output_handler("error", capture_error)

        return interface

    @pytest.mark.asyncio
    async def test_successful_command_processing(self, cli_interface):
        """Test successful command processing."""
        # Mock successful command result
        mock_result = Mock()
        mock_result.success = True
        mock_result.message = "Command executed successfully"
        mock_result.data = {"key": "value"}

        cli_interface.command_processor.process_command = AsyncMock(return_value=mock_result)

        # Process command
        await cli_interface._handle_command("/help")

        # Should show success response (data is shown separately as info)
        assert len(cli_interface.responses) == 1
        assert "Command executed successfully" in cli_interface.responses[0]

    @pytest.mark.asyncio
    async def test_failed_command_processing(self, cli_interface):
        """Test failed command processing."""
        # Mock failed command result
        mock_result = Mock()
        mock_result.success = False
        mock_result.message = "Command failed"

        cli_interface.command_processor.process_command = AsyncMock(return_value=mock_result)

        # Process command
        await cli_interface._handle_command("/invalid-command")

        # Should show error response
        assert len(cli_interface.errors) == 1
        assert "Command failed" in cli_interface.errors[0]

    @pytest.mark.asyncio
    async def test_command_processing_exception(self, cli_interface):
        """Test command processing exception handling."""
        # Mock command processor raising exception
        cli_interface.command_processor.process_command = AsyncMock(side_effect=Exception("Processing error"))

        # Process command
        await cli_interface._handle_command("/broken-command")

        # Should show enhanced command error response (new improved format)
        assert len(cli_interface.errors) == 1
        assert "Command Error" in cli_interface.errors[0]
        assert "broken-command" in cli_interface.errors[0]
        assert "Details" in cli_interface.errors[0]


class TestRichConsoleInputHandling:
    """Test Rich console input handling fixes."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock configuration manager."""
        return Mock(spec=ConfigManager)

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create CLI interface instance."""
        return CLIInterface(config_manager)

    @pytest.mark.asyncio
    async def test_fallback_to_default_input(self, cli_interface):
        """Test fallback to default input when no handler is set."""
        with patch("builtins.input", return_value="test input") as mock_input:
            result = await cli_interface.get_user_input("Prompt: ")
            mock_input.assert_called_once_with("Prompt: ")
            assert result == "test input"

    @pytest.mark.asyncio
    async def test_custom_input_handler_priority(self, cli_interface):
        """Test custom input handler takes priority over default."""
        # Register custom handler
        custom_handler = AsyncMock(return_value="custom input")
        cli_interface.set_input_handler(custom_handler)

        with patch("builtins.input") as mock_input:
            result = await cli_interface.get_user_input("Prompt: ")
            custom_handler.assert_called_once_with("Prompt: ")
            mock_input.assert_not_called()
            assert result == "custom input"


class TestSessionManagement:
    """Test session management functionality."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock configuration manager."""
        config = Mock(spec=ConfigManager)
        config.get.side_effect = lambda key, default=None: {
            "ai.default_provider": "openai",
            "ai.default_model": "gpt-4",
            "ui.theme": "dark",
            "ui.show_token_usage": True,
        }.get(key, default)
        return config

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create CLI interface instance."""
        interface = CLIInterface(config_manager)

        # Register output handlers for testing
        interface.outputs = []

        def capture_output(msg, output_type="response"):
            interface.outputs.append((msg, output_type))

        interface.set_output_handler("response", capture_output)
        interface.set_output_handler("info", capture_output)

        return interface

    def test_get_session_info(self, cli_interface):
        """Test session information retrieval."""
        # Set some state
        cli_interface.state.session_active = True
        cli_interface.state.current_provider = "openai"
        cli_interface.state.current_model = "gpt-4"
        cli_interface.state.conversation_history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]

        # Get session info
        info = cli_interface.get_session_info()

        assert info["active"] is True
        assert info["provider"] == "openai"
        assert info["model"] == "gpt-4"
        assert info["history_length"] == 2
        assert info["config"]["theme"] == "dark"
        assert info["config"]["show_tokens"] is True

    @pytest.mark.asyncio
    async def test_start_session(self, cli_interface):
        """Test session start functionality."""
        await cli_interface.start_session()

        # After UX improvements, start_session should be silent to avoid redundant messages
        # Welcome messages are handled by main.py
        assert len(cli_interface.outputs) == 0

    def test_stop_session(self, cli_interface):
        """Test session stop functionality."""
        cli_interface.state.session_active = True
        cli_interface.stop_session()

        assert cli_interface.state.session_active is False
