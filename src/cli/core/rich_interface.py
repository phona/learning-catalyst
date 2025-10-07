"""
Rich-based implementation of CLI interface
"""

import os
import sys
import traceback
from typing import Any, Dict, List, Optional

# Rich imports
from rich.console import Console
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from src.cli.core.interface import CLIInterface, FormatterInterface
from src.data.models.extended_models import Message


class RichInterface(CLIInterface, FormatterInterface):
    """Rich-based implementation of CLI interface"""

    def __init__(self):
        # Initialize Rich components
        self.console = Console()
        self.Markdown = Markdown
        self.Panel = Panel
        self.Table = Table
        self.Progress = Progress
        self.SpinnerColumn = SpinnerColumn
        self.TextColumn = TextColumn
        self.Live = Live
        self.rich_available = True

    def display_message(self, message: Message) -> None:
        """Display a message to the user with proper formatting"""
        try:
            if self.rich_available:
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
            if self.rich_available:
                with self.Progress(
                    self.SpinnerColumn(),
                    self.TextColumn("[bold blue]Catalyst is thinking...[/bold blue]"),
                    transient=True,
                ) as progress:
                    task = progress.add_task("thinking", total=None)
                    # This would normally be controlled externally
                    progress.advance(task)
            else:
                print("Catalyst is thinking...")
        except Exception as e:
            self._handle_display_error("display_typing_indicator", e)

    def get_user_input(self, prompt: str = "") -> str:
        """Get input from the user"""
        try:
            if prompt and self.rich_available:
                return self.console.input(prompt)
            elif prompt:
                return input(prompt)
            else:
                if self.rich_available:
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
            if self.rich_available:
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
            if self.rich_available:
                self.console.clear()
            else:
                os.system("cls" if os.name == "nt" else "clear")
        except Exception as e:
            self._handle_display_error("clear_screen", e)

    def display_checkpoint_list(self, checkpoints: List[Dict[str, Any]]) -> None:
        """Display available checkpoints"""
        try:
            if self.rich_available:
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
            if self.rich_available:
                if details:
                    self.console.print(
                        self.Panel(
                            f"[bold red]❌ Error:[/bold red] {error_message}\n\n[dim]{details}[/dim]",
                            title="Error",
                            border_style="red",
                        )
                    )
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
            if self.rich_available:
                self.console.print(f"[bold green]✅ {message}[/bold green]")
            else:
                print(f"✅ {message}")
        except Exception:
            print(f"✅ {message}")

    def display_warning(self, message: str) -> None:
        """Display warning message"""
        try:
            if self.rich_available:
                self.console.print(f"[bold yellow]⚠️  {message}[/bold yellow]")
            else:
                print(f"⚠️  {message}")
        except Exception:
            print(f"⚠️  {message}")

    # Formatter interface methods
    def format_table(self, data: List[Dict[str, Any]], title: str = "") -> None:
        """Format and display data as a table"""
        try:
            if not data or not self.rich_available:
                return

            table = self.Table(title=title) if title else self.Table()

            # Add columns from first row
            for key in data[0].keys():
                table.add_column(key.replace("_", " ").title(), style="cyan")

            # Add rows
            for row in data:
                table.add_row(*[str(value) for value in row.values()])

            self.console.print(table)
        except Exception as e:
            self._handle_display_error("format_table", e)

    def format_panel(self, content: str, title: str = "") -> None:
        """Format and display content in a panel"""
        try:
            if self.rich_available:
                self.console.print(self.Panel(content, title=title, border_style="blue"))
            else:
                if title:
                    print(f"{title}:")
                print(content)
        except Exception as e:
            self._handle_display_error("format_panel", e)

    def format_list(self, items: List[str], title: str = "") -> None:
        """Format and display a list of items"""
        try:
            if title:
                if self.rich_available:
                    self.console.print(f"\n[bold green]{title}[/bold green]")
                else:
                    print(f"\n{title}:")

            for i, item in enumerate(items, 1):
                if self.rich_available:
                    self.console.print(f"{i}. {item}")
                else:
                    print(f"{i}. {item}")
        except Exception as e:
            self._handle_display_error("format_list", e)

    def format_error(self, error_message: str, details: Optional[str] = None) -> None:
        """Format and display an error message"""
        self.display_error(error_message, details)

    def format_success(self, success_message: str) -> None:
        """Format and display a success message"""
        self.display_success(success_message)

    def format_warning(self, warning_message: str) -> None:
        """Format and display a warning message"""
        self.display_warning(warning_message)

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
