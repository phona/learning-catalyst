"""
Models command implementation
"""
import asyncio
import os

import typer
from rich.console import Console
from rich.table import Table

from ai.service import ModelAbstractionService
from cli.system_commands_handler import SystemCommandsHandlerImpl
from data.database_manager import DatabaseManager
from utils.preferences_manager import PreferencesManager

app = typer.Typer()


@app.command()
def models():
    """List available AI models configured for the application"""
    workspace_path = os.getcwd()
    learningspace_path = os.path.join(workspace_path, ".catalyst")
    db_path = os.path.join(learningspace_path, "data.db")

    # Initialize necessary components
    db_manager = DatabaseManager(db_path)
    model_service = ModelAbstractionService()
    prefs_manager = PreferencesManager(workspace_path)

    # Note: Providers and models are configured by the user during first-time setup
    # The model service will be set up with the user's preferred configuration

    # Create system commands handler and get models
    system_handler = SystemCommandsHandlerImpl(db_manager, model_service, prefs_manager)

    # Using asyncio to run the async method
    available_models = asyncio.run(system_handler.list_available_models())

    console = Console()
    if available_models:
        console.print("[blue]📋 Available AI Models:[/blue]")
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Provider", style="cyan", no_wrap=True)
        table.add_column("Model", style="magenta")
        table.add_column("Description", style="green")

        for model in available_models:
            table.add_row(model['provider'], model['model'], model.get('description', ''))
        console.print(table)
    else:
        console.print("[yellow]No models configured. Please set up your AI provider first.[/yellow]")
