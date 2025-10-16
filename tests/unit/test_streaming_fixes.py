"""
Unit tests for streaming implementation fixes.

Tests that the critical streaming issues identified in the UX evaluation are resolved:
1. Async Generator Handling in Streaming Response Processing
2. Missing Attributes Error Handling
3. Streaming State Initialization Issues
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from src.core.models import ChatResponse
from src.cli.interface import CLIInterface, StreamingState
from src.core.config import ConfigManager


class TestStreamingFixes:
    """Test suite for streaming implementation fixes."""

    @pytest.fixture
    def config_manager(self):
        """Create a mock config manager."""
        config = Mock(spec=ConfigManager)
        config.get.return_value = None
        return config

    @pytest.fixture
    def cli_interface(self, config_manager):
        """Create a CLI interface instance for testing."""
        with patch('src.cli.interface.initialize_key_handler') as mock_key_handler:
            mock_key_handler.return_value = Mock()
            interface = CLIInterface(config_manager)
            return interface

    def test_chat_response_handles_none_stream(self):
        """Test that ChatResponse.from_stream handles None input gracefully."""
        # Test with None input
        response = ChatResponse.from_stream(None)

        assert response._is_streaming is True
        assert response._response is None
        assert response.content == ""
        assert response.reasoning_content is None

    def test_chat_response_handles_non_async_iterable(self):
        """Test that ChatResponse.from_stream handles non-async iterable objects."""
        # Test with regular object (not async iterable)
        regular_obj = Mock()
        regular_obj.content = "test content"

        response = ChatResponse.from_stream(regular_obj)

        assert response._is_streaming is False
        assert response._response is regular_obj

    def test_chat_response_safe_content_extraction(self):
        """Test safe content extraction from malformed chunks."""
        # Test with None chunk
        response = ChatResponse(None)
        assert response.content == ""
        assert response.reasoning_content is None

        # Test with chunk missing choices
        chunk_no_choices = Mock()
        del chunk_no_choices.choices
        response = ChatResponse(chunk_no_choices)
        assert response.content == ""

        # Test with chunk having empty choices
        chunk_empty_choices = Mock()
        chunk_empty_choices.choices = []
        response = ChatResponse(chunk_empty_choices)
        assert response.content == ""

        # Test with chunk having choice without delta or message
        chunk_no_delta = Mock()
        chunk_no_delta.choices = [Mock()]
        # Don't set delta or message at all
        response = ChatResponse(chunk_no_delta)
        assert response.content == ""

    def test_chat_response_safe_reasoning_content_extraction(self):
        """Test safe reasoning content extraction from chunks."""
        # Test with chunk that has reasoning_content
        chunk_with_reasoning = Mock()
        chunk_with_reasoning.choices = [Mock()]
        chunk_with_reasoning.choices[0].delta = Mock()
        chunk_with_reasoning.choices[0].delta.reasoning_content = "thinking..."

        response = ChatResponse(chunk_with_reasoning)
        assert response.reasoning_content == "thinking..."

        # Test with chunk that doesn't have reasoning_content
        chunk_without_reasoning = Mock()
        chunk_without_reasoning.choices = [Mock()]
        chunk_without_reasoning.choices[0].delta = Mock()
        del chunk_without_reasoning.choices[0].delta.reasoning_content

        response = ChatResponse(chunk_without_reasoning)
        assert response.reasoning_content is None

    @pytest.mark.asyncio
    async def test_stream_generator_handles_chunk_errors(self):
        """Test that stream generator continues despite individual chunk errors."""
        # Create a mock async generator that yields chunks with some errors
        async def mock_async_generator():
            chunks = [
                Mock(choices=[Mock(delta=Mock(content="Hello "))]),
                None,  # This will cause an error
                Mock(choices=[Mock(delta=Mock(content="world!"))])
            ]

            for chunk in chunks:
                if chunk is None:
                    # This should be handled gracefully
                    yield None
                else:
                    yield chunk

        response = ChatResponse(mock_async_generator(), is_streaming=True)

        collected_chunks = []
        async for chunk_response in response:
            if chunk_response is not None:  # Filter out None responses from errors
                collected_chunks.append(chunk_response)

        # Should have collected valid chunks despite the error
        assert len(collected_chunks) >= 1
        # First chunk should be valid
        assert collected_chunks[0].content == "Hello "

    @pytest.mark.asyncio
    async def test_stream_generator_handles_async_iteration_errors(self):
        """Test that stream generator handles async iteration errors gracefully."""
        # Create a mock async generator that throws an error
        async def failing_async_generator():
            yield Mock(choices=[Mock(delta=Mock(content="Before error"))])
            raise RuntimeError("Async iteration failed")

        response = ChatResponse(failing_async_generator(), is_streaming=True)

        collected_chunks = []
        try:
            async for chunk_response in response:
                collected_chunks.append(chunk_response)
        except Exception as e:
            # Should not crash the entire application
            assert "Async iteration failed" in str(e)

        # Should have collected the chunk before the error
        assert len(collected_chunks) >= 1
        assert collected_chunks[0].content == "Before error"

    def test_streaming_state_proper_initialization(self, cli_interface):
        """Test that streaming state is properly initialized with timestamps."""
        # Reset streaming state to test initialization
        cli_interface._streaming_cancelled = False
        current_time = time.time()
        cli_interface._streaming_state = StreamingState(
            start_time=current_time,
            last_chunk_time=current_time,
            thinking_visible=False
        )

        # Check initial state
        assert isinstance(cli_interface._streaming_state, StreamingState)
        assert cli_interface._streaming_state.is_thinking is False
        assert cli_interface._streaming_state.thinking_content == ""
        assert cli_interface._streaming_state.response_content == ""
        assert cli_interface._streaming_state.thinking_visible is False
        assert cli_interface._streaming_state.start_time >= current_time
        assert cli_interface._streaming_state.last_chunk_time >= current_time

    @pytest.mark.asyncio
    async def test_streaming_state_initialization_in_streaming_method(self, cli_interface):
        """Test that streaming state is properly initialized in the streaming method."""
        # Mock the AI model
        cli_interface._ai_model = Mock()
        cli_interface._ai_model.send_message = AsyncMock(return_value=None)
        cli_interface._initialize_ai = AsyncMock(return_value=True)

        # Mock the live streaming manager to avoid Rich display issues
        with patch('src.cli.interface.LiveStreamingManager') as mock_manager_class:
            mock_manager = Mock()
            mock_manager_class.return_value = mock_manager
            mock_manager.start_streaming = Mock()
            mock_manager.stop_streaming = Mock()
            mock_manager.finalize_response = Mock()
            mock_manager.toggle_thinking_visibility = Mock()
            mock_manager.thinking_visible = False
            mock_manager.thinking_content = ""
            mock_manager.response_content = ""
            mock_manager.response_word_count = 0
            mock_manager.thinking_word_count = 0
            mock_manager.start_time = 0.0

            # Start streaming
            start_time = asyncio.get_event_loop().time()
            result = await cli_interface._output_ai_response_streaming("test input")

            # Check that streaming state was properly initialized
            assert cli_interface._streaming_state.start_time >= start_time
            assert cli_interface._streaming_state.last_chunk_time >= start_time
            assert cli_interface._streaming_state.thinking_visible is False
            assert cli_interface._streaming_state.is_thinking is False

    @pytest.mark.asyncio
    async def test_streaming_handles_non_async_iterable_stream(self, cli_interface):
        """Test that streaming handles non-async iterable stream objects."""
        # Create a non-async iterable response
        non_async_response = Mock()
        non_async_response.content = "Non-streaming content"

        # Mock the AI model to return non-async response
        cli_interface._ai_model = Mock()
        cli_interface._ai_model.send_message = AsyncMock(return_value=non_async_response)
        cli_interface._initialize_ai = AsyncMock(return_value=True)

        # Mock the live streaming manager
        with patch('src.cli.interface.LiveStreamingManager') as mock_manager_class:
            mock_manager = Mock()
            mock_manager_class.return_value = mock_manager
            mock_manager.start_streaming = Mock()
            mock_manager.stop_streaming = Mock()
            mock_manager.finalize_response = Mock()
            mock_manager.transition_to_response = Mock()
            mock_manager.thinking_content = ""
            mock_manager.response_content = "Non-streaming content"
            mock_manager.response_word_count = 2
            mock_manager.thinking_word_count = 0
            mock_manager.start_time = time.time()

            # Test streaming with non-async response
            result = await cli_interface._output_ai_response_streaming("test input")

            # Should handle non-async response gracefully
            assert result["success"] is True
            assert "Non-streaming content" in result["content"]

    @pytest.mark.asyncio
    async def test_streaming_fallback_mechanism(self, cli_interface):
        """Test that streaming falls back gracefully when streaming fails."""
        # Mock the AI model to fail for streaming
        failing_stream = Mock()
        failing_stream.__aiter__ = Mock(side_effect=RuntimeError("Streaming failed"))

        cli_interface._ai_model = Mock()
        cli_interface._ai_model.send_message = AsyncMock(return_value=failing_stream)
        cli_interface._initialize_ai = AsyncMock(return_value=True)

        # Mock fallback response
        with patch.object(cli_interface, '_get_ai_response_fallback', new_callable=AsyncMock) as mock_fallback:
            mock_fallback.return_value = {
                "success": True,
                "content": "Fallback content",
                "thinking_content": ""
            }

            # Test streaming with failing stream
            result = await cli_interface._output_ai_response_streaming("test input")

            # Should fall back successfully
            assert result["success"] is True
            assert "Fallback content" in result["content"]
            mock_fallback.assert_called_once()

    def test_thinking_toggle_with_error_handling(self, cli_interface):
        """Test that thinking toggle handles errors gracefully."""
        # Add a handler that will throw an error
        def failing_handler():
            raise RuntimeError("Handler failed")

        cli_interface.add_thinking_toggle_handler(failing_handler)

        # Toggle should not crash despite the failing handler
        initial_visibility = cli_interface._streaming_state.thinking_visible
        cli_interface.toggle_thinking_visibility()

        # Visibility should still toggle despite the error
        assert cli_interface._streaming_state.thinking_visible != initial_visibility

    @pytest.mark.asyncio
    async def test_streaming_cleanup_on_error(self, cli_interface):
        """Test that streaming cleanup happens even when errors occur."""
        # Mock a stream that fails
        failing_stream = Mock()
        failing_stream.__aiter__ = Mock(side_effect=RuntimeError("Stream failed"))

        cli_interface._ai_model = Mock()
        cli_interface._ai_model.send_message = AsyncMock(return_value=failing_stream)
        cli_interface._initialize_ai = AsyncMock(return_value=True)

        # Mock live streaming manager to verify cleanup
        with patch('src.cli.interface.LiveStreamingManager') as mock_manager_class:
            mock_manager = Mock()
            mock_manager_class.return_value = mock_manager
            mock_manager.start_streaming = Mock()
            mock_manager.stop_streaming = Mock()
            mock_manager.stop_streaming.side_effect = Exception("Cleanup failed")  # Even cleanup fails

            # Test streaming with failure
            result = await cli_interface._output_ai_response_streaming("test input")

            # Should fail gracefully
            assert result["success"] is False
            # Cleanup should have been attempted
            mock_manager.stop_streaming.assert_called()

    @pytest.mark.asyncio
    async def test_chat_response_from_stream_validation(self):
        """Test that ChatResponse.from_stream validates input properly."""
        # Test with valid async iterable
        async def valid_generator():
            yield Mock(choices=[Mock(delta=Mock(content="test"))])

        response = ChatResponse.from_stream(valid_generator())
        assert response._is_streaming is True
        assert hasattr(response, '__aiter__')

        # Test with invalid object that raises error during validation
        class InvalidObject:
            def __aiter__(self):
                raise RuntimeError("Invalid iterator")

        response = ChatResponse.from_stream(InvalidObject())
        # Should still create a response object, but might not work properly
        assert response._is_streaming is True  # Should fallback to streaming mode
        # The response object should still exist even if validation failed
        assert response is not None

    @pytest.mark.asyncio
    async def test_safe_attribute_access_patterns(self):
        """Test that all attribute access patterns are safe."""
        # Create chunk with various missing attributes
        chunk = Mock()
        chunk.choices = [Mock()]
        chunk.choices[0].delta = Mock()
        # Don't set any attributes on delta

        response = ChatResponse(chunk)

        # All these should not raise exceptions
        assert response.content == ""
        assert response.reasoning_content is None
        assert response.finish_reason == "stop"
        assert response.model == ""

        # Usage should not crash and should return something reasonable
        try:
            usage = response.usage
            # Usage might be a dict or a Mock object, but shouldn't crash
            assert usage is not None
        except Exception:
            # If it does crash, that's a failure
            pytest.fail("Usage access should not crash")

        assert response.timestamp > 0

    @pytest.mark.asyncio
    async def test_chat_response_streaming_with_missing_attributes(self):
        """Test ChatResponse streaming with missing attributes."""
        # Create chunks with various missing attributes
        async def chunk_generator():
            # Chunk with content but no reasoning
            chunk1 = Mock()
            chunk1.choices = [Mock()]
            chunk1.choices[0].delta = Mock()
            chunk1.choices[0].delta.content = "Hello "
            del chunk1.choices[0].delta.reasoning_content
            yield chunk1

            # Chunk with reasoning but no content
            chunk2 = Mock()
            chunk2.choices = [Mock()]
            chunk2.choices[0].delta = Mock()
            chunk2.choices[0].delta.reasoning_content = "thinking..."
            del chunk2.choices[0].delta.content
            yield chunk2

            # Chunk with neither
            chunk3 = Mock()
            chunk3.choices = [Mock()]
            chunk3.choices[0].delta = Mock()
            del chunk3.choices[0].delta.content
            del chunk3.choices[0].delta.reasoning_content
            yield chunk3

        response = ChatResponse(chunk_generator(), is_streaming=True)

        collected_chunks = []
        async for chunk_response in response:
            collected_chunks.append(chunk_response)

        # Should have collected all chunks without errors
        assert len(collected_chunks) == 3
        assert collected_chunks[0].content == "Hello "
        assert collected_chunks[0].reasoning_content is None
        assert collected_chunks[1].content == ""
        assert collected_chunks[1].reasoning_content == "thinking..."
        assert collected_chunks[2].content == ""
        assert collected_chunks[2].reasoning_content is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])