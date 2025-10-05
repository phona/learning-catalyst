"""
Integration tests for the CommandPalette with the main application
"""
import unittest
import tempfile
import os
from src.cli.command_palette import CommandPalette
from src.cli.interface import CLIInterfaceImpl
from src.data.models.extended_models import Message


class TestCommandPaletteIntegration(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        self.cli_interface = CLIInterfaceImpl()
        self.palette = CommandPalette(self.cli_interface)
        
        # Create a temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
    
    def test_set_config_command_registration(self):
        """Test that the set-config command is properly registered"""
        # Check that set-config command is registered
        self.assertIn("set-config", self.palette.commands)
        self.assertIn("config", self.palette.commands)  # Alias
        
        # Check command info
        command_info = self.palette.commands["set-config"]
        self.assertEqual(command_info.name, "set-config")
        self.assertEqual(command_info.description, "Configure AI provider and model")
        self.assertIn("config", command_info.aliases)
        self.assertEqual(command_info.category, "Configuration")
    
    def test_context_functionality(self):
        """Test that context functionality works correctly"""
        # Set context
        self.palette.context['workspace_path'] = self.test_dir
        
        # Verify context is set
        self.assertEqual(self.palette.context['workspace_path'], self.test_dir)
        
        # Test context merging in command execution
        # This is tested in unit tests, but we verify the attribute exists
        self.assertIsInstance(self.palette.context, dict)
    
    def test_help_command_output(self):
        """Test that help command includes set-config"""
        # Capture output by mocking display_message
        displayed_messages = []
        
        def capture_message(message: Message):
            displayed_messages.append(message)
        
        original_display = self.cli_interface.display_message
        self.cli_interface.display_message = capture_message
        
        try:
            # Execute help command
            self.palette.execute_command("/help")
            
            # Verify that help output contains set-config
            self.assertGreater(len(displayed_messages), 0)
            help_content = displayed_messages[0].content
            
            # Check that set-config is mentioned in help
            self.assertIn("set-config", help_content)
            self.assertIn("Configure AI provider and model", help_content)
            
        finally:
            # Restore original method
            self.cli_interface.display_message = original_display
    
    def test_command_execution_with_context(self):
        """Test command execution with context merging"""
        # Set up context
        self.palette.context['workspace_path'] = self.test_dir
        
        # This test verifies the structure rather than executing the command
        # which would require user input
        self.assertTrue(callable(self.palette._set_config_command))


if __name__ == '__main__':
    unittest.main()