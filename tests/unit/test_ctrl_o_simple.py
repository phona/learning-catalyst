"""
Simple test to verify Ctrl+O functionality works end-to-end.
"""

import pytest
from unittest.mock import Mock, patch

from src.cli.interface import CLIInterface
from src.core.config import ConfigManager


def test_ctrl_o_toggle_functionality():
    """Test that Ctrl+O toggle functionality works correctly."""
    # Create a mock config manager
    config_manager = Mock(spec=ConfigManager)
    config_manager.get.return_value = None

    # Create interface with mocked key handler
    with patch('src.cli.interface.initialize_key_handler'):
        interface = CLIInterface(config_manager)

        # Set up output handler to capture feedback
        captured_output = []
        def capture_output(message):
            captured_output.append(message)

        interface.set_output_handler("info", capture_output)

        # Test initial state
        assert interface._streaming_state.thinking_visible is False

        # Test toggle to visible
        interface.toggle_thinking_visibility()
        assert interface._streaming_state.thinking_visible is True
        assert "🧠 Thinking process shown" in captured_output[-1]

        # Test toggle to hidden
        interface.toggle_thinking_visibility()
        assert interface._streaming_state.thinking_visible is False
        assert "🧠 Thinking process hidden" in captured_output[-1]

        # Verify multiple toggles work
        interface.toggle_thinking_visibility()
        assert interface._streaming_state.thinking_visible is True
        interface.toggle_thinking_visibility()
        assert interface._streaming_state.thinking_visible is False

    print("✅ Ctrl+O toggle functionality works correctly!")


if __name__ == "__main__":
    test_ctrl_o_toggle_functionality()