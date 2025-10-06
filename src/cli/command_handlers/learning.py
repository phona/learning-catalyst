"""
Learning command handlers
"""

import asyncio
from typing import Any, Dict, List

from .base import BaseCommandHandler, CommandInfo


class LearningCommandHandler(BaseCommandHandler):
    """Handler for learning-related commands"""

    def get_commands(self) -> List[CommandInfo]:
        """Return list of learning commands"""
        return [
            CommandInfo(
                name="concepts",
                description="View available learning concepts and materials",
                aliases=["topics"],
                usage="/concepts [--list] [--search <term>]",
                category="Learning",
            ),
            CommandInfo(
                name="explain",
                description="Request an explanation for a concept",
                aliases=["exp"],
                usage="/explain <concept>",
                category="Learning",
            ),
            CommandInfo(
                name="quiz",
                description="Request a quiz or challenge on a concept",
                aliases=["challenge"],
                usage="/quiz <concept>",
                category="Learning",
            ),
            CommandInfo(
                name="knowledge-map",
                description="Display the current knowledge map structure",
                aliases=["kmap"],
                usage="/knowledge-map",
                category="Learning",
            ),
        ]

    def _concepts_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the concepts command"""
        try:
            # Get available concepts
            concepts = asyncio.run(self.context.knowledge_navigator.get_available_concepts())

            if not concepts:
                self._display_message(
                    "No concepts found. Please make sure you have Markdown files in your workspace."
                )
                return

            # Format and display concepts
            content = "📚 Available Learning Concepts:\n\n"
            for concept in concepts[:20]:  # Limit to first 20 concepts
                content += f"• {concept.title}\n"
                if hasattr(concept, "prerequisites") and concept.prerequisites:
                    content += f"  Prerequisites: {', '.join(concept.prerequisites)}\n"
                content += "\n"

            if len(concepts) > 20:
                content += f"... and {len(concepts) - 20} more concepts\n\n"

            content += "💡 Tip: Use /explain <concept-name> to learn more about a specific concept\n"
            content += "💡 Tip: Use /quiz <concept-name> to test your knowledge\n"

            self._display_message(content)

        except Exception as e:
            self._display_error("Error retrieving concepts", str(e))

    def _explain_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the explain command"""
        if not args:
            self._display_message(
                "Usage: /explain <concept-name>\nPlease specify what you'd like to learn about."
            )
            return

        try:
            # Import required modules inside the handler to avoid circular imports
            from src.core.catalyst_agent import CatalystAgentImpl
            from src.ai.service import ModelAbstractionService

            # Initialize components
            model_service = ModelAbstractionService()
            catalyst_agent = CatalystAgentImpl(
                model_service, knowledge_navigator=self.context.knowledge_navigator
            )

            # Search for the requested concept
            concept_name = " ".join(args)
            concepts = asyncio.run(self.context.knowledge_navigator.get_available_concepts())

            # Find matching concept (simple matching for now)
            target_concept = None
            for concept in concepts:
                if concept_name.lower() in concept.title.lower():
                    target_concept = concept
                    break

            if not target_concept:
                self._display_message(
                    f"No concept found matching '{concept_name}'. "
                    f"Try using /concepts to see available topics."
                )
                return

            # Generate explanation using the catalyst agent
            explanation = asyncio.run(
                catalyst_agent.generate_explanation(target_concept, {"learning_level": "intermediate"})
            )

            self._display_message(f"📘 Explanation: {target_concept.title}\n\n{explanation}")

        except Exception as e:
            self._display_error("Error generating explanation", str(e))

    def _quiz_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the quiz command"""
        if not args:
            self._display_message(
                "Usage: /quiz <concept-name>\nPlease specify what you'd like to be quizzed on."
            )
            return

        try:
            # Import required modules inside the handler to avoid circular imports
            from src.core.catalyst_agent import CatalystAgentImpl
            from src.ai.service import ModelAbstractionService

            # Initialize components
            model_service = ModelAbstractionService()
            catalyst_agent = CatalystAgentImpl(
                model_service, knowledge_navigator=self.context.knowledge_navigator
            )

            # Search for the requested concept
            concept_name = " ".join(args)
            concepts = asyncio.run(self.context.knowledge_navigator.get_available_concepts())

            # Find matching concept (simple matching for now)
            target_concept = None
            for concept in concepts:
                if concept_name.lower() in concept.title.lower():
                    target_concept = concept
                    break

            if not target_concept:
                self._display_message(
                    f"No concept found matching '{concept_name}'. "
                    f"Try using /concepts to see available topics."
                )
                return

            # Generate challenge using the catalyst agent
            challenge_data = asyncio.run(
                catalyst_agent.generate_challenge(
                    target_concept, {"challenge_type": "multiple-choice", "difficulty": "medium"}
                )
            )

            self._display_message(
                f"❓ Challenge: {target_concept.title}\n\n"
                f"{challenge_data.get('challenge_text', 'Challenge content not available.')}"
            )

        except Exception as e:
            self._display_error("Error generating challenge", str(e))

    def _knowledge_map_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the knowledge-map command"""
        try:
            # Get available concepts
            concepts = asyncio.run(self.context.knowledge_navigator.get_available_concepts())

            if not concepts:
                self._display_message(
                    "No concepts found. Please make sure you have Markdown files in your workspace."
                )
                return

            # Format and display knowledge map
            content = "🗺️  Knowledge Map:\n\n"
            content += "  Concepts:\n"

            for concept in concepts:
                content += f"    • {concept.title} (ID: {concept.id})\n"

            content += "\n  Relationships:\n"

            # For now, we'll show a simple relationship structure
            # In a real implementation, this would be more sophisticated
            content += "    • Hierarchical relationships based on document structure\n"

            content += "\n💡 Tip: Use /explain <concept-name> to learn more about a specific concept"

            self._display_message(content)

        except Exception as e:
            self._display_error("Error displaying knowledge map", str(e))