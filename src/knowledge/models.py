"""
Knowledge management models for Learning Catalyst.

Simple concept and learning path models.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class DifficultyLevel(Enum):
    """Difficulty levels for concepts."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ConceptType(Enum):
    """Types of knowledge concepts."""
    FUNDAMENTAL = "fundamental"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    APPLICATION = "application"
    THEORY = "theory"


@dataclass
class Concept:
    """Knowledge concept."""
    id: str
    title: str
    description: str
    concept_type: ConceptType
    difficulty: DifficultyLevel
    domain: str
    prerequisites: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    estimated_time_minutes: int = 60
    content_references: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert concept to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'concept_type': self.concept_type.value,
            'difficulty': self.difficulty.value,
            'domain': self.domain,
            'prerequisites': self.prerequisites,
            'tags': self.tags,
            'estimated_time_minutes': self.estimated_time_minutes,
            'content_references': self.content_references,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class LearningPath:
    """Learning path for concepts."""
    id: str
    title: str
    description: str
    concepts: List[str]  # List of concept IDs
    total_estimated_time: int = 0
    difficulty_progression: List[DifficultyLevel] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def add_concept(self, concept_id: str) -> None:
        """Add a concept to the learning path."""
        if concept_id not in self.concepts:
            self.concepts.append(concept_id)

    def remove_concept(self, concept_id: str) -> None:
        """Remove a concept from the learning path."""
        if concept_id in self.concepts:
            self.concepts.remove(concept_id)

    def to_dict(self) -> Dict[str, Any]:
        """Convert learning path to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'concepts': self.concepts,
            'total_estimated_time': self.total_estimated_time,
            'difficulty_progression': [d.value for d in self.difficulty_progression],
            'tags': self.tags,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat()
        }