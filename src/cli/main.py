"""
Main CLI application for Learning Catalyst - Updated with new command registry
"""

import asyncio
import atexit
import os
import readline
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Tuple

import typer
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel

from src.ai.service import ModelAbstractionService
from src.cli.autocomplete import AutoCompleter

# New command system imports
from src.cli.command_palette import CommandPalette
from src.cli.commands.analytics import StatisticsCommand, TokensCommand
from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
from src.cli.commands.learning import ConceptsCommand, ExplainCommand, KnowledgeMapCommand, QuizCommand
from src.cli.commands.registry import CommandRegistry
from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand
from src.cli.core.rich_interface import RichInterface

# Core imports
from src.core.catalyst_agent import CatalystAgentImpl, ConversationContext
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.core.startup_guide import StartupGuide
from src.core.state_manager import ApplicationState, StateManager
from src.utils.preferences_manager import PreferencesManager

app = typer.Typer()


# Create a simple adapter for the command palette interface
class CommandPaletteAdapter:
    """Adapter to bridge the new command registry with the old CommandPalette interface."""

    def __init__(self, registry: "CommandRegistry"):
        self.registry = registry

    def execute_command(self, command_input: str):
        """Execute a command through the registry."""
        return self.registry.execute_command(command_input)

    def get_autocomplete_suggestions(self, partial_input: str) -> List[str]:
        """Get autocomplete suggestions for commands."""
        # Get commands from registry
        suggestions: List[str] = []
        if partial_input.startswith("/"):
            command_part = partial_input[1:].lower()
            for cmd_name, _ in self.registry.commands.items():
                if cmd_name.lower().startswith(command_part):
                    suggestions.append(f"/{cmd_name}")
        return suggestions

    def get_concept_suggestions(self, _partial_input: str, _context: Dict[str, Any]) -> List[str]:
        """Get concept suggestions (placeholder for new system)."""
        # This would need to be implemented based on the new system
        return []

    def get_command_history(self) -> List[str]:
        """Get command history from registry."""
        return self.registry.get_command_history()

    def add_to_history(self, command: str) -> None:
        """Add a command to the registry history."""
        self.registry.add_to_history(command)


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
    # This function is too long and complex, let's break it down into smaller functions
    _setup_workspace(workspace_path)
    prefs_manager = PreferencesManager(workspace_path)
    _configure_ai_provider(prefs_manager)
    _display_startup_suggestions(prefs_manager, workspace_path)

    # Initialize and run the main application
    _run_main_application(workspace_path, prefs_manager)


def _setup_workspace(workspace_path: str) -> Tuple[str, Any, Any]:
    """Initialize workspace and return core components"""
    learningspace_path = os.path.join(workspace_path, ".catalyst")
    is_first_time = not os.path.exists(learningspace_path)

    if is_first_time:
        os.makedirs(learningspace_path)
        rprint("[bold blue]Created new learning space at:[/bold blue] " + learningspace_path)

    # Initialize core components
    db_path = os.path.join(learningspace_path, "data.db")
    knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
    state_manager = StateManager(workspace_path)
    startup_guide = StartupGuide(workspace_path, knowledge_navigator, state_manager)

    # Check if there's a previous state
    has_previous_state = False
    try:
        previous_state = asyncio.run(state_manager.load_last_state())
        has_previous_state = previous_state is not None
    except (OSError, ValueError, RuntimeError):
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

    return learningspace_path, knowledge_navigator, state_manager


