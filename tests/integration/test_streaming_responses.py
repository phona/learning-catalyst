"""
Integration tests for streaming AI responses functionality.

This test suite verifies that the streaming response system works correctly
with proper async generators, cancellation, and error handling.
"""

import asyncio
import pytest
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Add src to path for testing
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from src.cli.interface import CLIInterface
from src.core.config import ConfigManager
from src.core.models import Message, ChatResponse
from src.core.exceptions import AuthenticationError


class MockAsyncGenerator:
    """Mock async generator for streaming responses."""

    def __init__(self, chunks, delay=0.1):
        self.chunks = chunks
        self.delay = delay
        self.index = 0
        self.cancelled = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.cancelled or self.index >= len(self.chunks):
            raise StopAsyncIteration

        chunk = self.chunks[self.index]
        self.index += 1

        # Simulate network delay
        await asyncio.sleep(self.delay)

        # Return mock chunk object
        mock_chunk = MagicMock()
        mock_chunk.content = chunk
        return mock_chunk


class MockChatModel:
    """Mock chat model for testing streaming functionality."""

    def __init__(self, model_id="mock-model", should_fail=False):
        self.model_id = model_id
        self.should_fail = should_fail

    async def send_message(self, messages, temperature=0.7, max_tokens=None, stream=False):
        """Mock send_message method."""
        if self.should_fail:
            raise AuthenticationError("mock", "Mock authentication failed")

        if stream:
            # Return async generator for streaming
            chunks = [
                "Python is a ",
                "high-level, ",
                "interpreted programming language ",
                "known for its simplicity ",
                "and readability."
            ]
            return MockAsyncGenerator(chunks)
        else:
            # Return regular response for non-streaming
            content = "Python is a high-level, interpreted programming language known for its simplicity and readability."
            return ChatResponse(
                content=content,
                model=self.model_id,
                finish_reason="stop",
                usage={"prompt_tokens": 10, "completion_tokens": 15, "total_tokens": 25},
                timestamp=1234567890
            )


@pytest.fixture
def cli_interface():
    """Create a CLI interface for testing."""
    config_manager = ConfigManager()
    cli_interface = CLIInterface(config_manager)

    # Mock AI model
    cli_interface._ai_model = MockChatModel()
    cli_interface.state.current_provider = "mock"
    cli_interface.state.current_model = "mock-model"

    return cli_interface


