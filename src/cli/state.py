"""
CLI state management for Learning Catalyst.

Simple state tracking for CLI sessions.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class CLIState:
    """Current state of the CLI interface."""
    session_active: bool = True
    current_provider: Optional[str] = None
    current_model: Optional[str] = None
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    user_input: str = ""
    ai_session_id: Optional[str] = None  # For AI integration

    def add_to_history(self, role: str, content: str) -> None:
        """Add a message to conversation history."""
        self.conversation_history.append({
            "role": role,
            "content": content
        })

        # Keep only last 50 messages
        if len(self.conversation_history) > 50:
            self.conversation_history = self.conversation_history[-50:]

    def get_recent_history(self, count: int = 5) -> List[Dict[str, str]]:
        """Get recent conversation history."""
        return self.conversation_history[-count:]

    def clear_history(self) -> None:
        """Clear conversation history."""
        self.conversation_history = []

    def get_session_info(self) -> Dict[str, Any]:
        """Get current session information."""
        return {
            "active": self.session_active,
            "provider": self.current_provider,
            "model": self.current_model,
            "history_length": len(self.conversation_history),
            "ai_session_id": self.ai_session_id[:8] + "..." if self.ai_session_id else None
        }