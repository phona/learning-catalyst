"""
Session management for Learning Catalyst CLI
"""

import atexit
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from src.cli.core.interface import CLIInterface
from src.data.models.extended_models import Message


class SessionManager:
    """Manages CLI session state and operations"""

    def __init__(self, workspace_path: str, cli_interface: CLIInterface):
        self.workspace_path = workspace_path
        self.cli_interface = cli_interface
        self.session_id = self._generate_session_id()
        self.start_time = datetime.now()
        self.conversation_history: List[Message] = []
        self.session_data: Dict[str, Any] = {}
        self.history_file = os.path.join(workspace_path, ".catalyst", ".history")

        # Setup readline history
        self._setup_readline()

    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _setup_readline(self) -> None:
        """Setup readline for better input handling"""
        try:
            import readline

            # Enable tab completion
            readline.parse_and_bind("tab: complete")

            # Setup history file
            try:
                readline.read_history_file(self.history_file)
            except FileNotFoundError:
                # Create history file if it doesn't exist
                os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
                readline.write_history_file(self.history_file)

            # Set history length
            readline.set_history_length(1000)

            # Register save history at exit
            atexit.register(self._save_history)

            # Configure keyboard shortcuts
            self._configure_readline_shortcuts()

        except ImportError:
            # readline not available on Windows
            pass
        except Exception as e:
            # Log error but continue without readline enhancements
            self.cli_interface.display_warning(f"Could not setup readline: {str(e)}")

    def _configure_readline_shortcuts(self) -> None:
        """Configure readline keyboard shortcuts"""
        try:
            import readline

            # Check if using libedit (macOS) or GNU readline
            if "libedit" in str(readline.__doc__):
                # macOS libedit bindings
                readline.parse_and_bind("bind ^W ed-delete-prev-word")
                readline.parse_and_bind("bind ^U ed-kill-line")
                readline.parse_and_bind("bind ^[OA history-search-backward")
                readline.parse_and_bind("bind ^[OB history-search-forward")
            else:
                # GNU readline bindings
                readline.parse_and_bind("Control-w: unix-word-rubout")
                readline.parse_and_bind("Control-u: unix-line-discard")
                readline.parse_and_bind("\\e[A: history-search-backward")
                readline.parse_and_bind("\\e[B: history-search-forward")

        except Exception:
            # If shortcuts fail, continue without them
            pass

    def _save_history(self) -> None:
        """Save command history to file"""
        try:
            import readline

            readline.write_history_file(self.history_file)
        except Exception:
            pass

    def get_user_input(self, prompt: str = "Learning Catalyst > ") -> Optional[str]:
        """Get user input with proper handling"""
        try:
            # Use the CLI interface for consistent behavior
            if hasattr(self.cli_interface, "console") and self.cli_interface.console:
                user_input = self.cli_interface.console.input(f"[bold green]{prompt}[/bold green] ")
            else:
                user_input = input(prompt)

            return user_input.strip() if user_input else ""

        except KeyboardInterrupt:
            # Handle Ctrl+C gracefully
            self.cli_interface.display_warning("\nOperation cancelled. Press Ctrl+D to exit.")
            return None
        except EOFError:
            # Handle Ctrl+D (EOF)
            return "EOF"
        except Exception as e:
            self.cli_interface.display_error("Error getting input", str(e))
            return None

    def add_message(self, message: Message) -> None:
        """Add a message to conversation history"""
        self.conversation_history.append(message)

        # Limit conversation history
        if len(self.conversation_history) > 1000:
            self.conversation_history = self.conversation_history[-1000:]

    def get_conversation_history(self, limit: Optional[int] = None) -> List[Message]:
        """Get conversation history"""
        if limit:
            return self.conversation_history[-limit:]
        return self.conversation_history.copy()

    def clear_conversation_history(self) -> None:
        """Clear conversation history"""
        self.conversation_history.clear()

    def set_session_data(self, key: str, value: Any) -> None:
        """Set session data"""
        self.session_data[key] = value

    def get_session_data(self, key: str, default: Any = None) -> Any:
        """Get session data"""
        return self.session_data.get(key, default)

    def get_session_info(self) -> Dict[str, Any]:
        """Get session information"""
        return {
            "session_id": self.session_id,
            "workspace_path": self.workspace_path,
            "start_time": self.start_time.isoformat(),
            "duration": str(datetime.now() - self.start_time),
            "message_count": len(self.conversation_history),
            "session_data_keys": list(self.session_data.keys()),
        }

    def should_exit(self, user_input: Optional[str]) -> bool:
        """Check if the user wants to exit"""
        if user_input == "EOF":
            return True

        if user_input and user_input.lower() in ["/quit", "/exit", "/q"]:
            return True

        return False

    def display_startup_message(self, is_first_time: bool = False) -> None:
        """Display appropriate startup message"""
        if is_first_time:
            message = """
🎓 Welcome to Learning Catalyst! 🚀

This appears to be your first time using Learning Catalyst. Let's get you set up for a great learning experience!

📋 Quick Start Guide:
    1. Set up your AI provider configuration
    2. Explore available learning concepts
    3. Start your learning journey

💡 Tip: Use /help anytime to see all available commands
"""
        else:
            message = """
🎓 Welcome back to Learning Catalyst! 🚀

Ready to continue your learning journey?

💡 Quick Actions:
• View available concepts: /concepts
• Get help with commands: /help
• Check your configuration: /config

What would you like to do today?
"""

        startup_msg = Message(content=message, role="system")
        self.cli_interface.display_message(startup_msg)

    def display_goodbye_message(self) -> None:
        """Display goodbye message"""
        session_info = self.get_session_info()
        message = f"""
Thanks for using Learning Catalyst! 👋

Session Summary:
• Session ID: {session_info['session_id']}
• Duration: {session_info['duration']}
• Messages exchanged: {session_info['message_count']}

Goodbye and happy learning!
"""

        goodbye_msg = Message(content=message, role="system")
        self.cli_interface.display_message(goodbye_msg)

    def save_session_state(self) -> None:
        """Save current session state"""
        try:
            # This would integrate with the state manager
            # For now, just save basic session info
            session_file = os.path.join(self.workspace_path, ".catalyst", "session_state.json")

            os.makedirs(os.path.dirname(session_file), exist_ok=True)

            state = {
                "session_id": self.session_id,
                "last_activity": datetime.now().isoformat(),
                "workspace_path": self.workspace_path,
                "message_count": len(self.conversation_history),
            }

            with open(session_file, "w") as f:
                json.dump(state, f, indent=2)

        except Exception as e:
            self.cli_interface.display_warning(f"Could not save session state: {str(e)}")
