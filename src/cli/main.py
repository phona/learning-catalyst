"""
Main CLI application for Learning Catalyst
"""

import asyncio
import os
from datetime import datetime

import typer
from rich import print
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

app = typer.Typer()


def main_callback(ctx: typer.Context):
    """Callback to handle when no command is provided"""
    # If no command is provided, default to start-learning with current directory
    if ctx.invoked_subcommand is None:
        # Call start_learning with current directory
        start_learning(".")
        raise typer.Exit()


# Add the callback to the app
app.callback(invoke_without_command=True)(main_callback)


@app.command()
def start_learning(workspace_path: str = typer.Argument(".", help="Path to the learning workspace")):
    """Start the Learning Catalyst application in the specified workspace"""
    from src.ai.service import ModelAbstractionService
    from src.core.catalyst_agent import CatalystAgentImpl
    from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
    from src.core.state_manager import StateManager
    from src.core.startup_guide import StartupGuide
    from src.utils.preferences_manager import PreferencesManager

    # Initialize the workspace and start the application
    learningspace_path = os.path.join(workspace_path, ".catalyst")
    is_first_time = not os.path.exists(learningspace_path)

    if is_first_time:
        os.makedirs(learningspace_path)
        # Initialize database, preferences, etc.
        print("[bold blue]Created new learning space at:[/bold blue] " + learningspace_path)

    # Initialize core components
    db_path = os.path.join(learningspace_path, "data.db")
    knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
    state_manager = StateManager(workspace_path)
    startup_guide = StartupGuide(workspace_path, knowledge_navigator, state_manager)

    # Initialize preferences manager
    prefs_manager = PreferencesManager(workspace_path)

    # Check if AI provider is configured, if not, prompt the user
    default_provider = prefs_manager.get_preference("ai.default_provider")
    default_model = prefs_manager.get_preference("ai.default_model")

    # Check if there's a previous state
    has_previous_state = False
    try:
        previous_state = asyncio.run(state_manager.load_last_state())
        has_previous_state = previous_state is not None
    except Exception:
        has_previous_state = False

    # Display context-aware startup message
    console = Console()
    startup_message = asyncio.run(startup_guide.generate_startup_message(is_first_time, has_previous_state))
    console.print(
        Panel.fit(
            startup_message,
            title="🎓 Learning Catalyst 🚀",
            border_style="green" if is_first_time else "blue",
            padding=(1, 2),
        )
    )

    # If AI provider is not configured, prompt the user
    if not default_provider or not default_model:
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
            "local": "Local models - Privacy focused, requires local setup",
        }

        for provider in providers:
            desc = provider_descriptions.get(provider, f"{provider.title()} provider")
            console.print(f"  [cyan]• {provider}[/cyan]: {desc}")

        # Helper function for safe input that handles backspace properly
        def safe_input(prompt_text):
            """Safe input function that handles backspace properly"""
            try:
                # Use built-in input which works better with readline
                return input(prompt_text + " ").strip()
            except KeyboardInterrupt:
                console.print("\n[yellow]Setup cancelled. Exiting...[/yellow]")
                raise SystemExit(1)
            except EOFError:
                return ""

        # Prompt for provider with guidance
        console.print("\n[bold magenta]Choose your AI provider:[/bold magenta]")
        while True:
            try:
                provider_input = safe_input("  [magenta]>[/magenta]")
                if provider_input.lower() in providers:
                    provider = provider_input.lower()
                    prefs_manager.set_preference("ai.default_provider", provider)
                    break
                else:
                    console.print(f"[red]Invalid provider. Please choose from: {', '.join(providers)}[/red]")
            except (KeyboardInterrupt, SystemExit):
                raise

        # Prompt for model with guidance
        console.print(
            f"\n[bold magenta]Enter the model name for {provider}" f" (e.g., gpt-4o, claude-3-opus):[/bold magenta]"
        )
        try:
            model = safe_input("  [magenta]>[/magenta]")
            prefs_manager.set_preference("ai.default_model", model)
        except (KeyboardInterrupt, SystemExit):
            raise

        # Prompt for API key if required
        if provider.lower() not in ["local"]:
            console.print(f"\n[bold magenta]Enter your {provider} API key:[/bold magenta]")
            console.print("  [yellow]Note: This is stored locally and only used for API calls[/yellow]")
            try:
                api_key = safe_input("  [magenta]>[/magenta]")
                if api_key:
                    prefs_manager.set_preference(f"ai.{provider}_api_key", api_key)
                    console.print(f"  [green]✅ API key saved for {provider}[/green]")
            except (KeyboardInterrupt, SystemExit):
                raise

        console.print(f"\n[bold green]✅ AI configuration saved:[/bold green] [cyan]{provider} - {model}[/cyan]")
        console.print("[green]You're now ready to start learning![/green]")

    # Get user profile for contextual suggestions
    user_profile = {
        "ai_config": {
            "default_provider": prefs_manager.get_preference("ai.default_provider"),
            "default_model": prefs_manager.get_preference("ai.default_model"),
        },
        "learning_style": prefs_manager.get_preference("learning.style") or "intermediate",
    }

    # Generate and display contextual suggestions
    try:
        suggestions = asyncio.run(startup_guide.get_contextual_suggestions(user_profile))
        if suggestions:
            console.print("\n[bold blue]💡 Suggestions for you:[/bold blue]")
            for i, suggestion in enumerate(suggestions, 1):
                console.print(f"\n[cyan]{i}. {suggestion['title']}[/cyan]")
                console.print(f"   {suggestion['description']}")
                console.print(f"   [green]Command: {suggestion['command']}[/green]")
    except Exception as e:
        console.print(f"[yellow]Note: Could not load suggestions: {str(e)}[/yellow]")

    # Launch the main application loop with beautiful formatting
    console = Console()
    console.print(
        Panel(
            f"[bold green]Starting Learning Catalyst[/bold green]\n"
            f"[cyan]Workspace:[/cyan] {workspace_path}\n"
            f"[cyan]Learningspace:[/cyan] {learningspace_path}",
            title="[bold]🚀 Learning Catalyst[/bold]",
            expand=False,
        )
    )

    # Initialize components
    db_path = os.path.join(learningspace_path, "data.db")

    # Initialize model service and agent
    model_service = ModelAbstractionService()

    # Note: Providers and models will be configured by the user during first-time setup
    # The model service will be set up with the user's preferred configuration

    knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
    catalyst_agent = CatalystAgentImpl(model_service, knowledge_navigator=knowledge_navigator)

    # Load content from user's workspace (all markdown files)
    try:
        # Load all content from the workspace directory
        asyncio.run(knowledge_navigator.load_content(workspace_path=workspace_path))
    except Exception as e:
        print(f"[yellow]Warning: Could not load content from workspace {workspace_path}: {str(e)}[/yellow]")

    # Print welcome message with rich formatting
    console.print(
        "\n[bold green]🚀 Learning session started![/bold green] " "[blue]Use /help to see available commands.[/blue]"
    )

    import readline  # For input editing shortcuts like Ctrl+W

    # Initialize readline for enhanced input editing capabilities
    # This enables common shortcuts like Ctrl+W to remove a word
    try:
        # Try to enable readline features if available
        if "libedit" in str(readline.__doc__):
            readline.parse_and_bind("bind ^W ed-delete-prev-word")  # For libedit (macOS)
            readline.parse_and_bind("bind ^U ed-kill-line")  # Clear line
            # Configure arrow keys for history navigation
            readline.parse_and_bind("bind ^[OA history-search-backward")  # Up arrow
            readline.parse_and_bind("bind ^[OB history-search-forward")   # Down arrow
        else:
            readline.parse_and_bind("Control-w: unix-word-rubout")  # For GNU readline
            readline.parse_and_bind("Control-u: unix-line-discard")  # Clear line
            # Configure arrow keys for history navigation
            readline.parse_and_bind("\\e[A: history-search-backward")  # Up arrow
            readline.parse_and_bind("\\e[B: history-search-forward")   # Down arrow
    except (ImportError, AttributeError):
        # If readline is not available or has issues, continue without enhanced shortcuts
        pass

    # Show initial guidance message
    console.print("\n[bold blue]💡 Tip:[/bold blue] [cyan]Type /help to see all available commands[/cyan]")
    console.print(
        "[bold blue]💡 Tip:[/bold blue] [cyan]Start with /concepts to see available learning materials[/cyan]"
    )

    # Initialize command palette and autocomplete
    from src.cli.command_palette import CommandPalette
    from src.cli.interface import CLIInterfaceImpl
    from src.cli.autocomplete import AutoCompleter

    cli_interface = CLIInterfaceImpl()
    command_palette = CommandPalette(cli_interface)

    # Add workspace path to command palette context
    command_palette.context["workspace_path"] = workspace_path
    
    # Initialize and setup autocomplete
    try:
        completer = AutoCompleter(command_palette, workspace_path)
        completer.setup_readline_completion()
    except Exception as e:
        # If autocomplete setup fails, continue without it
        console.print(f"[yellow]Warning: Could not setup autocomplete: {str(e)}[/yellow]")

    # Initialize readline history
    import atexit

    history_file = os.path.join(learningspace_path, ".history")

    try:
        # Load previous command history
        readline.read_history_file(history_file)
    except FileNotFoundError:
        # If history file doesn't exist, initialize with empty history
        readline.write_history_file(history_file)

    # Set history length
    readline.set_history_length(1000)

    # Register to save history at exit
    atexit.register(readline.write_history_file, history_file)

    # Custom input handler for the interactive loop with autocomplete support
    def custom_input_handler():
        try:
            # Use a standard input with plain text prompt to ensure readline works properly
            # This fixes the issue where the prompt disappears when using arrow keys
            # for history navigation
            user_input = input("Learning Catalyst > ")
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
            # Save current state before exiting
            try:
                # Create an application state to save with current session data
                from src.core.state_manager import ApplicationState, StateManager

                current_state = ApplicationState(
                    user_profile={
                        "ai_config": {
                            "default_provider": prefs_manager.get_preference("ai.default_provider"),
                            "default_model": prefs_manager.get_preference("ai.default_model"),
                        },
                        "workspace_path": workspace_path,
                        "learning_style": prefs_manager.get_preference("learning.style") or "intermediate",
                    },
                    conversation_context={},  # This would contain conversation state
                    conversation_messages=[],  # This would contain chat history
                    current_state_metadata={
                        "last_access": str(datetime.now()),
                        "workspace_path": workspace_path,
                        "user_id": "default_user",
                    },
                )
                state_manager = StateManager(workspace_path)
                asyncio.run(state_manager.save_current_state(current_state))
            except Exception as e:
                # If state saving fails, log the error but continue with exit
                print(f"[red]Error saving state: {str(e)}[/red]")
            console.print("\n\n[bold green]Thanks for using Learning Catalyst. Goodbye![/bold green] 👋")
            break

        # Handle Ctrl+C (returned None)
        if user_input is None:
            continue

        # Handle commands through the command palette
        if user_input.startswith("/"):
            try:
                command_palette.execute_command(user_input)
            except Exception:
                console.print(f"[red]Unknown command: {user_input}. Type /help for available commands.[/red]")
        else:
            # Treat non-slash input as a concept request or general query for the AI
            if user_input.strip() == "":
                # If user just pressed enter with empty input, show helpful message
                console.print(
                    "[bold blue]💡 Tip:[/bold blue] " "[cyan]Type a concept name or use /help for commands[/cyan]"
                )
            else:
                # Process the user input with the Catalyst Agent
                try:
                    from src.core.catalyst_agent import ConversationContext

                    # Create a context for the conversation
                    conversation_context = ConversationContext(
                        user_profile={
                            "ai_config": {
                                "default_provider": prefs_manager.get_preference("ai.default_provider"),
                                "default_model": prefs_manager.get_preference("ai.default_model"),
                            },
                            "learning_style": prefs_manager.get_preference("learning.style") or "intermediate",
                        },
                        current_concept=None,  # Will be determined based on context
                        conversation_history=[],  # Placeholder - would contain actual history
                    )

                    # Interpret the user intent
                    intent = asyncio.run(catalyst_agent.interpret_intent(user_input, conversation_context))

                    # Generate a response based on the intent
                    response = asyncio.run(catalyst_agent.generate_response(user_input, intent, conversation_context))

                    console.print(f"[green]AI Tutor:[/green] {response}")
                except Exception as e:
                    console.print(f"[red]Error processing your request: {str(e)}[/red]")
                    console.print(
                        "[cyan]For now, please use slash commands like /concepts "
                        "to see available topics or /help for commands.[/cyan]"
                    )


