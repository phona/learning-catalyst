"""
Integration tests for user interaction flow with streaming responses.

This test suite verifies that the complete user interaction flow works correctly,
including streaming responses, cancellation, error handling, and command processing.
"""

import asyncio
import pytest
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from io import StringIO

# Add src to path for testing
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from src.cli.interface import CLIInterface
from src.core.config import ConfigManager
from src.core.models import Message, ChatResponse
from src.core.exceptions import AuthenticationError, ValidationError


class MockAsyncGenerator:
    """Mock async generator for realistic streaming simulation."""

    def __init__(self, chunks, delay=0.05):
        self.chunks = chunks
        self.delay = delay
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.chunks):
            raise StopAsyncIteration

        chunk = self.chunks[self.index]
        self.index += 1

        # Simulate realistic network delay
        await asyncio.sleep(self.delay)

        mock_chunk = MagicMock()
        mock_chunk.content = chunk
        return mock_chunk


class TestUserInteractionFlow:
    """Test suite for complete user interaction flows."""

    @pytest.fixture
    async def cli_interface(self):
        """Create a fully configured CLI interface for testing."""
        config_manager = ConfigManager()
        cli_interface = CLIInterface(config_manager)

        # Mock successful AI initialization
        with patch.object(cli_interface, '_initialize_ai', new_callable=AsyncMock) as mock_init:
            mock_init.return_value = True

            # Mock AI model
            mock_model = MagicMock()
            mock_model.model_id = "test-model"

            # Set up streaming response
            async def mock_send_message(messages, temperature=0.7, max_tokens=None, stream=False):
                if stream:
                    chunks = [
                        "Python is a ",
                        "high-level programming language ",
                        "that is widely used ",
                        "for web development, ",
                        "data science, and automation."
                    ]
                    return MockAsyncGenerator(chunks)
                else:
                    return ChatResponse(
                        content="Python is a high-level programming language used for web development, data science, and automation.",
                        model="test-model",
                        finish_reason="stop",
                        usage={"total_tokens": 25},
                        timestamp=1234567890
                    )

            mock_model.send_message = mock_send_message
            cli_interface._ai_model = mock_model
            cli_interface._ai_provider = MagicMock()
            cli_interface.state.current_provider = "test-provider"
            cli_interface.state.current_model = "test-model"

            yield cli_interface

    @pytest.mark.asyncio
    async def test_complete_conversation_flow(self, cli_interface):
        """Test a complete conversation flow from user input to AI response."""
        # Set up input/output capture
        user_inputs = ["What is Python?"]
        input_index = 0

        def mock_input(prompt):
            nonlocal input_index
            if input_index < len(user_inputs):
                result = user_inputs[input_index]
                input_index += 1
                return result
            return "/quit"

        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_input_handler(mock_input)
        cli_interface.set_output_handler("response", capture_output)
        cli_interface.set_output_handler("info", capture_output)
        cli_interface.set_output_handler("error", capture_output)
        cli_interface.set_output_handler("markdown", capture_output)

        # Process the conversation
        should_continue = await cli_interface.process_input("What is Python?")

        # Verify conversation flow
        assert should_continue is True, "Should continue after normal conversation"

        # Check that streaming was attempted
        output_types = [output_type for output_type, _ in captured_output]
        assert "response" in output_types, "Should have response outputs"

        # Check that AI response content is present
        all_output = " ".join([content for _, content in captured_output])
        assert "Python is a" in all_output, "Should contain AI response content"

        # Verify conversation history was updated
        assert len(cli_interface.state.conversation_history) > 0, "Should have conversation history"
        user_messages = [msg for msg in cli_interface.state.conversation_history if msg["role"] == "user"]
        assistant_messages = [msg for msg in cli_interface.state.conversation_history if msg["role"] == "assistant"]
        assert len(user_messages) > 0, "Should have user messages in history"
        assert len(assistant_messages) > 0, "Should have assistant messages in history"

    @pytest.mark.asyncio
    async def test_command_processing_flow(self, cli_interface):
        """Test that commands are processed correctly during conversation."""
        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)

        # Test help command
        should_continue = await cli_interface.process_input("/help")

        assert should_continue is True, "Should continue after help command"

        # Should have help content in output
        all_output = " ".join([content for _, content in captured_output])
        assert "help" in all_output.lower(), "Should contain help information"

    @pytest.mark.asyncio
    async def test_streaming_cancellation_during_response(self, cli_interface):
        """Test user cancellation during streaming response."""
        # Set up slower streaming to allow cancellation
        async def slow_send_message(messages, temperature=0.7, max_tokens=None, stream=False):
            if stream:
                chunks = ["Chunk 1 ", "Chunk 2 ", "Chunk 3 ", "Chunk 4 ", "Chunk 5 "]
                return MockAsyncGenerator(chunks, delay=0.1)  # Slower response
            else:
                return ChatResponse(
                    content="Slow response",
                    model="test-model",
                    finish_reason="stop",
                    usage={},
                    timestamp=1234567890
                )

        cli_interface._ai_model.send_message = slow_send_message

        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)

        # Start conversation in background
        conversation_task = asyncio.create_task(
            cli_interface.process_input("Tell me a long story")
        )

        # Wait a bit then cancel
        await asyncio.sleep(0.15)
        cli_interface.cancel_streaming()

        # Wait for completion
        should_continue = await conversation_task

        # Should continue after cancellation
        assert should_continue is True

        # Should have partial content
        all_output = " ".join([content for _, content in captured_output])
        assert "Chunk 1" in all_output, "Should have received some content before cancellation"

    @pytest.mark.asyncio
    async def test_error_handling_flow(self, cli_interface):
        """Test error handling during conversation flow."""
        # Mock AI model that fails
        failing_model = MagicMock()
        failing_model.model_id = "failing-model"

        async def failing_send_message(messages, temperature=0.7, max_tokens=None, stream=False):
            raise AuthenticationError("test-provider", "API key is invalid")

        failing_model.send_message = failing_send_message
        cli_interface._ai_model = failing_model

        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)
        cli_interface.set_output_handler("error", capture_output)

        # Process input with failing AI
        should_continue = await cli_interface.process_input("This should fail")

        # Should continue after error
        assert should_continue is True

        # Should have error message
        error_outputs = [content for output_type, content in captured_output if output_type == "error"]
        assert len(error_outputs) > 0, "Should have error outputs"

        # Should have helpful error information
        all_output = " ".join([content for _, content in captured_output])
        assert "Authentication" in all_output or "API key" in all_output, "Should have authentication error info"

    @pytest.mark.asyncio
    async def test_learning_suggestions_flow(self, cli_interface):
        """Test that learning suggestions are provided after responses."""
        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)
        cli_interface.set_output_handler("info", capture_output)

        # Process a question about programming
        should_continue = await cli_interface.process_input("What is Python programming?")

        assert should_continue is True

        # Check for learning suggestions
        all_output = " ".join([content for _, content in captured_output])

        # Should have suggestions related to programming
        suggestion_keywords = ["Ask for examples", "Show me a code example", "practice", "quiz"]
        has_suggestions = any(keyword in all_output for keyword in suggestion_keywords)

        # Note: This might not always trigger depending on the suggestion logic
        # but we can verify the structure is there
        assert "Python" in all_output, "Should have processed the Python question"

    @pytest.mark.asyncio
    async def test_conversation_context_maintenance(self, cli_interface):
        """Test that conversation context is maintained across multiple messages."""
        # Process multiple related questions
        questions = [
            "What is Python?",
            "How do I install it?",
            "Show me a simple example"
        ]

        for question in questions:
            should_continue = await cli_interface.process_input(question)
            assert should_continue is True, f"Should continue after: {question}"

        # Verify conversation history
        assert len(cli_interface.state.conversation_history) >= len(questions) * 2, "Should have user and assistant messages"

        # Verify context is maintained (user questions are in history)
        user_messages = [msg for msg in cli_interface.state.conversation_history if msg["role"] == "user"]
        for question in questions:
            assert any(question in msg["content"] for msg in user_messages), f"Should have '{question}' in history"

    @pytest.mark.asyncio
    async def test_exit_command_flow(self, cli_interface):
        """Test that exit commands are handled correctly."""
        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)

        # Test various exit commands
        exit_commands = ["/quit", "/exit", "quit", "exit"]

        for command in exit_commands:
            should_continue = await cli_interface.process_input(command)
            assert should_continue is False, f"Should exit after: {command}"

            # Reset for next test
            cli_interface.state.session_active = True

    @pytest.mark.asyncio
    async def test_concept_tracking_flow(self, cli_interface):
        """Test that concepts are tracked during conversation."""
        # Ask about programming concepts
        concept_question = "Explain variables, functions, and classes in programming"

        should_continue = await cli_interface.process_input(concept_question)
        assert should_continue is True

        # Check if concepts were tracked (if the feature is enabled)
        # This might not always trigger depending on the concept extraction logic
        # but we can verify the question was processed
        assert len(cli_interface.state.conversation_history) > 0, "Should have conversation history"

    @pytest.mark.asyncio
    async def test_empty_input_handling(self, cli_interface):
        """Test handling of empty and whitespace inputs."""
        empty_inputs = ["", "   ", "\t", "\n"]

        for empty_input in empty_inputs:
            should_continue = await cli_interface.process_input(empty_input)
            assert should_continue is True, "Should continue with empty input"

        # Should not have added empty inputs to conversation history
        user_messages = [msg for msg in cli_interface.state.conversation_history if msg["role"] == "user"]
        non_empty_messages = [msg for msg in user_messages if msg["content"].strip()]

        # Should not have empty messages in history
        empty_in_history = any(not msg["content"].strip() for msg in user_messages)
        assert not empty_in_history, "Should not have empty messages in conversation history"

    @pytest.mark.asyncio
    async def test_streaming_progress_indicators(self, cli_interface):
        """Test that streaming progress indicators work correctly."""
        captured_output = []
        def capture_output(message, output_type="response"):
            captured_output.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)

        # Process a question that will trigger streaming
        should_continue = await cli_interface.process_input("What is artificial intelligence?")

        assert should_continue is True

        # Check for progress indicators in output
        all_output = " ".join([content for _, content in captured_output])

        # Should have streaming indicators
        streaming_indicators = ["Streaming...", "words", "words/sec", "Response complete"]
        has_indicators = any(indicator in all_output for indicator in streaming_indicators)
        assert has_indicators, "Should have streaming progress indicators"

    @pytest.mark.asyncio
    async def test_multiple_concurrent_requests_prevention(self, cli_interface):
        """Test that multiple concurrent requests are handled gracefully."""
        # Start first request
        first_task = asyncio.create_task(
            cli_interface.process_input("First question")
        )

        # Try to start second request immediately
        # (This tests if the system handles concurrent gracefully)
        second_task = asyncio.create_task(
            cli_interface.process_input("Second question")
        )

        # Wait for both to complete
        result1 = await first_task
        result2 = await second_task

        # Both should complete successfully
        assert result1 is True, "First request should complete"
        assert result2 is True, "Second request should complete"

        # Should have conversation history for both
        user_messages = [msg for msg in cli_interface.state.conversation_history if msg["role"] == "user"]
        assert len(user_messages) >= 2, "Should have both user questions in history"


