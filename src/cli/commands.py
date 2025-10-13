"""
Command processing for Learning Catalyst CLI.

Handles slash commands and their execution.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import re

from ..core.config import ConfigManager
from .state import CLIState



@dataclass
class CommandResult:
    """Result of command execution."""
    success: bool
    message: str
    data: Optional[Any] = None


class Command(ABC):
    """Base class for CLI commands."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """
        Execute the command.

        Args:
            args: Command arguments
            config: Configuration manager
            state: CLI state

        Returns:
            CommandResult with execution result
        """
        pass


class CommandGroup(Command):
    """A command that contains subcommands and manages help text."""

    def __init__(self, name: str, description: str, category: str = "General"):
        super().__init__(name, description)
        self.category = category
        self._subcommands: Dict[str, Command] = {}

    def register_subcommand(self, command: Command) -> None:
        """Register a subcommand."""
        self._subcommands[command.name] = command

    def get_subcommand(self, name: str) -> Optional[Command]:
        """Get a subcommand by name."""
        return self._subcommands.get(name)

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """Execute a subcommand or show help."""
        if not args:
            return self._show_help()

        subcommand_name = args[0]
        subcommand = self.get_subcommand(subcommand_name)

        if not subcommand:
            available = ", ".join(self._subcommands.keys())
            return CommandResult(
                False,
                f"Unknown subcommand '{subcommand_name}'. Available: {available}"
            )

        return await subcommand.execute(args[1:], config, state)

    def _show_help(self) -> CommandResult:
        """Show help for this command group."""
        if not self._subcommands:
            return CommandResult(True, f"/{self.name} - {self.description}")

        help_text = f"📋 {self.description}:\n\n"
        for subcommand in self._subcommands.values():
            help_text += f"  /{self.name} {subcommand.name} - {subcommand.description}\n"

        return CommandResult(True, help_text)




class ConfigCommand(Command):
    """Configuration command."""

    def __init__(self):
        super().__init__("config", "Manage configuration")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_all_config(config)
        elif len(args) == 1:
            return self._show_config_section(config, args[0])
        elif len(args) == 2:
            return self._set_config_value(config, args[0], args[1])
        else:
            return CommandResult(False, "Invalid config command format")

    def _show_all_config(self, config: ConfigManager) -> CommandResult:
        """Show all configuration sections."""
        all_config = config.get_all()
        output = "⚙️ Configuration:\n"

        for section, values in all_config.items():
            output += f"\n{section.upper()}:\n"
            for key, value in values.items():
                if "api_key" not in key.lower():  # Don't show API keys
                    output += f"  {key}: {value}"

        return CommandResult(True, output)

    def _show_config_section(self, config: ConfigManager, section: str) -> CommandResult:
        """Show specific configuration section."""
        section_config = config.get_section(section)
        if not section_config:
            return CommandResult(False, f"Configuration section '{section}' not found")

        output = f"⚙️ {section.upper()} Configuration:\n"
        for key, value in section_config.items():
            if "api_key" not in key.lower():
                output += f"  {key}: {value}"

        return CommandResult(True, output)

    def _set_config_value(self, config: ConfigManager, key: str, value: str) -> CommandResult:
        """Set a configuration value."""
        try:
            # Convert value to appropriate type
            if value.lower() in ("true", "false"):
                value = value.lower() == "true"
            elif value.isdigit():
                value = int(value)
            elif "." in value and value.replace(".", "").isdigit():
                value = float(value)

            config.set(key, value)
            return CommandResult(True, f"✅ Set {key} = {value}")
        except Exception as e:
            return CommandResult(False, f"❌ Failed to set {key}: {str(e)}")


class ClearCommand(Command):
    """Clear screen command."""

    def __init__(self):
        super().__init__("clear", "Clear the terminal screen")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        import os
        os.system('cls' if os.name == 'nt' else 'clear')
        return CommandResult(True, "Screen cleared")


class TokenUsageCommand(Command):
    """Token usage statistics command."""

    def __init__(self):
        super().__init__("tokens", "Show token usage statistics")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        # This would integrate with actual token tracking
        # For now, return placeholder data
        usage_data = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_cost": 0.0,
            "requests_today": 0
        }

        output = "💰 Token Usage Statistics:\n"
        for key, value in usage_data.items():
            output += f"  {key.replace('_', ' ').title()}: {value}\n"

        return CommandResult(True, output, usage_data)


class CommandProcessor(CommandGroup):
    """Root command processor that manages all commands and subcommands."""

    def __init__(self):
        """Initialize command processor as root command group."""
        super().__init__("", "Learning Catalyst CLI", "System")
        self._register_default_commands()

    def _register_default_commands(self) -> None:
        """Register default commands and command groups.

        Command Organization Strategy:
        - Use CommandGroups to organize commands by functional category
        - Individual commands can be registered directly for simple operations
        - Commands in groups are accessed as /groupname command (e.g., /system clear)
        - Direct commands are accessed as /commandname (e.g., /config)
        """
        # For Phase 1 MVP, register commands directly to keep them simple
        # In future phases, consider organizing related commands into CommandGroups
        self.register_subcommand(ClearCommand())
        self.register_subcommand(TokenUsageCommand())
        self.register_subcommand(ConfigCommand())

    def register_command(self, command: Command) -> None:
        """
        Register a new command (alias for register_subcommand for compatibility).

        Args:
            command: Command to register
        """
        self.register_subcommand(command)

    async def process_command(
        self,
        command_line: str,
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """
        Process a command line.

        Args:
            command_line: Command line string
            config: Configuration manager
            state: CLI state

        Returns:
            CommandResult with execution result
        """
        # Remove leading slash and split
        command_line = command_line.lstrip('/')
        parts = command_line.split()

        if not parts:
            # No command provided, show help
            return self._show_help()

        # Handle help explicitly
        if parts[0] == "help":
            return self._show_help()

        # Use CommandGroup execute method (which supports partial matching)
        return await self.execute(parts, config, state)

    def list_commands(self) -> List[Command]:
        """
        List all registered commands.

        Returns:
            List of commands
        """
        commands = []
        for command in self._subcommands.values():
            commands.append(command)
            # If it's a command group, also list its subcommands
            if isinstance(command, CommandGroup):
                commands.extend(command._subcommands.values())
        return commands

    def get_command(self, name: str) -> Optional[Command]:
        """
        Get a command by name.

        Args:
            name: Command name

        Returns:
            Command or None if not found
        """
        return self.get_subcommand(name)

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """Override execute to support partial matching and root help."""
        if not args:
            return self._show_help()

        # Try exact match first
        command = self.get_subcommand(args[0])

        # If no exact match, try partial matching
        if not command:
            for name, cmd in self._subcommands.items():
                if name.startswith(args[0]):
                    command = cmd
                    break

        if not command:
            return CommandResult(False, f"Unknown command: /{args[0]}")

        return await command.execute(args[1:], config, state)

    def _show_help(self) -> CommandResult:
        """Show comprehensive help for all commands."""
        help_text = "🚀 Learning Catalyst - AI-Powered Learning Assistant\n\n"

        # Build help text from command groups and individual commands
        categories = {}

        for command in self._subcommands.values():
            if isinstance(command, CommandGroup):
                # Command groups get their own category
                if command.category not in categories:
                    categories[command.category] = []
                categories[command.category].append(command)
            else:
                # Individual commands go to "General" or their assigned category
                category = getattr(command, 'category', 'General')
                if category not in categories:
                    categories[category] = []
                categories[category].append(command)

        # Define category icons and order
        category_icons = {
            "System": "🔧",
            "Configuration": "⚙️",
            "Learning": "📚",
            "Analytics": "📊",
            "Session": "💾",
            "Context": "🧩",
            "General": "📋"
        }

        # Build help text by category
        for category_name in ["System", "Configuration", "Learning", "Analytics", "Session", "Context", "General"]:
            if category_name in categories:
                icon = category_icons.get(category_name, "📋")
                help_text += f"{icon} {category_name} Commands:\n"

                for command in categories[category_name]:
                    if isinstance(command, CommandGroup):
                        help_text += f"  /{command.name} - {command.description}\n"
                        # Show subcommands if group has any
                        if command._subcommands:
                            for subcmd in command._subcommands.values():
                                help_text += f"    /{command.name} {subcmd.name} - {subcmd.description}\n"
                    else:
                        help_text += f"  /{command.name} - {command.description}\n"

                help_text += "\n"

        # Add natural learning note
        help_text += "🧠 Natural Learning (No Commands Needed):\n"
        help_text += "  Just ask questions naturally in the shell:\n"
        help_text += "    • Explanations: \"Explain neural networks\"\n"
        help_text += "    • Practice: \"Test me on Python lists\"\n"
        help_text += "    • Learning: \"What should I learn next?\"\n\n"

        help_text += "💡 Simply ask questions directly without commands for natural learning!"

        return CommandResult(True, help_text)