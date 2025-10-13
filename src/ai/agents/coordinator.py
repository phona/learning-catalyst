"""
Agent coordinator for Learning Catalyst.

Routes requests to appropriate agents and manages multi-agent coordination.
"""

from typing import Dict, List, Any, Optional, Tuple

from .base import Agent, AgentResponse, AgentType
from .tutor import TutorAgent
from .assessment import AssessmentAgent
from .recommendation import RecommendationAgent
from .conversation import ConversationAgent


class AgentCoordinator:
    """Coordinates between multiple specialized agents."""

    def __init__(self, ai_provider=None):
        """Initialize the coordinator with all agents."""
        self.ai_provider = ai_provider
        self.agents = {
            AgentType.TUTOR: TutorAgent(ai_provider),
            AgentType.ASSESSMENT: AssessmentAgent(ai_provider),
            AgentType.RECOMMENDATION: RecommendationAgent(ai_provider),
            AgentType.CONVERSATION: ConversationAgent(ai_provider)
        }
        self._conversation_history: List[Dict[str, Any]] = []

    async def process_request(
        self,
        request: str,
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Process a user request by routing to appropriate agents.

        Args:
            request: User's request
            context: Current conversation context
            tools: Available tools

        Returns:
            AgentResponse from the most appropriate agent
        """
        if context is None:
            context = {}
        if tools is None:
            tools = {}

        # Update context with conversation history
        context["conversation_history"] = self._conversation_history[-5:]  # Last 5 interactions

        # Determine which agent(s) should handle this request
        agent_scores = await self._evaluate_agent_fitness(request, context)

        # Select the best agent
        best_agent_type, best_score = max(agent_scores, key=lambda x: x[1])

        # If no agent is confident (>0.5), try multiple agents
        if best_score < 0.5:
            return await self._handle_uncertain_request(request, context, tools, agent_scores)

        # Get the selected agent
        selected_agent = self.agents[best_agent_type]

        # Process the request
        response = await selected_agent.process_request(request, context, tools)

        # Record the interaction
        self._record_interaction(request, response, selected_agent.agent_type)

        return response

    async def process_multi_agent_request(
        self,
        request: str,
        agent_types: List[AgentType],
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[Dict[str, Any]] = None
    ) -> List[AgentResponse]:
        """
        Process a request using multiple agents.

        Args:
            request: User's request
            agent_types: List of agent types to use
            context: Current conversation context
            tools: Available tools

        Returns:
            List of AgentResponse objects from each agent
        """
        if context is None:
            context = {}
        if tools is None:
            tools = {}

        responses = []

        for agent_type in agent_types:
            if agent_type in self.agents:
                agent = self.agents[agent_type]
                response = await agent.process_request(request, context, tools)
                responses.append(response)

        return responses

    async def get_agent_suggestions(self, request: str, context: Dict[str, Any]) -> List[str]:
        """
        Get suggestions for which agents might be helpful.

        Args:
            request: User's request
            context: Current context

        Returns:
            List of agent suggestions with reasoning
        """
        agent_scores = await self._evaluate_agent_fitness(request, context)

        suggestions = []
        for agent_type, score in sorted(agent_scores, key=lambda x: x[1], reverse=True):
            if score > 0.3:  # Only suggest agents with some confidence
                agent = self.agents[agent_type]
                suggestions.append(f"• {agent.agent_type.value.title()} Agent: {score:.1%} confidence")

        return suggestions

    async def _evaluate_agent_fitness(self, request: str, context: Dict[str, Any]) -> List[Tuple[AgentType, float]]:
        """Evaluate how well each agent can handle the request."""
        scores = []

        for agent_type, agent in self.agents.items():
            score = agent.can_handle(request, context)
            scores.append((agent_type, score))

        return scores

    async def _handle_uncertain_request(
        self,
        request: str,
        context: Dict[str, Any],
        tools: Dict[str, Any],
        agent_scores: List[Tuple[AgentType, float]]
    ) -> AgentResponse:
        """Handle requests where no agent is highly confident."""

        # Get top 2 agents
        top_agents = sorted(agent_scores, key=lambda x: x[1], reverse=True)[:2]

        if len(top_agents) >= 2 and top_agents[0][1] > 0.3:
            # Try to combine insights from multiple agents
            agent_types = [top_agents[0][0], top_agents[1][0]]
            responses = await self.process_multi_agent_request(request, agent_types, context, tools)

            if responses:
                # Create a combined response
                combined_content = f"""I can help you with this from a couple of perspectives:

{chr(10).join([f"**{response.agent_type.value.title()} Agent:** {response.content}" for response in responses])}

Would you like me to focus on one of these approaches, or would you prefer more details about any aspect?"""

                return AgentResponse(
                    content=combined_content,
                    agent_type=AgentType.CONVERSATION,  # Coordinator acts as conversation agent
                    confidence=0.6,
                    data={"combined_agents": [r.agent_type.value for r in responses]},
                    requires_follow_up=True
                )

        # Fallback to conversation agent with suggestions
        conversation_agent = self.agents[AgentType.CONVERSATION]
        return await conversation_agent.process_request(request, context, tools)

    def _record_interaction(self, request: str, response: AgentResponse, agent_type: AgentType):
        """Record an interaction in the conversation history."""
        interaction = {
            "request": request,
            "response": response.content,
            "agent_type": agent_type.value,
            "confidence": response.confidence,
            "timestamp": self._get_timestamp()
        }

        self._conversation_history.append(interaction)

        # Keep only last 50 interactions
        if len(self._conversation_history) > 50:
            self._conversation_history = self._conversation_history[-50:]

    def _get_timestamp(self) -> float:
        """Get current timestamp."""
        import time
        return time.time()

    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get a summary of the conversation history."""
        if not self._conversation_history:
            return {"total_interactions": 0, "agent_usage": {}, "recent_topics": []}

        # Count agent usage
        agent_usage = {}
        for interaction in self._conversation_history:
            agent_type = interaction["agent_type"]
            agent_usage[agent_type] = agent_usage.get(agent_type, 0) + 1

        # Extract recent topics (simple keyword extraction)
        recent_topics = []
        for interaction in self._conversation_history[-5:]:
            request = interaction["request"].lower()
            # Simple topic extraction - look for nouns and key terms
            if any(word in request for word in ["python", "math", "science", "programming", "code"]):
                for word in ["python", "math", "science", "programming", "code"]:
                    if word in request and word not in recent_topics:
                        recent_topics.append(word)
                        break

        return {
            "total_interactions": len(self._conversation_history),
            "agent_usage": agent_usage,
            "recent_topics": recent_topics,
            "last_interaction": self._conversation_history[-1]["timestamp"] if self._conversation_history else None
        }

    def clear_history(self):
        """Clear conversation history."""
        self._conversation_history = []

    def get_agent_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all available agents."""
        info = {}

        for agent_type, agent in self.agents.items():
            info[agent_type.value] = {
                "type": agent_type.value,
                "capabilities": agent.get_capabilities()
            }

        return info