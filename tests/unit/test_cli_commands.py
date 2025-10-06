"""
Unit tests for CLI commands
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from typer.testing import CliRunner

from src.cli.main import app

runner = CliRunner()


def test_start_learning_command(temp_workspace):
    """Test the start-learning command"""
    from src.utils.preferences_manager import PreferencesManager

    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    try:
        # Create the .learningspace directory first
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)

        # Set up preferences to avoid the interactive setup
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference("ai.default_provider", "openai")
        prefs_mgr.set_preference("ai.default_model", "gpt-4o")

        # For this test, let's mock the input function to immediately quit
        with patch("builtins.input", side_effect=["/quit"]), patch("select.select", return_value=([], [], [])):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])

        # Check that the command executed and reached the interactive part
        # With rich formatting, we'll see the panel headers in the output
        assert "🚀 Learning Catalyst" in result.output
        # Check for guidance messages
        assert "💡 Tip:" in result.output
        assert "Type /help to see all available commands" in result.output
    finally:
        os.chdir(original_cwd)


def test_enhanced_guidance_messages():
    """Test that enhanced guidance messages are present in the code"""
    # This is a simple test to verify that our enhanced guidance messages exist
    # in the source code. We don't need to run the full interactive setup here.

    # Read the main.py file to check for our enhanced guidance messages
    with open("/mnt/d/Projects/learning_catalyst/src/cli/main.py", "r") as f:
        content = f.read()

    # Check that our enhanced guidance messages are present
    assert "🎯 Getting Started Guide:" in content
    assert "💡 Quick Tips:" in content
    assert "Let's begin!" in content
    assert "Continue Your Learning Journey:" in content
    assert "Quick Reminders:" in content


def test_models_command():
    """Test the models command"""
    result = runner.invoke(app, ["models"])

    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Available AI Models" in result.output


def test_tokens_command():
    """Test the tokens command"""
    result = runner.invoke(app, ["tokens"])

    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Token Usage Summary" in result.output


def test_tokens_command_with_model():
    """Test the tokens command with a model parameter"""
    result = runner.invoke(app, ["tokens", "gpt-4"])

    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Detailed Token Usage for gpt-4" in result.output


def test_knowledge_map_command():
    """Test the knowledge-map command"""
    result = runner.invoke(app, ["knowledge-map"])

    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Knowledge Map" in result.output


def test_preference_list_command(temp_workspace):
    """Test the preference list command"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory and preferences file
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    # Initialize with default preferences
    from src.utils.preferences_manager import PreferencesManager

    prefs_mgr = PreferencesManager(str(temp_workspace))

    try:
        # Run the preference list command
        result = runner.invoke(app, ["preference", "list"])

        # Check that the command executed successfully
        assert result.exit_code == 0
        # The command should output either JSON preferences or "No preferences file found"
        # Since PreferencesManager creates defaults, we expect JSON output
        assert ("{" in result.output and "}" in result.output) or "No preferences file found" in result.output
    finally:
        os.chdir(original_cwd)


def test_preference_set_command(temp_workspace):
    """Test the preference set command"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the preference set command
        result = runner.invoke(app, ["preference", "set", "test.key", "test_value"])

        # Check that the command executed successfully
        assert result.exit_code == 0
        assert "Preference test.key set to test_value" in result.output

        # Verify the preference was actually set by listing preferences
        result = runner.invoke(app, ["preference", "list"])
        assert "test_value" in result.output
    finally:
        os.chdir(original_cwd)


def test_preference_set_command_missing_args(temp_workspace):
    """Test the preference set command with missing arguments"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the preference set command with only one argument
        result = runner.invoke(app, ["preference", "set", "test.key"])

        # Check that the command failed as expected
        assert result.exit_code != 0
    finally:
        os.chdir(original_cwd)


