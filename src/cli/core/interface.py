"""
Core CLI interface abstractions
"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from src.cli.commands.base import CommandInfo

from src.data.models.extended_models import Message


class CLIInterface(ABC):
    """Abstract base class for CLI interface operations"""

    @abstractmethod
    def display_message(self, message: Message) -> None:
        """Display a message to the user with proper formatting"""

    @abstractmethod
    def display_typing_indicator(self) -> None:
        """Show typing indicator when AI is processing"""

    def clear_typing_indicator(self) -> None:
        """Clear the typing indicator"""

    @abstractmethod
    def get_user_input(self, prompt: str = "") -> str:
        """Get input from the user"""

    @abstractmethod
    def display_conversation_history(self, messages: List[Message]) -> None:
        """Display conversation history with proper formatting"""

    @abstractmethod
    def detect_command(self, input_text: str) -> bool:
        """Detect if input is a command (starts with /)"""

    @abstractmethod
    def clear_screen(self) -> None:
        """Clear the terminal screen"""

    @abstractmethod
    def display_checkpoint_list(self, checkpoints: List[Dict[str, Any]]) -> None:
        """Display available checkpoints"""

    @abstractmethod
    def display_error(self, error_message: str, details: Optional[str] = None) -> None:
        """Display error message with optional details"""

    @abstractmethod
    def display_success(self, message: str) -> None:
        """Display success message"""

    @abstractmethod
    def display_warning(self, message: str) -> None:
        """Display warning message"""


class CommandInterface(ABC):
    """Abstract interface for command execution"""

    @abstractmethod
    def execute_command(self, command: str, context: Dict[str, Any]) -> bool:
        """Execute a command and return success status"""

    @abstractmethod
    def register_command(self, command_info: "CommandInfo") -> None:
        """Register a new command"""

    @abstractmethod
    def get_command_list(self) -> List["CommandInfo"]:
        """Get list of all registered commands"""

    @abstractmethod
    def get_command_by_name(self, name: str) -> Optional["CommandInfo"]:
        """Get command by name or alias"""


class FormatterInterface(ABC):
    """Abstract interface for output formatting"""

    @abstractmethod
    def format_table(self, data: List[Dict[str, Any]], title: str = "") -> None:
        """Format and display data as a table"""

    @abstractmethod
    def format_panel(self, content: str, title: str = "") -> None:
        """Format and display content in a panel"""

    @abstractmethod
    def format_list(self, items: List[str], title: str = "") -> None:
        """Format and display a list of items"""

    @abstractmethod
    def format_error(self, error_message: str, details: Optional[str] = None) -> None:
        """Format and display an error message"""

    @abstractmethod
    def format_success(self, success_message: str) -> None:
        """Format and display a success message"""

    @abstractmethod
    def format_warning(self, warning_message: str) -> None:
        """Format and display a warning message"""
