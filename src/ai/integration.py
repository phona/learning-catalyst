"""
Main AI integration module for Learning Catalyst.

Connects agents, tools, and context management into a cohesive system.
"""

import uuid
from typing import Dict, List, Any, Optional

from .agents import AgentCoordinator, AgentType
from .context import ContextManager, LearningContext
from .tools import ToolRegistry
from .tools.learning import GetConceptTool, UpdateQuizTool, GetKnowledgeMapTool
from .tools.system import GetConfigurationTool, UpdateConfigurationTool, GetLearningStatisticsTool, ManageSessionTool


class AIIntegration:
    """Main AI integration system for Learning Catalyst."""

    def __init__(self, ai_provider=None, storage_path: Optional[str] = None):
        """Initialize AI integration system.

        Args:
            ai_provider: AI provider for generating responses
            storage_path: Path for storing session data
        """
        self.ai_provider = ai_provider

        # Initialize components
        self.context_manager = ContextManager(storage_path)
        self.agent_coordinator = AgentCoordinator(ai_provider)
        self.tool_registry = ToolRegistry()

        # Register tools
        self._register_tools()

        # Current session
        self.current_session_id: Optional[str] = None

    def _register_tools(self):
        """Register all available tools."""
        # Learning tools
        self.tool_registry.register_tool(GetConceptTool())
        self.tool_registry.register_tool(UpdateQuizTool())
        self.tool_registry.register_tool(GetKnowledgeMapTool())

        # System tools
        self.tool_registry.register_tool(GetConfigurationTool())
        self.tool_registry.register_tool(UpdateConfigurationTool())
        self.tool_registry.register_tool(GetLearningStatisticsTool())
        self.tool_registry.register_tool(ManageSessionTool())

    async def start_session(
        self,
        user_id: Optional[str] = None,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Start a new learning session.

        Args:
            user_id: User identifier
            initial_context: Initial context data

        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        self.context_manager.create_session(session_id, user_id, initial_context)
        self.current_session_id = session_id

        return session_id

    async def process_request(
        self,
        request: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a user request through the AI system.

        Args:
            request: User's request
            session_id: Session ID (uses current if not provided)

        Returns:
            Response dictionary with content and metadata
        """
        # Use current session if not specified
        if not session_id:
            session_id = self.current_session_id

        if not session_id:
            # Start a new session if none exists
            session_id = await self.start_session()
            self.current_session_id = session_id

        # Get session context
        context = self.context_manager.get_context_for_agents(session_id)

        # Get available tools
        tools = self.tool_registry.get_tools_dict()

        # Extract topic from request for context
        topic = self._extract_topic_from_request(request)
        if topic:
            self.context_manager.add_topic(session_id, topic)

        # Process through agent coordinator
        agent_response = await self.agent_coordinator.process_request(
            request, context, tools
        )

        # Update context based on response
        self._update_context_from_response(session_id, request, agent_response)

        # Execute suggested tools if any
        tool_results = []
        if agent_response.suggested_tools:
            for tool_name in agent_response.suggested_tools[:2]:  # Limit to 2 tools
                if tool_name in tools:
                    try:
                        result = await self.tool_registry.execute_tool(
                            tool_name,
                            topic=topic if topic else "general"
                        )
                        tool_results.append({
                            "tool": tool_name,
                            "result": result.success,
                            "message": result.message
                        })
                    except Exception:
                        pass  # Ignore tool execution errors

        # Format response
        response = {
            "content": agent_response.content,
            "agent_type": agent_response.agent_type.value,
            "confidence": agent_response.confidence,
            "session_id": session_id,
            "requires_follow_up": agent_response.requires_follow_up,
            "suggested_tools": agent_response.suggested_tools,
            "tool_results": tool_results,
            "metadata": {
                "topic": topic,
                "response_type": "agent_response",
                "timestamp": self._get_timestamp()
            }
        }

        return response

    async def get_agent_suggestions(self, request: str, session_id: Optional[str] = None) -> List[str]:
        """
        Get suggestions for which agents might be helpful.

        Args:
            request: User's request
            session_id: Session ID

        Returns:
            List of agent suggestions
        """
        if not session_id:
            session_id = self.current_session_id

        context = self.context_manager.get_context_for_agents(session_id) if session_id else {}

        return await self.agent_coordinator.get_agent_suggestions(request, context)

    async def get_session_info(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about the current session.

        Args:
            session_id: Session ID (uses current if not provided)

        Returns:
            Session information dictionary
        """
        if not session_id:
            session_id = self.current_session_id

        if not session_id:
            return {"error": "No active session"}

        context = self.context_manager.get_session(session_id)
        if not context:
            return {"error": "Session not found"}

        # Get conversation summary
        conversation_summary = self.agent_coordinator.get_conversation_summary()

        return {
            "session_id": session_id,
            "user_id": context.user_id,
            "current_topic": context.current_topic,
            "recent_topics": context.recent_topics,
            "interaction_count": context.interaction_count,
            "session_duration_minutes": int((self._get_timestamp() - context.session_start_time) / 60),
            "learning_goals": context.learning_goals,
            "learning_style": context.learning_style,
            "conversation_summary": conversation_summary
        }

    async def set_learning_goal(self, goal: str, session_id: Optional[str] = None) -> bool:
        """
        Set a learning goal for the session.

        Args:
            goal: Learning goal
            session_id: Session ID

        Returns:
            True if set successfully
        """
        if not session_id:
            session_id = self.current_session_id

        if not session_id:
            return False

        return self.context_manager.add_learning_goal(session_id, goal)

    async def execute_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """
        Execute a tool directly.

        Args:
            tool_name: Name of the tool to execute
            **kwargs: Tool parameters

        Returns:
            Tool execution result
        """
        result = await self.tool_registry.execute_tool(tool_name, **kwargs)

        return {
            "success": result.success,
            "data": result.data,
            "message": result.message,
            "error": result.error,
            "tool_name": tool_name
        }

    def get_available_tools(self) -> Dict[str, Dict[str, Any]]:
        """Get information about available tools."""
        return self.tool_registry.get_tool_info()

    def get_available_agents(self) -> Dict[str, Dict[str, Any]]:
        """Get information about available agents."""
        return self.agent_coordinator.get_agent_info()

    async def end_session(self, session_id: Optional[str] = None) -> bool:
        """
        End a learning session.

        Args:
            session_id: Session ID (uses current if not provided)

        Returns:
            True if session ended successfully
        """
        if not session_id:
            session_id = self.current_session_id

        if not session_id:
            return False

        # Save session before ending
        self.context_manager.save_session(session_id)
        success = self.context_manager.end_session(session_id)

        if session_id == self.current_session_id:
            self.current_session_id = None

        return success

    def _extract_topic_from_request(self, request: str) -> Optional[str]:
        """Extract the main topic from a user request."""
        request_lower = request.lower()

        # Look for learning-related patterns
        learning_patterns = [
            "learn about ", "explain ", "what is ", "tell me about ",
            "help me understand ", "teach me ", "quiz me on "
        ]

        for pattern in learning_patterns:
            if pattern in request_lower:
                start_idx = request_lower.find(pattern) + len(pattern)
                topic = request[start_idx:].strip()
                # Clean up
                topic = topic.rstrip("?.,!")
                if len(topic) > 0 and len(topic) < 50:
                    return topic

        # Look for common subjects
        subjects = ["python", "javascript", "math", "science", "programming", "code", "algorithms"]
        for subject in subjects:
            if subject in request_lower:
                return subject

        return None

    def _update_context_from_response(
        self,
        session_id: str,
        request: str,
        agent_response
    ):
        """Update session context based on agent response."""
        # Update interaction count
        context = self.context_manager.get_session(session_id)
        if context:
            context.interaction_count += 1
            context.last_interaction_time = self._get_timestamp()

            # Cache conversation info
            self.context_manager.set_cache(
                f"{session_id}_last_agent",
                agent_response.agent_type.value
            )
            self.context_manager.set_cache(
                f"{session_id}_last_confidence",
                agent_response.confidence
            )

    def _get_timestamp(self) -> float:
        """Get current timestamp."""
        import time
        return time.time()