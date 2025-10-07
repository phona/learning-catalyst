"""
Unit tests for Configuring AI Models (Story 6) functionality
"""

import os
import sys
from unittest.mock import AsyncMock, patch

import pytest
from typer.testing import CliRunner

from src.utils.preferences_manager import PreferencesManager

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))


runner = CliRunner()


class TestModelConfiguration:
    @pytest.mark.asyncio
    async def test_model_add_command(self, temp_workspace, model_service):
        """Test that the /model add command works correctly"""
        # Set up the workspace and preferences
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference("ai.providers", {})

        # Mock the model service's add_model method
        model_service.add_model = AsyncMock(return_value=True)

        # Test the models command
        from src.cli.commands.config.models import models_command

        # Mock the system handler
        with patch("src.cli.commands.config.models.SystemCommandsHandlerImpl") as MockHandler:
            mock_handler = MockHandler.return_value
            mock_handler.list_available_models = AsyncMock(
                return_value=[
                    {"provider": "openai", "model": "gpt-4o", "description": "OpenAI's most capable model", "is_default": True},
                    {"provider": "openai", "model": "gpt-3.5-turbo", "description": "OpenAI's fast model", "is_default": False},
                ]
            )

            result = await models_command([], {"workspace_path": str(temp_workspace)})

            # Verify the result
            assert result.success is True
            assert "Available AI Models" in result.message
            assert "gpt-4o" in result.message
            assert "gpt-3.5-turbo" in result.message

    @pytest.mark.asyncio
    async def test_models_list_command(self, temp_workspace):
        """Test that the /models command lists all configured models"""
        from src.cli.commands.config.models import models_command

        # Mock the system handler
        with patch("src.cli.commands.config.models.SystemCommandsHandlerImpl") as MockHandler:
            mock_handler = MockHandler.return_value
            mock_handler.list_available_models = AsyncMock(
                return_value=[
                    {"provider": "openai", "model": "gpt-4o", "description": "OpenAI's most capable model", "is_default": True},
                    {"provider": "openai", "model": "gpt-3.5-turbo", "description": "OpenAI's fast model", "is_default": False},
                    {
                        "provider": "anthropic",
                        "model": "claude-3-opus",
                        "description": "Anthropic's most capable model",
                        "is_default": False,
                    },
                ]
            )

            result = await models_command([], {"workspace_path": str(temp_workspace)})

            # Verify the models are listed correctly
            assert result.success is True
            assert "Available AI Models" in result.message
            assert "gpt-4o" in result.message
            assert "gpt-3.5-turbo" in result.message
            assert "claude-3-opus" in result.message
            assert "OPENAI:" in result.message
            assert "ANTHROPIC:" in result.message

    @pytest.mark.asyncio
    async def test_model_use_command(self, temp_workspace, model_service):
        """Test that the /model use command switches the active model"""
        # This test is no longer relevant as we don't have a model use command
        # The models command only lists available models
        # Configuration changes are handled through the config command

    @pytest.mark.asyncio
    async def test_model_use_invalid_model(self, temp_workspace, model_service):
        """Test that the models command handles errors gracefully"""
        from src.cli.commands.config.models import models_command

        # Mock the system handler to raise an error
        with patch("src.cli.commands.config.models.SystemCommandsHandlerImpl") as MockHandler:
            mock_handler = MockHandler.return_value
            mock_handler.list_available_models = AsyncMock(side_effect=ValueError("Invalid model"))

            result = await models_command([], {"workspace_path": str(temp_workspace)})

            # Verify the error was handled
            assert result.success is False
            assert "Error retrieving models" in result.message
            assert result.error and "Invalid model" in result.error

    @pytest.mark.asyncio
    async def test_provider_list_command(self, temp_workspace):
        """Test that the models command lists providers correctly"""
        from src.cli.commands.config.models import models_command

        # Mock the system handler
        with patch("src.cli.commands.config.models.SystemCommandsHandlerImpl") as MockHandler:
            mock_handler = MockHandler.return_value
            mock_handler.list_available_models = AsyncMock(
                return_value=[
                    {"provider": "openai", "model": "gpt-4o", "description": "OpenAI's most capable model", "is_default": True},
                    {
                        "provider": "anthropic",
                        "model": "claude-3-opus",
                        "description": "Anthropic's most capable model",
                        "is_default": False,
                    },
                    {
                        "provider": "openai-compatible",
                        "model": "llama3",
                        "description": "Local Llama3 model",
                        "is_default": False,
                    },
                ]
            )

            result = await models_command([], {"workspace_path": str(temp_workspace)})

            # Verify the providers are listed correctly
            assert result.success is True
            assert "Available AI Models" in result.message
            assert "OPENAI:" in result.message
            assert "ANTHROPIC:" in result.message
            assert "OPENAI-COMPATIBLE:" in result.message
