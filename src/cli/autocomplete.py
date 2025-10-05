"""
Autocomplete functionality for Learning Catalyst CLI
Provides intelligent command and argument suggestions
"""
import difflib
from typing import Any, Dict, List

from src.cli.command_palette import CommandPalette
from src.data.models.concept import Concept


class AutocompleteEngine:
    """Autocomplete engine for CLI commands and concepts"""

    def __init__(self, command_palette: CommandPalette):
        self.command_palette = command_palette
        self.learned_concepts: List[Concept] = []
        self.recent_inputs: List[str] = []

    def suggest_commands(self, partial_input: str) -> List[str]:
        """
        Suggest commands based on partial input

        Args:
            partial_input: The partially typed command

        Returns:
            List of suggested commands sorted by relevance
        """
        if not partial_input.startswith('/'):
            return []

        # Extract the command part (after /)
        command_part = partial_input[1:].strip().split()
        if not command_part:
            # If only "/" is typed, suggest all commands
            all_commands = [f"/{cmd.name}" for cmd in self.command_palette.get_command_list()]
            return sorted(all_commands)[:10]  # Limit to top 10

        typed_command = command_part[0].lower()

        # Get all available commands
        all_commands = []
        for cmd in self.command_palette.get_command_list():
            all_commands.append(cmd.name)
            all_commands.extend(cmd.aliases)

        # Find close matches using difflib
        matches = difflib.get_close_matches(typed_command, all_commands, n=5, cutoff=0.3)

        # Add prefix and sort by length (shorter first)
        suggestions = [f"/{match}" for match in matches]
        return sorted(suggestions, key=len)

    def suggest_concepts(self, partial_text: str) -> List[str]:
        """
        Suggest learned concepts based on partial text

        Args:
            partial_text: The partially typed concept name

        Returns:
            List of suggested concepts sorted by relevance
        """
        if not partial_text:
            return []

        # Get concept names
        concept_names = [concept.name for concept in self.learned_concepts]

        # Find close matches
        matches = difflib.get_close_matches(partial_text.lower(),
                                          [name.lower() for name in concept_names],
                                          n=5, cutoff=0.3)

        # Return original case names
        result = []
        for match in matches:
            for concept in self.learned_concepts:
                if concept.name.lower() == match:
                    result.append(concept.name)
                    break

        return result

    def update_learned_concepts(self, concepts: List[Concept]) -> None:
        """
        Update the list of learned concepts for suggestions

        Args:
            concepts: List of concepts to use for suggestions
        """
        self.learned_concepts = concepts

    def add_recent_input(self, input_text: str) -> None:
        """
        Add input to recent history for better suggestions

        Args:
            input_text: The input text to add to history
        """
        self.recent_inputs.append(input_text)
        # Keep only last 50 inputs
        if len(self.recent_inputs) > 50:
            self.recent_inputs = self.recent_inputs[-50:]

    def get_context_aware_suggestions(self, current_input: str, context: Dict[str, Any]) -> List[str]:
        """
        Get context-aware suggestions based on current input and application context

        Args:
            current_input: The current user input
            context: Application context including state, recent commands, etc.

        Returns:
            List of contextually relevant suggestions
        """
        suggestions = []

        # If it starts with /, suggest commands
        if current_input.startswith('/'):
            suggestions.extend(self.suggest_commands(current_input))
        else:
            # For regular text, suggest concepts if we're in a learning context
            if context.get('mode') == 'learning':
                suggestions.extend(self.suggest_concepts(current_input))

            # Add recent inputs that are similar
            if current_input:
                recent_matches = difflib.get_close_matches(
                    current_input.lower(),
                    [inp.lower() for inp in self.recent_inputs],
                    n=3,
                    cutoff=0.4
                )
                suggestions.extend(recent_matches)

        # Remove duplicates while preserving order
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion not in seen:
                seen.add(suggestion)
                unique_suggestions.append(suggestion)

        return unique_suggestions[:10]  # Limit to 10 suggestions

    def get_argument_suggestions(self, command: str, argument_position: int,
                               partial_argument: str) -> List[str]:
        """
        Get suggestions for command arguments

        Args:
            command: The command name
            argument_position: Position of the argument (0-indexed)
            partial_argument: Partially typed argument

        Returns:
            List of suggested arguments
        """
        cmd_info = self.command_palette.get_command_by_name(command.replace('/', ''))
        if not cmd_info:
            return []

        suggestions = []

        # Special handling for specific commands
        if cmd_info.name == "checkpoint":
            if argument_position == 0:
                # First argument for checkpoint command is action
                actions = ["save", "load", "list"]
                suggestions = difflib.get_close_matches(partial_argument, actions, n=3, cutoff=0.3)
            elif argument_position == 1 and partial_argument:
                # Second argument could be checkpoint name
                # In a real implementation, this would fetch actual checkpoint names
                suggestions = ["recent_checkpoint", "last_session", "beginner_concepts"]

        elif cmd_info.name == "help":
            if argument_position == 0 and partial_argument:
                # Help command argument is another command name
                all_commands = [cmd.name for cmd in self.command_palette.get_command_list()]
                suggestions = difflib.get_close_matches(partial_argument, all_commands, n=5, cutoff=0.3)

        return suggestions
