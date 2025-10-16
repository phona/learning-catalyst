"""
Main entry point for Learning Catalyst CLI application.

Minimal Typer-based CLI interface that provides the application entry point
and launches the interactive learning session.
"""

import asyncio
import os
import signal
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
    rich_markup_mode=None,
)

def create_rich_console() -> Console:
    """Create Rich console with optimal configuration for ANSI handling."""
    # Detect terminal capabilities
    is_terminal = sys.stdout.isatty()
    force_colors = os.getenv("FORCE_COLOR", "0") == "1" or os.getenv("CLICOLOR", "0") != "0"

    # More conservative console configuration to avoid ANSI issues
    console_config = {
        "legacy_windows": False,
        "force_terminal": is_terminal or force_colors,
        "no_color": False,  # Keep color processing enabled
        "width": None,
        "file": None,
        "color_system": "truecolor" if (is_terminal or force_colors) else None,  # Disable color system completely if no terminal
        "force_interactive": False,  # Let prompt-toolkit handle interaction
        "emoji": False,  # Disable emoji processing that can cause issues
        "markup": True,  # Keep markup enabled
        "highlight": False,  # Disable syntax highlighting to avoid ANSI issues
        "soft_wrap": True,  # Enable soft wrapping for better text handling
        "tab_size": 4,
    }

    return Console(**console_config)

# Global console instance - configured for proper ANSI handling
console = create_rich_console()


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

        # Setup logging - use .catalyst subdirectory within config dir
        log_file = Path(config_manager.config_dir) / ".catalyst" / "logs" / "learning_catalyst.log"
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
    # Create and configure CLI interface with shared console
    cli_interface = CLIInterface(config_manager, console=console)

    # Setup Rich console handlers with safe ANSI processing for output only
    cli_interface.set_output_handler("response", lambda msg: _safe_print(msg, style=""))
    cli_interface.set_output_handler("error", lambda msg: _safe_print(f"❌ {msg}", style="red"))
    cli_interface.set_output_handler("info", lambda msg: _safe_print(f"ℹ️  {msg}", style="dim blue"))
    cli_interface.set_output_handler("markdown", lambda msg: _render_markdown(msg))
    cli_interface.set_output_handler("rich_panel", lambda panel: console.print(panel))

    # Note: CLI interface handles its own enhanced input with prompt-toolkit
    # This enables tab completion and other enhanced features

    # Display welcome message
    display_welcome_message(config_manager, verbose)

    # Setup enhanced signal handling for streaming cancellation
    def signal_handler(signum, frame):
        """Handle SIGINT for graceful streaming cancellation."""
        console.print("\n⏹️ Received interrupt signal...", style="yellow")
        # The CLI interface will handle the actual cancellation
        cli_interface.cancel_streaming()

    # Register signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)

    # Run the interactive loop
    try:
        asyncio.run(cli_interface.run_interactive_loop())
    except KeyboardInterrupt:
        console.print("\n👋 Goodbye!", style="green")
    except Exception as e:
        console.print(f"\n❌ Unexpected error: {str(e)}", style="red")
        if verbose:
            console.print_exception()
        sys.exit(1)


def _safe_print(content: str, style: str = "") -> None:
    """Print content safely, handling ANSI escape sequences properly."""
    import re
    import sys

    # Check if content contains actual ANSI escape sequences or malformed ones
    has_ansi = re.search(r'\x1B\[[0-?]*[ -/]*[@-~]', content)
    has_malformed = re.search(r'\?\[[0-9;]*m', content)

    # Also check for common patterns that indicate ANSI issues
    has_reset_pattern = re.search(r'\?\[0m', content)

    if has_ansi or has_malformed or has_reset_pattern:
        # Content has ANSI codes (proper or malformed), strip them completely
        cleaned = content

        # Fix malformed ANSI sequences - replace ?[ with proper escape first
        cleaned = re.sub(r'\?\[', '\x1b[', cleaned)

        # Remove ALL ANSI escape sequences (the fixed ones and original ones)
        cleaned = re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', cleaned)

        # Remove any remaining malformed patterns
        cleaned = re.sub(r'\?\[[0-9;]*m', '', cleaned)
        cleaned = re.sub(r'\?\[[^\]]*\]', '', cleaned)

        # Additional cleanup for complex mixed patterns
        cleaned = re.sub(r'\?\[[^\]]*\?\[[^\]]*\]', '', cleaned)
        cleaned = re.sub(r'\?\[[^\]]*\?\[[^\]]*\?\[[^\]]*\]', '', cleaned)

        # Remove any remaining control characters
        cleaned = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', cleaned)

        # Print clean content without ANSI
        print(cleaned, end='', flush=True)
    else:
        # Clean content, use Rich console for proper formatting
        console.print(content, style=style)


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