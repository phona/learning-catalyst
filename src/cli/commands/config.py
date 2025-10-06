"""
Config command implementation for Learning Catalyst CLI
"""

import json
import os
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from src.utils.preferences_manager import PreferencesManager

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


def _get_preferences_manager():
    """Get the preferences manager instance"""
    workspace_path = os.getcwd()
    return PreferencesManager(workspace_path)


def _list_config(console):
    """List all configuration settings"""
    console.print(Panel.fit("[bold blue]Current Configuration[/bold blue]", border_style="blue"))

    try:
        prefs_manager = _get_preferences_manager()
        preferences = prefs_manager.list_preferences()

        if not preferences:
            console.print("[yellow]No configuration settings found.[/yellow]")
            return

        # Group preferences by category
        categories = {}
        for key, value in preferences.items():
            category = key.split('.')[0] if '.' in key else 'General'
            if category not in categories:
                categories[category] = []
            categories[category].append((key, value))

        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Key", style="cyan", width=30)
        table.add_column("Value", width=25)
        table.add_column("Category", width=15)

        for category, items in sorted(categories.items()):
            for key, value in items:
                # Format value for display
                if isinstance(value, (dict, list)):
                    display_value = json.dumps(value, indent=2)
                else:
                    display_value = str(value)
                
                # Truncate long values
                if len(display_value) > 50:
                    display_value = display_value[:47] + "..."
                
                table.add_row(key, display_value, category.capitalize())

        console.print(table)
    except Exception as e:
        console.print(f"[red]Error listing configuration: {str(e)}[/red]")


def _get_config(console, key):
    """Get value of specific configuration key"""
    try:
        prefs_manager = _get_preferences_manager()
        value = prefs_manager.get_preference(key)
        
        if value is not None:
            # Format value for display
            if isinstance(value, (dict, list)):
                display_value = json.dumps(value, indent=2)
            else:
                display_value = str(value)
            
            console.print(f"[bold]{key}[/bold]: {display_value}")
        else:
            console.print(f"[yellow]Configuration key '{key}' not found.[/yellow]")
    except Exception as e:
        console.print(f"[red]Error getting configuration: {str(e)}[/red]")


def _set_config(console, key, value):
    """Set configuration key to value"""
    try:
        prefs_manager = _get_preferences_manager()
        
        # Try to parse value as JSON first, then as basic types
        try:
            parsed_value = json.loads(value)
        except json.JSONDecodeError:
            # Try to parse as number
            try:
                if "." in value:
                    parsed_value = float(value)
                else:
                    parsed_value = int(value)
            except ValueError:
                # Check for boolean
                if value.lower() in ("true", "false"):
                    parsed_value = value.lower() == "true"
                else:
                    # Keep as string
                    parsed_value = value

        # Set the preference
        success = prefs_manager.set_preference(key, parsed_value)
        
        if success:
            console.print(Panel.fit("[bold green]Configuration Updated[/bold green]", border_style="green"))
            console.print(f"Set [bold]{key}[/bold] to [bold]{parsed_value}[/bold]")
            console.print("\n[italic]Note: Changes will take effect in new sessions.[/italic]")
        else:
            console.print(f"[red]Failed to set configuration key '{key}'[/red]")
    except Exception as e:
        console.print(f"[red]Error setting configuration: {str(e)}[/red]")


if __name__ == "__main__":
    app()
