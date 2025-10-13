"""
TDD tests for CLI Command Parser.

Following Test-Driven Development methodology, these tests define the expected behavior
of the CLI Command Parser before implementation. Tests cover command parsing, validation,
argument handling, and response formatting based on the CLI Commands API documentation.
"""

import pytest
from typing import Dict, Any, List
from unittest.mock import Mock, patch
from tests.test_helpers import (
    assert_raises_specific_error,
    cli_test_context
)


class TestCommandParser:
    """Test cases for CLI Command Parser following TDD principles."""

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_parser_initialization(self):
        """Test that command parser can be initialized (TDD: Red phase)."""
        # This test will initially fail until CommandParser is implemented
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()
        assert parser is not None
        assert hasattr(parser, 'parse_command')
        assert hasattr(parser, 'validate_command')
        assert hasattr(parser, 'execute_command')

    @pytest.mark.unit
    @pytest.mark.cli
    def test_basic_command_parsing(self):
        """Test that basic commands can be parsed."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test help command
        result = parser.parse_command("/help")
        assert result["command"] == "help"
        assert result["args"] == {}
        assert result["raw_command"] == "/help"

        # Test quit command
        result = parser.parse_command("/quit")
        assert result["command"] == "quit"
        assert result["args"] == {}

        # Test clear command
        result = parser.parse_command("/clear")
        assert result["command"] == "clear"
        assert result["args"] == {}

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_with_arguments_parsing(self):
        """Test that commands with arguments can be parsed."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test config provider command
        result = parser.parse_command("/config provider list")
        assert result["command"] == "config"
        assert result["args"]["action"] == "provider"
        assert result["args"]["subaction"] == "list"

        # Test config model command
        result = parser.parse_command("/config model switch gpt-4o-mini")
        assert result["command"] == "config"
        assert result["args"]["action"] == "model"
        assert result["args"]["subaction"] == "switch"
        assert result["args"]["model_name"] == "gpt-4o-mini"

        # Test learn command
        result = parser.parse_command("/learn python functions")
        assert result["command"] == "learn"
        assert result["args"]["topic"] == "python functions"

    @pytest.mark.unit
    @pytest.mark.cli
    def test_knowledge_map_command_parsing(self):
        """Test that knowledge map commands can be parsed."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test basic knowledge map
        result = parser.parse_command("/knowledge-map")
        assert result["command"] == "knowledge_map"
        assert result["args"] == {}

        # Test knowledge map with filters
        result = parser.parse_command("/knowledge-map progress python")
        assert result["command"] == "knowledge_map"
        assert result["args"]["view_mode"] == "progress"
        assert result["args"]["topic"] == "python"

        result = parser.parse_command("/knowledge-map weak-areas --depth 3")
        assert result["command"] == "knowledge_map"
        assert result["args"]["view_mode"] == "weak-areas"
        assert result["args"]["depth"] == 3

    @pytest.mark.unit
    @pytest.mark.cli
    def test_checkpoint_command_parsing(self):
        """Test that checkpoint commands can be parsed."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test checkpoint save
        result = parser.parse_command("/checkpoint save session1")
        assert result["command"] == "checkpoint"
        assert result["args"]["action"] == "save"
        assert result["args"]["name"] == "session1"

        # Test checkpoint load
        result = parser.parse_command("/checkpoint load session1")
        assert result["command"] == "checkpoint"
        assert result["args"]["action"] == "load"
        assert result["args"]["name"] == "session1"

        # Test checkpoint list
        result = parser.parse_command("/checkpoint list")
        assert result["command"] == "checkpoint"
        assert result["args"]["action"] == "list"

    @pytest.mark.unit
    @pytest.mark.cli
    def test_analytics_command_parsing(self):
        """Test that analytics commands can be parsed."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test tokens command
        result = parser.parse_command("/tokens")
        assert result["command"] == "tokens"
        assert result["args"] == {}

        # Test tokens with time period
        result = parser.parse_command("/tokens week")
        assert result["command"] == "tokens"
        assert result["args"]["period"] == "week"

        # Test statistics command
        result = parser.parse_command("/statistics --detailed")
        assert result["command"] == "statistics"
        assert result["args"]["detailed"] is True

    @pytest.mark.unit
    @pytest.mark.cli
    def test_context_command_parsing(self):
        """Test that context commands can be parsed."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test context command
        result = parser.parse_command("/context")
        assert result["command"] == "context"
        assert result["args"] == {}

        # Test context compression
        result = parser.parse_command("/context compress")
        assert result["command"] == "context"
        assert result["args"]["action"] == "compress"

        # Test context verbose
        result = parser.parse_command("/context verbose")
        assert result["command"] == "context"
        assert result["args"]["action"] == "verbose"

    @pytest.mark.unit
    @pytest.mark.cli
    def test_invalid_command_handling(self):
        """Test that invalid commands are handled gracefully."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test completely invalid command
        with pytest.raises(ValueError, match="Unknown command"):
            parser.parse_command("/invalid_command")

        # Test malformed command (missing slash)
        with pytest.raises(ValueError, match="Commands must start with /"):
            parser.parse_command("help")

        # Test empty command
        with pytest.raises(ValueError, match="Empty command"):
            parser.parse_command("")

        with pytest.raises(ValueError, match="Empty command"):
            parser.parse_command("/")

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_validation(self):
        """Test that command arguments are validated."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test valid config command
        parsed = parser.parse_command("/config provider list")
        validated = parser.validate_command(parsed)
        assert validated is True

        # Test invalid config subcommand
        parsed = parser.parse_command("/config provider invalid")
        with pytest.raises(ValueError, match="Invalid config subcommand"):
            parser.validate_command(parsed)

        # Test invalid checkpoint action
        parsed = parser.parse_command("/checkpoint invalid")
        with pytest.raises(ValueError, match="Invalid checkpoint action"):
            parser.validate_command(parsed)

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_suggestions(self):
        """Test that command suggestions can be generated."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test suggestions for partial commands
        suggestions = parser.get_command_suggestions("/conf")
        assert "config" in suggestions

        suggestions = parser.get_command_suggestions("/know")
        assert "knowledge-map" in suggestions

        suggestions = parser.get_command_suggestions("/check")
        assert "checkpoint" in suggestions

        # Test suggestions for partial arguments
        suggestions = parser.get_command_suggestions("/config provider")
        assert "list" in suggestions
        assert "switch" in suggestions
        assert "add" in suggestions

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_completion(self):
        """Test that command auto-completion works."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test basic completion
        completions = parser.get_completions("/")
        assert "help" in completions
        assert "quit" in completions
        assert "clear" in completions
        assert "config" in completions

        # Test subcommand completion
        completions = parser.get_completions("/config ")
        assert "provider" in completions
        assert "model" in completions

        completions = parser.get_completions("/config provider ")
        assert "list" in completions
        assert "switch" in completions
        assert "add" in completions

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_help_generation(self):
        """Test that help text can be generated for commands."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test general help
        help_text = parser.get_help_text()
        assert "Available commands" in help_text
        assert "/help" in help_text
        assert "/quit" in help_text
        assert "/config" in help_text

        # Test specific command help
        help_text = parser.get_command_help("config")
        assert "Configuration management" in help_text
        assert "/config provider" in help_text
        assert "/config model" in help_text

        help_text = parser.get_command_help("knowledge-map")
        assert "Knowledge map" in help_text
        assert "view modes" in help_text

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_history_tracking(self):
        """Test that command history can be tracked."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Execute some commands
        parser.parse_command("/help")
        parser.parse_command("/config provider list")
        parser.parse_command("/learn python basics")
        parser.parse_command("/knowledge-map")

        # Get command history
        history = parser.get_command_history()
        assert len(history) == 4
        assert history[0]["command"] == "help"
        assert history[1]["command"] == "config"
        assert history[2]["command"] == "learn"
        assert history[3]["command"] == "knowledge_map"

        # Test history search
        results = parser.search_command_history("config")
        assert len(results) == 1
        assert results[0]["command"] == "config"

        # Test history clearing
        parser.clear_command_history()
        assert len(parser.get_command_history()) == 0

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_aliases(self):
        """Test that command aliases work."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Define aliases
        parser.set_alias("h", "help")
        parser.set_alias("q", "quit")
        parser.set_alias("km", "knowledge-map")
        parser.set_alias("cp", "checkpoint")

        # Test alias expansion
        result = parser.parse_command("/h")
        assert result["command"] == "help"

        result = parser.parse_command("/q")
        assert result["command"] == "quit"

        result = parser.parse_command("/km progress")
        assert result["command"] == "knowledge_map"
        assert result["args"]["view_mode"] == "progress"

        result = parser.parse_command("/cp save test")
        assert result["command"] == "checkpoint"
        assert result["args"]["action"] == "save"
        assert result["args"]["name"] == "test"

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_parsing_edge_cases(self):
        """Test command parsing edge cases."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test commands with extra whitespace
        result = parser.parse_command("  /help  ")
        assert result["command"] == "help"

        result = parser.parse_command("/config  provider   list")
        assert result["command"] == "config"
        assert result["args"]["action"] == "provider"
        assert result["args"]["subaction"] == "list"

        # Test commands with special characters in arguments
        result = parser.parse_command('/learn "Python functions and methods"')
        assert result["command"] == "learn"
        assert result["args"]["topic"] == "Python functions and methods"

        # Test commands with quotes and spaces
        result = parser.parse_command('/checkpoint save "My Session 1"')
        assert result["command"] == "checkpoint"
        assert result["args"]["action"] == "save"
        assert result["args"]["name"] == "My Session 1"

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_context_awareness(self, cli_test_context):
        """Test that command parser is context-aware."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser(context=cli_test_context)

        # Test context-aware suggestions
        suggestions = parser.get_contextual_suggestions("/learn")
        # Should suggest concepts based on user's current progress
        assert len(suggestions) > 0

        # Test context-aware validation
        parsed = parser.parse_command("/config model switch gpt-4o-mini")
        # Should validate against current provider configuration
        validated = parser.validate_command(parsed)
        assert validated is True

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_execution_pipeline(self, cli_test_context):
        """Test that command execution pipeline works."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser(context=cli_test_context)

        # Mock command execution
        with patch.object(parser, '_execute_help_command') as mock_help:
            mock_help.return_value = {"success": True, "message": "Help displayed"}

            result = parser.execute_command("/help")
            assert result["success"] is True
            assert "Help displayed" in result["message"]

        # Test command with arguments
        with patch.object(parser, '_execute_config_command') as mock_config:
            mock_config.return_value = {"success": True, "data": {"providers": ["openai", "deepseek"]}}

            result = parser.execute_command("/config provider list")
            assert result["success"] is True
            assert "providers" in result["data"]

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_error_handling(self):
        """Test that command errors are handled gracefully."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Test execution error handling
        with patch.object(parser, '_execute_learn_command') as mock_learn:
            mock_learn.side_effect = Exception("Learning service unavailable")

            result = parser.execute_command("/learn python")
            assert result["success"] is False
            assert "error" in result
            assert "Learning service unavailable" in result["error"]["message"]

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_performance_tracking(self):
        """Test that command execution performance is tracked."""
        from src.cli.core.command_parser import CommandParser

        parser = CommandParser()

        # Execute some commands
        parser.execute_command("/help")
        parser.execute_command("/config provider list")

        # Get performance metrics
        metrics = parser.get_performance_metrics()
        assert "total_commands" in metrics
        assert metrics["total_commands"] == 2
        assert "average_execution_time" in metrics
        assert "slowest_command" in metrics

    @pytest.mark.unit
    @pytest.mark.cli
    def test_command_parser_configuration(self):
        """Test that command parser can be configured."""
        from src.cli.core.command_parser import CommandParser

        # Custom configuration
        config = {
            "command_prefix": "/",
            "case_sensitive": False,
            "auto_complete": True,
            "history_size": 100,
            "enable_suggestions": True
        }

        parser = CommandParser(config=config)

        assert parser.config["command_prefix"] == "/"
        assert parser.config["case_sensitive"] is False
        assert parser.config["auto_complete"] is True

        # Test case-insensitive parsing
        result = parser.parse_command("/HELP")
        assert result["command"] == "help"

        result = parser.parse_command("/Config Provider List")
        assert result["command"] == "config"