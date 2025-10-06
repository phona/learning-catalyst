"""
Checkpoint command implementation
"""

import asyncio
import os
from datetime import datetime

import typer
from rich.console import Console
from rich.table import Table

from core.state_manager import ApplicationState, StateManager

app = typer.Typer()


@app.command()
def checkpoint(
    action: str = typer.Argument(..., help="Action: save, load, or list"),
    name: str = typer.Argument("", help="Checkpoint name (required for save/load)"),
    description: str = typer.Option("", "--description", "-d", help="Description for the checkpoint"),
):
    """Manage application checkpoints for saving and restoring learning states"""
    workspace_path = os.getcwd()

    # Initialize necessary components
    state_manager = StateManager(workspace_path)

    # Note: Checkpoint functionality doesn't directly use the model service
    # But if it did, providers and models would be configured by the user during first-time setup

    console = Console()

    if action == "list":
        # List all checkpoints
        try:
            checkpoints = asyncio.run(state_manager.list_checkpoints())
            if checkpoints:
                console.print("[blue]💾 Available Checkpoints:[/blue]")
                table = Table(show_header=True, header_style="bold magenta")
                table.add_column("ID", style="cyan", no_wrap=True)
                table.add_column("Created At", style="magenta")
                table.add_column("Description", style="green")

                for checkpoint in checkpoints:
                    # Format the datetime for better readability
                    created_at = datetime.fromisoformat(checkpoint.created_at).strftime("%Y-%m-%d %H:%M:%S")
                    table.add_row(checkpoint.id, created_at, checkpoint.description)
                console.print(table)
            else:
                console.print("[yellow]No checkpoints found.[/yellow]")
        except Exception as e:
            console.print(f"[red]❌ Error listing checkpoints: {str(e)}[/red]")
            raise typer.Exit(code=1)

    elif action == "save":
        if not name:
            console.print("[red]❌ Checkpoint name required for save operation[/red]")
            raise typer.Exit(code=1)

        # Create proper ApplicationState object
        state = ApplicationState(
            user_profile={"user_id": "default_user"},
            conversation_context={},
            conversation_messages=[],
            current_state_metadata={
                "user_id": "default_user",
                "timestamp": datetime.now().isoformat(),
                "checkpoint_name": name,
            },
        )

        try:
            # Save the checkpoint
            checkpoint = asyncio.run(state_manager.create_checkpoint(state, description or name))
            console.print(f"[green]✅ Checkpoint '{name}' saved successfully with ID: {checkpoint.id}[/green]")
        except Exception as e:
            console.print(f"[red]❌ Error saving checkpoint: {str(e)}[/red]")
            raise typer.Exit(code=1)

    elif action == "load":
        if not name:
            console.print("[red]❌ Checkpoint name required for load operation[/red]")
            raise typer.Exit(code=1)

        try:
            # Load the checkpoint
            state = asyncio.run(state_manager.load_checkpoint(name))
            if state:
                console.print(f"[green]✅ Checkpoint '{name}' loaded successfully[/green]")
                # In a real implementation, this would restore the application state
            else:
                console.print(f"[red]❌ Checkpoint '{name}' not found or could not be loaded[/red]")
                raise typer.Exit(code=1)
        except FileNotFoundError:
            console.print(f"[red]❌ Checkpoint '{name}' not found[/red]")
            raise typer.Exit(code=1)
        except Exception as e:
            console.print(f"[red]❌ Error loading checkpoint: {str(e)}[/red]")
            raise typer.Exit(code=1)

    else:
        console.print(f"[red]Unknown action: {action}. Use 'save', 'load', or 'list'.[/red]")
        raise typer.Exit(code=1)
