"""
Explain command implementation - Unified version
"""

import os
from typing import Any, Dict, List, Union

from src.ai.service import ModelAbstractionService
from src.cli.commands.base import BaseCommand, CommandCategory, CommandInfo, CommandResult
from src.core.catalyst_agent import CatalystAgentImpl

# Initialize knowledge navigator
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator


class ExplainCommand(BaseCommand):
    """Explain command implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="explain",
            description="Request an explanation for a concept",
            aliases=["exp"],
            category=CommandCategory.LEARNING.value,
            usage="/explain <concept>",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the explain command"""
        if not args:
            return CommandResult(
                success=False,
                message="Usage: /explain <concept-name>\nPlease specify what you'd like to learn about.\n\n"
                "💡 Tip: Use /concepts to see available topics.",
            )

        try:
            workspace_path = context.get("workspace_path", os.getcwd())
            concept_name = " ".join(args)

            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)

            # Get available concepts
            concepts = await knowledge_navigator.get_available_concepts()

            # Find matching concept (improved matching)
            target_concept = self._find_best_match(concept_name, concepts)

            if not target_concept:
                # Provide helpful suggestions
                suggestions = self._get_similar_concepts(concept_name, concepts)
                suggestion_text = ""
                if suggestions:
                    suggestion_text = "\n\n💡 Did you mean:\n" + "\n".join([f"   • {s}" for s in suggestions[:5]])

                return CommandResult(
                    success=False,
                    message=f"No concept found matching '{concept_name}'.{suggestion_text}\n\n"
                    f"💡 Tip: Use /concepts to see all available topics.",
                )

            model_service = ModelAbstractionService()
            catalyst_agent = CatalystAgentImpl(model_service, knowledge_navigator=knowledge_navigator)

            # Generate explanation using the catalyst agent
            explanation = await catalyst_agent.generate_explanation(target_concept, {"learning_level": "intermediate"})

            # Format the response
            content = f"📘 Explanation: {target_concept.title}\n\n{explanation}"

            # Add related concepts if available
            related_concepts = self._get_related_concepts(target_concept, concepts)
            if related_concepts:
                content += "\n\n🔗 Related concepts:\n" + "\n".join([f"   • {c}" for c in related_concepts[:3]])
                content += "\n\n💡 Tip: Use /explain <concept-name> to learn about related topics"

            return CommandResult(
                success=True,
                message=content,
                data={
                    "concept_id": target_concept.id,
                    "concept_title": target_concept.title,
                    "explanation": explanation,
                    "related_concepts": related_concepts,
                },
            )

        except (ImportError, ValueError, RuntimeError) as e:
            return CommandResult(success=False, message="Error generating explanation", error=str(e))

    def _find_best_match(self, search_term: str, concepts: List[Any]) -> Any:
        """Find the best matching concept for the search term"""
        search_lower = search_term.lower()

        # Exact match first
        for concept in concepts:
            if concept.title.lower() == search_lower:
                return concept

        # Partial matches
        best_match = None
        best_score = 0

        for concept in concepts:
            title_lower = concept.title.lower()

            # Check if search term is contained in title
            if search_lower in title_lower:
                score = len(search_lower) / len(title_lower)
                if score > best_score:
                    best_score = score
                    best_match = concept

            # Check word-by-word matching
            search_words = search_lower.split()
            title_words = title_lower.split()

            matches = sum(1 for word in search_words if word in title_words)
            if matches > 0:
                score = matches / len(search_words)
                if score > best_score:
                    best_score = score
                    best_match = concept

        return best_match if best_score > 0.3 else None  # Minimum threshold

    def _get_similar_concepts(self, search_term: str, concepts: List[Any], limit: int = 5) -> List[str]:
        """Get concept suggestions based on similarity"""
        search_lower = search_term.lower()
        suggestions: List[str] = []

        for concept in concepts:
            title_lower = concept.title.lower()

            # Simple similarity check
            if search_lower != title_lower:  # Don't suggest the exact term
                # Check for partial matches
                if search_lower in title_lower or title_lower in search_lower:
                    suggestions.append(concept.title)
                else:
                    # Check word similarity
                    search_words = set(search_lower.split())
                    title_words = set(title_lower.split())

                    if search_words & title_words:  # Has common words
                        suggestions.append(concept.title)

        return suggestions[:limit]

    def _get_related_concepts(self, target_concept: Any, concepts: List[Any], limit: int = 3) -> List[str]:
        """Get related concepts based on prerequisites or content similarity"""
        related: List[str] = []

        # Check prerequisites
        if hasattr(target_concept, "prerequisites") and target_concept.prerequisites:
            for prereq_id in target_concept.prerequisites:
                for concept in concepts:
                    if str(concept.id) == str(prereq_id):
                        related.append(concept.title)
                        break

        # Check concepts that have this as prerequisite
        for concept in concepts:
            if hasattr(concept, "prerequisites") and concept.prerequisites:
                if str(target_concept.id) in [str(p) for p in concept.prerequisites]:
                    related.append(concept.title)

        return related[:limit]

    def validate_args(self, args: List[str]) -> Union[str, None]:
        """Validate command arguments"""
        if len(args) == 0:
            return "At least one argument is required"
        return None
