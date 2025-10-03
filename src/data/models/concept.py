"""
Data model for Concept
"""
from dataclasses import dataclass
from typing import List


@dataclass
class Concept:
    id: str
    title: str
    content: str
    prerequisites: List[str]
    difficulty_level: int