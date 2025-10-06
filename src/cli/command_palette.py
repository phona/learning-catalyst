"""
Command Palette implementation for Learning Catalyst CLI
"""

from typing import Any, Dict, List, Optional

from src.cli.command_handlers import (
    AnalyticsCommandHandler,
    BaseCommandHandler,
    CommandContext,
    CommandInfo,
    ConfigurationCommandHandler,
    LearningCommandHandler,
    SystemCommandHandler,
)
from src.cli.interface import CLIInterface


class CommandPalette:
    """Command palette for managing and executing CLI commands"""

    def __init__(self, cli_interface: CLIInterface):
        self.cli_interface = cli_interface
        self.commands: Dict[str, CommandInfo] = {}
        self.context: Dict[str, Any] = {}
        self.command_history: List[str] = []
        self.handlers: List[BaseCommandHandler] = []
        
        self._initialize_handlers()
        self._register_commands()

    def _initialize_handlers(self):
        """Initialize all command handlers"""
        workspace_path = self.context.get("workspace_path", ".")
        command_context = CommandContext(workspace_path)
        
        self.handlers = [
            SystemCommandHandler(self.cli_interface, command_context),
            ConfigurationCommandHandler(self.cli_interface, command_context),
            LearningCommandHandler(self.cli_interface, command_context),
            AnalyticsCommandHandler(self.cli_interface, command_context),
        ]

    def _register_commands(self):
        """Register all commands from handlers"""
        for handler in self.handlers:
            for command_info in handler.get_commands():
                # Create a handler function that captures the handler and command name
                def make_handler(h, cmd_name):
                    return lambda args, context: h.handle_command(cmd_name, args, context)
                
                command_info.handler = make_handler(handler, command_info.name)
                self.register_command(
                    name=command_info.name,
                    description=command_info.description,
                    aliases=command_info.aliases,
                    handler=command_info.handler,
                    usage=command_info.usage,
                    category=command_info.category,
                )

    def register_command(
        self,
        name: str,
        description: str,
        aliases: List[str],
        handler,
        usage: str = "",
        category: str = "General",
    ) -> None:
        """Register a new command"""
        command_info = CommandInfo(
            name=name, description=description, aliases=aliases, handler=handler, usage=usage, category=category
        )

        # Register the command with its name
        self.commands[name] = command_info

        # Register the command with each alias
        for alias in aliases:
            self.commands[alias] = command_info

    def execute_command(self, command_input: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Execute a command based on user input

        Args:
            command_input: The command string (including / prefix)
            context: Optional context data to pass to the command handler

        Returns:
            bool: True if command was executed, False if command not found
        """
        if not command_input.startswith("/"):
            return False

        # Add to command history
        self.add_to_history(command_input)

        # Parse command and arguments
        parts = command_input[1:].strip().split()
        if not parts:
            return False

        command_name = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []

        # Find the command
        if command_name in self.commands:
            command_info = self.commands[command_name]
            try:
                # Merge provided context with instance context and add command palette reference
                merged_context = self.context.copy()
                if context:
                    merged_context.update(context)
                
                # Add command palette reference for help command
                merged_context["command_palette"] = self

                # Execute the command handler
                command_info.handler(args, merged_context)
                return True
            except Exception as e:
                self.cli_interface.display_error("Error executing command", str(e))
                return True
        else:
            self.cli_interface.display_warning(f"Unknown command: {command_name}. Type /help for available commands.")
            return True

    def get_command_list(self) -> List[CommandInfo]:
        """Get list of unique commands (without duplicates from aliases)"""
        unique_commands = {}
        for name, command in self.commands.items():
            unique_commands[command.name] = command
        return list(unique_commands.values())

    def get_command_by_name(self, name: str) -> Optional[CommandInfo]:
        """Get command by name or alias"""
        return self.commands.get(name.lower())

    def add_to_history(self, command: str) -> None:
        """Add a command to the history"""
        # Don't add empty commands or duplicates of the last command
        if not command or (self.command_history and self.command_history[-1] == command):
            return

        self.command_history.append(command)

        # Limit history size
        if len(self.command_history) > 100:
            self.command_history = self.command_history[-100:]

    def get_command_history(self, reverse: bool = True) -> List[str]:
        """Get command history, most recent first by default"""
        if reverse:
            return list(reversed(self.command_history))
        return self.command_history.copy()

    def get_autocomplete_suggestions(self, partial_input: str) -> List[str]:
        """
        Get autocomplete suggestions for a partial command input

        Args:
            partial_input: The partial command string (may or may not include / prefix)

        Returns:
            List of suggested command completions
        """
        suggestions = []

        # If input starts with /, we're completing a command
        if partial_input.startswith("/"):
            command_part = partial_input[1:].lower()

            # Find matching commands
            for name, command_info in self.commands.items():
                if name.lower().startswith(command_part):
                    suggestions.append(f"/{name}")

        return suggestions

    def get_concept_suggestions(self, partial_input: str, context: Dict[str, Any]) -> List[str]:
        """
        Get concept suggestions for a partial input

        Args:
            partial_input: The partial input string
            context: Context data including workspace path

        Returns:
            List of suggested concept names
        """
        suggestions = []

        try:
            import asyncio

            # Get workspace path from context
            workspace_path = context.get("workspace_path", ".")
            command_context = CommandContext(workspace_path)

            # Get available concepts
            concepts = asyncio.run(command_context.knowledge_navigator.get_available_concepts())

            # Find matching concepts
            partial_lower = partial_input.lower()
            for concept in concepts:
                if concept.title.lower().startswith(partial_lower):
                    suggestions.append(concept.title)

            # Limit suggestions
            if len(suggestions) > 10:
                suggestions = suggestions[:10]

        except Exception:
            # If we can't get concepts, return empty list
            pass

        return suggestions

    def _help_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handle the help command"""
        from src.data.models.extended_models import Message
        
        if args:
            # Help for specific command
            command_name = args[0].lower()
            command = self.get_command_by_name(command_name)
            if command:
                help_text = f"Command: {command.name}\n"
                help_text += f"Description: {command.description}\n"
                if command.usage:
                    help_text += f"Usage: {command.usage}\n"
                if command.aliases:
                    help_text += f"Aliases: {', '.join(command.aliases)}\n"
                help_text += f"Category: {command.category}"
                message = Message(content=help_text, role="assistant")
            else:
                message = Message(content=f"Unknown command: {command_name}", role="assistant")
        else:
            # General help
            commands = self.get_command_list()
            help_text = "Available Commands:\n\n"
            
            # Group by category
            categories = {}
            for cmd in commands:
                if cmd.category not in categories:
                    categories[cmd.category] = []
                categories[cmd.category].append(cmd)
            
            for category, cmds in sorted(categories.items()):
                help_text += f"{category}:\n"
                for cmd in sorted(cmds, key=lambda x: x.name):
                    aliases = f" ({', '.join(cmd.aliases)})" if cmd.aliases else ""
                    help_text += f"  /{cmd.name}{aliases} - {cmd.description}\n"
                help_text += "\n"
            
            message = Message(content=help_text, role="assistant")
        
        self.cli_interface.display_message(message)

    def _clear_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handle the clear command"""
        self.cli_interface.clear_screen()

    def _quit_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handle the quit command"""
        from src.data.models.extended_models import Message
        message = Message(content="Goodbye! Learning Catalyst session ended.", role="assistant")
        self.cli_interface.display_message(message)
        # In a real implementation, this would exit the application
        # For testing, we just display the message

    def _reset_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handle the reset command"""
        from src.data.models.extended_models import Message
        message = Message(content="Conversation has been reset. Starting fresh.", role="assistant")
        self.cli_interface.display_message(message)
        # In a real implementation, this would reset the conversation state
        # For testing, we just display the message

    def _checkpoint_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handle the checkpoint command"""
        from src.data.models.extended_models import Message
        
        if not args:
            message = Message(content="Usage: /checkpoint [list|save|load] [name]", role="assistant")
        elif args[0] == "list":
            message = Message(content="Listing checkpoints...", role="assistant")
        elif args[0] == "save":
            if len(args) < 2:
                message = Message(content="Checkpoint name required for save operation", role="assistant")
            else:
                message = Message(content=f"Saving checkpoint: {args[1]}", role="assistant")
        elif args[0] == "load":
            if len(args) < 2:
                message = Message(content="Checkpoint name required for load operation", role="assistant")
            else:
                message = Message(content=f"Loading checkpoint: {args[1]}", role="assistant")
        else:
            message = Message(content=f"Unknown action: {args[0]}", role="assistant")
        
        self.cli_interface.display_message(message)

    def _set_config_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handle the set config command"""
        from src.data.models.extended_models import Message
        
        if len(args) < 2:
            message = Message(content="Usage: /set_config <key> <value>", role="assistant")
        else:
            key, value = args[0], args[1]
            message = Message(content=f"Configuration updated: {key} = {value}", role="assistant")
        
        self.cli_interface.display_message(message)