class TestStreamingResponses:
    """Test suite for streaming AI responses."""

    @pytest.mark.asyncio
    async def test_successful_streaming_response(self, cli_interface):
        """Test that streaming responses work correctly."""
        # Capture output
        output_messages = []
        def capture_output(message, output_type="response"):
            output_messages.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)
        cli_interface.set_output_handler("info", capture_output)
        cli_interface.set_output_handler("markdown", capture_output)

        # Test streaming response
        result = await cli_interface._output_ai_response_streaming("What is Python?")

        # Verify result
        assert result["success"] is True
        assert result["cancelled"] is False
        assert "Python is a high-level, interpreted programming language" in result["content"]

        # Verify metrics
        metrics = result["metrics"]
        assert "word_count" in metrics
        assert "duration" in metrics
        assert "words_per_second" in metrics
        assert metrics["word_count"] > 0
        assert metrics["duration"] > 0

    @pytest.mark.asyncio
    async def test_streaming_with_cancellation(self, cli_interface):
        """Test that streaming can be cancelled mid-response."""
        # Use a slower mock for cancellation testing
        slow_chunks = ["Chunk 1 ", "Chunk 2 ", "Chunk 3 ", "Chunk 4 ", "Chunk 5 "]
        cli_interface._ai_model = MockChatModel("slow-model")

        # Override send_message to use slower chunks
        async def slow_send_message(*args, **kwargs):
            if kwargs.get('stream'):
                return MockAsyncGenerator(slow_chunks, delay=0.2)
            else:
                return MockChatResponse()

        cli_interface._ai_model.send_message = slow_send_message

        # Start streaming
        streaming_task = asyncio.create_task(
            cli_interface._output_ai_response_streaming("Test question")
        )

        # Cancel after a short delay
        await asyncio.sleep(0.3)
        cli_interface.cancel_streaming()

        # Wait for completion
        result = await streaming_task

        # Verify cancellation
        assert result.get("cancelled", False) is True
        assert len(result["content"]) > 0  # Should have partial content
        assert len(result["content"]) < len("".join(slow_chunks))  # But not all content

    @pytest.mark.asyncio
    async def test_streaming_fallback_on_error(self, cli_interface):
        """Test that streaming falls back to non-streaming on error."""
        # Create a model that fails for streaming but works for regular requests
        class FailingStreamModel:
            def __init__(self):
                self.model_id = "failing-stream-model"

            async def send_message(self, messages, temperature=0.7, max_tokens=None, stream=False):
                if stream:
                    raise Exception("Streaming failed")
                else:
                    return ChatResponse(
                        content="Fallback response content",
                        model=self.model_id,
                        finish_reason="stop",
                        usage={},
                        timestamp=1234567890
                    )

        cli_interface._ai_model = FailingStreamModel()

        # Capture output
        output_messages = []
        def capture_output(message, output_type="response"):
            output_messages.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)
        cli_interface.set_output_handler("error", capture_output)

        # Test streaming response (should fallback)
        result = await cli_interface._output_ai_response_streaming("Test question")

        # Verify fallback worked
        assert result["success"] is True
        assert "Fallback response content" in result["content"]

        # Should have logged an error message
        error_messages = [msg for msg_type, msg in output_messages if msg_type == "error"]
        assert any("Streaming failed" in msg for msg in error_messages)

    @pytest.mark.asyncio
    async def test_streaming_authentication_error(self, cli_interface):
        """Test handling of authentication errors during streaming."""
        # Use failing mock model
        cli_interface._ai_model = MockChatModel(should_fail=True)

        # Capture output
        output_messages = []
        def capture_output(message, output_type="response"):
            output_messages.append((output_type, str(message)))

        cli_interface.set_output_handler("response", capture_output)
        cli_interface.set_output_handler("error", capture_output)

        # Test streaming response
        result = await cli_interface._output_ai_response_streaming("Test question")

        # Verify error handling
        assert result["success"] is False
        assert "Authentication failed" in result.get("error", "")

    @pytest.mark.asyncio
    async def test_non_streaming_response_format(self, cli_interface):
        """Test that non-streaming responses work correctly."""
        # Create a model that returns non-streaming response
        class NonStreamingModel:
            def __init__(self):
                self.model_id = "non-streaming-model"

            async def send_message(self, messages, temperature=0.7, max_tokens=None, stream=False):
                return ChatResponse(
                    content="Non-streaming response content",
                    model=self.model_id,
                    finish_reason="stop",
                    usage={},
                    timestamp=1234567890
                )

        cli_interface._ai_model = NonStreamingModel()

        # Test streaming response (should handle non-streaming response)
        result = await cli_interface._output_ai_response_streaming("Test question")

        # Verify non-streaming response handled correctly
        assert result["success"] is True
        assert "Non-streaming response content" in result["content"]

    def test_cancel_streaming_method(self, cli_interface):
        """Test the cancel_streaming method."""
        # Initially not cancelled
        assert cli_interface._streaming_cancelled is False

        # Cancel streaming
        cli_interface.cancel_streaming()

        # Should be cancelled
        assert cli_interface._streaming_cancelled is True

    @pytest.mark.asyncio
    async def test_get_ai_response_streaming_initialization(self, cli_interface):
        """Test _get_ai_response_streaming when AI is not initialized."""
        # Reset AI model to None
        cli_interface._ai_model = None
        cli_interface._ai_provider = None

        # Mock _initialize_ai to avoid actual initialization
        with patch.object(cli_interface, '_initialize_ai', new_callable=AsyncMock) as mock_init:
            mock_init.return_value = True
            cli_interface._ai_model = MockChatModel()

            # Test streaming response initialization
            result = await cli_interface._get_ai_response_streaming("Test question")

            # Verify initialization was called
            mock_init.assert_called_once()
            assert result["success"] is True

    @pytest.mark.asyncio
    async def test_streaming_response_metrics(self, cli_interface):
        """Test that streaming response provides accurate metrics."""
        result = await cli_interface._output_ai_response_streaming("What is Python?")

        # Verify all required metrics are present
        metrics = result["metrics"]
        required_metrics = ["word_count", "duration", "words_per_second"]

        for metric in required_metrics:
            assert metric in metrics, f"Missing metric: {metric}"
            assert isinstance(metrics[metric], (int, float)), f"Metric {metric} should be numeric"

        # Verify word count is reasonable
        word_count = metrics["word_count"]
        assert word_count > 0, "Word count should be greater than 0"
        assert word_count <= 50, "Word count seems too high for test content"

        # Verify duration is reasonable
        duration = metrics["duration"]
        assert duration > 0, "Duration should be greater than 0"
        assert duration <= 10, "Duration seems too long for test content"

        # Verify words per second calculation
        words_per_sec = metrics["words_per_second"]
        assert words_per_sec > 0, "Words per second should be greater than 0"


