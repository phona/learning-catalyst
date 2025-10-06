"""
Reset command implementation for Learning Catalyst CLI
"""

import typer
from rich.console import Console
from rich.panel import Panel

app = typer.Typer()


@app.command()
def reset(force: bool = typer.Option(False, "--force", "-f", help="Force reset without confirmation")):
    """Reset the current learning session"""
    console = Console()

    if not force:
        console.print("[yellow]Warning: This will reset your current learning session.[/yellow]")
        confirm = typer.confirm("Are you sure you want to reset?")
        if not confirm:
            console.print("[green]Reset cancelled.[/green]")
            return

    # In a real implementation, this would:
    # 1. Clear the current conversation context
    # 2. Reset any active challenges
    # 3. Clear temporary state
    # 4. Optionally create a checkpoint before resetting

    console.print(Panel.fit("[bold green]Session Reset Successfully[/bold green]", border_style="green"))
    console.print("Your learning session has been reset.")
    console.print("You can now start a new learning session.")


if __name__ == "__main__":
    app()
