"""
Quit command implementation
"""

from typing import Any, Dict, List

from src.cli.commands.base import BaseCommand, CommandCategory, CommandDecoratorConfig, CommandInfo, CommandResult, command


@command(
    CommandDecoratorConfig(
        name="quit",
        description="Exit the Learning Catalyst application",
        aliases=["exit", "q"],
        category=CommandCategory.SYSTEM,
        usage="/quit",
    )
)
def quit_command(args: List[str], context: Dict[str, Any]) -> CommandResult:
    """Handle the quit command"""
    return CommandResult(success=True, message="Goodbye! Thanks for using Learning Catalyst! 👋", data={"exit": True})


class QuitCommand(BaseCommand):
    """Quit command class implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="quit",
            description="Exit the Learning Catalyst application",
            aliases=["exit", "q"],
            category=CommandCategory.SYSTEM.value,
            usage="/quit",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        return quit_command(args, context)
