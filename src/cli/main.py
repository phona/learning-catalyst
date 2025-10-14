"""
Main entry point for Learning Catalyst CLI application.

Minimal Typer-based CLI interface that provides the application entry point
and launches the interactive learning session.
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.text import Text

from ..core.config import ConfigManager
from ..core.exceptions import ValidationError
from ..core.logging import setup_logging
from .interface import CLIInterface

# Create main Typer app
app = typer.Typer(
    name="learning-catalyst",
    help="🧠 An AI-driven interactive learning companion",
    invoke_without_command=True,
    rich_markup_mode="rich",
)

# Global console instance
console = Console()


def get_prompt_text(config_manager: ConfigManager) -> str:
    """Get the prompt text with current provider and model context."""
    provider = config_manager.get("ai.default_provider", "none")
    model = config_manager.get("ai.default_model", "none")

    if provider != "none" and model != "none":
        return f"🧠 ({provider}):{model}> "
    else:
        return "🧠 Learning Catalyst> "


@app.callback()
def main(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose output"),
    config_dir: Optional[Path] = typer.Option(None, "--config-dir", help="Custom configuration directory"),
) -> None:
    """
    Learning Catalyst - AI-Powered Interactive Learning

    Start your personalized learning journey with AI guidance.
    """
    if verbose:
        console.print("🔧 Verbose mode enabled", style="dim")

    try:
        # Initialize configuration
        config_manager = setup_configuration(config_dir, verbose)

        # Setup logging
        log_file = Path(config_manager.config_dir) / "logs" / "learning_catalyst.log" if config_dir else None
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)
        setup_logging(verbose=verbose, log_file=log_file)

        # Start interactive mode
        run_interactive_mode(config_manager, verbose)

    except KeyboardInterrupt:
        console.print("\n👋 Goodbye!", style="green")
        sys.exit(0)
    except ValidationError as e:
        console.print(f"❌ Configuration error: {e.message}", style="red")
        sys.exit(1)
    except Exception as e:
        console.print(f"❌ Unexpected error: {str(e)}", style="red")
        if verbose:
            console.print_exception()
        sys.exit(1)


def setup_configuration(config_dir: Optional[Path], verbose: bool = False) -> ConfigManager:
    """
    Initialize and setup configuration manager.

    Args:
        config_dir: Custom configuration directory path
        verbose: Enable verbose output

    Returns:
        Initialized ConfigManager instance
    """
    try:
        config_manager = ConfigManager(config_dir)

        if verbose:
            console.print(f"📁 Config directory: {config_manager.config_dir}", style="dim")

        # First-time setup message
        if not config_manager.config_file.exists():
            console.print(
                Panel(
                    Text(
                        "🎉 Welcome to Learning Catalyst!\n\n"
                        "This appears to be your first time running the application.\n"
                        "Configuration has been initialized with default settings.\n\n"
                        "Use '/config' commands to customize your experience.",
                        style="bold",
                    ),
                    title="First Time Setup",
                    border_style="green",
                )
            )

        return config_manager

    except Exception as e:
        console.print(f"❌ Failed to setup configuration: {str(e)}", style="red")
        raise


def run_interactive_mode(config_manager: ConfigManager, verbose: bool = False) -> None:
    """
    Run the main interactive CLI mode.

    Args:
        config_manager: Initialized configuration manager
        verbose: Enable verbose output
    """
    # Create and configure CLI interface
    cli_interface = CLIInterface(config_manager)

    # Setup Rich console handlers
    cli_interface.set_output_handler("response", lambda msg: console.print(msg))
    cli_interface.set_output_handler("error", lambda msg: console.print(f"❌ {msg}", style="red"))
    cli_interface.set_output_handler("info", lambda msg: console.print(f"ℹ️  {msg}", style="dim blue"))
    cli_interface.set_output_handler("markdown", lambda msg: _render_markdown(msg))
    cli_interface.set_output_handler("rich_panel", lambda panel: console.print(panel))

    # Setup enhanced input handler with command history
    import readline
    import atexit
    from pathlib import Path

    # Setup command history file
    history_file = Path(config_manager.config_dir) / "history.txt"

    def setup_readline():
        """Setup readline for command history and navigation."""
        try:
            # Load history from file
            if history_file.exists():
                readline.read_history_file(str(history_file))

            # Set history length
            readline.set_history_length(1000)

            # Save history on exit
            atexit.register(lambda: readline.write_history_file(str(history_file)))

        except ImportError:
            # readline not available, fallback to basic input
            pass

    setup_readline()

    def get_input(prompt: str) -> str:
        try:
            # Use dynamic prompt with context
            prompt_text = get_prompt_text(config_manager)
            user_input = input(prompt_text)
            return user_input
        except (KeyboardInterrupt, EOFError):
            raise

    cli_interface.set_input_handler(get_input)

    # Display welcome message
    display_welcome_message(config_manager, verbose)

    # Run the interactive loop
    asyncio.run(cli_interface.run_interactive_loop())


def _render_markdown(content: str) -> None:
    """Render markdown content with Rich."""
    try:
        md = Markdown(content)
        console.print(md)
    except Exception:
        # Fallback to plain text if markdown parsing fails
        console.print(content)


def display_welcome_message(config_manager: ConfigManager, verbose: bool = False) -> None:
    """
    Display welcome message and basic information.

    Args:
        config_manager: Configuration manager instance
        verbose: Enable verbose output
    """
    # Get current configuration
    provider = config_manager.get("ai.default_provider", "Not configured")
    model = config_manager.get("ai.default_model", "Not configured")

    # Create welcome panel
    welcome_text = Text.from_markup(
        "🚀 Welcome to [bold green]Learning Catalyst[/bold green]!\n\n"
        "Your AI-powered learning companion is ready.\n\n"
        f"Provider: [dim]{provider}[/dim]\n"
        f"Model: [dim]{model}[/dim]\n\n"
        "• Type '[bold]/help[/bold]' for available commands\n"
        "• Type '[bold]/quit[/bold]' or press Ctrl+C to exit\n"
        "• Use [bold]↑/↓[/bold] arrow keys to navigate command history\n"
        "• Ask questions naturally to start learning!"
    )

    console.print(Panel(welcome_text, title="Learning Catalyst", border_style="blue", padding=(1, 2)))

    if verbose:
        console.print(f"🔧 Debug: Config loaded from {config_manager.config_file}", style="dim")


if __name__ == "__main__":
    app()
