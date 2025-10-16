"""
Tests for enhanced streaming functionality with thinking process display.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from src.cli.interface import CLIInterface, StreamingState
from src.core.config import ConfigManager


class TestEnhancedStreaming:
    """Test enhanced streaming functionality."""

    @pytest.fixture
    def cli_interface(self):
        """Create a CLI interface instance for testing."""
        config_manager = Mock(spec=ConfigManager)
        config_manager.get.return_value = None

        # Mock the key handler to avoid complex setup
        with patch('src.cli.interface.initialize_key_handler') as mock_key_handler:
            mock_key_handler.return_value = Mock()
            interface = CLIInterface(config_manager)
            return interface

    def test_streaming_state_initialization(self, cli_interface):
        """Test that streaming state is properly initialized."""
        assert isinstance(cli_interface._streaming_state, StreamingState)
        assert cli_interface._streaming_state.is_thinking is False
        assert cli_interface._streaming_state.thinking_content == ""
        assert cli_interface._streaming_state.response_content == ""
        assert cli_interface._streaming_state.thinking_visible is False
        assert cli_interface._streaming_state.start_time > 0
        assert cli_interface._streaming_state.last_chunk_time > 0

    def test_thinking_toggle(self, cli_interface):
        """Test thinking visibility toggle."""
        # Initial state should be False
        assert cli_interface._streaming_state.thinking_visible is False

        # Toggle to True
        cli_interface.toggle_thinking_visibility()
        assert cli_interface._streaming_state.thinking_visible is True

        # Toggle back to False
        cli_interface.toggle_thinking_visibility()
        assert cli_interface._streaming_state.thinking_visible is False

    def test_detect_thinking_phase(self, cli_interface):
        """Test thinking phase detection."""
        # Test positive cases
        thinking_indicators = [
            "Let me think about this problem carefully.",
            "Hmm, I need to consider the implications.",
            "Well, let's see what we have here.",
            "First, I should break this down.",
            "Considering the requirements, I think..."
        ]

        for content in thinking_indicators:
            assert cli_interface._detect_thinking_phase(content), f"Should detect thinking in: {content}"

        # Test negative cases
        non_thinking = [
            "The answer is 42.",
            "Here's how to solve this:",
            "Based on the documentation:",
            "The solution involves three steps:"
        ]

        for content in non_thinking:
            assert not cli_interface._detect_thinking_phase(content), f"Should not detect thinking in: {content}"

    def test_extract_thinking_content(self, cli_interface):
        """Test thinking content extraction."""
        # Test content with clear thinking/response separation
        content = """Let me think about this carefully.

I need to consider several factors:
1. The user's experience level
2. The complexity of the topic
3. The best way to explain it

Based on this analysis, here's my response.

