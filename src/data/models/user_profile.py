"""
Data model for User Profile
"""
from dataclasses import dataclass
from typing import Dict, Any, Optional
import json
from datetime import datetime


@dataclass
class UserProfile:
    id: str
    created_at: str
    preferences: Dict[str, Any]
    competency_profile: Dict[str, Any]
    ai_config: Dict[str, Any]
    current_checkpoint_id: Optional[str] = None