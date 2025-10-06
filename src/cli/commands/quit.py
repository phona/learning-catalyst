"""
Quit command implementation for Learning Catalyst CLI
"""

import sys

import typer
from rich.console import Console
from rich.panel import Panel

app = typer.Typer()


@app.command()
def quit_command(force: bool = typer.Option(False, "--force", "-f", help="Force quit without confirmation")):
    """Exit the Learning Catalyst application"""
    console = Console()

    if not force:
        console.print("[yellow]Are you sure you want to exit Learning Catalyst?[/yellow]")
        confirm = typer.confirm("Confirm exit")
        if not confirm:
            console.print("[green]Exit cancelled. Continue learning![/green]")
            return

    console.print(Panel.fit("[bold blue]Thank you for using Learning Catalyst![/bold blue]", border_style="blue"))
    console.print("Your progress has been saved.")
    console.print("[italic]See you next time![/italic]")

    # Exit the application
    sys.exit(0)


if __name__ == "__main__":
    app()
