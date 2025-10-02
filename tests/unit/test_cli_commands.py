"""
Unit tests for CLI commands
"""
import pytest
import tempfile
import os
from pathlib import Path
from typer.testing import CliRunner
from unittest.mock import patch, MagicMock
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
        prefs_mgr.set_preference('ai.default_provider', 'openai')
        prefs_mgr.set_preference('ai.default_model', 'gpt-4o')
        
        # For this test, let's mock the input function instead of Prompt.ask
        with patch('builtins.input', return_value='/quit'), patch('select.select'):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])
        
        # Check that the command executed and reached the interactive part
        # With rich formatting, we'll see the panel headers in the output
        assert "🚀 Learning Catalyst" in result.output
    finally:
        os.chdir(original_cwd)


def test_models_command():
    """Test the models command"""
    result = runner.invoke(app, ["models"])
    
    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Available AI models would be listed here" in result.output


def test_tokens_command():
    """Test the tokens command"""
    result = runner.invoke(app, ["tokens"])
    
    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Getting token usage summary" in result.output


def test_tokens_command_with_model():
    """Test the tokens command with a model parameter"""
    result = runner.invoke(app, ["tokens", "gpt-4"])
    
    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Getting detailed token usage for model: gpt-4" in result.output


def test_knowledge_map_command():
    """Test the knowledge-map command"""
    result = runner.invoke(app, ["knowledge-map"])
    
    # Check that the command executed successfully
    assert result.exit_code == 0
    assert "Knowledge map would be displayed here" in result.output


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


def test_start_learning_with_help():
    """Test the start-learning command with help"""
    result = runner.invoke(app, ["start-learning", "--help"])
    
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


# Integration test for the main CLI app
def test_main_cli_integration(temp_workspace):
    """Test the main CLI app integration"""
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))
    
    # Create the .learningspace directory
    learningspace_path = temp_workspace / ".learningspace"
    learningspace_path.mkdir(exist_ok=True)
    
    try:
        # Test multiple commands in sequence
        # 1. List preferences
        result = runner.invoke(app, ["preference", "list"])
        assert result.exit_code == 0
        
        # 2. Set a preference
        result = runner.invoke(app, ["preference", "set", "cli.test", "cli_test_value"])
        assert result.exit_code == 0
        assert "Preference cli.test set to cli_test_value" in result.output
        
        # 3. Get tokens summary
        result = runner.invoke(app, ["tokens"])
        assert result.exit_code == 0
        assert "Getting token usage summary" in result.output
        
        # 4. List models
        result = runner.invoke(app, ["models"])
        assert result.exit_code == 0
        assert "Available AI models would be listed here" in result.output
    finally:
        os.chdir(original_cwd)


# Additional tests for slash commands in interactive session
def test_slash_help_command(temp_workspace):
    """Test the /help slash command in the interactive session"""
    from src.utils.preferences_manager import PreferencesManager
    
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))
    
    try:
        # Create the .learningspace directory first
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)
        
        # Set up preferences
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference('ai.default_provider', 'openai')
        prefs_mgr.set_preference('ai.default_model', 'gpt-4o')
        
        # Mock both input and Prompt.ask (for the set-config flow)
        with patch('builtins.input', side_effect=['/help', '/quit']), \
             patch('select.select'), \
             patch('rich.prompt.Prompt.ask', side_effect=['openai', 'gpt-4o', 'fake_key']):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])
        
        # Verify that help message was shown (check for table elements now)
        assert "Available Slash Commands" in result.output
        assert "/help" in result.output
        assert "/quit or /exit or /q" in result.output
        assert "/set-config" in result.output
    finally:
        os.chdir(original_cwd)


def test_slash_config_command(temp_workspace):
    """Test the /config slash command in the interactive session"""
    from src.utils.preferences_manager import PreferencesManager
    
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))
    
    try:
        # Create the .learningspace directory first
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)
        
        # Set up preferences
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference('ai.default_provider', 'openai')
        prefs_mgr.set_preference('ai.default_model', 'gpt-4o')
        
        # Mock both input and Prompt.ask (for the set-config flow)
        with patch('builtins.input', side_effect=['/config', '/quit']), \
             patch('select.select'), \
             patch('rich.prompt.Prompt.ask', side_effect=['openai', 'gpt-4o', 'fake_key']):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])
        
        # Verify that config info was shown
        assert "Current AI configuration:" in result.output
        assert "openai" in result.output
        assert "gpt-4o" in result.output
    finally:
        os.chdir(original_cwd)


def test_slash_set_config_command(temp_workspace):
    """Test the /set-config slash command in the interactive session"""
    from src.utils.preferences_manager import PreferencesManager
    
    # Change to the temporary workspace directory
    original_cwd = os.getcwd()
    os.chdir(str(temp_workspace))
    
    try:
        # Create the .learningspace directory first
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)
        
        # Set up initial preferences
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference('ai.default_provider', 'openai')
        prefs_mgr.set_preference('ai.default_model', 'gpt-4o')
        
        # Mock both input and Prompt.ask for the full flow
        with patch('builtins.input', side_effect=['/set-config', '/config', '/quit']), \
             patch('select.select'), \
             patch('rich.prompt.Prompt.ask', side_effect=[
                 'anthropic',    # provider choice
                 'claude-3-opus', # model
                 'fake_key',     # API key
                 'anthropic',    # provider to show in config
                 'claude-3-opus' # model to show in config
             ]):
            result = runner.invoke(app, ["start-learning", str(temp_workspace)])
        
        # Verify that the config was changed
        assert "AI configuration updated:" in result.output
        assert "anthropic" in result.output
        assert "claude-3-opus" in result.output
        assert "Current AI configuration: anthropic - claude-3-opus" in result.output
    finally:
        os.chdir(original_cwd)


if __name__ == "__main__":
    pytest.main([__file__])