def _configure_ai_provider(prefs_manager: PreferencesManager) -> ModelAbstractionService:
    """Configure AI provider if not already set up"""
    default_provider = prefs_manager.get_preference("ai.default_provider")
    default_model = prefs_manager.get_preference("ai.default_model")

    if not default_provider or not default_model:
        console = Console()
        console.print("[bold yellow]Let's configure your AI provider to get started.[/bold yellow]")
        console.print("\n[bold]Supported providers:[/bold]")

        # Get providers from the service
        model_service = ModelAbstractionService()
        providers = model_service.get_available_providers()
        provider_descriptions = model_service.get_provider_descriptions()

        for provider in providers:
            desc = provider_descriptions.get(provider, f"{provider.title()} provider")
            console.print(f"  [cyan]• {provider}[/cyan]: {desc}")

        def safe_input(prompt_text: str) -> str:
            """Safe input function that handles backspace properly"""
            try:
                return input(prompt_text + " ").strip()
            except KeyboardInterrupt:
                console.print("\n[yellow]Setup cancelled. Exiting...[/yellow]")
                raise SystemExit(1) from None
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
                console.print(f"[red]Invalid provider. Please choose from: {', '.join(providers)}[/red]")
            except (KeyboardInterrupt, SystemExit):
                raise

        # Prompt for model with guidance
        provider_models = {
            "openai": {"chat": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]},
            "deepseek": {"chat": ["deepseek-chat", "deepseek-coder"]},
            "siliconflow": {"chat": ["qwen-plus", "qwen-turbo"]},
            "chatglm": {"chat": ["glm-4", "glm-3-turbo"]},
        }.get(provider, {})
        chat_models = provider_models.get("chat", [])

        if chat_models:
            model_examples = ", ".join(chat_models[:3])  # Show first 3 examples
            console.print(f"\n[bold magenta]Enter the model name for {provider} (e.g., {model_examples}):[/bold magenta]")
        else:
            console.print(f"\n[bold magenta]Enter the model name for {provider}:[/bold magenta]")
        try:
            model = safe_input("  [magenta]>[/magenta]")
            prefs_manager.set_preference("ai.default_model", model)
        except (KeyboardInterrupt, SystemExit):
            raise

        # Prompt for API key if required
        if provider.lower() not in ["openai-compatible"]:
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

    return ModelAbstractionService()


def _display_startup_suggestions(prefs_manager: PreferencesManager, workspace_path: str) -> None:
    """Display contextual suggestions based on user profile"""
    user_profile = {
        "ai_config": {
            "default_provider": prefs_manager.get_preference("ai.default_provider"),
            "default_model": prefs_manager.get_preference("ai.default_model"),
        },
        "learning_style": prefs_manager.get_preference("learning.style") or "intermediate",
    }

    learningspace_path = os.path.join(workspace_path, ".catalyst")
    db_path = os.path.join(learningspace_path, "data.db")
    knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
    state_manager = StateManager(workspace_path)
    startup_guide = StartupGuide(workspace_path, knowledge_navigator, state_manager)

    try:
        suggestions = asyncio.run(startup_guide.get_contextual_suggestions(user_profile))
        if suggestions:
            console = Console()
            console.print("\n[bold blue]💡 Suggestions for you:[/bold blue]")
            for i, suggestion in enumerate(suggestions, 1):
                console.print(f"\n[cyan]{i}. {suggestion['title']}[/cyan]")
                console.print(f"   {suggestion['description']}")
                console.print(f"   [green]Command: {suggestion['command']}[/green]")
    except (ValueError, RuntimeError, KeyError) as e:
        console = Console()
        console.print(f"[yellow]Note: Could not load suggestions: {str(e)}[/yellow]")


def _run_main_application(workspace_path: str, prefs_manager: PreferencesManager) -> None:
    """Run the main application loop"""
    # Launch the main application loop with beautiful formatting
    console = Console()
    learningspace_path = os.path.join(workspace_path, ".catalyst")
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
    model_service = ModelAbstractionService()
    knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
    catalyst_agent = CatalystAgentImpl(model_service, knowledge_navigator=knowledge_navigator)
    state_manager = StateManager(workspace_path)

    # Load content from user's workspace (all markdown files)
    try:
        asyncio.run(knowledge_navigator.load_content(workspace_path=workspace_path))
    except (OSError, ValueError, RuntimeError) as e:
        rprint(f"[yellow]Warning: Could not load content from workspace {workspace_path}: {str(e)}[/yellow]")

    # Print welcome message with rich formatting
    console.print("\n[bold green]🚀 Learning session started![/bold green] [blue]Use /help to see available commands.[/blue]")

    # Initialize readline for enhanced input editing capabilities
    _setup_readline()

    # Initialize the new command registry system
    registry_config = RegistryConfig(
        console=console,
        workspace_path=workspace_path,
        prefs_manager=prefs_manager,
        knowledge_navigator=knowledge_navigator,
        catalyst_agent=catalyst_agent,
        state_manager=state_manager,
        model_service=model_service,
        learningspace_path=learningspace_path,
    )
    command_registry = _setup_command_registry(registry_config)

    # Show initial guidance message
    console.print("\n[bold blue]💡 Tip:[/bold blue] [cyan]Type /help to see all available commands[/cyan]")
    console.print("[bold blue]💡 Tip:[/bold blue] [cyan]Start with /concepts to see available learning materials[/cyan]")

    # Main interactive loop with the new command registry
    interactive_config = InteractiveLoopConfig(
        console=console,
        workspace_path=workspace_path,
        prefs_manager=prefs_manager,
        knowledge_navigator=knowledge_navigator,
        catalyst_agent=catalyst_agent,
        state_manager=state_manager,
        model_service=model_service,
        command_registry=command_registry,
    )
    _run_interactive_loop(interactive_config)


