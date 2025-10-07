"""
Command registry for managing and executing CLI commands
"""

import asyncio
import os
from typing import Any, Dict, List, Optional, Set, Union

from src.cli.core.interface import CLIInterface
from src.core import SQLiteKnowledgeNavigator

from .base import BaseCommand, CommandCategory, CommandInfo, CommandResult


class CommandRegistry:
    """Registry for managing CLI commands"""

    def __init__(self, cli_interface: CLIInterface):
        self.cli_interface = cli_interface
        self._commands: Dict[str, BaseCommand] = {}
        self._command_history: List[str] = []
        self._context: Dict[str, Any] = {}

    def register_command(self, command: BaseCommand) -> None:
        """Register a command with the registry"""
        info = command.info

        # Register with primary name
        self._commands[info.name.lower()] = command

        # Register with aliases
        for alias in info.aliases:
            self._commands[alias.lower()] = command

    def register_commands(self, commands: List[BaseCommand]) -> None:
        """Register multiple commands"""
        for command in commands:
            self.register_command(command)

    def get_command(self, name: str) -> Optional[BaseCommand]:
        """Get a command by name or alias"""
        return self._commands.get(name.lower())

    def get_all_commands(self) -> List[CommandInfo]:
        """Get all unique command infos"""
        seen_names: Set[str] = set()
        commands: List[CommandInfo] = []

        for command in self._commands.values():
            if command.info.name not in seen_names:
                commands.append(command.info)
                seen_names.add(command.info.name)

        return commands

    def get_commands_by_category(self, category: Union[CommandCategory, str]) -> List[CommandInfo]:
        """Get commands filtered by category"""
        category_value = category.value if isinstance(category, CommandCategory) else category
        return [cmd for cmd in self.get_all_commands() if cmd.category == category_value]

    async def execute_command(self, command_input: str, context: Optional[Dict[str, Any]] = None) -> CommandResult:
        """Execute a command from input string"""
        if not command_input.startswith("/"):
            return CommandResult(success=False, message="Not a command (doesn't start with /)", error="Command must start with /")

        # Add to history
        self.add_to_history(command_input)

        # Parse command
        parts = command_input[1:].strip().split()
        if not parts:
            return CommandResult(success=False, message="Empty command", error="No command provided")

        command_name = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []

        # Find command
        command = self.get_command(command_name)
        if not command:
            return CommandResult(
                success=False, message=f"Unknown command: {command_name}", error=f"Command '{command_name}' not found"
            )

        # Merge context
        exec_context = self._context.copy()
        if context:
            exec_context.update(context)
        exec_context["command_registry"] = self
        exec_context["cli_interface"] = self.cli_interface

        try:
            # Validate arguments
            validation_error = command.validate_args(args)
            if validation_error:
                return CommandResult(success=False, message="Invalid arguments", error=validation_error)

            # Execute command (all commands are async according to BaseCommand)
            result = await command.execute(args, exec_context)

            # Don't display messages here - let the caller handle it
            return result

        except (ValueError, RuntimeError) as e:
            error_msg = f"Error executing command {command_name}: {str(e)}"
            self.cli_interface.display_error("Command execution error", str(e))
            return CommandResult(success=False, message=error_msg, error=str(e))

    def add_to_history(self, command: str) -> None:
        """Add a command to history"""
        if command and (not self._command_history or self._command_history[-1] != command):
            self._command_history.append(command)
            # Limit history size
            if len(self._command_history) > 100:
                self._command_history = self._command_history[-100:]

    def get_command_history(self, reverse: bool = True) -> List[str]:
        """Get command history"""
        if reverse:
            return list(reversed(self._command_history))
        return self._command_history.copy()

    def clear_history(self) -> None:
        """Clear command history"""
        self._command_history.clear()

    def set_context(self, key: str, value: Any) -> None:
        """Set a context value"""
        self._context[key] = value

    def get_context(self, key: str, default: Any = None) -> Any:
        """Get a context value"""
        return self._context.get(key, default)

    def update_context(self, context: Dict[str, Any]) -> None:
        """Update multiple context values"""
        self._context.update(context)

    def get_help_for_command(self, command_name: str) -> Optional[str]:
        """Get help text for a specific command"""
        command = self.get_command(command_name)
        if command:
            info = command.info
            aliases_text = f" ({', '.join(info.aliases)})" if info.aliases else ""
            usage_text = info.usage if hasattr(info, "usage") and info.usage else f"/{info.name}"
            return f"Usage: {usage_text}\n\n{info.description}{aliases_text}"
        return None

    def get_help_text(self) -> str:
        """Get comprehensive help text"""
        help_text = "Learning Catalyst CLI - Available Commands\n\n"

        # Group by category
        categories: Dict[str, List[CommandInfo]] = {}
        for command in self.get_all_commands():
            if command.category not in categories:
                categories[command.category] = []
            categories[command.category].append(command)

        # Display by category
        for category in CommandCategory:
            if category.value in categories:
                help_text += f"{category.value}:\n"
                for command in sorted(categories[category.value], key=lambda x: x.name):
                    aliases = f" ({', '.join(command.aliases)})" if command.aliases else ""
                    help_text += f"  /{command.name}{aliases} - {command.description}\n"
                help_text += "\n"

        help_text += "Type /help <command> for more information about a specific command."
        return help_text

    @property
    def commands(self) -> Dict[str, BaseCommand]:
        """Get all registered commands (including aliases)"""
        return self._commands.copy()

    @property
    def command_count(self) -> int:
        """Get the number of unique commands (excluding aliases)"""
        return len(self.get_all_commands())

    def get_autocomplete_suggestions(self, partial_input: str) -> List[str]:
        """Get autocomplete suggestions for a partial command input"""
        suggestions: List[str] = []

        # If input starts with /, we're completing a command
        if partial_input.startswith("/"):
            command_part = partial_input[1:].lower()

            # Find matching commands
            for name in self._commands:
                if name.lower().startswith(command_part):
                    suggestions.append(f"/{name}")

        return suggestions

    def get_concept_suggestions(self, partial_input: str, context: Dict[str, Any]) -> List[str]:
        """Get concept suggestions for a partial input"""
        suggestions: List[str] = []

        try:
            # Get workspace path from context
            workspace_path = context.get("workspace_path", ".")

            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")

            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)

            concepts = asyncio.run(knowledge_navigator.get_available_concepts())

            # Find matching concepts
            partial_lower = partial_input.lower()
            for concept in concepts:
                if hasattr(concept, "title") and concept.title.lower().startswith(partial_lower):
                    suggestions.append(concept.title)

            # Limit suggestions
            if len(suggestions) > 10:
                suggestions = suggestions[:10]

        except (ImportError, ValueError, RuntimeError):
            # If we can't get concepts, return empty list
            pass

        return suggestions
