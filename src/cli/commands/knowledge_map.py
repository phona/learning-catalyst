"""
Knowledge map command implementation
"""

import asyncio
import os

import typer
from rich.console import Console

from src.ai.service import ModelAbstractionService
from src.cli.system_commands_handler import SystemCommandsHandlerImpl
from src.data.database_manager import DatabaseManager
from src.utils.preferences_manager import PreferencesManager

app = typer.Typer()


@app.command()
def knowledge_map():
    """Display the current knowledge map structure"""
    workspace_path = os.getcwd()
    learningspace_path = os.path.join(workspace_path, ".catalyst")
    db_path = os.path.join(learningspace_path, "data.db")

    # Initialize necessary components
    db_manager = DatabaseManager(db_path)
    model_service = ModelAbstractionService()
    prefs_manager = PreferencesManager(workspace_path)

    # Note: Providers and models are configured by the user during first-time setup
    # The model service will be set up with the user's preferred configuration

    # Create system commands handler
    system_handler = SystemCommandsHandlerImpl(db_manager, model_service, prefs_manager)

    # Using asyncio to run the async method
    console = Console()
    knowledge_map_result = asyncio.run(system_handler.get_knowledge_map())

    if knowledge_map_result:
        console.print("[blue]🗺️  Knowledge Map:[/blue]")

        if hasattr(knowledge_map_result, "concepts") and knowledge_map_result.concepts:
            console.print("  [bold]Concepts:[/bold]")
            for i, concept in enumerate(knowledge_map_result.concepts, 1):
                console.print(f"    [cyan]{i}. {concept.get('title', 'N/A')}[/cyan] (ID: {concept.get('id', 'N/A')})")

            if hasattr(knowledge_map_result, "relationships") and knowledge_map_result.relationships:
                console.print("\n  [bold]Relationships:[/bold]")
                for relationship in knowledge_map_result.relationships:
                    console.print(
                        f"    [magenta]{relationship.get('from', 'N/A')}[/magenta] → "
                        f"[magenta]{relationship.get('to', 'N/A')}[/magenta]"
                    )
        else:
            console.print("  [yellow]No knowledge map available. Add learning materials to your workspace.[/yellow]")
    else:
        console.print("[yellow]Knowledge map would be displayed here[/yellow]")