@app.command()
def models():
    """List available AI models configured for the application"""
    from src.cli.commands import models

    models.models()


@app.command()
def tokens(model_name: str = typer.Argument("", help="Optional model name to get detailed usage")):
    """Show token usage statistics"""
    from src.cli.commands import tokens

    tokens.tokens(model_name=model_name)


@app.command()
def knowledge_map():
    """Display the current knowledge map structure"""
    from src.cli.commands import knowledge_map

    knowledge_map.knowledge_map()


@app.command()
def preference(
    action: str = typer.Argument(..., help="Action: list or set"),
    key: str = typer.Argument("", help="Key for preference (required for set)"),
    value: str = typer.Argument("", help="Value to set (required for set)"),
):
    """Manage application preferences using key-value syntax (like npm config)"""
    from src.cli.commands import preference

    preference.preference(action=action, key=key, value=value)


@app.command()
def help(command: str = typer.Argument("", help="Specific command to get help for")):
    """Display help information for commands"""
    from src.cli.commands import help

    help.help(command=command)


@app.command()
def concepts(
    list_all: bool = typer.Option(False, "--list", "-l", help="List all learned concepts"),
    search: str = typer.Option("", "--search", "-s", help="Search for concepts by name"),
):
    """Manage and view learned concepts"""
    from src.cli.commands import concepts

    concepts.concepts(list_all=list_all, search=search)


