"""
Knowledge manager for Learning Catalyst.

Simple concept and learning path management.
"""

from typing import List, Optional, Dict, Any
import uuid
from pathlib import Path
import json

from .models import Concept, LearningPath, DifficultyLevel, ConceptType


class KnowledgeManager:
    """Simple knowledge manager."""

    def __init__(self, data_dir: Optional[Path] = None):
        """
        Initialize knowledge manager.

        Args:
            data_dir: Data directory for storage
        """
        self.data_dir = data_dir or Path.home() / ".catalyst" / "knowledge"
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.concepts_file = self.data_dir / "concepts.json"
        self.paths_file = self.data_dir / "learning_paths.json"

        self._concepts: Dict[str, Concept] = {}
        self._learning_paths: Dict[str, LearningPath] = {}

        # Load existing data
        self._load_data()

    def _load_data(self) -> None:
        """Load concepts and learning paths from storage."""
        # Load concepts
        if self.concepts_file.exists():
            try:
                with open(self.concepts_file, 'r') as f:
                    concepts_data = json.load(f)
                    for concept_data in concepts_data:
                        concept = Concept(**concept_data)
                        self._concepts[concept.id] = concept
            except (json.JSONDecodeError, IOError):
                pass

        # Load learning paths
        if self.paths_file.exists():
            try:
                with open(self.paths_file, 'r') as f:
                    paths_data = json.load(f)
                    for path_data in paths_data:
                        path = LearningPath(**path_data)
                        self._learning_paths[path.id] = path
            except (json.JSONDecodeError, IOError):
                pass

    def _save_data(self) -> None:
        """Save concepts and learning paths to storage."""
        # Save concepts
        try:
            concepts_data = [concept.to_dict() for concept in self._concepts.values()]
            with open(self.concepts_file, 'w') as f:
                json.dump(concepts_data, f, indent=2)
        except IOError:
            pass

        # Save learning paths
        try:
            paths_data = [path.to_dict() for path in self._learning_paths.values()]
            with open(self.paths_file, 'w') as f:
                json.dump(paths_data, f, indent=2)
        except IOError:
            pass

    def create_concept(
        self,
        title: str,
        description: str,
        concept_type: ConceptType,
        difficulty: DifficultyLevel,
        domain: str,
        **kwargs
    ) -> str:
        """
        Create a new concept.

        Args:
            title: Concept title
            description: Concept description
            concept_type: Type of concept
            difficulty: Difficulty level
            domain: Knowledge domain
            **kwargs: Additional concept attributes

        Returns:
            ID of created concept
        """
        concept_id = str(uuid.uuid4())
        concept = Concept(
            id=concept_id,
            title=title,
            description=description,
            concept_type=concept_type,
            difficulty=difficulty,
            domain=domain,
            **kwargs
        )

        self._concepts[concept_id] = concept
        self._save_data()
        return concept_id

    def get_concept(self, concept_id: str) -> Optional[Concept]:
        """
        Get a concept by ID.

        Args:
            concept_id: ID of the concept

        Returns:
            Concept or None if not found
        """
        return self._concepts.get(concept_id)

    def search_concepts(
        self,
        query: str = "",
        domain: Optional[str] = None,
        difficulty: Optional[DifficultyLevel] = None,
        limit: int = 50
    ) -> List[Concept]:
        """
        Search for concepts.

        Args:
            query: Search query
            domain: Filter by domain
            difficulty: Filter by difficulty
            limit: Maximum results

        Returns:
            List of matching concepts
        """
        results = []

        for concept in self._concepts.values():
            # Apply filters
            if domain and concept.domain != domain:
                continue
            if difficulty and concept.difficulty != difficulty:
                continue
            if query:
                query_lower = query.lower()
                if (query_lower not in concept.title.lower() and
                    query_lower not in concept.description.lower() and
                    not any(query_lower in tag.lower() for tag in concept.tags)):
                    continue

            results.append(concept)
            if len(results) >= limit:
                break

        return results

    def create_learning_path(
        self,
        title: str,
        description: str,
        concept_ids: List[str],
        **kwargs
    ) -> str:
        """
        Create a new learning path.

        Args:
            title: Learning path title
            description: Learning path description
            concept_ids: List of concept IDs
            **kwargs: Additional path attributes

        Returns:
            ID of created learning path
        """
        path_id = str(uuid.uuid4())
        path = LearningPath(
            id=path_id,
            title=title,
            description=description,
            concepts=concept_ids.copy(),
            **kwargs
        )

        # Calculate total estimated time
        total_time = 0
        for concept_id in concept_ids:
            concept = self.get_concept(concept_id)
            if concept:
                total_time += concept.estimated_time_minutes
        path.total_estimated_time = total_time

        self._learning_paths[path_id] = path
        self._save_data()
        return path_id

    def get_learning_path(self, path_id: str) -> Optional[LearningPath]:
        """
        Get a learning path by ID.

        Args:
            path_id: ID of the learning path

        Returns:
            Learning path or None if not found
        """
        return self._learning_paths.get(path_id)

    def get_learning_paths(self, limit: int = 20) -> List[LearningPath]:
        """
        Get all learning paths.

        Args:
            limit: Maximum number of paths to return

        Returns:
            List of learning paths
        """
        return list(self._learning_paths.values())[:limit]

    def recommend_concepts(
        self,
        known_concepts: List[str],
        difficulty: Optional[DifficultyLevel] = None,
        count: int = 10
    ) -> List[Concept]:
        """
        Recommend concepts based on known concepts.

        Args:
            known_concepts: List of known concept IDs
            difficulty: Target difficulty level
            count: Number of recommendations

        Returns:
            List of recommended concepts
        """
        recommendations = []
        known_set = set(known_concepts)

        # Find concepts that aren't known but have prerequisites that are known
        for concept in self._concepts.values():
            if concept.id in known_set:
                continue

            if difficulty and concept.difficulty != difficulty:
                continue

            # Check if all prerequisites are known
            if concept.prerequisites:
                if all(prereq in known_set for prereq in concept.prerequisites):
                    recommendations.append(concept)
            else:
                # No prerequisites, can be recommended
                recommendations.append(concept)

        return recommendations[:count]

    def get_domain_overview(self, domain: str) -> Dict[str, Any]:
        """
        Get overview of a knowledge domain.

        Args:
            domain: Domain name

        Returns:
            Domain overview information
        """
        domain_concepts = [
            concept for concept in self._concepts.values()
            if concept.domain == domain
        ]

        if not domain_concepts:
            return {"error": f"Domain '{domain}' not found"}

        difficulty_counts = {}
        type_counts = {}

        for concept in domain_concepts:
            # Count by difficulty
            diff_key = concept.difficulty.value
            difficulty_counts[diff_key] = difficulty_counts.get(diff_key, 0) + 1

            # Count by type
            type_key = concept.concept_type.value
            type_counts[type_key] = type_counts.get(type_key, 0) + 1

        return {
            "domain": domain,
            "total_concepts": len(domain_concepts),
            "difficulty_distribution": difficulty_counts,
            "type_distribution": type_counts,
            "total_estimated_time": sum(c.estimated_time_minutes for c in domain_concepts)
        }

    def delete_concept(self, concept_id: str) -> bool:
        """
        Delete a concept.

        Args:
            concept_id: ID of the concept to delete

        Returns:
            True if concept was deleted
        """
        if concept_id in self._concepts:
            del self._concepts[concept_id]
            self._save_data()
            return True
        return False

    def delete_learning_path(self, path_id: str) -> bool:
        """
        Delete a learning path.

        Args:
            path_id: ID of the learning path to delete

        Returns:
            True if path was deleted
        """
        if path_id in self._learning_paths:
            del self._learning_paths[path_id]
            self._save_data()
            return True
        return False