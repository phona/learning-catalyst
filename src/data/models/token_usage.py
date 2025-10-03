"""
Data model for Token Usage
"""
from dataclasses import dataclass
from datetime import datetime


@dataclass
class TokenUsage:
    id: str
    model_name: str
    provider: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    timestamp: str  # ISO 8601 format
    user_id: str
    context: str  # What the tokens were used for (e.g. "explanation", "challenge", "embedding")