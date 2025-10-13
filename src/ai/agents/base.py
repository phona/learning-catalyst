"""
Base agent classes for Learning Catalyst.

Simple, focused agent interfaces following "less is more" principle.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from ...core.models import Message


class AgentType(Enum):
    """Types of specialized agents."""
    TUTOR = "tutor"
    ASSESSMENT = "assessment"
    RECOMMENDATION = "recommendation"
    CONVERSATION = "conversation"


@dataclass
class AgentResponse:
    """Response from an agent."""
    content: str
    agent_type: AgentType
    confidence: float = 1.0
    data: Optional[Dict[str, Any]] = None
    requires_follow_up: bool = False
    suggested_tools: List[str] = None

    def __post_init__(self):
        if self.suggested_tools is None:
            self.suggested_tools = []


class Agent(ABC):
    """Base class for all learning agents."""

    def __init__(self, agent_type: AgentType, ai_provider=None):
        """Initialize agent.

        Args:
            agent_type: Type of this agent
            ai_provider: AI provider for generating responses
        """
        self.agent_type = agent_type
        self.ai_provider = ai_provider

    @abstractmethod
    async def process_request(
        self,
        request: str,
        context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """
        Process a user request.

        Args:
            request: User's request/question
            context: Current conversation context
            tools: Available tools dictionary

        Returns:
            AgentResponse with the result
        """
        pass

    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """
        Get list of capabilities this agent provides.

        Returns:
            List of capability descriptions
        """
        pass

    def can_handle(self, request: str, context: Dict[str, Any]) -> float:
        """
        Determine if this agent can handle the request.

        Args:
            request: User's request
            context: Current context

        Returns:
            Confidence score (0.0 to 1.0)
        """
        # Base implementation - subclasses should override
        return 0.5

    async def _generate_response(
        self,
        prompt: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate AI response using the provider.

        Args:
            prompt: Prompt for the AI
            context: Context information

        Returns:
            Generated response text
        """
        if not self.ai_provider:
            return f"[{self.agent_type.value}] I need an AI provider to generate detailed responses."

        # Create context-aware prompt
        context_str = "\n".join([f"{k}: {v}" for k, v in context.items() if v])
        full_prompt = f"""You are a {self.agent_type.value} agent for Learning Catalyst.

Context:
{context_str}

User request: {prompt}

Provide a helpful response as a {self.agent_type.value} agent."""

        try:
            # For now, return a simple response
            # In a full implementation, this would call the AI provider
            return f"[{self.agent_type.value}] I understand you're asking about: {request}"
        except Exception as e:
            return f"[{self.agent_type.value}] Sorry, I encountered an error: {str(e)}"