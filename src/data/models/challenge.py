"""
Data model for Challenge
"""

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class Challenge:
    id: str
    concept_id: str
    challenge_type: str
    challenge_text: str
    expected_answer: str
    options: Dict[str, Any]  # For multiple choice, fill-in-the-blank, etc.
