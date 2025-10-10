"""
Unit tests for Configuring AI Models (Story 6) functionality
"""

import os
import sys
from unittest.mock import AsyncMock, patch

import pytest
from typer.testing import CliRunner

from src.utils.preferences_manager import PreferencesManager


runner = CliRunner()


class TestModelConfiguration:
    @pytest.mark.asyncio
    async def test_model_add_command(self, temp_workspace, model_service):
        """Test that the /models command shows configured models"""
        # Set up the workspace and preferences with configured models
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference("ai.providers", {
            "openai": {
                "models": {
                    "gpt-4o": {"description": "OpenAI's most capable model", "is_default": True},
                    "gpt-3.5-turbo": {"description": "OpenAI's fast model", "is_default": False}
                }
            }
        })

        # Test the models command
        from src.cli.commands.config.models import models_command

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

        # Set up the workspace and preferences with multiple providers
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference("ai.providers", {
            "openai": {
                "models": {
                    "gpt-4o": {"description": "OpenAI's most capable model", "is_default": True},
                    "gpt-3.5-turbo": {"description": "OpenAI's fast model", "is_default": False}
                }
            },
            "anthropic": {
                "models": {
                    "claude-3-opus": {"description": "Anthropic's most capable model", "is_default": False}
                }
            }
        })

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
        """Test that the models command shows no models when none are configured"""
        from src.cli.commands.config.models import models_command

        # Set up empty preferences (no configured models)
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference("ai.providers", {})

        result = await models_command([], {"workspace_path": str(temp_workspace)})

        # Verify the no models message is shown
        assert result.success is True
        assert "No models configured" in result.message
        assert "Please set up your AI provider first using /config" in result.message

    @pytest.mark.asyncio
    async def test_provider_list_command(self, temp_workspace):
        """Test that the models command lists providers correctly"""
        from src.cli.commands.config.models import models_command

        # Set up preferences with multiple providers including openai-compatible
        prefs_mgr = PreferencesManager(str(temp_workspace))
        prefs_mgr.set_preference("ai.providers", {
            "openai": {
                "models": {
                    "gpt-4o": {"description": "OpenAI's most capable model", "is_default": True}
                }
            },
            "anthropic": {
                "models": {
                    "claude-3-opus": {"description": "Anthropic's most capable model", "is_default": False}
                }
            },
            "openai-compatible": {
                "models": {
                    "llama3": {"description": "Local Llama3 model", "is_default": False}
                }
            }
        })

        result = await models_command([], {"workspace_path": str(temp_workspace)})

        # Verify the providers are listed correctly
        assert result.success is True
        assert "Available AI Models" in result.message
        assert "OPENAI:" in result.message
        assert "ANTHROPIC:" in result.message
        assert "OPENAI-COMPATIBLE:" in result.message
