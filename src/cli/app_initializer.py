"""
Application initialization utilities for Learning Catalyst
"""

import os
import sys
from typing import Dict, Any, Tuple, Optional
from rich.console import Console
from rich.prompt import Prompt
from src.core.startup_guide import StartupGuide
from src.core.state_manager import StateManager
from src.utils.preferences_manager import PreferencesManager
from src.utils.workspace_manager import WorkspaceManager
from src.ai.service import ModelAbstractionService
from src.cli.command_palette import CommandPalette
from src.cli.interface import CLIInterfaceImpl
from src.utils.error_handler import handle_errors, log_error


class WorkspaceInitializer:
    """Handles workspace initialization and setup"""

    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.workspace_manager = WorkspaceManager(workspace_path)

    @handle_errors
    def initialize_workspace(self) -> Tuple[bool, str]:
        """Initialize workspace and return first_time flag and learningspace path"""
        try:
            # Check if workspace exists
            workspace_exists = self.workspace_manager.workspace_exists()
            is_first_time = not workspace_exists

            if is_first_time:
                success = self.workspace_manager.initialize_workspace()
                if not success:
                    raise Exception("Failed to initialize workspace")

            learningspace_path = str(self.workspace_manager.learningspace_path)
            return is_first_time, learningspace_path
        except Exception as e:
            log_error(f"Failed to initialize workspace: {e}")
            raise


class ComponentInitializer:
    """Handles initialization of core application components"""

    def __init__(self, workspace_path: str, learningspace_path: str):
        self.workspace_path = workspace_path
        self.learningspace_path = learningspace_path

    @handle_errors
    def initialize_core_components(self) -> Dict[str, Any]:
        """Initialize core application components"""
        try:
            prefs_manager = PreferencesManager(self.workspace_path)

            # Create placeholder components that will be properly initialized later
            # We'll create a minimal startup guide for now
            startup_guide = None  # Will be initialized later with proper dependencies

            # Create a basic knowledge navigator (will be enhanced later)
            knowledge_navigator = None  # Will be initialized later

            return {
                "prefs_manager": prefs_manager,
                "startup_guide": startup_guide,
                "knowledge_navigator": knowledge_navigator,
            }
        except Exception as e:
            log_error(f"Failed to initialize core components: {e}")
            raise

    @handle_errors
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
        except Exception as e:
            log_error(f"Failed to initialize AI components: {e}")
            raise


class AIConfigurationManager:
    """Handles AI provider configuration"""

    def __init__(self, workspace_path: str, prefs_manager: PreferencesManager):
        self.workspace_path = workspace_path
        self.prefs_manager = prefs_manager

    @handle_errors
    def check_ai_configuration(self) -> Tuple[Optional[str], Optional[str]]:
        """Check if AI is configured and return provider and model"""
        try:
            default_provider = self.prefs_manager.get_preference("default_provider")
            default_model = self.prefs_manager.get_preference("default_model")

            if not default_provider or not default_model:
                return None, None
            return default_provider, default_model
        except Exception as e:
            log_error(f"Failed to check AI configuration: {e}")
            return None, None

    @handle_errors
    def configure_ai_provider(self) -> Tuple[str, str]:
        """Configure AI provider interactively"""
        try:
            console = Console()
            console.print("\n[bold yellow]AI Provider Configuration[/bold yellow]")
            console.print("Please configure your AI provider to continue.\n")

            # Provider selection
            providers = ["openai", "chatglm", "deepseek", "siliconflow", "local"]
            provider = Prompt.ask("Select AI provider", choices=providers, default="openai")

            # Model selection based on provider
            models = self._get_models_for_provider(provider)
            model = Prompt.ask(
                f"Select {provider} model", choices=models, default=models[0] if models else "gpt-3.5-turbo"
            )

            # Save preferences
            self.prefs_manager.set_preference("default_provider", provider)
            self.prefs_manager.set_preference("default_model", model)

            # API key configuration if needed
            if provider != "local":
                self._configure_api_key(provider)

            return provider, model
        except Exception as e:
            log_error(f"Failed to configure AI provider: {e}")
            raise

    def _get_models_for_provider(self, provider: str) -> list:
        """Get available models for a provider"""
        model_map = {
            "openai": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
            "chatglm": ["chatglm3-6b", "chatglm2-6b"],
            "deepseek": ["deepseek-coder", "deepseek-chat"],
            "siliconflow": ["qwen-plus", "qwen-turbo"],
            "local": ["local-model"],
        }
        return model_map.get(provider, ["default"])

    def _configure_api_key(self, provider: str):
        """Configure API key for a provider"""
        api_key = Prompt.ask(f"Enter {provider} API key", password=True)
        self.prefs_manager.set_preference(f"{provider}_api_key", api_key)