def _setup_readline() -> None:
    """Configure readline for enhanced input editing"""
    try:
        # Try to enable readline features if available
        if "libedit" in str(readline.__doc__):
            readline.parse_and_bind("bind ^W ed-delete-prev-word")  # For libedit (macOS)
            readline.parse_and_bind("bind ^U ed-kill-line")  # Clear line
            # Configure arrow keys for history navigation
            readline.parse_and_bind("bind ^[OA history-search-backward")  # Up arrow
            readline.parse_and_bind("bind ^[OB history-search-forward")  # Down arrow
        else:
            readline.parse_and_bind("Control-w: unix-word-rubout")  # For GNU readline
            readline.parse_and_bind("Control-u: unix-line-discard")  # Clear line
            # Configure arrow keys for history navigation
            readline.parse_and_bind("\\e[A: history-search-backward")  # Up arrow
            readline.parse_and_bind("\\e[B: history-search-forward")  # Down arrow
    except (ImportError, AttributeError):
        # If readline is not available or has issues, continue without enhanced shortcuts
        pass


@dataclass
class RegistryConfig:
    """Configuration for command registry setup"""

    console: Console
    workspace_path: str
    prefs_manager: PreferencesManager
    knowledge_navigator: Any
    catalyst_agent: Any
    state_manager: Any
    model_service: Any
    learningspace_path: str


def _setup_command_registry(config: RegistryConfig) -> CommandRegistry:
    """Set up the command registry with all commands"""
    # Create CLI interface and command registry
    cli_interface = RichInterface()
    command_registry = CommandRegistry(cli_interface)

    # Register all commands
    command_registry.register_command(HelpCommand())
    command_registry.register_command(QuitCommand())
    command_registry.register_command(ClearCommand())

    command_registry.register_command(ModelsCommand())
    command_registry.register_command(PreferencesCommand())
    command_registry.register_command(ConfigCommand())

    command_registry.register_command(ConceptsCommand())
    command_registry.register_command(ExplainCommand())
    command_registry.register_command(QuizCommand())
    command_registry.register_command(KnowledgeMapCommand())

    command_registry.register_command(TokensCommand())
    command_registry.register_command(StatisticsCommand())

    # Set up context for the command registry
    command_registry.set_context("workspace_path", config.workspace_path)
    command_registry.set_context("prefs_manager", config.prefs_manager)
    command_registry.set_context("knowledge_navigator", config.knowledge_navigator)
    command_registry.set_context("catalyst_agent", config.catalyst_agent)
    command_registry.set_context("state_manager", config.state_manager)
    command_registry.set_context("model_service", config.model_service)

    # Initialize and setup autocomplete with the new system
    try:
        # Create a CommandPalette instance that wraps our registry
        command_palette = CommandPalette(cli_interface)
        command_palette.registry = command_registry  # Replace the default registry with ours

        completer = AutoCompleter(command_palette, config.workspace_path)
        completer.setup_readline_completion()
    except (ImportError, RuntimeError, ValueError) as e:
        # If autocomplete setup fails, continue without it
        config.console.print(f"[yellow]Warning: Could not setup autocomplete: {str(e)}[/yellow]")

    # Initialize readline history
    history_file = os.path.join(config.learningspace_path, ".history")

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

    return command_registry


