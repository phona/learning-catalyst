"""
Start learning command implementation
"""

import os

import typer

app = typer.Typer()


@app.command()
def start_learning(workspace_path: str = typer.Argument(".", help="Path to the learning workspace")):
    """Start the Learning Catalyst application in the specified workspace"""
    # Initialize the workspace and start the application
    learningspace_path = os.path.join(workspace_path, ".catalyst")

    if not os.path.exists(learningspace_path):
        os.makedirs(learningspace_path)
        # Initialize database, preferences, etc.
        typer.echo(f"Created new learning space at: {learningspace_path}")

    # Launch the main application loop
    typer.echo(f"Starting Learning Catalyst in workspace: {workspace_path}")
    typer.echo(f"Learningspace directory: {learningspace_path}")

    # In a real implementation, this would start the interactive learning session
    typer.echo("Learning session started. Use /help for available commands.")
