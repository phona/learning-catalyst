"""
Main CLI application for Learning Catalyst
"""
import typer
from typing_extensions import Annotated
import json
import os
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.prompt import Prompt
from rich.table import Table
from rich import print

app = typer.Typer()


@app.command()
def start_learning(
    workspace_path: str = typer.Argument(".", help="Path to the learning workspace")
):
    """Start the Learning Catalyst application in the specified workspace"""
    import sys
    from src.utils.preferences_manager import PreferencesManager
    from src.ai.service import ModelAbstractionService
    from src.core.catalyst_agent import CatalystAgentImpl
    from src.core.challenge_engine import ChallengeEngineImpl
    from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
    from src.data.database_manager import DatabaseManager
    
    # Initialize the workspace and start the application
    learningspace_path = os.path.join(workspace_path, ".learningspace")
    
    if not os.path.exists(learningspace_path):
        os.makedirs(learningspace_path)
        # Initialize database, preferences, etc.
        print("[bold blue]Created new learning space at:[/bold blue] " + learningspace_path)
    
    # Initialize preferences manager
    prefs_manager = PreferencesManager(workspace_path)
    
    # Check if AI provider is configured, if not, prompt the user
    default_provider = prefs_manager.get_preference('ai.default_provider')
    default_model = prefs_manager.get_preference('ai.default_model')
    
    if not default_provider or not default_model:
        # Welcome message with rich formatting
        console = Console()
        console.print(Panel("[bold green]Welcome to Learning Catalyst![/bold green]", expand=False))
        console.print("[bold yellow]Let's configure your AI provider to get started.[/bold yellow]")
        
        # Prompt for provider
        providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]
        console.print(f"[bold cyan]Available providers:[/bold cyan] {', '.join(providers)}")
        
        while True:
            provider = Prompt.ask("[bold magenta]Which AI provider would you like to use?[/bold magenta]", 
                                 choices=providers, default="openai")
            if provider.lower() in providers:
                prefs_manager.set_preference('ai.default_provider', provider.lower())
                break
            else:
                console.print(f"[red]Invalid provider. Please choose from: {', '.join(providers)}[/red]")
        
        # Prompt for model
        model = Prompt.ask("[bold magenta]Which model would you like to use?[/bold magenta]", default="gpt-4o")
        prefs_manager.set_preference('ai.default_model', model)
        
        # Prompt for API key if required
        if provider.lower() not in ["local"]:
            api_key = Prompt.ask("[bold magenta]Please enter your API key[/bold magenta]", password=True)
            prefs_manager.set_preference(f'ai.{provider.lower()}_api_key', api_key)
        
        console.print(f"[bold green]AI configuration saved:[/bold green] [cyan]{provider} - {model}[/cyan]")
    
    # Launch the main application loop with beautiful formatting
    console = Console()
    console.print(Panel(
        f"[bold green]Starting Learning Catalyst[/bold green]\n"
        f"[cyan]Workspace:[/cyan] {workspace_path}\n"
        f"[cyan]Learningspace:[/cyan] {learningspace_path}",
        title="[bold]🚀 Learning Catalyst[/bold]",
        expand=False
    ))
    
    # Initialize components
    db_path = os.path.join(learningspace_path, "data.db")
    db_manager = DatabaseManager(db_path)
    
    # Initialize model service and agent
    model_service = ModelAbstractionService()
    
    # Note: In a real implementation, we would properly configure the provider with credentials
    # For now, we'll proceed with the configuration
    
    catalyst_agent = CatalystAgentImpl(model_service)
    challenge_engine = ChallengeEngineImpl(catalyst_agent)
    knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
    
    # Print welcome message with rich formatting
    console.print("\n[bold green]🚀 Learning session started![/bold green] [blue]Use /help to see available commands.[/blue]")
    
    # Main interactive loop with slash commands and beautiful UI
    while True:
        try:
            user_input = Prompt.ask("\n[bold yellow]Learning Catalyst[/bold yellow]", default="")
            
            # Handle slash commands
            if user_input.startswith('/'):
                command = user_input[1:].lower().strip()  # Remove the '/' and get the command
                
                if command in ['quit', 'exit', 'q']:
                    console.print("[bold green]Thanks for using Learning Catalyst. Goodbye![/bold green] 👋")
                    break
                elif command == 'help':
                    table = Table(title="Available Slash Commands", show_header=True, header_style="bold magenta")
                    table.add_column("Command", style="cyan", no_wrap=True)
                    table.add_column("Description")
                    
                    table.add_row("/help", "Show this help message")
                    table.add_row("/quit or /exit or /q", "Exit the application")
                    table.add_row("/models", "Show configured AI model")
                    table.add_row("/set-model <model_name>", "Set the AI model to use")
                    table.add_row("/set-provider <provider_name>", "Set the AI provider to use")
                    table.add_row("/concepts", "Show available learning concepts")
                    table.add_row("/reset", "Reset the learning session")
                    
                    console.print(table)
                elif command == 'models':
                    current_provider = prefs_manager.get_preference('ai.default_provider')
                    current_model = prefs_manager.get_preference('ai.default_model')
                    console.print(f"[blue]Current AI configuration:[/blue] [bold]{current_provider}[/bold] - [bold]{current_model}[/bold]")
                elif command.startswith('set-model'):
                    # Extract model name from command
                    parts = command.split(' ', 1)
                    if len(parts) > 1:
                        model_name = parts[1].strip()
                        prefs_manager.set_preference('ai.default_model', model_name)
                        console.print(f"[green]AI model set to:[/green] [bold]{model_name}[/bold]")
                    else:
                        console.print("[red]Usage: /set-model <model_name>[/red]")
                elif command.startswith('set-provider'):
                    # Extract provider name from command
                    parts = command.split(' ', 1)
                    if len(parts) > 1:
                        provider_name = parts[1].strip()
                        # Validate provider
                        valid_providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]
                        if provider_name.lower() in valid_providers:
                            prefs_manager.set_preference('ai.default_provider', provider_name.lower())
                            console.print(f"[green]AI provider set to:[/green] [bold]{provider_name.lower()}[/bold]")
                        else:
                            console.print(f"[red]Invalid provider. Valid providers: {', '.join(valid_providers)}[/red]")
                    else:
                        console.print("[red]Usage: /set-provider <provider_name>[/red]")
                elif command == 'concepts':
                    console.print("[blue]Available concepts would be listed here based on your learning materials.[/blue]")
                    # In real implementation, this would fetch from knowledge navigator
                elif command == 'reset':
                    console.print("[yellow]Session reset. Configuration remains unchanged.[/yellow]")
                else:
                    console.print(f"[red]Unknown command: /{command}. Type /help for available commands.[/red]")
            else:
                # Treat non-slash input as a concept request or general query for the AI
                console.print(f"[blue]Learning request:[/blue] {user_input}")
                console.print("[yellow]In a full implementation, this would connect to your AI model for learning assistance.[/yellow]")
                console.print("[cyan]For now, please use slash commands like /concepts to see available topics or /help for commands.[/cyan]")
        
        except KeyboardInterrupt:
            console.print("\n\n[bold green]Thanks for using Learning Catalyst. Goodbye![/bold green] 👋")
            break
        except Exception as e:
            console.print(f"[red]An error occurred: {e}[/red]")
            continue