@dataclass
class InteractiveLoopConfig:
    """Configuration for interactive loop"""

    console: Console
    workspace_path: str
    prefs_manager: PreferencesManager
    knowledge_navigator: Any
    catalyst_agent: Any
    state_manager: Any
    model_service: Any
    command_registry: CommandRegistry


def _run_interactive_loop(config: InteractiveLoopConfig) -> None:
    """Run the main interactive loop"""

    # Custom input handler for the interactive loop with autocomplete support
    def custom_input_handler():
        try:
            # Use a standard input with plain text prompt to ensure readline works properly
            user_input = input("Learning Catalyst > ")
            return user_input
        except KeyboardInterrupt:
            # For Ctrl+C, just return empty input to show a new prompt
            config.console.print()  # Go to new line without extra text
            return None
        except EOFError:
            # For Ctrl+D, return special value to indicate exit
            return "EOF"

    # Main interactive loop with the new command registry
    while True:
        user_input = custom_input_handler()

        # Handle EOF (Ctrl+D)
        if user_input == "EOF":
            _handle_exit(config.workspace_path, config.prefs_manager, config.state_manager, config.console)
            break

        # Handle Ctrl+C (returned None)
        if user_input is None:
            continue

        # Handle commands through the new command registry
        if user_input.startswith("/"):
            try:
                asyncio.run(
                    config.command_registry.execute_command(
                        user_input,
                        {
                            "workspace_path": config.workspace_path,
                            "prefs_manager": config.prefs_manager,
                            "knowledge_navigator": config.knowledge_navigator,
                            "catalyst_agent": config.catalyst_agent,
                            "state_manager": config.state_manager,
                            "model_service": config.model_service,
                        },
                    )
                )
                # The command registry already handles display, so we don't need to do anything here
            except (RuntimeError, ValueError, KeyError) as e:
                config.console.print(f"[red]Error executing command: {str(e)}[/red]")
                config.console.print("[cyan]Type /help for available commands.[/cyan]")
        else:
            # Treat non-slash input as a concept request or general query for the AI
            if user_input.strip() == "":
                # If user just pressed enter with empty input, show helpful message
                config.console.print("[bold blue]💡 Tip:[/bold blue] [cyan]Type a concept name or use /help for commands[/cyan]")
            else:
                # Process the user input with the Catalyst Agent
                try:
                    # Create a context for the conversation
                    conversation_context = ConversationContext(
                        user_profile={
                            "ai_config": {
                                "default_provider": config.prefs_manager.get_preference("ai.default_provider"),
                                "default_model": config.prefs_manager.get_preference("ai.default_model"),
                            },
                            "learning_style": config.prefs_manager.get_preference("learning.style") or "intermediate",
                        },
                        current_concept=None,  # Will be determined based on context
                        conversation_history=[],  # Placeholder - would contain actual history
                    )

                    # Interpret the user intent
                    intent = asyncio.run(config.catalyst_agent.interpret_intent(user_input, conversation_context))

                    # Generate a response based on the intent
                    response = asyncio.run(config.catalyst_agent.generate_response(user_input, intent, conversation_context))

                    config.console.print(f"[green]AI Tutor:[/green] {response}")
                except (RuntimeError, ValueError, KeyError) as e:
                    config.console.print(f"[red]Error processing your request: {str(e)}[/red]")
                    config.console.print(
                        "[cyan]For now, please use slash commands like /concepts "
                        "to see available topics or /help for commands.[/cyan]"
                    )


def _handle_exit(workspace_path: str, prefs_manager: PreferencesManager, state_manager: StateManager, console: Console) -> None:
    """Handle application exit"""
    try:
        # Create an application state to save with current session data
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
    except (OSError, ValueError, RuntimeError) as e:
        # If state saving fails, log the error but continue with exit
        rprint(f"[red]Error saving state: {str(e)}[/red]")
    console.print("\n\n[bold green]Thanks for using Learning Catalyst. Goodbye![/bold green] 👋")


if __name__ == "__main__":
    app()
