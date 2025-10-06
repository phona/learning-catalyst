"""
Formatting utilities for Learning Catalyst CLI
Provides consistent formatting for different types of content
"""

from typing import Any, Dict, List

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.tree import Tree


class CLIFormatter:
    """Handles formatting for CLI output"""

    def __init__(self):
        self.console = Console()

    def format_header(self, title: str, subtitle: str = "") -> None:
        """Format and display a header"""
        header_text = f"[bold blue]{title}[/bold blue]"
        if subtitle:
            header_text += f"\n[dim]{subtitle}[/dim]"

        self.console.print(Panel(header_text, expand=False, border_style="blue"))

    def format_section(self, title: str, content: str) -> None:
        """Format and display a section with title and content"""
        self.console.print(f"\n[bold green]{title}[/bold green]")
        self.console.print(content)

    def format_markdown(self, markdown_text: str) -> None:
        """Format and display markdown content"""
        md = Markdown(markdown_text)
        self.console.print(md)

    def format_concept_list(self, concepts: List[Dict[str, Any]]) -> None:
        """Format and display a list of concepts"""
        table = Table(title="Learning Concepts")
        table.add_column("Concept", style="cyan", no_wrap=True)
        table.add_column("Description", style="magenta")
        table.add_column("Level", style="green")

        for concept in concepts:
            table.add_row(
                concept.get("title", "Unknown"),
                concept.get("description", "No description available"),
                str(concept.get("level", 1)),
            )

        self.console.print(table)

    def format_command_list(self, commands: List[Dict[str, Any]]) -> None:
        """Format and display a list of commands"""
        table = Table(title="Available Commands")
        table.add_column("Command", style="cyan", no_wrap=True)
        table.add_column("Description", style="magenta")
        table.add_column("Usage", style="green")
        table.add_column("Aliases", style="yellow")

        for command in commands:
            table.add_row(
                f"/{command.get('name', 'Unknown')}",
                command.get("description", "No description available"),
                command.get("usage", ""),
                ", ".join(command.get("aliases", [])),
            )

        self.console.print(table)

    def format_help(self, command_name: str, command_info: Dict[str, Any]) -> None:
        """Format and display help for a specific command"""
        help_text = f"[bold blue]/{command_name}[/bold blue]\n\n"
        help_text += f"[dim]{command_info.get('description', 'No description available')}[/dim]\n\n"
        help_text += f"[bold]Usage:[/bold] {command_info.get('usage', f'/{command_name}')}\n\n"

        aliases = command_info.get("aliases", [])
        if aliases:
            help_text += f"[bold]Aliases:[/bold] {', '.join(aliases)}\n"

        self.console.print(Panel(help_text, expand=False, border_style="blue"))

    def format_error(self, error_message: str) -> None:
        """Format and display an error message"""
        self.console.print(f"[bold red]Error:[/bold red] {error_message}")

    def format_success(self, success_message: str) -> None:
        """Format and display a success message"""
        self.console.print(f"[bold green]Success:[/bold green] {success_message}")

    def format_info(self, info_message: str) -> None:
        """Format and display an info message"""
        self.console.print(f"[bold blue]Info:[/bold blue] {info_message}")

    def format_warning(self, warning_message: str) -> None:
        """Format and display a warning message"""
        self.console.print(f"[bold yellow]Warning:[/bold yellow] {warning_message}")

    def format_progress(self, task_description: str) -> Progress:
        """Create and return a progress indicator"""
        return Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=self.console)

    def format_tree(self, root_label: str, items: List[Dict[str, Any]]) -> None:
        """Format and display a tree structure"""
        tree = Tree(f"[bold green]{root_label}[/bold green]")

        for item in items:
            label = item.get("title", item.get("name", "Unknown"))
            description = item.get("description", "")

            if description:
                node = tree.add(f"[cyan]{label}[/cyan] [dim]({description})[/dim]")
            else:
                node = tree.add(f"[cyan]{label}[/cyan]")

            # Add children if any
            children = item.get("children", [])
            for child in children:
                child_label = child.get("title", child.get("name", "Unknown"))
                child_description = child.get("description", "")

                if child_description:
                    node.add(f"[yellow]{child_label}[/yellow] [dim]({child_description})[/dim]")
                else:
                    node.add(f"[yellow]{child_label}[/yellow]")

        self.console.print(tree)

    def format_code_block(self, code: str, language: str = "") -> None:
        """Format and display a code block"""
        if language:
            self.console.print(f"[dim]// {language}[/dim]")

        self.console.print(Panel(code, border_style="dim", expand=False))

    def format_quote(self, quote: str, author: str = "") -> None:
        """Format and display a quote"""
        if author:
            quote_text = f'[italic]"{quote}"[/italic]\n[dim]— {author}[/dim]'
        else:
            quote_text = f'[italic]"{quote}"[/italic]'

        self.console.print(Panel(quote_text, border_style="dim", expand=False))

    def format_list(self, items: List[str], title: str = "") -> None:
        """Format and display a list of items"""
        if title:
            self.console.print(f"\n[bold green]{title}[/bold green]")

        for i, item in enumerate(items, 1):
            self.console.print(f"{i}. {item}")

    def format_key_value(self, data: Dict[str, Any], title: str = "") -> None:
        """Format and display key-value pairs"""
        if title:
            self.console.print(f"\n[bold green]{title}[/bold green]")

        for key, value in data.items():
            self.console.print(f"[cyan]{key}:[/cyan] {value}")

    def format_separator(self, char: str = "-", length: int = 50) -> None:
        """Format and display a separator line"""
        self.console.print(char * length)

    def clear_screen(self) -> None:
        """Clear the console screen"""
        self.console.clear()

    def print(self, content: Any) -> None:
        """Print content directly to the console"""
        self.console.print(content)
