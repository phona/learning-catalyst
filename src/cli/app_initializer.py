"""
Application initialization utilities for Learning Catalyst - Updated with new command registry
"""

import asyncio
import atexit
import os
import readline
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from rich.console import Console
from rich.prompt import Prompt

from src.ai.service import ModelAbstractionService
from src.cli.commands.analytics import StatisticsCommand, TokensCommand
from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
from src.cli.commands.learning import ConceptsCommand, ExplainCommand, KnowledgeMapCommand, QuizCommand

# New command system imports
from src.cli.commands.registry import CommandRegistry
from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand
from src.cli.core.rich_interface import RichInterface
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator

# Core imports
from src.core.startup_guide import StartupGuide
from src.core.state_manager import StateManager
from src.utils.error_handler import handle_errors, log_error
from src.utils.preferences_manager import PreferencesManager
from src.utils.workspace_manager import WorkspaceManager


class WorkspaceInitializer:
    """
    Handles workspace initialization and setup.

    This class manages the creation and initialization of workspace directories,
    ensuring the proper structure exists for the Learning Catalyst application.
    """

    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.workspace_manager = WorkspaceManager(workspace_path)

    @handle_errors()
    def initialize_workspace(self) -> Tuple[bool, str]:
        """Initialize workspace and return first_time flag and learningspace path"""
        try:
            # Check if workspace exists
            workspace_exists = self.workspace_manager.workspace_exists()
            is_first_time = not workspace_exists

            if is_first_time:
                success = self.workspace_manager.initialize_workspace()
                if not success:
                    raise RuntimeError("Failed to initialize workspace")

            learningspace_path = str(self.workspace_manager.learningspace_path)
            return is_first_time, learningspace_path
        except (OSError, RuntimeError, ValueError) as e:
            log_error(f"Failed to initialize workspace: {e}")
            raise

    def validate_workspace(self) -> bool:
        """Validate that workspace is properly initialized"""
        return self.workspace_manager.workspace_exists() and self.workspace_manager.learningspace_path.exists()


class ComponentInitializer:
    """Handles initialization of core application components"""

    def __init__(self, workspace_path: str, learningspace_path: str):
        self.workspace_path = workspace_path
        self.learningspace_path = learningspace_path

    @handle_errors()
    def initialize_core_components(self) -> Dict[str, Any]:
        """Initialize core application components"""
        try:
            prefs_manager = PreferencesManager(self.workspace_path)

            # Ensure the learningspace directory exists
            os.makedirs(self.learningspace_path, exist_ok=True)

            # Initialize knowledge navigator
            db_path = os.path.join(self.learningspace_path, "data.db")
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)

            # Initialize startup guide
            state_manager = StateManager(self.workspace_path)
            startup_guide = StartupGuide(self.workspace_path, knowledge_navigator, state_manager)

            return {
                "prefs_manager": prefs_manager,
                "startup_guide": startup_guide,
                "knowledge_navigator": knowledge_navigator,
                "state_manager": state_manager,
            }
        except (OSError, RuntimeError, ValueError, ImportError) as e:
            log_error(f"Failed to initialize core components: {e}")
            raise

    @handle_errors()
    def initialize_ai_components(self) -> Dict[str, Any]:
        """Initialize AI-related components"""
        try:
            ai_service = ModelAbstractionService()
            state_manager = StateManager(self.workspace_path)
            checkpoint_manager = None  # Will be initialized later

            return {
                "ai_service": ai_service,
                "state_manager": state_manager,
                "checkpoint_manager": checkpoint_manager,
            }
        except (ImportError, RuntimeError, ValueError) as e:
            log_error(f"Failed to initialize AI components: {e}")
            raise


