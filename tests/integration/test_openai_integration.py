"""
Integration tests for Phase 1.2 Basic OpenAI Integration.

Tests that the CLI can successfully communicate with OpenAI API.
"""

import pytest
import asyncio
import os
from unittest.mock import Mock, patch, AsyncMock

from src.cli.interface import CLIInterface
from src.core.config import ConfigManager


class TestOpenAIIntegration:
    """Test cases for OpenAI integration."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_openai_provider_initialization(self):
        """Test that OpenAI provider can be initialized."""
        config = ConfigManager()
        interface = CLIInterface(config)

        # Mock configuration with OpenAI API key
        config.set("ai.default_provider", "openai")
        config.set("ai.providers.openai.api_key", "test-api-key")
        config.set("ai.default_model", "gpt-3.5-turbo")

        # Mock the AI provider factory and provider
        with patch('src.cli.interface.ModelFactory') as mock_factory:
            mock_provider = Mock()
            mock_provider.list_available_models = AsyncMock(return_value=Mock(
                chat=[Mock(model_id="gpt-3.5-turbo")]
            ))
            mock_factory.get_provider_instance = Mock(return_value=mock_provider)

            result = await interface._initialize_ai()
            assert result is True
            assert interface._ai_provider is not None
            assert interface._ai_model is not None

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_conversation_input_with_ai(self):
        """Test that conversation input triggers AI response."""
        config = ConfigManager()
        interface = CLIInterface(config)

        # Mock AI response
        mock_response = Mock()
        mock_response.content = "Python is a programming language..."
        mock_response.model = "gpt-3.5-turbo"
        mock_response.usage = {"prompt_tokens": 10, "completion_tokens": 20}

        with patch.object(interface, '_get_ai_response') as mock_ai:
            mock_ai.return_value = {
                "success": True,
                "content": mock_response.content,
                "model": mock_response.model,
                "usage": mock_response.usage
            }

            # Mock output handler
            output_messages = []
            interface.set_output_handler("response", output_messages.append)

            await interface._handle_conversation_input("What is Python?")

            # Verify AI was called and response output
            mock_ai.assert_called_once_with("What is Python?")
            assert len(output_messages) == 1
            assert "Python is a programming language" in output_messages[0]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_conversation_input_fallback_without_ai(self):
        """Test fallback behavior when AI is not configured."""
        config = ConfigManager()
        interface = CLIInterface(config)

        # Mock initialization failure
        with patch.object(interface, '_initialize_ai', return_value=False):
            # Mock output handler
            output_messages = []
            interface.set_output_handler("response", output_messages.append)

            await interface._handle_conversation_input("What is Python?")

            # Verify fallback message
            assert len(output_messages) == 1
            assert "configure an AI provider first" in output_messages[0]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_ai_response_error_handling(self):
        """Test error handling in AI responses."""
        config = ConfigManager()
        interface = CLIInterface(config)

        with patch.object(interface, '_get_ai_response') as mock_ai:
            mock_ai.return_value = {
                "success": False,
                "error": "API key invalid"
            }

            # Mock output handler
            output_messages = []
            interface.set_output_handler("response", output_messages.append)

            await interface._handle_conversation_input("What is Python?")

            # Verify fallback message on error
            assert len(output_messages) == 1
            assert "configure an AI provider first" in output_messages[0]

    @pytest.mark.integration
    @pytest.mark.phase1_2
    def test_interface_has_ai_attributes(self):
        """Test that interface has AI-related attributes."""
        config = ConfigManager()
        interface = CLIInterface(config)

        assert hasattr(interface, '_ai_provider')
        assert hasattr(interface, '_ai_model')
        assert hasattr(interface, '_initialize_ai')
        assert hasattr(interface, '_get_ai_response')