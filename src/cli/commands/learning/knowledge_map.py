"""
Knowledge Map command implementation - Unified version
"""

import os
from typing import Any, Dict, List, Optional

from src.cli.commands.base import BaseCommand, CommandCategory, CommandInfo, CommandResult
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.data.models.concept import Concept


class KnowledgeMapCommand(BaseCommand):
    """Knowledge Map command implementation"""

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="knowledge-map",
            description="Display the current knowledge map structure",
            aliases=["kmap"],
            category=CommandCategory.LEARNING.value,
            usage="/knowledge-map [--format <tree|list>] [--concept <concept>]",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the knowledge-map command"""
        try:
            workspace_path = context.get("workspace_path", os.getcwd())

            # Parse arguments
            format_type = self._extract_format(args)
            focus_concept = self._extract_focus_concept(args)

            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)

            # Get available concepts
            concepts = await knowledge_navigator.get_available_concepts()

            if not concepts:
                return CommandResult(
                    success=True,
                    message="🗺️  No concepts found. Please make sure you have Markdown files in your workspace.\n\n"
                    "💡 Tip: Add some .md files to your workspace and try again.",
                )

            # If focusing on a specific concept, filter the map
            if focus_concept:
                target_concept = self._find_best_match(focus_concept, concepts)
                if not target_concept:
                    return CommandResult(
                        success=False,
                        message=f"No concept found matching '{focus_concept}'.\n\n"
                        f"💡 Tip: Use /concepts to see available topics.",
                    )
                concepts = self._get_concept_and_related(target_concept, concepts)

            # Generate the knowledge map based on format
            if format_type == "tree":
                content = self._generate_tree_map(concepts)
            else:
                content = self._generate_list_map(concepts)

            # Add helpful tips
            content += "\n💡 Tip: Use /explain <concept-name> to learn more about a specific concept"
            content += "\n💡 Tip: Use /quiz <concept-name> to test your knowledge"

            if not focus_concept:
                content += "\n💡 Tip: Use /knowledge-map --concept <name> to focus on a specific " "concept"

            return CommandResult(
                success=True,
                message=content,
                data={
                    "concepts": [{"id": c.id, "title": c.title} for c in concepts],
                    "total_count": len(concepts),
                    "format": format_type,
                    "focus_concept": focus_concept,
                },
            )

        except Exception as e:
            return CommandResult(success=False, message="Error displaying knowledge map", error=str(e))

    def _extract_format(self, args: List[str]) -> str:
        """Extract format type from arguments"""
        for i, arg in enumerate(args):
            if arg in ["--format", "-f"] and i + 1 < len(args):
                format_type = args[i + 1].lower()
                if format_type in ["tree", "list"]:
                    return format_type
        return "tree"  # Default

    def _extract_focus_concept(self, args: List[str]) -> str:
        """Extract focus concept from arguments"""
        for i, arg in enumerate(args):
            if arg in ["--concept", "-c"] and i + 1 < len(args):
                return args[i + 1]
        return None

    def _find_best_match(self, search_term: str, concepts: List[Concept]) -> Optional[Concept]:
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

    def _get_concept_and_related(self, target_concept: Any, concepts: List[Concept]) -> List[Concept]:
        """Get the target concept and its related concepts"""
        related_ids = set()
        related_ids.add(str(target_concept.id))

        # Add prerequisites
        if hasattr(target_concept, "prerequisites") and target_concept.prerequisites:
            related_ids.update([str(p) for p in target_concept.prerequisites])

        # Add concepts that have this as prerequisite
        for concept in concepts:
            if hasattr(concept, "prerequisites") and concept.prerequisites:
                if str(target_concept.id) in [str(p) for p in concept.prerequisites]:
                    related_ids.add(str(concept.id))

        # Filter concepts
        return [c for c in concepts if str(c.id) in related_ids]

    def _generate_tree_map(self, concepts: List[Concept]) -> str:
        """Generate a tree-style knowledge map"""
        content = "🗺️  Knowledge Map:\n\n"

        # Group concepts by level (based on prerequisites)
        levels = self._organize_by_level(concepts)

        for level, level_concepts in sorted(levels.items()):
            content += f"📊 Level {level}:\n"
            for concept in level_concepts:
                content += f"   📚 {concept.title} (ID: {concept.id})\n"

                # Show prerequisites if any
                if hasattr(concept, "prerequisites") and concept.prerequisites:
                    prereq_names = []
                    for prereq_id in concept.prerequisites:
                        for prereq_concept in concepts:
                            if str(prereq_concept.id) == str(prereq_id):
                                prereq_names.append(prereq_concept.title)
                                break
                    if prereq_names:
                        content += f"      ⬅️  Requires: {', '.join(prereq_names)}\n"

            content += "\n"

        # Add statistics
        content += "📈 Statistics:\n"
        content += f"   Total concepts: {len(concepts)}\n"
        content += f"   Max level: {max(levels.keys()) if levels else 0}\n"

        return content

    def _generate_list_map(self, concepts: List[Concept]) -> str:
        """Generate a list-style knowledge map"""
        content = "🗺️  Knowledge Map:\n\n"
        content += "📚 Concepts:\n"

        # Sort concepts alphabetically
        sorted_concepts = sorted(concepts, key=lambda c: c.title.lower())

        for concept in sorted_concepts:
            content += f"   • {concept.title} (ID: {concept.id})\n"

            # Show prerequisites if any
            if hasattr(concept, "prerequisites") and concept.prerequisites:
                prereq_names = []
                for prereq_id in concept.prerequisites:
                    for prereq_concept in concepts:
                        if str(prereq_concept.id) == str(prereq_id):
                            prereq_names.append(prereq_concept.title)
                            break
                if prereq_names:
                    content += f"     Prerequisites: {', '.join(prereq_names)}\n"

        content += "\n🔗 Relationships:\n"

        # Show prerequisite relationships
        relationship_count = 0
        for concept in concepts:
            if hasattr(concept, "prerequisites") and concept.prerequisites:
                for prereq_id in concept.prerequisites:
                    for prereq_concept in concepts:
                        if str(prereq_concept.id) == str(prereq_id):
                            content += f"   {prereq_concept.title} → {concept.title}\n"
                            relationship_count += 1
                            break

        if relationship_count == 0:
            content += "   No prerequisite relationships found\n"

        # Add statistics
        content += "\n📈 Statistics:\n"
        content += f"   Total concepts: {len(concepts)}\n"
        content += f"   Relationships: {relationship_count}\n"

        return content

    def _organize_by_level(self, concepts: List[Concept]) -> Dict[int, List[Concept]]:
        """Organize concepts by their level based on prerequisites"""
        levels = {0: []}  # Level 0 for concepts with no prerequisites

        # Determine levels
        remaining_concepts = concepts.copy()
        max_iterations = len(concepts) + 1  # Prevent infinite loops

        for iteration in range(max_iterations):
            current_level_concepts = []

            for concept in remaining_concepts[:]:  # Copy to avoid modification during iteration
                if hasattr(concept, "prerequisites") and concept.prerequisites:
                    # Check if all prerequisites are already placed
                    prereq_levels = []
                    all_prereqs_placed = True

                    for prereq_id in concept.prerequisites:
                        prereq_found = False
                        for level, level_concepts in levels.items():
                            if any(str(c.id) == str(prereq_id) for c in level_concepts):
                                prereq_levels.append(level)
                                prereq_found = True
                                break

                        if not prereq_found:
                            all_prereqs_placed = False
                            break

                    if all_prereqs_placed:
                        concept_level = max(prereq_levels) + 1 if prereq_levels else 0
                        if concept_level not in levels:
                            levels[concept_level] = []
                        levels[concept_level].append(concept)
                        remaining_concepts.remove(concept)

            # If no progress was made, break to prevent infinite loop
            if not current_level_concepts and remaining_concepts:
                # Add remaining concepts to level 0 (circular dependencies or issues)
                levels[0].extend(remaining_concepts)
                break

        return levels

    def validate_args(self, args: List[str]) -> str | None:
        """Validate command arguments"""
        # Check for valid flag combinations
        for i, arg in enumerate(args):
            if arg in ["--format", "--concept", "-f", "-c"]:
                if i + 1 >= len(args):
                    return f"Missing value for {arg} flag"

        # Check for valid format values
        for i, arg in enumerate(args):
            if arg in ["--format", "-f"] and i + 1 < len(args):
                if args[i + 1].lower() not in ["tree", "list"]:
                    return "Format must be 'tree' or 'list'"

        return None