Python decorators are a powerful feature..."""

        thinking, response = cli_interface._extract_thinking_content(content)

        assert "Let me think about this carefully" in thinking
        assert "Based on this analysis, here's my response" in response
        assert "Python decorators are a powerful feature" in response

    def test_create_thinking_panel(self, cli_interface):
        """Test thinking panel creation."""
        thinking_content = "Let me think about this step by step..."

        panel = cli_interface._create_thinking_panel(thinking_content)

        assert panel is not None
        # The panel should contain the thinking content
        assert thinking_content in str(panel)

        # Test empty content
        empty_panel = cli_interface._create_thinking_panel("")
        assert empty_panel is None

    def test_create_progress_indicator(self, cli_interface):
        """Test progress indicator creation."""
        # Test thinking phase
        thinking_state = StreamingState(
            is_thinking=True,
            thinking_content="Some thinking content here",
            start_time=0.0,
            last_chunk_time=5.0
        )

        progress = cli_interface._create_progress_indicator(thinking_state)
        progress_str = str(progress)

        assert "🤔 Thinking..." in progress_str
        assert "3 words" in progress_str  # Should count thinking words
        assert "5.0s" in progress_str

        # Test responding phase
        responding_state = StreamingState(
            is_thinking=False,
            response_content="Here is the response content with more words",
            start_time=0.0,
            last_chunk_time=10.0
        )

        progress = cli_interface._create_progress_indicator(responding_state)
        progress_str = str(progress)

        assert "⚡ Responding..." in progress_str
        assert "10 words" in progress_str  # Should count response words
        assert "10.0s" in progress_str

    def test_create_control_hints(self, cli_interface):
        """Test control hints creation."""
        # Test with thinking content
        thinking_state = StreamingState(
            thinking_content="Some thinking",
            thinking_visible=False
        )

        hints = cli_interface._create_control_hints(thinking_state)
        hints_str = str(hints)

        assert "Ctrl+C: cancel" in hints_str
        assert "Ctrl+O: show thinking" in hints_str

        # Test with thinking visible
        visible_state = StreamingState(
            thinking_content="Some thinking",
            thinking_visible=True
        )

        hints = cli_interface._create_control_hints(visible_state)
        hints_str = str(hints)

        assert "Ctrl+O: hide thinking" in hints_str

        # Test without thinking content
        no_thinking_state = StreamingState()
        hints = cli_interface._create_control_hints(no_thinking_state)
        hints_str = str(hints)

        assert "Ctrl+C: cancel" in hints_str
        assert "Ctrl+O:" not in hints_str

    @pytest.mark.asyncio
    async def test_streaming_response_with_thinking(self, cli_interface):
        """Test streaming response with thinking process."""
        # Mock the AI response
        mock_stream = AsyncMock()
        mock_stream.__aiter__ = AsyncMock(return_value=iter([
            {"content": "Let me think about this carefully. "},
            {"content": "I need to consider the best approach.\n\n"},
            {"content": "Based on my analysis, here's the solution: "},
            {"content": "The answer is 42."}
        ]))

        # Mock the AI methods
        cli_interface._ai_model = Mock()
        cli_interface._ai_model.send_message = AsyncMock(return_value=mock_stream)
        cli_interface._initialize_ai = AsyncMock(return_value=True)

        # Mock output handlers
        cli_interface.set_output_handler("response", Mock())
        cli_interface.set_output_handler("info", Mock())
        cli_interface.set_output_handler("error", Mock())

        # Test the streaming response
        with patch('src.cli.interface.Live') as mock_live:
            mock_live_instance = Mock()
            mock_live.return_value.__enter__.return_value = mock_live_instance

            response = await cli_interface._output_ai_response_streaming("Test question")

            assert response["success"] is True
            assert "thinking_content" in response
            assert "content" in response
            assert "metrics" in response

            # Should have detected thinking phase
            assert cli_interface._streaming_state.is_thinking is False  # Should end in responding phase
            assert len(cli_interface._streaming_state.thinking_content) > 0
            assert len(cli_interface._streaming_state.response_content) > 0

    def test_signal_handler_setup(self, cli_interface):
        """Test signal handler setup."""
        # Test that signal handler is set up (if available)
        with patch('src.cli.interface.signal.signal') as mock_signal:
            cli_interface._setup_signal_handlers()
            mock_signal.assert_called_once()

    def test_key_handler_integration(self, cli_interface):
        """Test key handler integration."""
        # Should have key handler initialized
        assert cli_interface._key_handler is not None

        # Should be able to add thinking toggle handlers
        test_handler = Mock()
        cli_interface.add_thinking_toggle_handler(test_handler)
        assert test_handler in cli_interface._thinking_toggle_handlers

    @pytest.mark.asyncio
    async def test_streaming_cancellation(self, cli_interface):
        """Test streaming cancellation."""
        # Mock a long-running stream
        async def mock_stream():
            for i in range(100):
                if cli_interface._streaming_cancelled:
                    break
                yield {"content": f"Content chunk {i} "}
                await asyncio.sleep(0.01)

        # Mock AI methods
        cli_interface._ai_model = Mock()
        cli_interface._ai_model.send_message = AsyncMock(return_value=mock_stream())
        cli_interface._initialize_ai = AsyncMock(return_value=True)

        # Mock output handlers
        cli_interface.set_output_handler("response", Mock())

        # Test cancellation
        with patch('src.cli.interface.Live') as mock_live:
            mock_live_instance = Mock()
            mock_live.return_value.__enter__.return_value = mock_live_instance

            # Start streaming in background
            task = asyncio.create_task(
                cli_interface._output_ai_response_streaming("Test question")
            )

            # Wait a bit then cancel
            await asyncio.sleep(0.05)
            cli_interface.cancel_streaming()

            # Wait for task to complete
            response = await task

            assert response["cancelled"] is True
            assert response["success"] is True


if __name__ == "__main__":
    pytest.main([__file__])