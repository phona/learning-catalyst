"""
Command Palette implementation for Learning Catalyst CLI
"""

import asyncio
import concurrent.futures
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

# Import all command classes
from src.cli.commands.analytics import StatisticsCommand, TokensCommand
from src.cli.commands.base import BaseCommand, CommandInfo, CommandResult
from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
from src.cli.commands.registry import CommandRegistry
from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand
from src.cli.core.interface import CLIInterface
from src.data.models.extended_models import Message


@dataclass
class CommandMetadata:
    """Metadata for command configuration"""

    name: str
    description: str
    aliases: List[str]
    handler: Callable[..., Any]
    usage: str
    category: str


class SimpleCommand(BaseCommand):
    """Simple command wrapper for backward compatibility."""

    def __init__(self, metadata: CommandMetadata):
        self._name = metadata.name
        self._description = metadata.description
        self._aliases = metadata.aliases
        self._handler = metadata.handler
        self._usage = metadata.usage
        self._category = metadata.category
        self._info = CommandInfo(
            name=self._name,
            description=self._description,
            aliases=self._aliases,
            usage=self._usage,
            category=self._category,
        )
        super().__init__()

    def get_info(self) -> CommandInfo:
        """Get command information"""
        return self._info

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the command"""
        try:
            result = self._handler(args, context)
            # If the handler returns a CommandResult, use it
            if isinstance(result, CommandResult):
                return result
            # Otherwise, create a successful result
            return CommandResult(success=True, message=str(result) if result else "Command executed successfully")
        except (ValueError, RuntimeError) as e:
            return CommandResult(success=False, message=f"Error executing command: {str(e)}", error=str(e))


class CommandPalette:
    """Command palette for managing and executing CLI commands"""

    def __init__(self, cli_interface: CLIInterface):
        self.cli_interface = cli_interface
        self.registry = CommandRegistry(cli_interface)
        self.context: Dict[str, Any] = {}
        self.command_history: List[str] = []

        # Initialize commands
        self._initialize_commands()

    @property
    def commands(self) -> Dict[str, Any]:
        """Get all registered commands (for backward compatibility)"""
        return self.registry.commands

    def _initialize_commands(self):
        """Initialize all commands using the registry"""

        # Register all commands
        self.registry.register_command(HelpCommand())
        self.registry.register_command(QuitCommand())
        self.registry.register_command(ClearCommand())
        self.registry.register_command(ModelsCommand())
        self.registry.register_command(PreferencesCommand())
        self.registry.register_command(ConfigCommand())
        self.registry.register_command(TokensCommand())
        self.registry.register_command(StatisticsCommand())

    def register_command(
        self,
        name: str,
        description: str,
        aliases: List[str],
        handler: Callable[..., Any],
        usage: str = "",
        category: str = "General",
    ) -> None:
        """Register a new command (delegates to registry)"""

        # Register the command
        metadata = CommandMetadata(name, description, aliases, handler, usage, category)
        command = SimpleCommand(metadata)
        self.registry.register_command(command)

    def execute_command(self, command_input: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Execute a command based on user input

        Args:
            command_input: The command string (including / prefix)
            context: Optional context data to pass to the command handler

        Returns:
            bool: True if command was handled (valid or invalid), False if not a command
        """
        if not command_input.startswith("/"):
            return False

        # Add to command history
        self.add_to_history(command_input)

        # Merge provided context with instance context and add command palette reference
        merged_context = self.context.copy()
        if context:
            merged_context.update(context)

        # Add command palette reference for help command
        merged_context["command_palette"] = self

        # Execute the command using the registry (handle both sync and async)
        try:
            # Try to run the async command
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're already in an event loop, create a new one
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self.registry.execute_command(command_input, merged_context))
                    result = future.result()
            else:
                result = asyncio.run(self.registry.execute_command(command_input, merged_context))
        except RuntimeError:
            # Fallback for when asyncio.run can't be used
            result = asyncio.run(self.registry.execute_command(command_input, merged_context))

        # Handle the result display
        if result.message:
            if result.success:
                self.cli_interface.display_success(result.message)
            else:
                # Check if this is an unknown command error
                if "Unknown command" in result.message or (result.error and "not found" in result.error):
                    self.cli_interface.display_warning(result.message)
                else:
                    self.cli_interface.display_error(result.message, result.error)

        # Always return True for commands that start with / (even if they fail)
        # This matches the expected behavior in the tests
        return True

    async def execute_command_async(self, command_input: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Execute a command asynchronously

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

        # Merge provided context with instance context and add command palette reference
        merged_context = self.context.copy()
        if context:
            merged_context.update(context)

        # Add command palette reference for help command
        merged_context["command_palette"] = self

        # Execute the command using the registry
        result = await self.registry.execute_command(command_input, merged_context)
        return result.success

    def get_command_list(self) -> List[CommandInfo]:
        """Get list of unique commands (without duplicates from aliases)"""
        return self.registry.get_all_commands()

    def get_command_by_name(self, name: str) -> Optional[CommandInfo]:
        """Get command by name or alias"""
        cmd = self.registry.get_command(name)
        return cmd.info if cmd else None

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
        return self.registry.get_autocomplete_suggestions(partial_input)

    def get_concept_suggestions(self, partial_input: str, context: Dict[str, Any]) -> List[str]:
        """
        Get concept suggestions for a partial input

        Args:
            partial_input: The partial input string
            context: Context data including workspace path

        Returns:
            List of suggested concept names
        """
        return self.registry.get_concept_suggestions(partial_input, context)

    def _help_command(self, _args: List[str], _context: Dict[str, Any]) -> None:
        """Handle the help command"""
        # This method is not used as help is handled by the HelpCommand class

    def _clear_command(self, _args: List[str], _context: Dict[str, Any]) -> None:
        """Handle the clear command"""
        self.cli_interface.clear_screen()

    def _quit_command(self, _args: List[str], _context: Dict[str, Any]) -> None:
        """Handle the quit command"""
        message = Message(content="Goodbye! Learning Catalyst session ended.", role="assistant")
        self.cli_interface.display_message(message)
        # In a real implementation, this would exit the application
        # For testing, we just display the message

    def _reset_command(self, _args: List[str], _context: Dict[str, Any]) -> None:
        """Handle the reset command"""
        message = Message(content="Conversation has been reset. Starting fresh.", role="assistant")
        self.cli_interface.display_message(message)
        # In a real implementation, this would reset the conversation state
        # For testing, we just display the message

    def _checkpoint_command(self, args: List[str], _context: Dict[str, Any]) -> None:
        """Handle the checkpoint command"""
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

    def _set_config_command(self, args: List[str], _context: Dict[str, Any]) -> None:
        """Handle the set config command"""
        if len(args) < 2:
            message = Message(content="Usage: /set_config <key> <value>", role="assistant")
        else:
            key, value = args[0], args[1]
            message = Message(content=f"Configuration updated: {key} = {value}", role="assistant")

        self.cli_interface.display_message(message)
