"""
Clear command implementation
"""

from typing import Any, Dict, List

from src.cli.commands.base import BaseCommand, CommandCategory, CommandDecoratorConfig, CommandInfo, CommandResult, command


@command(
    CommandDecoratorConfig(
        name="clear", description="Clear the terminal screen", aliases=["cls"], category=CommandCategory.SYSTEM, usage="/clear"
    )
)
def clear_command(_args: List[str], context: Dict[str, Any]) -> CommandResult:
    """Handle the clear command"""
    cli_interface = context.get("cli_interface")
    if cli_interface:
        cli_interface.clear_screen()
        return CommandResult(success=True, message="Screen cleared")

    return CommandResult(success=False, message="CLI interface not available", error="Missing cli_interface in context")


class ClearCommand(BaseCommand):
    """Clear command class implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="clear",
            description="Clear the terminal screen",
            aliases=["cls"],
            category=CommandCategory.SYSTEM.value,
            usage="/clear",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        return clear_command(args, context)
