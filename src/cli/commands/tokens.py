"""
Tokens command implementation
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
def tokens(model_name: str = typer.Argument("", help="Optional model name to get detailed usage")):
    """Show token usage statistics"""
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
    
    if model_name:
        # Get detailed usage for specific model
        detailed_usage = asyncio.run(system_handler.get_detailed_token_usage(model_name))
        
        console.print(f"[blue]📊 Detailed Token Usage for {model_name}:[/blue]")
        if detailed_usage:
            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Timestamp", style="cyan", no_wrap=True)
            table.add_column("Input Tokens", style="green")
            table.add_column("Output Tokens", style="green")
            table.add_column("Context", style="magenta")
            
            for record in detailed_usage:
                table.add_row(
                    record['timestamp'],
                    str(record['input_tokens']),
                    str(record['output_tokens']),
                    record.get('context', 'N/A')
                )
            console.print(table)
        else:
            console.print(f"[yellow]No detailed usage records found for model: {model_name}[/yellow]")
    else:
        # Get summary usage
        token_usage = asyncio.run(system_handler.get_token_usage())
        
        console.print("[blue]📊 Token Usage Summary:[/blue]")
        console.print(f"  [cyan]Total Tokens (Last 30 days):[/cyan] {token_usage.get('total_tokens', 0)}")
        console.print(f"  [cyan]Input Tokens: {token_usage.get('input_tokens', 0)}[/cyan]")
        console.print(f"  [cyan]Output Tokens: {token_usage.get('output_tokens', 0)}[/cyan]")