@app.command()
def models():
    """List available AI models configured for the application"""
    # Get models from system commands handler
    typer.echo("Available AI models would be listed here")


@app.command()
def tokens(model_name: str = typer.Argument("", help="Optional model name to get detailed usage")):
    """Show token usage statistics"""
    # Display token usage from database
    if model_name:
        typer.echo(f"Getting detailed token usage for model: {model_name}")
    else:
        typer.echo("Getting token usage summary")


@app.command()
def knowledge_map():
    """Display the current knowledge map structure"""
    # Get and display knowledge map
    typer.echo("Knowledge map would be displayed here")


@app.command()
def preference(
    action: str = typer.Argument(..., help="Action: list or set"),
    key: str = typer.Argument("", help="Key for preference (required for set)"),
    value: str = typer.Argument("", help="Value to set (required for set)")
):
    """Manage application preferences using key-value syntax (like npm config)"""
    learningspace_path = os.path.join(os.getcwd(), ".learningspace")
    preferences_path = os.path.join(learningspace_path, "preferences.json")
    
    if action == "list":
        # Read and display all preferences
        if os.path.exists(preferences_path):
            with open(preferences_path, "r") as f:
                preferences = json.load(f)
                typer.echo(json.dumps(preferences, indent=2))
        else:
            typer.echo("No preferences file found. Using defaults.")
    
    elif action == "set":
        if not key or not value:
            typer.echo("Key and value required for set operation")
            raise typer.Exit(code=1)
        
        # Parse value to appropriate type (string, number, boolean, or JSON)
        parsed_value = _parse_value(value)
        
        # Update preferences file at key location
        _update_preferences(preferences_path, key, parsed_value)
    else:
        typer.echo(f"Unknown action: {action}. Use 'list' or 'set'.")


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


def _update_preferences(preferences_path: str, key: str, value):
    """Update preferences file at key location using dot notation (like npm config)"""
    # Ensure the preferences file exists
    if os.path.exists(preferences_path):
        with open(preferences_path, "r") as f:
            preferences = json.load(f)
    else:
        preferences = {}
    
    # Navigate to the parent of the final key using dot notation
    keys = key.split('.')
    current = preferences
    
    # Navigate to the parent of the final key
    for k in keys[:-1]:
        if k not in current:
            current[k] = {}
        current = current[k]
    
    # Set the final value
    final_key = keys[-1]
    current[final_key] = value
    
    # Write back to file
    with open(preferences_path, "w") as f:
        json.dump(preferences, f, indent=2)
    
    typer.echo(f"Preference {key} set to {value}")


if __name__ == "__main__":
    app()