class AIConfigurationManager:
    """Handles AI provider configuration"""

    def __init__(self, workspace_path: str, prefs_manager: PreferencesManager):
        self.workspace_path = workspace_path
        self.prefs_manager = prefs_manager

    @handle_errors()
    def check_ai_configuration(self) -> Tuple[Optional[str], Optional[str]]:
        """Check if AI is configured and return provider and model"""
        try:
            default_provider = self.prefs_manager.get_preference("ai.default_provider")
            default_model = self.prefs_manager.get_preference("ai.default_model")

            if not default_provider or not default_model:
                return None, None
            return default_provider, default_model
        except (ValueError, KeyError, OSError) as e:
            log_error(f"Failed to check AI configuration: {e}")
            return None, None

    @handle_errors()
    def configure_ai_provider(self) -> Tuple[str, str]:
        """Configure AI provider interactively"""
        try:
            console = Console()
            console.print("\n[bold yellow]AI Provider Configuration[/bold yellow]")
            console.print("Please configure your AI provider to continue.\n")

            # Get providers from the service
            model_service = ModelAbstractionService()
            providers = model_service.get_available_providers()
            provider_descriptions = model_service.get_provider_descriptions()

            for provider in providers:
                desc = provider_descriptions.get(provider, f"{provider.title()} provider")
                console.print(f"  [cyan]• {provider}[/cyan]: {desc}")

            # Provider selection
            console.print("\n[bold magenta]Choose your AI provider:[/bold magenta]")
            provider = Prompt.ask("Select AI provider", choices=providers, default="deepseek")

            # Model selection based on provider - use hardcoded models for now
            model_map = {
                "deepseek": ["deepseek-chat", "deepseek-coder"],
                "chatglm": ["glm-4", "glm-3-turbo"],
                "siliconflow": ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-7B-Instruct"],
                "local": ["llama3", "mistral", "phi3"],
                "openai-compatible": ["gpt-3.5-turbo", "gpt-4", "text-davinci-003"],
            }

            chat_models = model_map.get(provider, ["default"])

            if chat_models:
                model_examples = ", ".join(chat_models[:3])  # Show first 3 examples
                console.print(f"\n[bold magenta]Enter the model name for {provider}" f" (e.g., {model_examples}):[/bold magenta]")
            else:
                console.print(f"\n[bold magenta]Enter the model name for {provider}:[/bold magenta]")

            model = Prompt.ask(
                f"Select {provider} model",
                choices=chat_models if chat_models else ["default"],
                default=chat_models[0] if chat_models else "default",
            )

            # Save preferences
            self.prefs_manager.set_preference("ai.default_provider", provider)
            self.prefs_manager.set_preference("ai.default_model", model)

            # API key configuration if needed
            if provider.lower() not in ["openai-compatible"]:
                self._configure_api_key(provider)

            return provider, model
        except (ValueError, RuntimeError, KeyError, EOFError) as e:
            log_error(f"Failed to configure AI provider: {e}")
            raise

    def _configure_api_key(self, provider: str):
        """Configure API key for a provider"""
        console = Console()
        console.print(f"\n[bold magenta]Enter your {provider} API key:[/bold magenta]")
        console.print("  [yellow]Note: This is stored locally and only used for API calls[/yellow]")
        api_key = Prompt.ask(f"Enter {provider} API key", password=True)
        if api_key:
            self.prefs_manager.set_preference(f"ai.{provider}_api_key", api_key)
            console.print(f"  [green]✅ API key saved for {provider}[/green]")


class StartupMessageManager:
    """Manages startup messages and contextual suggestions"""

    def __init__(self, startup_guide: StartupGuide, console: Console):
        self.startup_guide = startup_guide
        self.console = console

    @handle_errors()
    def display_startup_message(self, is_first_time: bool) -> bool:
        """Display appropriate startup message"""
        try:
            if is_first_time:
                # Display first-time welcome message
                welcome_msg = """
🎓 Welcome to Learning Catalyst! 🚀

This appears to be your first time using Learning Catalyst. Let's get you set up for a great learning experience!

📋 Quick Start Guide:
    1. Set up your AI provider configuration
    2. Explore available learning concepts
    3. Start your learning journey

💡 Tip:
    Use /help anytime to see all available commands
"""
                self.console.print(welcome_msg)
                return False
            else:
                # For returning users, just display standard welcome
                welcome_msg = """
🎓 Welcome to Learning Catalyst! 🚀

Ready to continue your learning journey?

💡 Quick Actions:
• View available concepts: /concepts
• Get help with commands: /help
• Check your configuration: /config

What would you like to do today?
"""
                self.console.print(welcome_msg)
                return False  # Simplified for now
        except (ValueError, RuntimeError) as e:
            log_error(f"Failed to display startup message: {e}")
            return False

    @handle_errors()
    def display_contextual_suggestions(self, user_profile: Dict[str, Any]):
        """Display contextual suggestions based on user preferences"""
        try:
            # Generate and display contextual suggestions
            suggestions = asyncio.run(self.startup_guide.get_contextual_suggestions(user_profile))
            if suggestions:
                self.console.print("\n[bold blue]💡 Suggestions for you:[/bold blue]")
                for i, suggestion in enumerate(suggestions, 1):
                    self.console.print(f"\n[cyan]{i}. {suggestion['title']}[/cyan]")
                    self.console.print(f"   {suggestion['description']}")
                    self.console.print(f"   [green]Command: {suggestion['command']}[/green]")
            else:
                # For now, display simple suggestions
                self.console.print("\n[bold cyan]Quick Actions:[/bold cyan]")
                self.console.print("• View available concepts: /concepts")
                self.console.print("• Get help with commands: /help")
                self.console.print("• Check your configuration: /config")
        except (ValueError, RuntimeError, KeyError) as e:
            log_error(f"Failed to display contextual suggestions: {e}")


@dataclass
class SessionConfig:
    """Configuration for interactive session"""

    workspace_path: str
    learningspace_path: str
    core_components: Dict[str, Any]
    ai_components: Dict[str, Any]
    default_provider: str
    default_model: str


