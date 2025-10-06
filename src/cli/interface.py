"""
CLI Interface implementation for Learning Catalyst
"""

import sys
import traceback
from abc import ABC, abstractmethod
from typing import List, Optional

from src.data.models.extended_models import Message


class CLIInterface(ABC):
    """Abstract base class for CLI interface operations"""

    @abstractmethod
    def display_message(self, message: Message) -> None:
        """Display a message to the user with proper formatting"""
        pass

    @abstractmethod
    def display_typing_indicator(self) -> None:
        """Show typing indicator when AI is processing"""
        pass

    def clear_typing_indicator(self) -> None:
        """Clear the typing indicator"""
        pass

    @abstractmethod
    def get_user_input(self, prompt: str = "") -> str:
        """Get input from the user"""
        pass

    @abstractmethod
    def display_conversation_history(self, messages: List[Message]) -> None:
        """Display conversation history with proper formatting"""
        pass

    @abstractmethod
    def detect_command(self, input_text: str) -> bool:
        """Detect if input is a command (starts with /)"""
        pass

    @abstractmethod
    def clear_screen(self) -> None:
        """Clear the terminal screen"""
        pass

    @abstractmethod
    def display_checkpoint_list(self, checkpoints: List[dict]) -> None:
        """Display available checkpoints"""
        pass

    @abstractmethod
    def display_error(self, error_message: str, details: Optional[str] = None) -> None:
        """Display error message with optional details"""
        pass

    @abstractmethod
    def display_success(self, message: str) -> None:
        """Display success message"""
        pass

    @abstractmethod
    def display_warning(self, message: str) -> None:
        """Display warning message"""
        pass


class CLIInterfaceImpl(CLIInterface):
    """Concrete implementation of CLI interface using Rich library for formatting"""

    def __init__(self):
        # Import rich components here to avoid issues if not installed
        try:
            from rich.console import Console
            from rich.markdown import Markdown
            from rich.panel import Panel
            from rich.table import Table
            from rich.progress import Progress, SpinnerColumn, TextColumn
            from rich.live import Live

            self.console = Console()
            self.Markdown = Markdown
            self.Panel = Panel
            self.Table = Table
            self.Progress = Progress
            self.SpinnerColumn = SpinnerColumn
            self.TextColumn = TextColumn
            self.Live = Live
        except ImportError:
            # Fallback if rich is not available
            self.console = None

    def display_message(self, message: Message) -> None:
        """Display a message to the user with proper formatting"""
        try:
            if self.console:
                if message.role == "assistant":
                    # AI messages in a panel
                    self.console.print(self.Panel(message.content, title="🎓 Catalyst", border_style="blue"))
                elif message.role == "user":
                    # User messages in a panel
                    self.console.print(self.Panel(message.content, title="👤 You", border_style="green"))
                else:
                    # System messages
                    self.console.print(f"[bold yellow]{message.content}[/bold yellow]")
            else:
                # Fallback to basic print
                print(f"{message.role}: {message.content}")
        except Exception as e:
            self._handle_display_error("display_message", e)

    def display_typing_indicator(self) -> None:
        """Show typing indicator when AI is processing"""
        try:
            if self.console:
                with self.Progress(
                    self.SpinnerColumn(),
                    self.TextColumn("[bold blue]Catalyst is thinking...[/bold blue]"),
                    transient=True,
                ) as progress:
                    task = progress.add_task("thinking", total=None)
                    # This would normally be controlled externally, but for now it's just a visual indicator
                    progress.advance(task)
            else:
                print("Catalyst is thinking...")
        except Exception as e:
            self._handle_display_error("display_typing_indicator", e)

    def clear_typing_indicator(self) -> None:
        """Clear the typing indicator"""
        # In a real implementation, we might want to clear the line
        pass

    def get_user_input(self, prompt: str = "") -> str:
        """Get input from the user"""
        try:
            if prompt and self.console:
                return self.console.input(prompt)
            elif prompt:
                return input(prompt)
            else:
                if self.console:
                    return self.console.input("[bold green]👤 You:[/bold green] ")
                else:
                    return input("You: ")
        except KeyboardInterrupt:
            self.display_warning("\nOperation cancelled by user.")
            return ""
        except EOFError:
            self.display_warning("\nInput ended. Use /quit to exit.")
            return ""
        except Exception as e:
            self.display_error("Error getting input", str(e))
            return ""

    def display_conversation_history(self, messages: List[Message]) -> None:
        """Display conversation history with proper formatting"""
        try:
            if self.console:
                self.console.print(self.Panel("📚 Conversation History", title="History", border_style="magenta"))
                for message in messages:
                    self.display_message(message)
            else:
                print("--- Conversation History ---")
                for message in messages:
                    print(f"{message.role}: {message.content}")
        except Exception as e:
            self._handle_display_error("display_conversation_history", e)

    def detect_command(self, input_text: str) -> bool:
        """Detect if input is a command (starts with /)"""
        return input_text.startswith("/")

    def clear_screen(self) -> None:
        """Clear the terminal screen"""
        try:
            if self.console:
                self.console.clear()
            else:
                import os

                os.system("cls" if os.name == "nt" else "clear")
        except Exception as e:
            self._handle_display_error("clear_screen", e)

    def display_checkpoint_list(self, checkpoints: List[dict]) -> None:
        """Display available checkpoints"""
        try:
            if self.console:
                table = self.Table(title="💾 Available Checkpoints")
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
            else:
                print("--- Available Checkpoints ---")
                for checkpoint in checkpoints:
                    print(f"ID: {checkpoint.get('id', 'N/A')}")
                    print(f"Description: {checkpoint.get('description', 'N/A')}")
                    print(f"Created At: {checkpoint.get('created_at', 'N/A')}")
                    print("-" * 30)
        except Exception as e:
            self._handle_display_error("display_checkpoint_list", e)

    def display_error(self, error_message: str, details: Optional[str] = None) -> None:
        """Display error message with optional details"""
        try:
            if self.console:
                if details:
                    self.console.print(self.Panel(
                        f"[bold red]❌ Error:[/bold red] {error_message}\n\n[dim]{details}[/dim]",
                        title="Error",
                        border_style="red"
                    ))
                else:
                    self.console.print(f"[bold red]❌ Error:[/bold red] {error_message}")
            else:
                print(f"❌ Error: {error_message}")
                if details:
                    print(f"Details: {details}")
        except Exception:
            # Last resort fallback
            print(f"❌ Error: {error_message}")
            if details:
                print(f"Details: {details}")

    def display_success(self, message: str) -> None:
        """Display success message"""
        try:
            if self.console:
                self.console.print(f"[bold green]✅ {message}[/bold green]")
            else:
                print(f"✅ {message}")
        except Exception:
            print(f"✅ {message}")

    def display_warning(self, message: str) -> None:
        """Display warning message"""
        try:
            if self.console:
                self.console.print(f"[bold yellow]⚠️  {message}[/bold yellow]")
            else:
                print(f"⚠️  {message}")
        except Exception:
            print(f"⚠️  {message}")

    def _handle_display_error(self, operation: str, error: Exception) -> None:
        """Handle errors in display operations gracefully"""
        try:
            print(f"⚠️  Display error in {operation}: {str(error)}")
            # In debug mode, we might want to show the full traceback
            if "--debug" in sys.argv:
                traceback.print_exc()
        except Exception:
            # Ultimate fallback
            print(f"Display error occurred in {operation}")
