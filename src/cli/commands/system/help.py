"""
Help command implementation
"""

from typing import Any, Dict, List

from src.cli.commands.base import BaseCommand, CommandCategory, CommandDecoratorConfig, CommandInfo, CommandResult, command
from src.data.models.extended_models import Message


@command(
    CommandDecoratorConfig(
        name="help",
        description="Show available commands or help for a specific command",
        aliases=["h", "?"],
        category=CommandCategory.SYSTEM,
        usage="/help [command_name]",
    )
)
def help_command(args: List[str], context: Dict[str, Any]) -> CommandResult:
    """Handle the help command"""
    command_registry = context.get("command_registry")
    cli_interface = context.get("cli_interface")

    if not command_registry:
        return CommandResult(success=False, message="Command registry not available", error="Missing command_registry in context")

    if args:
        # Show help for specific command
        command_name = args[0].lstrip("/")  # Remove leading slash if present
        help_text = command_registry.get_help_for_command(command_name)

        if help_text:
            # Display the help message directly
            if cli_interface:
                message = Message(content=help_text, role="assistant")
                cli_interface.display_message(message)
            return CommandResult(success=True, message="")

        error_msg = f"Unknown command: {command_name}"
        if cli_interface:
            cli_interface.display_error(error_msg)
        return CommandResult(success=False, message=error_msg, error=f"Command '{command_name}' not found")

    # Show general help
    help_text = command_registry.get_help_text()
    # Display the help message directly
    if cli_interface:
        message = Message(content=help_text, role="assistant")
        cli_interface.display_message(message)
    return CommandResult(success=True, message="")


class HelpCommand(BaseCommand):
    """Help command class implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="help",
            description="Show available commands or help for a specific command",
            aliases=["h", "?"],
            category=CommandCategory.SYSTEM.value,
            usage="/help [command_name]",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        return help_command(args, context)
