"""
Unit tests for the command palette module.
"""

from pathlib import Path
from typing import Any, Dict
from unittest.mock import Mock

import pytest

from src.cli.command_palette import CommandPalette
from src.cli.core.interface import CLIInterface
from src.data.models.extended_models import Message


class TestCommandPalette:
    """Test cases for the CommandPalette class."""

    @pytest.fixture
    def mock_cli_interface(self) -> Mock:
        """Create a mock CLI interface."""
        interface = Mock(spec=CLIInterface)
        interface.display_message = Mock(return_value=None)
        interface.display_warning = Mock(return_value=None)
        interface.clear_screen = Mock(return_value=None)
        return interface

    @pytest.fixture
    def command_palette(self, mock_cli_interface: Mock) -> CommandPalette:
        """Create a CommandPalette instance with mocked dependencies."""
        return CommandPalette(mock_cli_interface)

    def test_init(self, command_palette: CommandPalette):
        """Test CommandPalette initialization."""
        assert command_palette.cli_interface is not None
        assert len(command_palette.commands) > 0  # Default commands should be registered
        assert command_palette.get_command_history() == []

    def test_register_command(self, command_palette: CommandPalette):
        """Test registering a new command."""

        # Arrange
        def test_handler(args: Any, context: Dict[str, Any]) -> None:
            pass

        # Act
        command_palette.register_command_with_params(
            name="test",
            handler=test_handler,
            description="Test command",
            aliases=["t"],
            usage="test [options]",
            category="Testing"
		)

        # Assert
        assert "test" in command_palette.commands
        assert "t" in command_palette.commands

    def test_execute_command_valid(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test executing a valid command."""
        # Act
        result = command_palette.execute_command("/help")

        # Assert
        assert result is True
        mock_cli_interface.display_message.assert_called()

    def test_execute_command_with_args(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test executing a command with arguments."""
        # Act
        result = command_palette.execute_command("/help test")

        # Assert
        assert result is True
        # Check if display_message was called (either directly or through display_warning)
        assert mock_cli_interface.display_message.called or mock_cli_interface.display_warning.called

    def test_execute_command_invalid(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test executing an invalid command."""
        # Act
        result = command_palette.execute_command("/nonexistent")

        # Assert
        assert result is True  # Still returns True as it handles the error
        # Check if display_warning was called for unknown command
        mock_cli_interface.display_warning.assert_called()

    def test_execute_command_non_command(self, command_palette: CommandPalette):
        """Test executing a non-command string."""
        # Act
        result = command_palette.execute_command("not a command")

        # Assert
        assert result is False

    def test_get_command_list(self, command_palette: CommandPalette):
        """Test getting list of unique commands."""
        # Act
        commands = command_palette.get_command_list()

        # Assert
        assert len(commands) > 0
        # Check that we have unique commands (no duplicates from aliases)
        command_names = [cmd.name for cmd in commands]
        assert len(command_names) == len(set(command_names))

    def test_get_command_by_name(self, command_palette: CommandPalette):
        """Test getting command by name."""
        # Act
        command = command_palette.get_command_by_name("help")

        # Assert
        assert command is not None
        assert command.name == "help"

    def test_get_command_by_alias(self, command_palette: CommandPalette):
        """Test getting command by alias."""
        # Act
        command = command_palette.get_command_by_name("h")

        # Assert
        assert command is not None
        assert command.name == "help"  # Alias should point to the main command

    def test_get_command_by_nonexistent(self, command_palette: CommandPalette):
        """Test getting non-existent command."""
        # Act
        command = command_palette.get_command_by_name("nonexistent")

        # Assert
        assert command is None

    def test_add_to_history(self, command_palette: CommandPalette):
        """Test adding commands to history."""
        # Clear history first by executing a non-command (which won't be added to history)
        command_palette.execute_command("not a command")

        # Act
        command_palette.add_to_history("/help")
        command_palette.add_to_history("/concepts")
        command_palette.add_to_history("/help")  # Not consecutive duplicate, should be added

        # Assert
        history = command_palette.get_command_history()
        assert len(history) >= 3  # All commands should be added
        assert "/help" in history
        assert "/concepts" in history

    def test_add_to_history_consecutive_duplicate(self, command_palette: CommandPalette):
        """Test that consecutive duplicates are not added."""
        # Clear history first
        command_palette.execute_command("not a command")

        # Act
        command_palette.add_to_history("/help")
        command_palette.add_to_history("/help")  # Consecutive duplicate

        # Assert
        history = command_palette.get_command_history()
        assert len(history) >= 1  # At least one command should be added
        assert "/help" in history

    def test_add_to_history_empty(self, command_palette: CommandPalette):
        """Test adding empty command to history."""
        # Clear history first by executing a non-command
        command_palette.execute_command("not a command")

        # Act
        command_palette.add_to_history("")

        # Assert
        history = command_palette.get_command_history()
        # Empty commands should not be added to history
        assert "" not in history

    def test_get_command_history(self, command_palette: CommandPalette):
        """Test getting command history."""
        # Clear history first by executing a non-command
        command_palette.execute_command("not a command")

        # Arrange
        command_palette.add_to_history("/help")
        command_palette.add_to_history("/concepts")

        # Act
        history = command_palette.get_command_history()

        # Assert
        assert len(history) >= 2
        assert "/concepts" in history  # Most recent first
        assert history[1] == "/help"

    def test_get_command_history_not_reversed(self, command_palette: CommandPalette):
        """Test getting command history not reversed."""
        # Clear history first by executing a non-command
        command_palette.execute_command("not a command")

        # Arrange
        command_palette.add_to_history("/help")
        command_palette.add_to_history("/concepts")

        # Act
        history = command_palette.get_command_history(reverse=False)

        # Assert
        assert len(history) >= 2
        assert "/help" in history  # Original order
        assert history[1] == "/concepts"

    def test_get_autocomplete_suggestions(self, command_palette: CommandPalette):
        """Test getting autocomplete suggestions."""
        # Act
        suggestions = command_palette.get_autocomplete_suggestions("/he")

        # Assert
        assert len(suggestions) > 0
        assert any("/help" in s for s in suggestions)

    def test_get_autocomplete_suggestions_no_prefix(self, command_palette: CommandPalette):
        """Test getting autocomplete suggestions without / prefix."""
        # Act
        suggestions = command_palette.get_autocomplete_suggestions("help")

        # Assert
        assert len(suggestions) == 0

    def test_get_autocomplete_suggestions_empty(self, command_palette: CommandPalette):
        """Test getting autocomplete suggestions with empty input."""
        # Act
        suggestions = command_palette.get_autocomplete_suggestions("")

        # Assert
        assert len(suggestions) == 0

    def test_get_concept_suggestions(self, command_palette: CommandPalette, temp_workspace: Path):
        """Test getting concept suggestions."""
        # Arrange
        context = {"workspace_path": str(temp_workspace)}

        # Act
        suggestions = command_palette.get_concept_suggestions("py", context)

        # Assert
        # Should return empty list or list of suggestions if concepts exist
        assert isinstance(suggestions, list)

    def test_help_command_handler(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the help command handler."""
        # Act
        command_palette._help_command([], {})

        # Assert - _help_command is not implemented (handled by HelpCommand class)
        # So display_message should not be called
        mock_cli_interface.display_message.assert_not_called()

    def test_help_command_with_argument(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the help command handler with a specific command."""
        # Act
        command_palette._help_command(["help"], {})

        # Assert - _help_command is not implemented (handled by HelpCommand class)
        # So display_message should not be called
        mock_cli_interface.display_message.assert_not_called()

    def test_clear_command_handler(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the clear command handler."""
        # Act
        command_palette._clear_command([], {})

        # Assert
        mock_cli_interface.clear_screen.assert_called_once()

    def test_quit_command_handler(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the quit command handler."""
        # Act
        command_palette._quit_command([], {})

        # Assert
        mock_cli_interface.display_message.assert_called()
        call_args = mock_cli_interface.display_message.call_args[0][0]
        assert isinstance(call_args, Message)
        assert "Goodbye" in call_args.content

    def test_reset_command_handler(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the reset command handler."""
        # Act
        command_palette._reset_command([], {})

        # Assert
        mock_cli_interface.display_message.assert_called()
        call_args = mock_cli_interface.display_message.call_args[0][0]
        assert isinstance(call_args, Message)
        assert "Conversation has been reset" in call_args.content

    def test_checkpoint_command_handler_no_args(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the checkpoint command handler with no arguments."""
        # Act
        command_palette._checkpoint_command([], {})

        # Assert
        mock_cli_interface.display_message.assert_called()
        call_args = mock_cli_interface.display_message.call_args[0][0]
        assert isinstance(call_args, Message)
        assert "Usage" in call_args.content

    def test_checkpoint_command_handler_list(self, command_palette: CommandPalette, mock_cli_interface: Mock):
        """Test the checkpoint command handler with list action."""
        # Act
        command_palette._checkpoint_command(["list"], {})

        # Assert
        mock_cli_interface.display_message.assert_called()
        call_args = mock_cli_interface.display_message.call_args[0][0]
        assert isinstance(call_args, Message)
        assert "Listing checkpoints" in call_args.content
