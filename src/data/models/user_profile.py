"""
Data model for User Profile
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class UserProfile:
    """Represents a user's profile with preferences and learning data."""

    id: str
    created_at: str
    preferences: Dict[str, Any]
    competency_profile: Dict[str, Any]
    ai_config: Dict[str, Any]
    current_checkpoint_id: Optional[str] = None
