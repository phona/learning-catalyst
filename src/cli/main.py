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
from rich.panel import Panel
from rich.text import Text

from ..core.config import ConfigManager
from ..core.exceptions import ValidationError
from .interface import CLIInterface


# Create main Typer app
app = typer.Typer(
    name="learning-catalyst",
    help="🧠 An AI-driven interactive learning companion",
    invoke_without_command=True,
    rich_markup_mode="rich"
)

# Global console instance
console = Console()


@app.callback()
def main(
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Enable verbose output"
    ),
    config_dir: Optional[Path] = typer.Option(
        None,
        "--config-dir",
        help="Custom configuration directory"
    )
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

        # Start interactive mode
        asyncio.run(run_interactive_mode(config_manager, verbose))

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
                    Text("🎉 Welcome to Learning Catalyst!\n\n"
                         "This appears to be your first time running the application.\n"
                         "Configuration has been initialized with default settings.\n\n"
                         "Use '/config' commands to customize your experience.",
                         style="bold"),
                    title="First Time Setup",
                    border_style="green"
                )
            )

        return config_manager

    except Exception as e:
        console.print(f"❌ Failed to setup configuration: {str(e)}", style="red")
        raise


async def run_interactive_mode(config_manager: ConfigManager, verbose: bool = False) -> None:
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

    # Setup async input handler
    async def get_input(prompt: str) -> str:
        # Print styled prompt and get input
        console.print(prompt, style="bold blue", end="")
        return input()

    cli_interface.set_input_handler(get_input)

    # Display welcome message
    display_welcome_message(config_manager, verbose)

    # Run the interactive loop
    await cli_interface.run_interactive_loop()


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
        "Type '[bold]/help[/bold]' for available commands\n"
        "Type '[bold]/quit[/bold]' or press Ctrl+C to exit"
    )

    console.print(
        Panel(
            welcome_text,
            title="Learning Catalyst",
            border_style="blue",
            padding=(1, 2)
        )
    )

    if verbose:
        console.print(f"🔧 Debug: Config loaded from {config_manager.config_file}", style="dim")


if __name__ == "__main__":
    app()