@app.command()
def reset(force: bool = typer.Option(False, "--force", "-f", help="Force reset without confirmation")):
    """Reset the current learning session"""
    from src.cli.commands import reset

    reset.reset(force=force)


@app.command()
def quit(force: bool = typer.Option(False, "--force", "-f", help="Force quit without confirmation")):
    """Exit the Learning Catalyst application"""
    from src.cli.commands import quit

    quit.quit(force=force)


@app.command()
def config(
    list_config: bool = typer.Option(False, "--list", "-l", help="List all configuration settings"),
    get_key: str = typer.Option("", "--get", "-g", help="Get value of specific configuration key"),
    set_key: str = typer.Option("", "--set", "-s", help="Set configuration key"),
    value: str = typer.Option("", "--value", "-v", help="Value to set for the key"),
):
    """Manage application configuration"""
    from src.cli.commands import config

    config.config(list_config=list_config, get_key=get_key, set_key=set_key, value=value)


@app.command()
def checkpoint(
    action: str = typer.Argument(..., help="Action: save, load, or list"),
    name: str = typer.Argument("", help="Checkpoint name (required for save/load)"),
    description: str = typer.Option("", "--description", "-d", help="Description for the checkpoint"),
):
    """Manage application checkpoints for saving and restoring learning states"""
    from src.cli.commands import checkpoint

    checkpoint.checkpoint(action=action, name=name, description=description)


if __name__ == "__main__":
    app()
