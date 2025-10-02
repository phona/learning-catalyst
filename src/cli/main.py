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
        console.print(Panel.fit("🎓 [bold green]Welcome to Learning Catalyst![/bold green] 🚀", 
                               border_style="green", padding=(1, 1)))
        console.print("[bold yellow]Let's configure your AI provider to get started.[/bold yellow]")
        console.print("\n[bold]Supported providers:[/bold]")
        providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]
        
        # Show provider descriptions to guide user
        provider_descriptions = {
            "openai": "OpenAI (GPT models) - Great for general knowledge",
            "anthropic": "Anthropic (Claude models) - Good for nuanced understanding",
            "chatglm": "Zhipu AI (ChatGLM) - Chinese language models, good for multilingual content",
            "siliconflow": "SiliconFlow - Optimized for speed",
            "deepseek": "DeepSeek - Cost-effective option",
            "local": "Local models - Privacy focused, requires local setup"
        }
        
        for provider in providers:
            desc = provider_descriptions.get(provider, f"{provider.title()} provider")
            console.print(f"  [cyan]• {provider}[/cyan]: {desc}")
        
        # Prompt for provider with guidance
        console.print("\n[bold magenta]Choose your AI provider:[/bold magenta]")
        while True:
            provider = Prompt.ask("  [magenta]>[/magenta] ", choices=providers, show_choices=False)
            if provider.lower() in providers:
                prefs_manager.set_preference('ai.default_provider', provider.lower())
                break
            else:
                console.print(f"[red]Invalid provider. Please choose from: {', '.join(providers)}[/red]")
        
        # Prompt for model with guidance
        console.print(f"\n[bold magenta]Enter the model name for {provider} (e.g., gpt-4o, claude-3-opus):[/bold magenta]")
        model = Prompt.ask("  [magenta]>[/magenta] ")
        prefs_manager.set_preference('ai.default_model', model)
        
        # Prompt for API key if required
        if provider.lower() not in ["local"]:
            console.print(f"\n[bold magenta]Enter your {provider} API key:[/bold magenta]")
            console.print("  [yellow]Note: This is stored locally and only used for API calls[/yellow]")
            api_key = Prompt.ask("  [magenta]>[/magenta] ", password=True)
            prefs_manager.set_preference(f'ai.{provider.lower()}_api_key', api_key)
        
        console.print(f"\n[bold green]✅ AI configuration saved:[/bold green] [cyan]{provider} - {model}[/cyan]")
        console.print("[green]You're now ready to start learning![/green]")
    else:
        # If already configured, welcome back
        current_provider = prefs_manager.get_preference('ai.default_provider')
        current_model = prefs_manager.get_preference('ai.default_model')
        console = Console()
        console.print(Panel.fit(f"🎓 [bold green]Welcome back to Learning Catalyst![/bold green] 🚀", 
                               border_style="blue", padding=(1, 1)))
        console.print(f"[green]Using AI configuration:[/green] [cyan]{current_provider} - {current_model}[/cyan]")
        console.print("[yellow]Type /help to see available commands.[/yellow]")
    
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
    
    import readline  # For input editing shortcuts like Ctrl+W
    import sys
    
    # Initialize readline for enhanced input editing capabilities
    # This enables common shortcuts like Ctrl+W to remove a word
    try:
        # Try to enable readline features if available
        import rlcompleter
        if 'libedit' in readline.__doc__:
            readline.parse_and_bind("bind ^W ed-delete-prev-word")  # For libedit (macOS)
            readline.parse_and_bind("bind ^U ed-kill-line")        # Clear line
        else:
            readline.parse_and_bind("Control-w: unix-word-rubout")  # For GNU readline
            readline.parse_and_bind("Control-u: unix-line-discard") # Clear line
    except:
        # If readline is not available, continue without enhanced shortcuts
        pass
    
    # Show initial guidance message
    console.print("\n[bold blue]💡 Tip:[/bold blue] [cyan]Type /help to see all available commands[/cyan]")
    console.print("[bold blue]💡 Tip:[/bold blue] [cyan]Start with /concepts to see available learning materials[/cyan]")
    
    # Custom input handler for the interactive loop
    def custom_input_handler():
        try:
            # Print the prompt with rich formatting, then get input without formatting
            console.print("[bold yellow]Learning Catalyst[/bold yellow]", end="", style="yellow")
            user_input = input("> ")
            return user_input
        except KeyboardInterrupt:
            # For Ctrl+C, just return empty input to show a new prompt
            console.print()  # Go to new line without extra text
            return None
        except EOFError:
            # For Ctrl+D, return special value to indicate exit
            return "EOF"
    
    # Main interactive loop with slash commands and beautiful UI
    while True:
        user_input = custom_input_handler()
        
        # Handle EOF (Ctrl+D)
        if user_input == "EOF":
            console.print("\n\n[bold green]Thanks for using Learning Catalyst. Goodbye![/bold green] 👋")
            break
        
        # Handle Ctrl+C (returned None)
        if user_input is None:
            continue
            
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
                
                table.add_row("/help", "Show this help message (you're here!)")
                table.add_row("/concepts", "Show available learning concepts [bold green][RECOMMENDED START][/bold green]")
                table.add_row("/config", "Show current AI configuration")
                table.add_row("/set-config", "Set AI provider and model")
                table.add_row("/reset", "Reset the learning session")
                table.add_row("/quit or /exit or /q", "Exit the application")
                
                console.print(table)
                console.print("\n[bold blue]💡 Getting Started:[/bold blue]")
                console.print("  1. Use [bold]/concepts[/bold] to see available learning materials")
                console.print("  2. Select a concept to begin learning")
                console.print("  3. Answer questions to test your understanding")
            elif command == 'config':
                current_provider = prefs_manager.get_preference('ai.default_provider')
                current_model = prefs_manager.get_preference('ai.default_model')
                if current_provider and current_model:
                    console.print(f"[blue]Current AI configuration:[/blue] [bold]{current_provider}[/bold] - [bold]{current_model}[/bold]")
                    console.print("[green]Configuration is set and ready to use.[/green]")
                else:
                    console.print("[red]No AI configuration set. Use /set-config to configure.[/red]")
            elif command == 'set-config':
                # Prompt for provider
                providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]
                provider = Prompt.ask(f"[bold magenta]Which AI provider?[/bold magenta] ({'/'.join(providers)})", 
                                     choices=providers)
                prefs_manager.set_preference('ai.default_provider', provider.lower())
                
                # Prompt for model
                model = Prompt.ask("[bold magenta]Which model would you like to use?[/bold magenta]")
                prefs_manager.set_preference('ai.default_model', model)
                
                # Prompt for API key if required
                if provider.lower() not in ["local"]:
                    api_key = Prompt.ask("[bold magenta]Please enter your API key[/bold magenta]", password=True)
                    prefs_manager.set_preference(f'ai.{provider.lower()}_api_key', api_key)
                
                console.print(f"[green]✅ AI configuration updated:[/green] [cyan]{provider} - {model}[/cyan]")
                console.print("[green]You're now ready to continue learning![/green]")
                console.print("[bold blue]💡 Next Steps:[/bold blue]")
                console.print("  • Use [bold]/concepts[/bold] to explore available learning materials")
                console.print("  • Try [bold]/help[/bold] to see all available commands")
            elif command == 'concepts':
                console.print("[blue]📚 Available learning concepts:[/blue]")
                # In real implementation, this would fetch from knowledge navigator
                console.print("  [yellow]• Data Structures[/yellow]")
                console.print("  [yellow]• Algorithms[/yellow]")
                console.print("  [yellow]• Machine Learning Fundamentals[/yellow]")
                console.print("  [yellow]• Python Programming[/yellow]")
                console.print("\n[i]Select a concept to start learning![/i]")
            elif command == 'reset':
                console.print("[yellow]Session reset. Configuration remains unchanged.[/yellow]")
                console.print("[green]You can continue learning with your current settings.[/green]")
            else:
                console.print(f"[red]Unknown command: /{command}. Type /help for available commands.[/red]")
                console.print("[bold blue]💡 Tip:[/bold blue] [cyan]Check /help for a list of available commands[/cyan]")
        else:
            # Treat non-slash input as a concept request or general query for the AI
            if user_input.strip() == "":
                # If user just pressed enter with empty input, show helpful message
                console.print("[bold blue]💡 Tip:[/bold blue] [cyan]Type a concept name or use /help for commands[/cyan]")
            else:
                console.print(f"[blue]Learning request:[/blue] {user_input}")
                console.print("[yellow]In a full implementation, this would connect to your AI model for learning assistance.[/yellow]")
                console.print("[cyan]For now, please use slash commands like /concepts to see available topics or /help for commands.[/cyan]")


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