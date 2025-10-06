"""
Base classes for command handlers
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, TYPE_CHECKING

from src.cli.interface import CLIInterface
from src.data.models.extended_models import Message

if TYPE_CHECKING:
    from .context import CommandContext


@dataclass
class CommandInfo:
    """Data class to store command information"""

    name: str
    description: str
    aliases: List[str]
    handler: Optional[Callable[[List[str], Dict[str, Any]], None]] = None  # Will be set by CommandPalette
    usage: str = ""
    category: str = "General"


class BaseCommandHandler(ABC):
    """Abstract base class for all command handlers"""

    def __init__(self, cli_interface: CLIInterface, command_context: "CommandContext"):
        self.cli_interface = cli_interface
        self.context = command_context

    @abstractmethod
    def get_commands(self) -> List[CommandInfo]:
        """Return list of commands this handler provides"""
        pass

    def handle_command(self, command_name: str, args: List[str], context: Dict[str, Any]) -> None:
        """
        Route to appropriate command handler method
        
        Args:
            command_name: Name of the command to handle
            args: Command arguments
            context: Execution context
        """
        try:
            handler_method = getattr(self, f"_{command_name}_command", None)
            if handler_method:
                handler_method(args, context)
            else:
                self.cli_interface.display_error(f"Unknown command: {command_name}")
        except Exception as e:
            self.cli_interface.display_error(f"Error executing command {command_name}", str(e))

    def _display_message(self, content: str, role: str = "system") -> None:
        """Helper method to display messages"""
        self.cli_interface.display_message(Message(role=role, content=content))

    def _display_success(self, content: str) -> None:
        """Helper method to display success messages"""
        self.cli_interface.display_success(content)

    def _display_warning(self, content: str) -> None:
        """Helper method to display warning messages"""
        self.cli_interface.display_warning(content)

    def _display_error(self, title: str, message: str) -> None:
        """Helper method to display error messages"""
        self.cli_interface.display_error(title, message)

    def _safe_input(self, prompt_text: str) -> str:
        """Safe input function that handles backspace properly"""
        try:
            # Use built-in input which works better with readline
            return input(prompt_text + " ").strip()
        except KeyboardInterrupt:
            raise
        except EOFError:
            return ""