def test_preference_invalid_action(temp_workspace):
    """Test the preference command with invalid action"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the preference command with invalid action
        result = runner.invoke(app, ["preference", "invalid_action"])

        # Check that the command failed as expected
        assert result.exit_code != 0 or "Unknown action" in result.output
    finally:
        os.chdir(original_cwd)


def test_main_app_help():
    """Test the main app help"""
    result = runner.invoke(app, ["--help"])

    # Check that the help command executed successfully
    assert result.exit_code == 0
    assert "Usage:" in result.output


def test_models_with_help():
    """Test the models command with help"""
    result = runner.invoke(app, ["models", "--help"])

    # Check that the help command executed successfully
    assert result.exit_code == 0
    assert "Usage:" in result.output


def test_tokens_with_help():
    """Test the tokens command with help"""
    result = runner.invoke(app, ["tokens", "--help"])

    # Check that the help command executed successfully
    assert result.exit_code == 0
    assert "Usage:" in result.output


def test_knowledge_map_with_help():
    """Test the knowledge-map command with help"""
    result = runner.invoke(app, ["knowledge-map", "--help"])

    # Check that the help command executed successfully
    assert result.exit_code == 0
    assert "Usage:" in result.output


def test_preference_with_help():
    """Test the preference command with help"""
    result = runner.invoke(app, ["preference", "--help"])

    # Check that the help command executed successfully
    assert result.exit_code == 0
    assert "Usage:" in result.output


# Checkpoint command tests
def test_checkpoint_list_empty_workspace(temp_workspace):
    """Test checkpoint list command in an empty workspace"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the checkpoint list command
        result = runner.invoke(app, ["checkpoint", "list"])

        # Check that the command executed successfully
        assert result.exit_code == 0
        assert "No checkpoints found." in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_save_without_description(temp_workspace):
    """Test checkpoint save command without description"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the checkpoint save command
        result = runner.invoke(app, ["checkpoint", "save", "test_checkpoint"])

        # Check that the command executed successfully
        assert result.exit_code == 0
        assert "✅ Checkpoint 'test_checkpoint' saved successfully" in result.output

        # Verify that a checkpoint was created by listing checkpoints
        result = runner.invoke(app, ["checkpoint", "list"])
        assert result.exit_code == 0
        assert "test_checkpoint" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_save_with_description(temp_workspace):
    """Test checkpoint save command with description"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the checkpoint save command with description
        result = runner.invoke(app, ["checkpoint", "save", "test_checkpoint", "--description", "Test description"])

        # Check that the command executed successfully
        assert result.exit_code == 0
        assert "✅ Checkpoint 'test_checkpoint' saved successfully" in result.output

        # Verify that the checkpoint was created with the correct description
        result = runner.invoke(app, ["checkpoint", "list"])
        assert result.exit_code == 0
        assert "Test description" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_save_missing_name(temp_workspace):
    """Test checkpoint save command with missing name"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the checkpoint save command without name
        result = runner.invoke(app, ["checkpoint", "save"])

        # Check that the command failed as expected
        assert result.exit_code != 0
        assert "Checkpoint name required for save operation" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_load_valid_id(temp_workspace):
    """Test checkpoint load command with valid checkpoint ID"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # First save a checkpoint
        result = runner.invoke(app, ["checkpoint", "save", "test_checkpoint"])
        assert result.exit_code == 0

        # Get the checkpoint ID from the list command
        result = runner.invoke(app, ["checkpoint", "list"])
        assert result.exit_code == 0

        # Extract the checkpoint ID from the output
        # The output format is like: checkpoint_20251003_222402_9988
        import re

        match = re.search(r"checkpoint_\d{8}_\d{6}_\d{4}", result.output)
        assert match is not None
        checkpoint_id = match.group(0)

        # Load the checkpoint
        result = runner.invoke(app, ["checkpoint", "load", checkpoint_id])

        # Check that the command executed successfully
        assert result.exit_code == 0
        assert f"✅ Checkpoint '{checkpoint_id}' loaded successfully" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_load_invalid_id(temp_workspace):
    """Test checkpoint load command with invalid checkpoint ID"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Try to load a non-existent checkpoint
        result = runner.invoke(app, ["checkpoint", "load", "nonexistent_checkpoint"])

        # Check that the command failed as expected
        assert result.exit_code != 0
        assert "Checkpoint 'nonexistent_checkpoint' not found" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_load_missing_id(temp_workspace):
    """Test checkpoint load command with missing ID"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Try to load without specifying checkpoint ID
        result = runner.invoke(app, ["checkpoint", "load"])

        # Check that the command failed as expected
        assert result.exit_code != 0
        assert "Checkpoint name required for load operation" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_list_with_existing_checkpoints(temp_workspace):
    """Test listing checkpoints when checkpoints exist."""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # First save a checkpoint
        result = runner.invoke(app, ["checkpoint", "save", "test_checkpoint", "--description", "Test description"])
        assert result.exit_code == 0

        # Now list checkpoints
        result = runner.invoke(app, ["checkpoint", "list"])
        assert result.exit_code == 0
        assert "Available Checkpoints" in result.output
        # The output shows the ID, not the name, so we check for the ID pattern
        assert "checkpoint_2025" in result.output  # Check for timestamp-based ID
        assert "Test description" in result.output
    finally:
        os.chdir(original_cwd)


