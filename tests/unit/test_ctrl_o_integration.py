"""
Integration tests for Ctrl+O hotkey functionality.

This test verifies the complete integration between the key handler,
CLI interface, and live streaming manager for thinking visibility toggle.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from src.cli.interface import CLIInterface, LiveStreamingManager, StreamingState, AIState
from src.cli.key_handler import KeyHandler
from src.core.config import ConfigManager


class TestCtrlOIntegration:
    """Test Ctrl+O hotkey integration."""

    @pytest.fixture
    def mock_config_manager(self):
        """Create a mock configuration manager."""
        config_manager = Mock(spec=ConfigManager)
        config_manager.get.return_value = None
        return config_manager

    @pytest.fixture
    def cli_interface(self, mock_config_manager):
        """Create a CLI interface instance with mocked key handler."""
        with patch('src.cli.interface.initialize_key_handler') as mock_init:
            # Create a mock key handler
            mock_key_handler = Mock()
            mock_init.return_value = mock_key_handler

            interface = CLIInterface(mock_config_manager)
            return interface

    def test_thinking_toggle_state_update(self, cli_interface):
        """Test that thinking toggle updates state correctly."""
        # Initial state should be False
        assert cli_interface._streaming_state.thinking_visible is False

        # Toggle to True
        cli_interface.toggle_thinking_visibility()
        assert cli_interface._streaming_state.thinking_visible is True

        # Toggle back to False
        cli_interface.toggle_thinking_visibility()
        assert cli_interface._streaming_state.thinking_visible is False

    def test_thinking_toggle_feedback(self, cli_interface):
        """Test that thinking toggle provides feedback."""
        # Mock output handler
        mock_output = Mock()
        cli_interface.set_output_handler("info", mock_output)

        # Toggle thinking visibility
        cli_interface.toggle_thinking_visibility()

        # Should provide feedback
        mock_output.assert_called_with("🧠 Thinking process shown")

    @pytest.mark.asyncio
    async def test_thinking_toggle_with_live_streaming_manager(self, cli_interface):
        """Test thinking toggle with active live streaming manager."""
        # Create a live streaming manager
        stream_manager = LiveStreamingManager("test-model", Mock())
        stream_manager.thinking_visible = False

        # Set as current stream manager
        cli_interface._current_stream_manager = stream_manager

        # Mock the refresh method
        with patch.object(stream_manager, '_refresh_display') as mock_refresh:
            # Toggle thinking visibility
            cli_interface.toggle_thinking_visibility()

            # Should update stream manager
            assert stream_manager.thinking_visible is True
            mock_refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_thinking_toggle_during_streaming(self, cli_interface):
        """Test thinking toggle during active streaming."""
        # Mock output handlers
        mock_output = Mock()
        cli_interface.set_output_handler("info", mock_output)

        # Create and start a live streaming manager
        stream_manager = LiveStreamingManager("test-model", Mock())
        with patch.object(stream_manager, 'start_streaming'):
            stream_manager.start_streaming()

        cli_interface._current_stream_manager = stream_manager

        # Toggle thinking visibility multiple times
        cli_interface.toggle_thinking_visibility()  # Show
        cli_interface.toggle_thinking_visibility()  # Hide
        cli_interface.toggle_thinking_visibility()  # Show

        # Should update state and stream manager
        assert cli_interface._streaming_state.thinking_visible is True
        assert stream_manager.thinking_visible is True

        # Should provide feedback for each toggle
        assert mock_output.call_count == 3

    def test_thinking_toggle_handler_registration(self, cli_interface):
        """Test that thinking toggle handlers are properly registered."""
        # Create a mock handler
        mock_handler = Mock()

        # Add handler
        cli_interface.add_thinking_toggle_handler(mock_handler)
        assert mock_handler in cli_interface._thinking_toggle_handlers

        # Toggle thinking visibility
        cli_interface.toggle_thinking_visibility()

        # Handler should be called
        mock_handler.assert_called_once()

    def test_thinking_toggle_handler_error_handling(self, cli_interface):
        """Test error handling in thinking toggle handlers."""
        # Create a handler that raises an exception
        def failing_handler():
            raise Exception("Handler failed")

        # Add failing handler
        cli_interface.add_thinking_toggle_handler(failing_handler)

        # Mock output for error messages
        mock_output = Mock()
        cli_interface.set_output_handler("error", mock_output)

        # Toggle should not fail even with failing handler
        cli_interface.toggle_thinking_visibility()

        # State should still be updated
        assert cli_interface._streaming_state.thinking_visible is True

    def test_key_handler_initialization_integration(self, mock_config_manager):
        """Test key handler initialization integration."""
        with patch('src.cli.interface.initialize_key_handler') as mock_init:
            mock_key_handler = Mock()
            mock_init.return_value = mock_key_handler

            # Create interface
            interface = CLIInterface(mock_config_manager)

            # Key handler should be initialized
            mock_init.assert_called_once_with(interface)
            assert interface._key_handler == mock_key_handler

    def test_key_handler_initialization_failure(self, mock_config_manager):
        """Test graceful handling of key handler initialization failure."""
        with patch('src.cli.interface.initialize_key_handler') as mock_init:
            mock_init.side_effect = Exception("Key handler failed")

            # Create interface - should not raise exception
            interface = CLIInterface(mock_config_manager)

            # Should handle failure gracefully
            assert interface._key_handler is None

    def test_resource_cleanup_on_stop(self, cli_interface):
        """Test that resources are cleaned up when stopping session."""
        # Mock cleanup methods
        with patch('src.cli.interface.cleanup_key_handler') as mock_cleanup:
            # Create a mock stream manager
            mock_stream_manager = Mock()
            cli_interface._current_stream_manager = mock_stream_manager

            # Stop session
            cli_interface.stop_session()

            # Should cleanup resources
            mock_cleanup.assert_called_once()
            mock_stream_manager.stop_streaming.assert_called_once()

    @pytest.mark.asyncio
    async def test_live_streaming_manager_thinking_toggle(self):
        """Test LiveStreamingManager thinking toggle functionality."""
        mock_output = Mock()
        manager = LiveStreamingManager("test-model", mock_output)

        # Initial state
        assert manager.thinking_visible is False

        # Toggle visibility
        manager.toggle_thinking_visibility()
        assert manager.thinking_visible is True

        # Toggle again
        manager.toggle_thinking_visibility()
        assert manager.thinking_visible is False

    @pytest.mark.asyncio
    async def test_live_streaming_layout_with_thinking_hidden(self):
        """Test layout creation when thinking is hidden."""
        mock_output = Mock()
        manager = LiveStreamingManager("test-model", mock_output)
        manager.thinking_visible = False
        manager.thinking_content = "This is thinking content"
        manager.response_content = ""
        manager.current_state = AIState.THINKING

        # Create layout
        layout = manager._create_current_layout()

        # Should not contain thinking panel
        layout_str = str(layout)
        assert "Thinking Process" not in layout_str
        assert "This is thinking content" not in layout_str

    @pytest.mark.asyncio
    async def test_live_streaming_layout_with_thinking_shown(self):
        """Test layout creation when thinking is shown."""
        mock_output = Mock()
        manager = LiveStreamingManager("test-model", mock_output)
        manager.thinking_visible = True
        manager.thinking_content = "This is thinking content"
        manager.response_content = ""
        manager.current_state = AIState.THINKING

        # Create layout
        layout = manager._create_current_layout()

        # Should contain thinking panel
        layout_str = str(layout)
        assert "Thinking Process" in layout_str
        assert "This is thinking content" in layout_str

    def test_footer_hints_update_with_thinking_visibility(self):
        """Test that footer hints update based on thinking visibility."""
        mock_output = Mock()
        manager = LiveStreamingManager("test-model", mock_output)
        manager.current_state = AIState.THINKING

        # Test with thinking hidden
        manager.thinking_visible = False
        footer_hidden = manager._create_footer()
        footer_hidden_str = str(footer_hidden)
        assert "[Ctrl+O] Show" in footer_hidden_str
        assert "[Ctrl+O] Hide" not in footer_hidden_str

        # Test with thinking shown
        manager.thinking_visible = True
        footer_shown = manager._create_footer()
        footer_shown_str = str(footer_shown)
        assert "[Ctrl+O] Hide" in footer_shown_str
        assert "[Ctrl+O] Show" not in footer_shown_str

    @pytest.mark.asyncio
    async def test_streaming_state_named_tuple_immutability(self):
        """Test that StreamingState can be properly updated using _replace."""
        initial_state = StreamingState(thinking_visible=False)

        # Update using _replace
        new_state = initial_state._replace(thinking_visible=True)

        # Original should be unchanged
        assert initial_state.thinking_visible is False
        # New state should be updated
        assert new_state.thinking_visible is True

    def test_key_handler_ctrl_o_binding(self, mock_config_manager):
        """Test that Ctrl+O is properly bound to thinking toggle."""
        with patch('src.cli.interface.initialize_key_handler') as mock_init:
            # Create a mock key handler
            mock_key_handler = Mock()
            mock_init.return_value = mock_key_handler

            # Create interface
            interface = CLIInterface(mock_config_manager)

            # Should add Ctrl+O handler if interface has toggle method
            if hasattr(interface, 'toggle_thinking_visibility'):
                mock_key_handler.add_key_handler.assert_called_once()
                call_args = mock_key_handler.add_key_handler.call_args
                assert call_args[0][0] == 'ctrl+o'
                assert call_args[0][1] == interface.toggle_thinking_visibility

    @pytest.mark.asyncio
    async def test_integration_flow_complete(self, mock_config_manager):
        """Test complete integration flow from key press to UI update."""
        with patch('src.cli.interface.initialize_key_handler') as mock_init:
            # Create mock key handler that simulates Ctrl+O press
            mock_key_handler = Mock()
            mock_init.return_value = mock_key_handler

            # Create interface
            interface = CLIInterface(mock_config_manager)

            # Mock output handler
            mock_output = Mock()
            interface.set_output_handler("info", mock_output)

            # Create live streaming manager
            stream_manager = LiveStreamingManager("test-model", Mock())
            interface._current_stream_manager = stream_manager

            # Mock the display refresh
            with patch.object(stream_manager, '_refresh_display'):
                # Simulate Ctrl+O press by calling the handler directly
                interface.toggle_thinking_visibility()

                # Verify all components updated correctly
                assert interface._streaming_state.thinking_visible is True
                assert stream_manager.thinking_visible is True
                mock_output.assert_called_with("🧠 Thinking process shown")

    def test_error_recovery_in_toggle(self, cli_interface):
        """Test error recovery during thinking toggle."""
        # Mock output to capture error messages
        mock_error_output = Mock()
        mock_info_output = Mock()
        cli_interface.set_output_handler("error", mock_error_output)
        cli_interface.set_output_handler("info", mock_info_output)

        # Create a stream manager that will fail on refresh
        failing_manager = Mock()
        failing_manager.thinking_visible = False
        failing_manager._refresh_display.side_effect = Exception("Display failed")
        cli_interface._current_stream_manager = failing_manager

        # Toggle should handle the error gracefully
        cli_interface.toggle_thinking_visibility()

        # Should still update state
        assert cli_interface._streaming_state.thinking_visible is True
        assert failing_manager.thinking_visible is True

        # Should show feedback despite error
        mock_info_output.assert_called_with("🧠 Thinking process shown")


if __name__ == "__main__":
    pytest.main([__file__])