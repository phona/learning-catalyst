"""
Unit tests for the CommandPalette class
"""
import unittest
from unittest.mock import Mock, patch
from src.cli.command_palette import CommandPalette
from src.cli.interface import CLIInterface
from src.data.models.extended_models import Message


class TestCLIInterface(CLIInterface):
    """Test implementation of CLIInterface"""
    
    def display_message(self, message: Message) -> None:
        pass
    
    def display_typing_indicator(self) -> None:
        pass
    
    def get_user_input(self, prompt: str = '') -> str:
        return ""
    
    def display_conversation_history(self, messages: list) -> None:
        pass
    
    def detect_command(self, input_text: str) -> bool:
        return input_text.startswith('/')
    
    def clear_screen(self) -> None:
        pass
    
    def display_checkpoint_list(self, checkpoints: list) -> None:
        pass


class TestCommandPalette(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        cli_interface = TestCLIInterface()
        self.palette = CommandPalette(cli_interface)
    
    def test_command_registration(self):
        """Test that commands are properly registered"""
        # Check that set-config command is registered
        self.assertIn("set-config", self.palette.commands)
        self.assertIn("config", self.palette.commands)  # Alias
        
        # Check that both name and alias point to the same command
        self.assertEqual(self.palette.commands["set-config"], self.palette.commands["config"])
    
    def test_context_attribute(self):
        """Test that context attribute exists and is a dictionary"""
        self.assertTrue(hasattr(self.palette, 'context'))
        self.assertIsInstance(self.palette.context, dict)
    
    def test_context_merging(self):
        """Test that context is properly merged when executing commands"""
        # Set up instance context
        self.palette.context['workspace_path'] = '/instance/path'
        
        # Create a mock command handler
        handler = Mock()
        self.palette.register_command(
            name="test",
            description="Test command",
            aliases=[],
            handler=handler
        )
        
        # Execute command with additional context
        self.palette.execute_command("/test", {'additional': 'value'})
        
        # Verify handler was called with merged context
        handler.assert_called_once()
        call_args = handler.call_args[0]
        context = call_args[1]  # Second argument is context
        
        self.assertIn('workspace_path', context)
        self.assertIn('additional', context)
        self.assertEqual(context['workspace_path'], '/instance/path')
        self.assertEqual(context['additional'], 'value')
    
    def test_command_execution(self):
        """Test command execution"""
        # Test that a valid command returns True
        result = self.palette.execute_command("/help")
        self.assertTrue(result)
        
        # Test that an invalid command returns True (but displays error)
        with patch.object(self.palette.cli_interface, 'display_message') as mock_display:
            result = self.palette.execute_command("/nonexistent")
            self.assertTrue(result)  # Still returns True as it was processed
            mock_display.assert_called_once()
    
    def test_non_command_input(self):
        """Test that non-command input returns False"""
        result = self.palette.execute_command("regular text")
        self.assertFalse(result)
        
        result = self.palette.execute_command("")
        self.assertFalse(result)


if __name__ == '__main__':
    unittest.main()