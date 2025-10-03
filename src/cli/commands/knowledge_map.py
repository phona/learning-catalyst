"""
Knowledge map command implementation
"""
import typer
from typing_extensions import Annotated
import json
import os
from pathlib import Path
from rich.console import Console
from rich.table import Table
import asyncio
from data.database_manager import DatabaseManager
from ai.service import ModelAbstractionService
from utils.preferences_manager import PreferencesManager
from cli.system_commands_handler import SystemCommandsHandlerImpl

app = typer.Typer()


@app.command()
def knowledge_map():
    """Display the current knowledge map structure"""
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
    knowledge_map_result = asyncio.run(system_handler.get_knowledge_map())
    
    if knowledge_map_result:
        console.print("[blue]🗺️  Knowledge Map:[/blue]")
        
        if hasattr(knowledge_map_result, 'concepts') and knowledge_map_result.concepts:
            console.print("  [bold]Concepts:[/bold]")
            for i, concept in enumerate(knowledge_map_result.concepts, 1):
                console.print(f"    [cyan]{i}. {concept.get('title', 'N/A')}[/cyan] (ID: {concept.get('id', 'N/A')})")
            
            if hasattr(knowledge_map_result, 'relationships') and knowledge_map_result.relationships:
                console.print("\n  [bold]Relationships:[/bold]")
                for relationship in knowledge_map_result.relationships:
                    console.print(f"    [magenta]{relationship.get('from', 'N/A')}[/magenta] → [magenta]{relationship.get('to', 'N/A')}[/magenta]")
        else:
            console.print("  [yellow]No knowledge map available. Add learning materials to your workspace.[/yellow]")
    else:
        console.print("[yellow]Knowledge map would be displayed here[/yellow]")