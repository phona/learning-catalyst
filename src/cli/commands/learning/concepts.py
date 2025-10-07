"""
Concepts command implementation - Unified version
"""

import os
from typing import Any, Dict, List, Union

from src.cli.commands.base import BaseCommand, CommandCategory, CommandInfo, CommandResult
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator


class ConceptsCommand(BaseCommand):
    """Concepts command implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="concepts",
            description="View available learning concepts and materials",
            aliases=["topics"],
            category=CommandCategory.LEARNING.value,
            usage="/concepts [--list] [--search <term>]",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the concepts command"""
        try:
            workspace_path = context.get("workspace_path", os.getcwd())

            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)

            # Get available concepts
            concepts = await knowledge_navigator.get_available_concepts()

            if not concepts:
                return CommandResult(
                    success=True,
                    message="📚 No concepts found. Please make sure you have Markdown files in your workspace.\n\n"
                    "💡 Tip: Add some .md files to your workspace and try again.",
                )

            # Parse arguments
            list_all = "--list" in args or "-l" in args
            search_term = None

            # Extract search term
            for i, arg in enumerate(args):
                if arg in ["--search", "-s"] and i + 1 < len(args):
                    search_term = args[i + 1]
                    break

            # Filter concepts if searching
            if search_term:
                search_lower = search_term.lower()
                concepts = [
                    concept
                    for concept in concepts
                    if search_lower in concept.title.lower()
                    or (hasattr(concept, "content") and concept.content and search_lower in concept.content.lower())
                ]

            if not concepts:
                return CommandResult(
                    success=True,
                    message=f"📚 No concepts found matching '{search_term}'.\n\n"
                    f"💡 Tip: Try a different search term or use /concepts to see all available topics.",
                )

            # Format and display concepts
            content = "📚 Available Learning Concepts:\n\n"

            if list_all:
                # Show all concepts
                for i, concept in enumerate(concepts, 1):
                    content += f"{i}. {concept.title}\n"
                    if hasattr(concept, "prerequisites") and concept.prerequisites:
                        content += f"   Prerequisites: {', '.join(concept.prerequisites)}\n"
                    if hasattr(concept, "content") and concept.content:
                        # Show a brief preview
                        preview = concept.content[:100].replace("\n", " ").strip()
                        if len(concept.content) > 100:
                            preview += "..."
                        content += f"   Preview: {preview}\n"
                    content += "\n"
            else:
                # Show limited list (first 20)
                display_concepts = concepts[:20]
                for concept in display_concepts:
                    content += f"• {concept.title}\n"
                    if hasattr(concept, "prerequisites") and concept.prerequisites:
                        content += f"  Prerequisites: {', '.join(concept.prerequisites)}\n"
                    content += "\n"

                if len(concepts) > 20:
                    content += f"... and {len(concepts) - 20} more concepts\n\n"
                    content += "💡 Tip: Use /concepts --list to see all concepts\n"

            # Add helpful tips
            content += "💡 Tip: Use /explain <concept-name> to learn more about a specific concept\n"
            content += "💡 Tip: Use /quiz <concept-name> to test your knowledge\n"

            if search_term:
                content += f"💡 Tip: Showing results for search: '{search_term}'\n"

            return CommandResult(
                success=True,
                message=content,
                data={
                    "concepts": [{"id": c.id, "title": c.title} for c in concepts],
                    "total_count": len(concepts),
                    "search_term": search_term,
                },
            )

        except (ImportError, ValueError, RuntimeError) as e:
            return CommandResult(success=False, message="Error retrieving concepts", error=str(e))

    def validate_args(self, args: List[str]) -> Union[str, None]:
        """Validate command arguments"""
        # Check for valid argument combinations
        if "--search" in args and "-s" in args:
            return "Cannot use both --search and -s flags"

        # Check if search term is provided
        for i, arg in enumerate(args):
            if arg in ["--search", "-s"] and i + 1 >= len(args):
                return "Missing search term"

        return None