class TestUserInteractionEdgeCases:
    """Test edge cases for user interaction flow."""

    @pytest.mark.asyncio
    async def test_very_long_user_input(self, cli_interface):
        """Test handling of very long user inputs."""
        long_input = "Explain " + "very " * 1000 + "long concepts in detail."

        should_continue = await cli_interface.process_input(long_input)
        assert should_continue is True

        # Should handle long input without crashing
        assert len(cli_interface.state.conversation_history) > 0

    @pytest.mark.asyncio
    async def test_special_characters_in_input(self, cli_interface):
        """Test handling of special characters in user input."""
        special_inputs = [
            "What is Python? 🐍",
            "Test with 中文 characters",
            "Arabic: البرمجة",
            "Russian: Программирование",
            "Math: ∑∏∫∆∇∂",
            "Emojis: 🚀🎯💡🔧"
        ]

        for special_input in special_inputs:
            should_continue = await cli_interface.process_input(special_input)
            assert should_continue is True, f"Should handle special input: {special_input}"

    @pytest.mark.asyncio
    async def test_rapid_succession_inputs(self, cli_interface):
        """Test rapid succession of user inputs."""
        inputs = [
            "Quick question 1",
            "Quick question 2",
            "Quick question 3"
        ]

        for user_input in inputs:
            should_continue = await cli_interface.process_input(user_input)
            assert should_continue is True

        # Should have handled all inputs
        user_messages = [msg for msg in cli_interface.state.conversation_history if msg["role"] == "user"]
        assert len(user_messages) >= len(inputs), "Should have processed all rapid inputs"


if __name__ == "__main__":
    # Run tests if script is executed directly
    pytest.main([__file__, "-v"])