"""
Main CLI application for Learning Catalyst
"""
import typer
from typing_extensions import Annotated
import json
import os
from pathlib import Path

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
        typer.echo(f"Created new learning space at: {learningspace_path}")
    
    # Initialize preferences manager
    prefs_manager = PreferencesManager(workspace_path)
    
    # Check if AI provider is configured, if not, prompt the user
    default_provider = prefs_manager.get_preference('ai.default_provider')
    default_model = prefs_manager.get_preference('ai.default_model')
    
    if not default_provider or not default_model:
        typer.echo("Welcome to Learning Catalyst!")
        typer.echo("Let's configure your AI provider to get started.")
        
        # Prompt for provider
        providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]
        typer.echo(f"Available providers: {', '.join(providers)}")
        
        while True:
            provider = typer.prompt("Which AI provider would you like to use?", type=str)
            if provider.lower() in providers:
                prefs_manager.set_preference('ai.default_provider', provider.lower())
                break
            else:
                typer.echo(f"Invalid provider. Please choose from: {', '.join(providers)}")
        
        # Prompt for model
        model = typer.prompt("Which model would you like to use?", type=str)
        prefs_manager.set_preference('ai.default_model', model)
        
        # Prompt for API key if required
        if provider.lower() not in ["local"]:
            api_key = typer.prompt("Please enter your API key", type=str, hide_input=True)
            prefs_manager.set_preference(f'ai.{provider.lower()}_api_key', api_key)
        
        typer.echo(f"AI configuration saved: {provider} - {model}")
    
    # Launch the main application loop
    typer.echo(f"Starting Learning Catalyst in workspace: {workspace_path}")
    typer.echo(f"Learningspace directory: {learningspace_path}")
    
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
    
    typer.echo("Learning session started. Type 'help' for available commands or 'quit' to exit.")
    
    # Main interactive loop
    while True:
        try:
            user_input = typer.prompt("\nLearning Catalyst", prompt_suffix="> ")
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                typer.echo("Thanks for using Learning Catalyst. Goodbye!")
                break
            elif user_input.lower() == 'help':
                typer.echo("\nAvailable commands:")
                typer.echo("  help - Show this help message")
                typer.echo("  quit/exit/q - Exit the application")
                typer.echo("  models - Show configured AI model")
                typer.echo("  concepts - Show available learning concepts")
                typer.echo("  [concept_name] - Start learning a specific concept")
            elif user_input.lower() == 'models':
                current_provider = prefs_manager.get_preference('ai.default_provider')
                current_model = prefs_manager.get_preference('ai.default_model')
                typer.echo(f"Current AI configuration: {current_provider} - {current_model}")
            elif user_input.lower() == 'concepts':
                typer.echo("Available concepts would be listed here based on your learning materials.")
                # In real implementation, this would fetch from knowledge navigator
            else:
                # Treat any other input as a concept request or general query
                typer.echo(f"Request received: {user_input}")
                typer.echo("In a full implementation, this would connect to your AI model for learning assistance.")
                typer.echo("For now, please use 'concepts' to see available topics or 'help' for commands.")
        
        except KeyboardInterrupt:
            typer.echo("\n\nThanks for using Learning Catalyst. Goodbye!")
            break
        except Exception as e:
            typer.echo(f"An error occurred: {e}")
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