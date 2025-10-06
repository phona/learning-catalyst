"""
System command handlers
"""

from typing import Any, Dict, List

from .base import BaseCommandHandler, CommandInfo


class SystemCommandHandler(BaseCommandHandler):
    """Handler for system-related commands"""

    def get_commands(self) -> List[CommandInfo]:
        """Return list of system commands"""
        return [
            CommandInfo(
                name="help",
                description="Show available commands",
                aliases=["h", "?"],
                usage="/help [command]",
                category="System",
            ),
            CommandInfo(
                name="clear",
                description="Clear the screen",
                aliases=["cls"],
                category="System",
            ),
            CommandInfo(
                name="quit",
                description="Exit the application",
                aliases=["exit", "q"],
                category="System",
            ),
            CommandInfo(
                name="reset",
                description="Reset the conversation",
                aliases=["restart"],
                category="System",
            ),
            CommandInfo(
                name="checkpoint",
                description="Manage checkpoints",
                aliases=["cp"],
                usage="/checkpoint [save|load|list] [name]",
                category="System",
            ),
        ]

    def _help_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the help command"""
        if args:
            # Show help for specific command
            command_name = args[0]
            # Get the command palette from context to find the command
            command_palette = context.get("command_palette")
            if command_palette:
                command_info = command_palette.get_command_by_name(command_name)
                if command_info:
                    help_content = f"{command_info.name} - {command_info.description}\n"
                    help_content += f"Usage: /{command_info.name} {command_info.usage}\n"
                    help_content += f"Aliases: {', '.join(command_info.aliases) if command_info.aliases else 'None'}"
                    self._display_message(help_content)
                else:
                    self._display_warning(f"Command '{command_name}' not found.")
            else:
                self._display_error("Error", "Command palette not available in context")
        else:
            # Show all commands grouped by category
            command_palette = context.get("command_palette")
            if command_palette:
                commands = command_palette.get_command_list()
                
                # Group commands by category
                categories = {}
                for command in commands:
                    if command.category not in categories:
                        categories[command.category] = []
                    categories[command.category].append(command)

                help_text = "Available Commands:\n"
                for category, cmds in categories.items():
                    help_text += f"\n{category}:\n"
                    for command in cmds:
                        help_text += f"  /{command.name} - {command.description}\n"

                help_text += "\nType /help <command> for more information about a specific command."
                self._display_message(help_text)
            else:
                self._display_error("Error", "Command palette not available in context")

    def _clear_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the clear command"""
        self.cli_interface.clear_screen()

    def _quit_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the quit command"""
        # This would typically set a flag to exit the application
        self._display_success("Goodbye! Thanks for using Learning Catalyst!")
        # In a real implementation, we would signal the application to exit

    def _reset_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the reset command"""
        self._display_success("Conversation has been reset.")
        # In a real implementation, this would reset the conversation state

    def _checkpoint_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the checkpoint command"""
        if not args:
            self._display_warning("Usage: /checkpoint [save|load|list] [name]")
            return

        action = args[0].lower()
        checkpoint_name = args[1] if len(args) > 1 else None

        if action == "list":
            # In a real implementation, this would fetch and display checkpoints
            self._display_message("📋 Listing checkpoints...")
        elif action == "save":
            if checkpoint_name:
                self._display_success(f"💾 Checkpoint saved: {checkpoint_name}")
            else:
                self._display_warning("Please provide a name for the checkpoint.")
        elif action == "load":
            if checkpoint_name:
                self._display_success(f"📂 Checkpoint loaded: {checkpoint_name}")
            else:
                self._display_warning("Please provide a checkpoint name to load.")
        else:
            self._display_warning("Invalid checkpoint action. Use save, load, or list.")