def test_checkpoint_invalid_action(temp_workspace):
    """Test checkpoint command with invalid action"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Run the checkpoint command with invalid action
        result = runner.invoke(app, ["checkpoint", "invalid_action"])

        # Check that the command failed as expected
        assert result.exit_code != 0
        assert "Unknown action: invalid_action" in result.output
    finally:
        os.chdir(original_cwd)


def test_start_learning_with_help():
    """Test the start-learning command with help"""
    result = runner.invoke(app, ["start-learning", "--help"])

    # Check that the help command executed successfully
    assert result.exit_code == 0
    assert "Usage:" in result.output


# Integration test for the main CLI app
def test_main_cli_integration(temp_workspace):
    """Test the main CLI integration with all commands"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Test the main command
        result = runner.invoke(app, [])
        assert result.exit_code == 0
        assert "Learning Catalyst" in result.output

        # Test tokens command
        result = runner.invoke(app, ["tokens"])
        assert result.exit_code == 0
        assert "Token Usage Summary" in result.output

        # Test models command
        result = runner.invoke(app, ["models"])
        assert result.exit_code == 0
        assert "Available AI Models" in result.output

        # Test knowledge-map command
        result = runner.invoke(app, ["knowledge-map"])
        assert result.exit_code == 0
        assert "Knowledge Map" in result.output

        # Test preference commands
        result = runner.invoke(app, ["preference", "set", "test.key", "test_value"])
        assert result.exit_code == 0

        result = runner.invoke(app, ["preference", "list"])
        assert result.exit_code == 0

        # Test checkpoint commands
        result = runner.invoke(app, ["checkpoint", "save", "test_checkpoint", "--description", "Test description"])
        assert result.exit_code == 0

        result = runner.invoke(app, ["checkpoint", "list"])
        assert result.exit_code == 0
        assert "Available Checkpoints" in result.output
    finally:
        os.chdir(original_cwd)


# Additional tests for slash commands in interactive session
def test_slash_help_command(temp_workspace):
    """Test the /help slash command"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)

    try:
        # Mock the input to simulate the /help command
        with patch("builtins.input", side_effect=["/help", "/quit"]), patch("select.select", return_value=([], [], [])):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])

            # Check that the command executed successfully
            assert result.exit_code == 0
            # Check that the help command output is present
            assert "For detailed help, please use the 'help' command directly" in result.output
    finally:
        os.chdir(original_cwd)


def test_slash_config_command(temp_workspace):
    """Test the /set-config slash command in the interactive session"""
    from src.utils.preferences_manager import PreferencesManager

    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    try:
        # Create the .learningspace directory first
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)

        # Mock both input and Prompt.ask for the full flow
        with patch("builtins.input", side_effect=["/set-config", "/quit"]), patch(
            "select.select", return_value=([], [], [])
        ), patch(
            "rich.prompt.Prompt.ask",
            side_effect=["anthropic", "claude-3-opus", "fake_key"],  # provider choice  # model  # API key
        ):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])

        # Verify that the config was changed
        assert "AI configuration updated:" in result.output
        assert "anthropic" in result.output
        assert "claude-3-opus" in result.output
        # Verify guidance after config update
        assert "Next Steps:" in result.output
        assert "Use /concepts" in result.output
    finally:
        os.chdir(original_cwd)


def test_slash_set_config_command(temp_workspace):
    """Test the /set-config slash command functionality"""
    from src.utils.preferences_manager import PreferencesManager

    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))

    try:
        # Create the .learningspace directory first
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)

        # Mock both input and Prompt.ask for the full flow
        with patch("builtins.input", side_effect=["/set-config", "/quit"]), patch(
            "select.select", return_value=([], [], [])
        ), patch(
            "rich.prompt.Prompt.ask",
            side_effect=["anthropic", "claude-3-opus", "fake_key"],  # provider choice  # model  # API key
        ):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])

        # Verify that the config was changed
        assert "AI configuration updated:" in result.output
        assert "anthropic" in result.output
        assert "claude-3-opus" in result.output
        # Verify guidance after config update
        assert "Next Steps:" in result.output
        assert "Use /concepts" in result.output
    finally:
        os.chdir(original_cwd)


if __name__ == "__main__":
    pytest.main([__file__])