class TestStreamingEdgeCases:
    """Test edge cases for streaming functionality."""

    @pytest.mark.asyncio
    async def test_empty_streaming_response(self, cli_interface):
        """Test handling of empty streaming responses."""
        # Create mock that returns empty chunks
        class EmptyChunkModel:
            def __init__(self):
                self.model_id = "empty-chunk-model"

            async def send_message(self, messages, temperature=0.7, max_tokens=None, stream=False):
                if stream:
                    return MockAsyncGenerator([], delay=0.01)  # Empty chunks
                else:
                    return ChatResponse(
                        content="",
                        model=self.model_id,
                        finish_reason="stop",
                        usage={},
                        timestamp=1234567890
                    )

        cli_interface._ai_model = EmptyChunkModel()

        # Test empty streaming response
        result = await cli_interface._output_ai_response_streaming("Test question")

        # Verify empty response is handled
        assert result["success"] is True
        assert result["content"] == ""

    @pytest.mark.asyncio
    async def test_streaming_with_single_chunk(self, cli_interface):
        """Test streaming with just one chunk."""
        # Create mock that returns single chunk
        class SingleChunkModel:
            def __init__(self):
                self.model_id = "single-chunk-model"

            async def send_message(self, messages, temperature=0.7, max_tokens=None, stream=False):
                if stream:
                    return MockAsyncGenerator(["Single chunk response"], delay=0.01)
                else:
                    return ChatResponse(
                        content="Single chunk response",
                        model=self.model_id,
                        finish_reason="stop",
                        usage={},
                        timestamp=1234567890
                    )

        cli_interface._ai_model = SingleChunkModel()

        # Test single chunk streaming
        result = await cli_interface._output_ai_response_streaming("Test question")

        # Verify single chunk works
        assert result["success"] is True
        assert result["content"] == "Single chunk response"

    @pytest.mark.asyncio
    async def test_immediate_cancellation(self, cli_interface):
        """Test cancellation immediately after starting streaming."""
        # Start streaming and cancel immediately
        streaming_task = asyncio.create_task(
            cli_interface._output_ai_response_streaming("Test question")
        )

        # Cancel immediately
        cli_interface.cancel_streaming()

        # Wait for completion
        result = await streaming_task

        # Verify immediate cancellation
        assert result.get("cancelled", False) is True
        # Content might be empty or very short


if __name__ == "__main__":
    # Run tests if script is executed directly
    pytest.main([__file__, "-v"])