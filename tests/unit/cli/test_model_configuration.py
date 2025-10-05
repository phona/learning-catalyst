"""
Unit tests for Configuring AI Models (Story 6) functionality
"""
import sys
import os
import pytest
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from typer.testing import CliRunner
from src.cli.main import app
from src.ai.service import ModelAbstractionService
from src.utils.preferences_manager import PreferencesManager

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))


runner = CliRunner()


class TestModelConfiguration:
    @pytest.mark.asyncio
    async def test_model_add_command(self, temp_workspace, model_service_mock):
        """Test that the /model add command works correctly"""
        # Set up the workspace and preferences
        prefs_mgr = PreferencesManager(str(temp_workspace))
        await prefs_mgr.set_preference("ai.providers", {})
        
        # Mock the model service's add_model method
        model_service_mock.add_model = AsyncMock(return_value=True)
        
        # Test the model add command
        with patch('src.cli.commands.model_commands.model_service', model_service_mock), \
             patch('src.cli.commands.model_commands.get_current_workspace', return_value=str(temp_workspace)), \
             patch('builtins.input', side_effect=['openai', 'gpt-4o', 'test-api-key']):
            
            # We would typically use runner.invoke here, but since this is a system command
            # within the interactive session, we'll directly test the function
            from src.cli.commands.model_commands import handle_model_add
            result = await handle_model_add()
            
            # Verify the model was added
            assert result is True
            model_service_mock.add_model.assert_called_once_with(
                'openai', 'gpt-4o', 'test-api-key'
            )
    
    @pytest.mark.asyncio
    async def test_models_list_command(self, temp_workspace):
        """Test that the /models command lists all configured models"""
        # Set up the workspace and preferences with sample models
        prefs_mgr = PreferencesManager(str(temp_workspace))
        await prefs_mgr.set_preference("ai.providers", {
            'openai': {
                'models': {
                    'gpt-4o': {'api_key': 'encrypted-key-1'},
                    'gpt-3.5-turbo': {'api_key': 'encrypted-key-2'}
                }
            },
            'anthropic': {
                'models': {
                    'claude-3-opus': {'api_key': 'encrypted-key-3'}
                }
            }
        })
        await prefs_mgr.set_preference("ai.default_provider", "openai")
        await prefs_mgr.set_preference("ai.default_model", "gpt-4o")
        
        # Mock the get_current_workspace function
        with patch('src.cli.commands.model_commands.get_current_workspace', return_value=str(temp_workspace)):
            
            # We would typically use runner.invoke here, but since this is a system command
            # within the interactive session, we'll directly test the function
            from src.cli.commands.model_commands import handle_models_list
            result = await handle_models_list()
            
            # Verify the models are listed correctly
            assert "Available Models:" in result
            assert "* gpt-4o" in result  # The active model should be marked
            assert "  gpt-3.5-turbo" in result
            assert "  claude-3-opus" in result
            assert "(provider: openai)" in result
            assert "(provider: anthropic)" in result
    
    @pytest.mark.asyncio
    async def test_model_use_command(self, temp_workspace, model_service_mock):
        """Test that the /model use command switches the active model"""
        # Set up the workspace and preferences with sample models
        prefs_mgr = PreferencesManager(str(temp_workspace))
        await prefs_mgr.set_preference("ai.providers", {
            'openai': {
                'models': {
                    'gpt-4o': {'api_key': 'encrypted-key-1'},
                    'gpt-3.5-turbo': {'api_key': 'encrypted-key-2'}
                }
            }
        })
        await prefs_mgr.set_preference("ai.default_provider", "openai")
        await prefs_mgr.set_preference("ai.default_model", "gpt-4o")
        
        # Mock the model service's set_active_model method
        model_service_mock.set_active_model = AsyncMock(return_value=True)
        
        # Test the model use command
        with patch('src.cli.commands.model_commands.model_service', model_service_mock), \
             patch('src.cli.commands.model_commands.get_current_workspace', return_value=str(temp_workspace)):
            
            # We would typically use runner.invoke here, but since this is a system command
            # within the interactive session, we'll directly test the function
            from src.cli.commands.model_commands import handle_model_use
            result = await handle_model_use("openai:gpt-3.5-turbo")
            
            # Verify the model was switched
            assert "Now using: openai:gpt-3.5-turbo" in result
            model_service_mock.set_active_model.assert_called_once_with("openai", "gpt-3.5-turbo")
            
            # Verify preferences were updated
            assert prefs_mgr.get_preference("ai.default_model") == "gpt-3.5-turbo"
    
    @pytest.mark.asyncio
    async def test_model_use_invalid_model(self, temp_workspace, model_service_mock):
        """Test that the /model use command handles invalid models gracefully"""
        # Set up the workspace and preferences
        prefs_mgr = PreferencesManager(str(temp_workspace))
        await prefs_mgr.set_preference("ai.providers", {
            'openai': {
                'models': {
                    'gpt-4o': {'api_key': 'encrypted-key-1'}
                }
            }
        })
        
        # Mock the model service's set_active_model method to raise an error
        model_service_mock.set_active_model = AsyncMock(side_effect=ValueError("Invalid model"))
        
        # Test the model use command with an invalid model
        with patch('src.cli.commands.model_commands.model_service', model_service_mock), \
             patch('src.cli.commands.model_commands.get_current_workspace', return_value=str(temp_workspace)):
            
            from src.cli.commands.model_commands import handle_model_use
            result = await handle_model_use("openai:invalid-model")
            
            # Verify the error was handled
            assert "Error" in result
            assert "Invalid model" in result
    
    @pytest.mark.asyncio
    async def test_provider_list_command(self, temp_workspace):
        """Test that the /provider list command lists all configured providers"""
        # Set up the workspace and preferences with sample providers
        prefs_mgr = PreferencesManager(str(temp_workspace))
        await prefs_mgr.set_preference("ai.providers", {
            'openai': {'models': {}},
            'anthropic': {'models': {}},
            'local': {'models': {}}
        })
        
        # Mock the get_current_workspace function
        with patch('src.cli.commands.model_commands.get_current_workspace', return_value=str(temp_workspace)):
            
            from src.cli.commands.model_commands import handle_provider_list
            result = await handle_provider_list()
            
            # Verify the providers are listed correctly
            assert "Configured providers:" in result
            assert "- openai" in result
            assert "- anthropic" in result
            assert "- local" in result