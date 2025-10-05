"""
Config command implementation for Learning Catalyst CLI
"""
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

app = typer.Typer()


@app.command()
def config(
    list_config: bool = typer.Option(False, "--list", "-l", help="List all configuration settings"),
    get_key: Optional[str] = typer.Option(None, "--get", "-g", help="Get value of specific configuration key"),
    set_key: Optional[str] = typer.Option(None, "--set", "-s", help="Set configuration key"),
    value: Optional[str] = typer.Option(None, "--value", "-v", help="Value to set for the key"),
):
    """Manage application configuration"""
    console = Console()

    if list_config:
        _list_config(console)
    elif get_key:
        _get_config(console, get_key)
    elif set_key and value:
        _set_config(console, set_key, value)
    else:
        console.print("[red]Invalid usage. Use --help for more information.[/red]")


def _list_config(console):
    """List all configuration settings"""
    console.print(Panel.fit("[bold blue]Current Configuration[/bold blue]",
                           border_style="blue"))

    # In a real implementation, this would fetch from the preferences manager
    # For now, showing sample data
    sample_config = [
        ("ai.default_provider", "openai", "AI"),
        ("ai.default_model", "gpt-4", "AI"),
        ("ui.theme", "dark", "UI"),
        ("learning.difficulty", "adaptive", "Learning"),
        ("features.autosave", "true", "Features"),
    ]

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Key", style="cyan", width=25)
    table.add_column("Value", width=20)
    table.add_column("Category", width=15)

    for key, val, category in sample_config:
        table.add_row(key, val, category)

    console.print(table)


def _get_config(console, key):
    """Get value of specific configuration key"""
    # In a real implementation, this would fetch from the preferences manager
    sample_values = {
        "ai.default_provider": "openai",
        "ai.default_model": "gpt-4",
        "ui.theme": "dark",
        "learning.difficulty": "adaptive",
        "features.autosave": "true",
    }

    if key in sample_values:
        console.print(f"[bold]{key}[/bold]: {sample_values[key]}")
    else:
        console.print(f"[yellow]Configuration key '{key}' not found.[/yellow]")


def _set_config(console, key, value):
    """Set configuration key to value"""
    # In a real implementation, this would update through the preferences manager
    console.print(Panel.fit("[bold green]Configuration Updated[/bold green]",
                           border_style="green"))
    console.print(f"Set [bold]{key}[/bold] to [bold]{value}[/bold]")

    # Show confirmation
    console.print("\n[italic]Note: Changes will take effect in new sessions.[/italic]")


if __name__ == "__main__":
    app()
