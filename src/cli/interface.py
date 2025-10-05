"""
CLI Interface implementation for Learning Catalyst
"""
from abc import ABC, abstractmethod
from typing import List

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


class CLIInterfaceImpl(CLIInterface):
    """Concrete implementation of CLI interface using Rich library for formatting"""

    def __init__(self):
        # Import rich components here to avoid issues if not installed
        try:
            from rich.console import Console
            from rich.markdown import Markdown
            from rich.panel import Panel
            from rich.table import Table
            self.console = Console()
            self.Markdown = Markdown
            self.Panel = Panel
            self.Table = Table
        except ImportError:
            # Fallback if rich is not available
            self.console = None

    def display_message(self, message: Message) -> None:
        """Display a message to the user with proper formatting"""
        if self.console:
            if message.role == "assistant":
                # AI messages in a panel
                self.console.print(self.Panel(message.content, title="Catalyst", border_style="blue"))
            elif message.role == "user":
                # User messages in a panel
                self.console.print(self.Panel(message.content, title="You", border_style="green"))
            else:
                # System messages
                self.console.print(f"[bold yellow]{message.content}[/bold yellow]")
        else:
            # Fallback to basic print
            print(f"{message.role}: {message.content}")

    def display_typing_indicator(self) -> None:
        """Show typing indicator when AI is processing"""
        if self.console:
            self.console.print("[bold blue]Catalyst is thinking...[/bold blue]")
        else:
            print("Catalyst is thinking...")

    def clear_typing_indicator(self) -> None:
        """Clear the typing indicator"""
        # In a real implementation, we might want to clear the line
        pass

    def get_user_input(self, prompt: str = "") -> str:
        """Get input from the user"""
        if prompt and self.console:
            return self.console.input(prompt)
        elif prompt:
            return input(prompt)
        else:
            if self.console:
                return self.console.input("[bold green]You:[/bold green] ")
            else:
                return input("You: ")

    def display_conversation_history(self, messages: List[Message]) -> None:
        """Display conversation history with proper formatting"""
        if self.console:
            self.console.print(self.Panel("Conversation History", title="History", border_style="magenta"))
            for message in messages:
                self.display_message(message)
        else:
            print("--- Conversation History ---")
            for message in messages:
                print(f"{message.role}: {message.content}")

    def detect_command(self, input_text: str) -> bool:
        """Detect if input is a command (starts with /)"""
        return input_text.startswith('/')

    def clear_screen(self) -> None:
        """Clear the terminal screen"""
        if self.console:
            self.console.clear()
        else:
            import os
            os.system('cls' if os.name == 'nt' else 'clear')

    def display_checkpoint_list(self, checkpoints: List[dict]) -> None:
        """Display available checkpoints"""
        if self.console:
            table = self.Table(title="Available Checkpoints")
            table.add_column("ID", style="cyan")
            table.add_column("Description", style="magenta")
            table.add_column("Created At", style="green")

            for checkpoint in checkpoints:
                table.add_row(
                    checkpoint.get('id', 'N/A'),
                    checkpoint.get('description', 'N/A'),
                    checkpoint.get('created_at', 'N/A')
                )

            self.console.print(table)
        else:
            print("--- Available Checkpoints ---")
            for checkpoint in checkpoints:
                print(f"ID: {checkpoint.get('id', 'N/A')}")
                print(f"Description: {checkpoint.get('description', 'N/A')}")
                print(f"Created At: {checkpoint.get('created_at', 'N/A')}")
                print("-" * 30)
