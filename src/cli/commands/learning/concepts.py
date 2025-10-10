"""
Concepts command implementation - Unified version with lazy loading and caching
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Union

from src.cli.commands.base import BaseCommand, CommandCategory, CommandInfo, CommandResult
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator


class ConceptsCommand(BaseCommand):
    """Concepts command implementation with lazy loading and caching"""

    def __init__(self):
        super().__init__()
        self.cache_file = None
        self.workspace_path = None

    def get_info(self) -> CommandInfo:
        return CommandInfo(
            name="concepts",
            description="View available learning concepts and materials with caching",
            aliases=["topics"],
            category=CommandCategory.LEARNING.value,
            usage="/concepts [--list] [--search <term>] [--refresh]",
        )

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the concepts command with lazy loading and caching"""
        try:
            workspace_path = context.get("workspace_path", os.getcwd())
            self.workspace_path = workspace_path

            learningspace_path = os.path.join(workspace_path, ".catalyst")
            self.cache_file = os.path.join(learningspace_path, "concepts_cache.json")
            db_path = os.path.join(learningspace_path, "data.db")
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)

            # Parse arguments
            refresh_cache = "--refresh" in args or "-r" in args
            list_all = "--list" in args or "-l" in args
            search_term = None

            # Extract search term
            for i, arg in enumerate(args):
                if arg in ["--search", "-s"] and i + 1 < len(args):
                    search_term = args[i + 1]
                    break

            # Load concepts with caching and lazy loading
            if refresh_cache or not self._is_cache_valid():
                concepts = await self._load_workspace_content(knowledge_navigator, workspace_path)
                self._save_cache(concepts)
            else:
                concepts = self._load_cache()
                # If cache fails, load from workspace
                if concepts is None:
                    concepts = await self._load_workspace_content(knowledge_navigator, workspace_path)
                    self._save_cache(concepts)

            if not concepts:
                cache_status = " (cache refreshed)" if refresh_cache else " (using cache)"
                return CommandResult(
                    success=True,
                    message=f"📚 No concepts found{cache_status}. Please make sure you have Markdown files in your workspace.\n\n"
                    "💡 Tip: Add some .md files to your workspace and try again.\n"
                    "💡 Tip: Use /concepts --refresh to reload after adding files.",
                )

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
            cache_status = " (refreshed cache)" if refresh_cache else " (using cache)" if not refresh_cache and self._is_cache_valid() else ""
            content = f"📚 Available Learning Concepts{cache_status}:\n\n"

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
            content += "💡 Tip: Use /concepts --refresh to reload workspace content\n"

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

    async def _load_workspace_content(self, knowledge_navigator: SQLiteKnowledgeNavigator, workspace_path: str) -> List:
        """Load content from workspace and extract concepts"""
        try:
            # Load content from workspace (lazy loading)
            await knowledge_navigator.load_content(workspace_path=workspace_path)
            # Get available concepts
            concepts = await knowledge_navigator.get_available_concepts()
            return concepts
        except Exception as e:
            print(f"[yellow]Warning: Could not load content from workspace {workspace_path}: {str(e)}[/yellow]")
            return []

    def _is_cache_valid(self) -> bool:
        """Check if cache exists and is valid"""
        if not self.cache_file or not os.path.exists(self.cache_file):
            return False

        try:
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)

            # Check if workspace has changed since cache was created
            cache_workspace = cache_data.get('workspace_path')
            cache_time = cache_data.get('timestamp', 0)

            if cache_workspace != self.workspace_path:
                return False

            # Check if any markdown files have been modified since cache
            if self._has_workspace_changed(cache_time):
                return False

            return True
        except (json.JSONDecodeError, KeyError, OSError):
            return False

    def _has_workspace_changed(self, cache_time: float) -> bool:
        """Check if workspace files have changed since cache was created"""
        try:
            from pathlib import Path

            workspace = Path(self.workspace_path)
            for md_file in workspace.glob("**/*.md"):
                if md_file.stat().st_mtime > cache_time:
                    return True
            return False
        except (OSError, ImportError):
            return True  # Assume changed if we can't check

    def _load_cache(self) -> Union[List, None]:
        """Load concepts from cache"""
        try:
            if not self.cache_file or not os.path.exists(self.cache_file):
                return None

            with open(self.cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)

            # Convert cached data back to concept objects
            concepts_data = cache_data.get('concepts', [])
            from src.data.models.concept import Concept

            concepts = []
            for concept_data in concepts_data:
                concept = Concept(
                    id=concept_data['id'],
                    title=concept_data['title'],
                    content=concept_data['content'],
                    prerequisites=concept_data.get('prerequisites', []),
                    difficulty_level=concept_data.get('difficulty_level', 1)
                )
                concepts.append(concept)

            return concepts
        except (json.JSONDecodeError, KeyError, OSError, ImportError):
            return None

    def _save_cache(self, concepts: List) -> None:
        """Save concepts to cache"""
        try:
            if not self.cache_file:
                return

            # Ensure cache directory exists
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)

            # Convert concepts to serializable format
            concepts_data = []
            for concept in concepts:
                concept_data = {
                    'id': concept.id,
                    'title': concept.title,
                    'content': concept.content,
                    'prerequisites': getattr(concept, 'prerequisites', []),
                    'difficulty_level': getattr(concept, 'difficulty_level', 1)
                }
                concepts_data.append(concept_data)

            cache_data = {
                'workspace_path': self.workspace_path,
                'timestamp': datetime.now().timestamp(),
                'concepts': concepts_data
            }

            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
        except OSError:
            # Fail silently if we can't save cache
            pass