class StartupMessageManager:
    """Manages startup messages and contextual suggestions"""

    def __init__(self, startup_guide: StartupGuide, console: Console):
        self.startup_guide = startup_guide
        self.console = console

    @handle_errors
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
        except Exception as e:
            log_error(f"Failed to display startup message: {e}")
            return False

    @handle_errors
    def display_contextual_suggestions(self):
        """Display contextual suggestions based on user preferences"""
        try:
            # For now, display simple suggestions
            self.console.print("\n[bold cyan]Quick Actions:[/bold cyan]")
            self.console.print("• View available concepts: /concepts")
            self.console.print("• Get help with commands: /help")
            self.console.print("• Check your configuration: /config")
        except Exception as e:
            log_error(f"Failed to display contextual suggestions: {e}")


class InteractiveSessionManager:
    """Manages interactive session setup and execution"""

    def __init__(
        self,
        workspace_path: str,
        learningspace_path: str,
        core_components: Dict[str, Any],
        ai_components: Dict[str, Any],
        default_provider: str,
        default_model: str,
    ):
        self.workspace_path = workspace_path
        self.learningspace_path = learningspace_path
        self.core_components = core_components
        self.ai_components = ai_components
        self.default_provider = default_provider
        self.default_model = default_model

    @handle_errors
    def setup_readline(self):
        """Setup readline for better input handling"""
        try:
            import readline

            # Enable tab completion
            readline.parse_and_bind("tab: complete")
            # Set up history file
            history_file = os.path.expanduser("~/.learning_catalyst_history")
            try:
                readline.read_history_file(history_file)
            except FileNotFoundError:
                pass
            readline.set_history_length(1000)
        except ImportError:
            # readline not available on Windows
            pass
        except Exception as e:
            log_error(f"Failed to setup readline: {e}")

    @handle_errors
    def setup_command_history(self):
        """Setup command history tracking"""
        try:
            history_file = os.path.expanduser("~/.learning_catalyst_history")
            import atexit

            atexit.register(lambda: self._save_history(history_file))
        except Exception as e:
            log_error(f"Failed to setup command history: {e}")

    def _save_history(self, history_file: str):
        """Save command history to file"""
        try:
            import readline

            readline.write_history_file(history_file)
        except Exception as e:
            log_error(f"Failed to save history: {e}")

    @handle_errors
    def setup_command_palette(self) -> CommandPalette:
        """Setup and return command palette"""
        try:
            # Initialize components needed for command palette
            ai_service = self.ai_components["ai_service"]
            prefs_manager = self.core_components["prefs_manager"]
            knowledge_navigator = self.core_components["knowledge_navigator"]

            # Create catalyst agent
            # Create catalyst agent with proper dependencies
            from src.core.catalyst_agent import CatalystAgentImpl

            catalyst_agent = CatalystAgentImpl(model_service=ai_service, knowledge_navigator=knowledge_navigator)

            # Create user interface
            user_interface = CLIInterfaceImpl()

            # Create command palette with proper parameters
            command_palette = CommandPalette(cli_interface=user_interface)

            # Set context for command palette
            command_palette.context.update(
                {
                    "workspace_path": self.workspace_path,
                    "catalyst_agent": catalyst_agent,
                    "prefs_manager": prefs_manager,
                    "knowledge_navigator": knowledge_navigator,
                }
            )

            return command_palette
        except Exception as e:
            log_error(f"Failed to setup command palette: {e}")
            raise

    @handle_errors
    def create_input_handler(self):
        """Create input handler function"""
        try:
            command_palette = self.setup_command_palette()

            def input_handler():
                """Handle user input with autocomplete and formatting"""
                try:
                    user_input = input("\n[bold green]You:[/bold, green] ")
                    return user_input.strip()
                except KeyboardInterrupt:
                    print("\nUse 'quit' to exit.")
                    return ""
                except EOFError:
                    print("\nGoodbye!")
                    sys.exit(0)

            return input_handler
        except Exception as e:
            log_error(f"Failed to create input handler: {e}")
            raise
