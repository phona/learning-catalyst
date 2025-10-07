"""
System-related interfaces for Learning Catalyst application
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from src.data.models.concept import Concept


class ChallengeEngine(ABC):
    @abstractmethod
    async def generate_challenge(self, concept: Concept, difficulty: str, challenge_type: str) -> Dict[str, Any]:
        """Generate a challenge for a concept"""

    @abstractmethod
    async def evaluate_answer(self, user_answer: str, challenge_data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate user's answer to a challenge"""

    @abstractmethod
    async def get_feedback(self, evaluation_result: Dict[str, Any]) -> str:
        """Generate feedback for user based on evaluation"""


class CheckpointManager(ABC):
    @abstractmethod
    async def save_checkpoint(self, checkpoint_id: str, state_data: Dict[str, Any]) -> bool:
        """Save application state checkpoint"""

    @abstractmethod
    async def load_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """Load application state checkpoint"""

    @abstractmethod
    async def list_checkpoints(self) -> List[Dict[str, Any]]:
        """List all available checkpoints"""

    @abstractmethod
    async def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint"""


class SystemCommandsHandler(ABC):
    @abstractmethod
    async def handle_command(self, command: str, args: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle system command"""

    @abstractmethod
    async def get_help(self, command: str = None) -> str:
        """Get help text for commands"""

    @abstractmethod
    async def clear_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Clear conversation context"""
