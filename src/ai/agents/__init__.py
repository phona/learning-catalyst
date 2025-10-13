"""
Agent system for Learning Catalyst multi-agent architecture.

Simple, focused agents for learning orchestration.
"""

from .base import Agent, AgentResponse, AgentType
from .coordinator import AgentCoordinator
from .tutor import TutorAgent
from .assessment import AssessmentAgent
from .recommendation import RecommendationAgent
from .conversation import ConversationAgent

__all__ = [
    'Agent',
    'AgentResponse',
    'AgentType',
    'AgentCoordinator',
    'TutorAgent',
    'AssessmentAgent',
    'RecommendationAgent',
    'ConversationAgent'
]