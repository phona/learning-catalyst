"""
CLI Interface implementation for Learning Catalyst
"""

import sys
import traceback
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from rich.console import Console
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

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
    def display_checkpoint_list(self, checkpoints: List[Dict[str, str]]) -> None:
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


class CLIInterfaceImpl(CLIInterface):
    """Concrete implementation of CLI interface using Rich library for formatting"""

    def __init__(self):
        self.console = Console()
        # Store references to Rich components for convenience
        self.markdown_class = Markdown
        self.panel_class = Panel
        self.table_class = Table
        self.progress_class = Progress
        self.spinner_column_class = SpinnerColumn
        self.text_column_class = TextColumn
        self.live_class = Live

    def display_message(self, message: Message) -> None:
        """Display a message to the user with proper formatting"""
        try:
            if message.role == "assistant":
                # AI messages in a panel
                self.console.print(self.panel_class(message.content, title="🎓 Catalyst", border_style="blue"))
            elif message.role == "user":
                # User messages in a panel
                self.console.print(self.panel_class(message.content, title="👤 You", border_style="green"))
            else:
                # System messages
                self.console.print(f"[bold yellow]{message.content}[/bold yellow]")
        except (ValueError, AttributeError) as e:
            self._handle_display_error("display_message", e)

    def display_typing_indicator(self) -> None:
        """Show typing indicator when AI is processing"""
        try:
            with self.progress_class(
                self.spinner_column_class(),
                self.text_column_class("[bold blue]Catalyst is thinking...[/bold blue]"),
                transient=True,
            ) as progress:
                task = progress.add_task("thinking", total=None)
                # This would normally be controlled externally, but for now it's just a visual indicator
                progress.advance(task)
        except (ValueError, RuntimeError) as e:
            self._handle_display_error("display_typing_indicator", e)

    def clear_typing_indicator(self) -> None:
        """Clear the typing indicator"""
        # In a real implementation, we might want to clear the line

    def get_user_input(self, prompt: str = "") -> str:
        """Get input from the user"""
        try:
            if prompt:
                return self.console.input(prompt)
            return self.console.input("[bold green]👤 You:[/bold green] ")
        except KeyboardInterrupt:
            self.display_warning("\nOperation cancelled by user.")
            return ""
        except EOFError:
            self.display_warning("\nInput ended. Use /quit to exit.")
            return ""
        except (IOError, OSError) as e:
            self.display_error("Error getting input", str(e))
            return ""

    def display_conversation_history(self, messages: List[Message]) -> None:
        """Display conversation history with proper formatting"""
        try:
            self.console.print(self.panel_class("📚 Conversation History", title="History", border_style="magenta"))
            for message in messages:
                self.display_message(message)
        except (ValueError, AttributeError) as e:
            self._handle_display_error("display_conversation_history", e)

    def detect_command(self, input_text: str) -> bool:
        """Detect if input is a command (starts with /)"""
        return input_text.startswith("/")

    def clear_screen(self) -> None:
        """Clear the terminal screen"""
        try:
            self.console.clear()
        except (OSError, RuntimeError) as e:
            self._handle_display_error("clear_screen", e)

    def display_checkpoint_list(self, checkpoints: List[Dict[str, str]]) -> None:
        """Display available checkpoints"""
        try:
            table = self.table_class(title="💾 Available Checkpoints")
            table.add_column("ID", style="cyan")
            table.add_column("Description", style="magenta")
            table.add_column("Created At", style="green")

            for checkpoint in checkpoints:
                table.add_row(
                    checkpoint.get("id", "N/A"),
                    checkpoint.get("description", "N/A"),
                    checkpoint.get("created_at", "N/A"),
                )

            self.console.print(table)
        except (ValueError, AttributeError) as e:
            self._handle_display_error("display_checkpoint_list", e)

    def display_error(self, error_message: str, details: Optional[str] = None) -> None:
        """Display error message with optional details"""
        try:
            if details:
                self.console.print(
                    self.panel_class(
                        f"[bold red]❌ Error:[/bold red] {error_message}\n\n[dim]{details}[/dim]",
                        title="Error",
                        border_style="red",
                    )
                )
            else:
                self.console.print(f"[bold red]❌ Error:[/bold red] {error_message}")
        except (ValueError, RuntimeError):
            # Last resort fallback
            print(f"❌ Error: {error_message}")
            if details:
                print(f"Details: {details}")

    def display_success(self, message: str) -> None:
        """Display success message"""
        try:
            self.console.print(f"[bold green]✅ {message}[/bold green]")
        except (ValueError, RuntimeError):
            print(f"✅ {message}")

    def display_warning(self, message: str) -> None:
        """Display warning message"""
        try:
            self.console.print(f"[bold yellow]⚠️  {message}[/bold yellow]")
        except (ValueError, RuntimeError):
            print(f"⚠️  {message}")

    def _handle_display_error(self, operation: str, error: Exception) -> None:
        """Handle errors in display operations gracefully"""
        try:
            print(f"⚠️  Display error in {operation}: {str(error)}")
            # In debug mode, we might want to show the full traceback
            if "--debug" in sys.argv:
                traceback.print_exc()
        except (ValueError, RuntimeError):
            # Ultimate fallback
            print(f"Display error occurred in {operation}")
