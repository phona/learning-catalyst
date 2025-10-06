"""
Autocomplete functionality for Learning Catalyst CLI
Provides command and concept autocompletion
"""
import os
import re
from typing import Any, Dict, List, Optional

from src.cli.command_palette import CommandPalette
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.data.models.extended_models import Message


class AutoCompleter:
    """Handles autocompletion for commands and concepts"""

    def __init__(self, command_palette: CommandPalette, workspace_path: str):
        self.command_palette = command_palette
        self.workspace_path = workspace_path
        self.knowledge_navigator = None
        self._init_knowledge_navigator()

    def _init_knowledge_navigator(self) -> None:
        """Initialize the knowledge navigator"""
        try:
            learningspace_path = os.path.join(self.workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            self.knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
        except Exception:
            # If we can't initialize the knowledge navigator, we'll continue without it
            self.knowledge_navigator = None

    def get_completions(self, text: str, state: int) -> Optional[str]:
        """
        Get completion for the given text

        Args:
            text: The current input text
            state: The state of completion (0 for first call, >0 for subsequent calls)

        Returns:
            The next completion or None if no more completions
        """
        # Store completions between calls
        if not hasattr(self, '_completions'):
            self._completions = []
            self._completion_index = 0

        # If state is 0, we're starting a new completion
        if state == 0:
            self._completions = self._get_matching_completions(text)
            self._completion_index = 0

        # Return the current completion or None if we've exhausted all completions
        if self._completion_index < len(self._completions):
            completion = self._completions[self._completion_index]
            self._completion_index += 1
            return completion

        return None

    def _get_matching_completions(self, text: str) -> List[str]:
        """Get all matching completions for the given text"""
        completions = []

        # If text starts with /, we're completing a command
        if text.startswith('/'):
            command_completions = self._get_command_completions(text)
            completions.extend(command_completions)
        else:
            # Check if we're in a command that takes concept arguments
            concept_completions = self._get_concept_completions(text)
            completions.extend(concept_completions)

        return completions

    def _get_command_completions(self, text: str) -> List[str]:
        """Get command completions for the given text"""
        completions = []

        # Get command suggestions from the command palette
        command_suggestions = self.command_palette.get_autocomplete_suggestions(text)
        completions.extend(command_suggestions)

        return completions

    def _get_concept_completions(self, text: str) -> List[str]:
        """Get concept completions for the given text"""
        completions = []

        # Get concept suggestions from the command palette
        context = {'workspace_path': self.workspace_path}
        concept_suggestions = self.command_palette.get_concept_suggestions(text, context)
        completions.extend(concept_suggestions)

        return completions

    def setup_readline_completion(self) -> None:
        """Set up readline completion for the CLI"""
        try:
            import readline

            # Set up the completer function
            readline.set_completer(self.get_completions)

            # Enable tab completion
            readline.parse_and_bind("tab: complete")

            # Set up history
            history_file = os.path.join(self.workspace_path, ".catalyst", "history")
            if os.path.exists(history_file):
                readline.read_history_file(history_file)

            # Set up history saving on exit
            import atexit
            atexit.register(readline.write_history_file, history_file)

        except ImportError:
            # readline is not available on all platforms
            pass

    def get_command_history(self, limit: int = 10) -> List[str]:
        """Get recent command history"""
        return self.command_palette.get_command_history()[:limit]

    def add_to_command_history(self, command: str) -> None:
        """Add a command to the history"""
        self.command_palette.add_to_history(command)
