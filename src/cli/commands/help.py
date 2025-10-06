"""
Help command implementation for Learning Catalyst CLI
"""

from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer()


@app.command()
def help_command(command: Optional[str] = typer.Argument(None, help="Specific command to get help for")):
    """Display help information for commands"""
    console = Console()

    if command:
        # Show help for specific command
        _show_command_help(console, command)
    else:
        # Show general help
        _show_general_help(console)


def _show_general_help(console):
    """Display general help information"""
    console.print(Panel.fit("[bold blue]Learning Catalyst CLI Help[/bold blue]", border_style="blue"))

    console.print("\n[bold]Available Commands:[/bold]\n")

    # Create a table for commands
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Command", style="cyan", width=15)
    table.add_column("Description", width=50)
    table.add_column("Aliases", style="yellow")

    # Core commands
    commands = [
        ("start-learning", "Start the learning session", "start"),
        ("models", "List available AI models", "model"),
        ("tokens", "Show token usage statistics", "token"),
        ("knowledge-map", "Display the knowledge map", "map"),
        ("preference", "Manage user preferences", "pref, config"),
        ("help", "Show this help message", "h, ?"),
    ]

    for cmd, desc, aliases in commands:
        table.add_row(cmd, desc, aliases)

    console.print(table)

    console.print("\n[bold]Usage:[/bold]")
    console.print("  learning-catalyst [command] [options]")
    console.print("  learning-catalyst [command] --help")


def _show_command_help(console, command_name):
    """Display help for a specific command"""
    command_help = {
        "start-learning": {
            "description": "Start the learning session in the specified workspace",
            "usage": "learning-catalyst start-learning [WORKSPACE_PATH]",
            "options": [
                ("WORKSPACE_PATH", "Path to the learning workspace (default: current directory)"),
            ],
        },
        "models": {
            "description": "List all available AI models from configured providers",
            "usage": "learning-catalyst models",
            "options": [],
        },
        "tokens": {
            "description": "Show detailed token usage statistics",
            "usage": "learning-catalyst tokens",
            "options": [],
        },
        "knowledge-map": {
            "description": "Display the current knowledge map structure",
            "usage": "learning-catalyst knowledge-map",
            "options": [],
        },
        "preference": {
            "description": "Manage user preferences",
            "usage": "learning-catalyst preference [list|set] [KEY] [VALUE]",
            "options": [
                ("list", "List all current preferences"),
                ("set KEY VALUE", "Set a preference value"),
            ],
        },
        "help": {
            "description": "Show help information",
            "usage": "learning-catalyst help [COMMAND]",
            "options": [
                ("COMMAND", "Show help for specific command"),
            ],
        },
    }

    if command_name in command_help:
        cmd_info = command_help[command_name]
        console.print(Panel.fit(f"[bold blue]{command_name}[/bold blue]", border_style="blue"))
        console.print(f"\n[bold]Description:[/bold] {cmd_info['description']}")
        console.print(f"\n[bold]Usage:[/bold] {cmd_info['usage']}")

        if cmd_info["options"]:
            console.print("\n[bold]Options:[/bold]")
            for option, desc in cmd_info["options"]:
                console.print(f"  {option:<20} {desc}")
    else:
        console.print(f"[red]Unknown command:[/red] {command_name}")
        console.print("Use 'learning-catalyst help' to see available commands.")


if __name__ == "__main__":
    app()