class InteractiveSessionManager:
    """Manages interactive session setup and execution"""

    def __init__(self, config: SessionConfig):
        self.workspace_path = config.workspace_path
        self.learningspace_path = config.learningspace_path
        self.core_components = config.core_components
        self.ai_components = config.ai_components
        self.default_provider = config.default_provider
        self.default_model = config.default_model

    @handle_errors()
    def setup_readline(self):
        """Setup readline for better input handling"""
        try:
            # Enable tab completion
            readline.parse_and_bind("tab: complete")

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

            # Set up history file
            history_file = os.path.join(self.learningspace_path, ".history")
            try:
                readline.read_history_file(history_file)
            except FileNotFoundError:
                pass
            readline.set_history_length(1000)
        except ImportError:
            # readline not available on Windows
            pass
        except OSError as e:
            log_error(f"Failed to setup readline: {e}")

    @handle_errors()
    def setup_command_history(self):
        """Setup command history tracking"""
        try:
            history_file = os.path.join(self.learningspace_path, ".history")
            atexit.register(lambda: self._save_history(history_file))
        except (OSError, RuntimeError) as e:
            log_error(f"Failed to setup command history: {e}")

    def _save_history(self, history_file: str):
        """Save command history to file"""
        try:
            readline.write_history_file(history_file)
        except (OSError, IOError) as e:
            log_error(f"Failed to save history: {e}")

    @handle_errors()
    def setup_command_registry(self) -> CommandRegistry:
        """Setup and return command registry"""
        try:
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
            command_registry.set_context("workspace_path", self.workspace_path)
            command_registry.set_context("prefs_manager", self.core_components["prefs_manager"])
            command_registry.set_context("knowledge_navigator", self.core_components["knowledge_navigator"])
            command_registry.set_context("state_manager", self.core_components["state_manager"])
            command_registry.set_context("startup_guide", self.core_components["startup_guide"])
            command_registry.set_context("model_service", self.ai_components["ai_service"])

            # Initialize catalyst agent
            catalyst_agent = CatalystAgentImpl(
                model_service=self.ai_components["ai_service"], knowledge_navigator=self.core_components["knowledge_navigator"]
            )
            command_registry.set_context("catalyst_agent", catalyst_agent)

            return command_registry
        except (ImportError, RuntimeError, ValueError, KeyError) as e:
            log_error(f"Failed to setup command registry: {e}")
            raise

    @handle_errors()
    def setup_autocomplete(self, command_registry: CommandRegistry):
        """Setup simple autocomplete without the complex adapter"""
        try:
            # Set up a simple completer class
            class CommandCompleter:
                """Command completion helper for readline"""

                def __init__(self, registry: CommandRegistry):
                    self.commands: List[str] = sorted(registry.commands.keys())
                    self.matches: List[str] = []
                    self.index: int = 0

                def __call__(self, text: str, state: int) -> Optional[str]:
                    """Simple command completion for readline"""
                    if state == 0:
                        # Filter commands based on input
                        search_text = text[1:] if text.startswith("/") else text
                        self.matches = [cmd for cmd in self.commands if cmd.startswith(search_text)]
                        self.index = 0

                    if self.index < len(self.matches):
                        result = self.matches[self.index]
                        self.index += 1
                        return f"/{result}" if not text.startswith("/") else result

                    return None

                def get_all_commands(self) -> List[str]:
                    """Get all available commands"""
                    return self.commands.copy()

                def refresh_commands(self, registry: CommandRegistry) -> None:
                    """Refresh the command list from registry"""
                    self.commands = sorted(registry.commands.keys())

            # Set up readline completion
            completer = CommandCompleter(command_registry)
            readline.set_completer(completer)
            readline.parse_and_bind("tab: complete")
        except (ImportError, RuntimeError) as e:
            log_error(f"Failed to setup autocomplete: {e}")

    @handle_errors()
    def create_input_handler(self, _command_registry: CommandRegistry):
        """Create input handler function"""
        try:

            def input_handler() -> Optional[str]:
                """Handle user input with autocomplete and formatting"""
                try:
                    user_input = input("Learning Catalyst > ")
                    return user_input.strip()
                except KeyboardInterrupt:
                    print()  # Go to new line without extra text
                    return None
                except EOFError:
                    return "EOF"

            return input_handler
        except (RuntimeError, ValueError) as e:
            log_error(f"Failed to create input handler: {e}")
            raise

    @handle_errors()
    def execute_command(self, command_registry: CommandRegistry, user_input: str, context: Dict[str, Any]):
        """Execute a command through the registry"""
        try:
            if user_input.startswith("/"):
                result = command_registry.execute_command(user_input, context)
                return result

            # Handle non-command input (AI interaction)
            return None
        except (RuntimeError, ValueError, KeyError) as e:
            log_error(f"Failed to execute command: {e}")
            raise
