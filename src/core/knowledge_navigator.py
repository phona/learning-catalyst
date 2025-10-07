"""
SQLite implementation of KnowledgeNavigator
"""

import json
import sqlite3
from typing import Any, Dict, List, Optional

from src.core.interfaces.base import KnowledgeNavigator
from src.data.models.concept import Concept
from src.data.models.extended_models import KnowledgeMap, UserProgress
from src.utils.markdown_parser import MarkdownParser, extract_all_concepts


class SQLiteKnowledgeNavigator(KnowledgeNavigator):
    """SQLite implementation of the KnowledgeNavigator interface.

    Manages concepts and their relationships using a SQLite database.
    Provides functionality to load content from markdown files and
    retrieve concepts with their learning paths.
    """

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        # Initialize the database schema based on the architecture document
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create concepts table
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS concepts (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            prerequisites TEXT,
            difficulty_level INTEGER
        )
        """
        )

        conn.commit()
        conn.close()

    async def load_content(
        self, file_path: str = "", workspace_path: Optional[str] = None, extraction_mode: str = "headers"
    ) -> KnowledgeMap:
        # Implementation to load markdown content into knowledge map
        parser = MarkdownParser(extraction_mode)

        concepts = []
        relationships = []

        # If workspace_path is provided, scan all markdown files in workspace
        if workspace_path:
            try:
                concepts_data = extract_all_concepts(workspace_path, extraction_mode)

                # Convert to the format expected by the system
                for concept_data in concepts_data:
                    concept = Concept(
                        id=concept_data["id"],
                        title=concept_data["title"],
                        content=concept_data["content"],
                        prerequisites=[],  # Will be filled in later based on relationships
                        difficulty_level=concept_data["level"],
                    )
                    concepts.append(concept)

                # Create relationships based on header hierarchy
                relationships = self._create_relationships_from_headers(concepts_data)

                # Save concepts to database
                self._save_concepts_to_db(concepts)

            except (FileNotFoundError, PermissionError, OSError) as e:
                print(f"Error scanning workspace {workspace_path}: {str(e)}")
        # If it's a markdown file, parse it
        elif file_path.endswith(".md"):
            try:
                # Parse the markdown file to extract concepts
                concepts_data = parser.find_concepts_in_file(file_path)

                # Convert to the format expected by the system
                for concept_data in concepts_data:
                    concept = Concept(
                        id=concept_data["id"],
                        title=concept_data["title"],
                        content=concept_data["content"],
                        prerequisites=[],  # Will be filled in later based on relationships
                        difficulty_level=concept_data["level"],
                    )
                    concepts.append(concept)

                # Create relationships based on header hierarchy
                relationships = self._create_relationships_from_headers(concepts_data)

                # Save concepts to database
                self._save_concepts_to_db(concepts)

            except (FileNotFoundError, PermissionError, OSError, ValueError) as e:
                print(f"Error parsing {file_path}: {str(e)}")

        return KnowledgeMap(concepts=concepts, relationships=relationships)

    def _create_relationships_from_headers(self, concepts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """
        Create relationships between concepts based on their header hierarchy
        """
        if not concepts:
            return []

        relationships = []

        # Create a mapping from concept ID to concept for easy lookup
        # concept_map = {c['id']: c for c in concepts}  # pylint: disable=unused-variable

        # Iterate through each concept to find potential parent concepts based on header hierarchy
        for concept in concepts:
            current_level = concept.get("level", 1)

            # Look for concepts with a higher level (lower number = higher level)
            for other_concept in concepts:
                other_level = other_concept.get("level", 1)

                # If other_concept has a higher level (1 is higher than 2) and appears before this concept
                if other_level < current_level and other_concept != concept:
                    # In a real implementation, we'd need to check document order
                    # For now, we'll add a simple relationship
                    relationships.append(
                        {"source": other_concept["id"], "target": concept["id"], "relationship_type": "subtopic_of"}
                    )

        return relationships

    async def get_available_concepts(self) -> List[Concept]:
        # Implementation to retrieve concepts from database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts")
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(
                Concept(
                    id=row[0],
                    title=row[1],
                    content=row[2],
                    prerequisites=json.loads(row[3]) if row[3] else [],
                    difficulty_level=row[4],
                )
            )

        return concepts

    def get_available_concepts_sync(self) -> List[Concept]:
        # Synchronous version of get_available_concepts for internal use
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts")
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(
                Concept(
                    id=row[0],
                    title=row[1],
                    content=row[2],
                    prerequisites=json.loads(row[3]) if row[3] else [],
                    difficulty_level=row[4],
                )
            )

        return concepts

    def get_concept_path(self, concept_id: str) -> List[Concept]:
        # Implementation to get the learning path for a specific concept
        # This would consider prerequisites
        all_concepts = self.get_available_concepts_sync()

        # Find the specific concept
        target_concept = None
        for concept in all_concepts:
            if concept.id == concept_id:
                target_concept = concept
                break

        if not target_concept:
            return []

        # Find prerequisite concepts
        path = []
        for concept in all_concepts:
            if concept.id in target_concept.prerequisites:
                path.append(concept)

        # Add the target concept at the end
        path.append(target_concept)

        return path

    def update_progress(self, concept_id: str, progress: UserProgress) -> None:
        # Implementation to update user progress for a concept
        # This would typically update the database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Update or insert progress in the user_progress table
        cursor.execute(
            """
        INSERT OR REPLACE INTO user_progress (concept_id, completed, score)
        VALUES (?, ?, ?)
        """,
            (concept_id, progress.completed, progress.score),
        )

        conn.commit()
        conn.close()

    def _save_concepts_to_db(self, concepts: List[Concept]) -> None:
        """
        Save concepts to the database
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        for concept in concepts:
            # Insert or replace concept in the database
            cursor.execute(
                """
            INSERT OR REPLACE INTO concepts (id, title, content, prerequisites, difficulty_level)
            VALUES (?, ?, ?, ?, ?)
            """,
                (
                    concept.id,
                    concept.title,
                    concept.content,
                    json.dumps(concept.prerequisites) if concept.prerequisites else "[]",
                    concept.difficulty_level,
                ),
            )

        conn.commit()
        conn.close()
