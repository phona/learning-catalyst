"""
Preference command implementation
"""
import typer
import json
import os
from pathlib import Path
from rich.console import Console
import asyncio
from data.database_manager import DatabaseManager
from ai.service import ModelAbstractionService
from utils.preferences_manager import PreferencesManager
from cli.system_commands_handler import SystemCommandsHandlerImpl

app = typer.Typer()


def _parse_value(value: str):
    """Parse string value to appropriate Python type (string, number, boolean, or JSON)"""
    # Try to parse as JSON first
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        pass
    
    # Try to parse as number
    try:
        if '.' in value:
            return float(value)
        else:
            return int(value)
    except ValueError:
        pass
    
    # Check for boolean values
    if value.lower() in ('true', 'false'):
        return value.lower() == 'true'
    
    # Return as string
    return value


@app.command()
def preference(
    action: str = typer.Argument(..., help="Action: list or set"),
    key: str = typer.Argument("", help="Key for preference (required for set)"),
    value: str = typer.Argument("", help="Value to set (required for set)")
):
    """Manage application preferences using key-value syntax (like npm config)"""
    workspace_path = os.getcwd()
    learningspace_path = os.path.join(workspace_path, ".learningspace")
    db_path = os.path.join(learningspace_path, "data.db")
    
    # Initialize necessary components
    db_manager = DatabaseManager(db_path)
    model_service = ModelAbstractionService()
    prefs_manager = PreferencesManager(workspace_path)
    
    # Create system commands handler
    system_handler = SystemCommandsHandlerImpl(db_manager, model_service, prefs_manager)
    
    # Using asyncio to run the async method
    console = Console()
    
    if action == "list":
        # List all preferences
        preferences = asyncio.run(system_handler.list_preferences())
        console.print("[blue]📋 Current Preferences:[/blue]")
        console.print_json(data=preferences)
    
    elif action == "set":
        if not key or not value:
            console.print("[red]Key and value required for set operation[/red]")
            raise typer.Exit(code=1)
        
        # Parse value to appropriate type (string, number, boolean, or JSON)
        parsed_value = _parse_value(value)
        
        # Set the preference
        success = asyncio.run(system_handler.set_preference(key, parsed_value))
        
        if success:
            console.print(f"[green]✅ Preference {key} set to {parsed_value}[/green]")
        else:
            console.print(f"[red]❌ Failed to set preference {key}[/red]")
    else:
        console.print(f"[red]Unknown action: {action}. Use 'list' or 'set'.[/red]")