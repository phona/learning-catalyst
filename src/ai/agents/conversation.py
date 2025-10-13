"""
Conversation agent for Learning Catalyst.

Manages dialogue flow and handles general conversation.
"""

from typing import Dict, List, Any

from .base import Agent, AgentResponse, AgentType


class ConversationAgent(Agent):
    """Agent specialized in managing conversation and general interactions."""

    def __init__(self, ai_provider=None):
        super().__init__(AgentType.CONVERSATION, ai_provider)

    async def process_request(
        self,
        request: str,
        context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """Process general conversation requests."""

        # This agent handles requests that don't clearly fit other agents
        # or are general conversational in nature

        # Check for conversation patterns
        is_conversational = self._is_conversational_request(request)

        if not is_conversational:
            # If this doesn't seem conversational, suggest other agents
            return AgentResponse(
                content=self._suggest_specialized_agents(request),
                agent_type=self.agent_type,
                confidence=0.6,
                suggested_tools=["get_concept", "update_quiz", "get_knowledge_map"]
            )

        # Handle different types of conversational requests
        if self._is_greeting(request):
            return await self._handle_greeting(context)
        elif self._is_farewell(request):
            return await self._handle_farewell(context)
        elif self._is_question_about_system(request):
            return await self._handle_system_question(request, context)
        elif self._is_checking_progress(request):
            return await self._handle_progress_check(context, tools)
        elif self._needs_help(request):
            return await self._handle_help_request(request, context)
        else:
            return await self._handle_general_conversation(request, context)

    def get_capabilities(self) -> List[str]:
        """Get conversation agent capabilities."""
        return [
            "Managing conversation flow",
            "Handling greetings and farewells",
            "Answering general questions",
            "Providing system information",
            "Helping with navigation",
            "Facilitating smooth interactions"
        ]

    def can_handle(self, request: str, context: Dict[str, Any]) -> float:
        """Determine if this is a conversational request."""
        # This agent should have a lower baseline confidence
        # since it's more of a fallback/generalist agent

        # High confidence for clear conversational patterns
        if self._is_greeting(request) or self._is_farewell(request):
            return 0.9

        # Medium confidence for general questions
        if self._is_question_about_system(request) or self._needs_help(request):
            return 0.7

        # Lower confidence for other requests (let specialized agents handle them)
        return 0.3

    def _is_conversational_request(self, request: str) -> bool:
        """Check if this is a conversational request."""
        request_lower = request.lower()

        conversational_patterns = [
            "hello", "hi ", "hey", "good morning", "good afternoon", "good evening",
            "bye", "goodbye", "see you", "thanks", "thank you",
            "how are you", "what can you do", "help", "what is this",
            "how does this work", "where am i", "what can i do"
        ]

        return any(pattern in request_lower for pattern in conversational_patterns)

    def _is_greeting(self, request: str) -> bool:
        """Check if this is a greeting."""
        request_lower = request.lower()
        greetings = ["hello", "hi ", "hey", "good morning", "good afternoon", "good evening", "howdy"]
        return any(greeting in request_lower for greeting in greetings)

    def _is_farewell(self, request: str) -> bool:
        """Check if this is a farewell."""
        request_lower = request.lower()
        farewells = ["bye", "goodbye", "see you", "see ya", "farewell", "later"]
        return any(farewell in request_lower for farewell in farewells)

    def _is_question_about_system(self, request: str) -> bool:
        """Check if user is asking about the system."""
        request_lower = request.lower()
        system_questions = [
            "what can you do", "how does this work", "what is this",
            "where am i", "what is learning catalyst", "how do i use",
            "what are you", "who are you"
        ]
        return any(question in request_lower for question in system_questions)

    def _is_checking_progress(self, request: str) -> bool:
        """Check if user is asking about progress."""
        request_lower = request.lower()
        progress_patterns = [
            "how am i doing", "my progress", "what have i learned",
            "how far have i come", "my statistics", "my performance"
        ]
        return any(pattern in request_lower for pattern in progress_patterns)

    def _needs_help(self, request: str) -> bool:
        """Check if user needs help."""
        request_lower = request.lower()
        help_patterns = ["help", "stuck", "confused", "don't understand", "lost", "what should i do"]
        return any(pattern in request_lower for pattern in help_patterns)

    def _suggest_specialized_agents(self, request: str) -> str:
        """Suggest specialized agents based on request content."""
        request_lower = request.lower()

        suggestions = ["I can help you with that! Here's what my specialized agents can do:"]

        if any(word in request_lower for word in ["explain", "what is", "understand", "concept"]):
            suggestions.append("\n🎓 **Tutor Agent**: For explanations and concept understanding")

        if any(word in request_lower for word in ["quiz", "test", "practice", "assess"]):
            suggestions.append("\n📝 **Assessment Agent**: For quizzes and knowledge evaluation")

        if any(word in request_lower for word in ["recommend", "suggest", "next", "path"]):
            suggestions.append("\n🎯 **Recommendation Agent**: For learning guidance and next steps")

        suggestions.append("\n\nCould you tell me more specifically what you'd like help with?")

        return "\n".join(suggestions)

    async def _handle_greeting(self, context: Dict[str, Any]) -> AgentResponse:
        """Handle greeting messages."""
        # Check if this is a returning user
        interaction_count = context.get("interaction_count", 0)
        last_session = context.get("last_session")

        if interaction_count > 1 and last_session:
            greeting = f"""Welcome back! 👋

Good to see you again. It looks like you've been learning with us before.

How can I help you continue your learning journey today?"""
        else:
            greeting = """Hello! 👋 Welcome to Learning Catalyst!

I'm here to help you learn effectively through personalized AI assistance. I can connect you with specialized agents for:

🎓 **Learning & Explanations** - Get help understanding concepts
📝 **Assessment & Practice** - Test your knowledge and skills
🎯 **Recommendations & Guidance** - Get personalized learning paths
💬 **General Conversation** - Ask questions and get help

What would you like to learn about today?"""

        return AgentResponse(
            content=greeting,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"interaction_type": "greeting", "returning_user": interaction_count > 1}
        )

    async def _handle_farewell(self, context: Dict[str, Any]) -> AgentResponse:
        """Handle farewell messages."""
        # Try to save session if tools are available
        session_saved = False
        # if "manage_session" in tools:
        #     try:
        #         await tools["manage_session"]("save", "auto_save")
        #         session_saved = True
        #     except:
        #         pass

        farewell = """Thank you for learning with me today! 🎓

Your progress has been noted, and you can pick up where you left off next time.

Remember:
• Learning is a journey, not a race
• Consistent practice leads to mastery
• Don't hesitate to ask for help

See you next time! 👋"""

        if session_saved:
            farewell = f"""{farewell}

💾 Your session has been automatically saved."""

        return AgentResponse(
            content=farewell,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"interaction_type": "farewell", "session_saved": session_saved}
        )

    async def _handle_system_question(self, request: str, context: Dict[str, Any]) -> AgentResponse:
        """Handle questions about the system."""
        content = """## About Learning Catalyst

Learning Catalyst is an AI-powered learning platform that helps you learn effectively through personalized assistance.

### 🤖 **Multi-Agent System**
I coordinate different specialized agents to provide comprehensive learning support:
• **Tutor Agent**: Explains concepts and provides targeted explanations
• **Assessment Agent**: Creates quizzes and evaluates your knowledge
• **Recommendation Agent**: Suggests learning paths and resources
• **Conversation Agent**: Manages our dialogue and provides general help (that's me!)

### 🎯 **Key Features**
• **Personalized Learning**: Adapted to your level and goals
• **Interactive Dialogue**: Natural conversation about any topic
• **Progress Tracking**: Monitor your learning journey
• **Resource Recommendations**: Get tailored learning materials

### 💡 **How to Use**
1. Ask questions about any topic you want to learn
2. Request quizzes to test your understanding
3. Get recommendations for what to learn next
4. Use commands like `/help` for available options

What would you like to learn more about?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"interaction_type": "system_info"}
        )

    async def _handle_progress_check(self, context: Dict[str, Any], tools: Dict[str, Any]) -> AgentResponse:
        """Handle progress checking requests."""

        # Try to get statistics
        stats = {}
        if "get_learning_statistics" in tools:
            try:
                stats = await tools["get_learning_statistics"]()
            except:
                pass

        if stats:
            content = f"""## Your Learning Progress 📊

{stats}

### 💡 **Insights**
• Keep up the great work!
• Consistency is key to mastery
• Don't forget to review previous topics

### 🎯 **Suggestions**
• Try a practice quiz to reinforce your learning
• Explore related topics to expand your knowledge
• Set a new learning goal for this week"""
        else:
            content = """## Your Learning Journey 📈

I'm tracking your progress as we learn together. Here's what I can see:

### 📚 **Topics Explored**
You've been engaging with various learning materials and asking great questions!

### 🎯 **Recent Activity**
Your recent interactions show curiosity and engagement with the learning process.

### 💡 **Keep Going**
• Every question you ask helps solidify your understanding
• Practice regularly to maintain momentum
• Celebrate small victories along the way

Would you like me to create a quiz to test your current knowledge, or suggest next steps for your learning journey?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.8,
            data={"interaction_type": "progress_check", "has_stats": bool(stats)},
            suggested_tools=["get_learning_statistics", "update_quiz", "get_knowledge_map"]
        )

    async def _handle_help_request(self, request: str, context: Dict[str, Any]) -> AgentResponse:
        """Handle help requests."""
        content = """## How I Can Help You 🤝

I'm here to support your learning journey. Here's how we can work together:

### 🎓 **Learn New Topics**
• "Explain [concept] to me"
• "What is [topic]?"
• "Help me understand [subject]"

### 📝 **Test Your Knowledge**
• "Quiz me on [topic]"
• "Test my understanding of [concept]"
• "Give me practice problems for [subject]"

### 🎯 **Get Guidance**
• "What should I learn next?"
• "Create a learning path for [topic]"
• "Recommend resources for [subject]"

### 💬 **General Help**
• "How am I doing with my learning?"
• "What can you help me with?"
• "I'm stuck, what should I do?"

### ⚙️ **System Commands**
• `/help` - Show all available commands
• `/config` - Check your configuration
• `/clear` - Clear the screen
• `/quit` - Exit the session

What specific help do you need right now?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"interaction_type": "help"}
        )

    async def _handle_general_conversation(self, request: str, context: Dict[str, Any]) -> AgentResponse:
        """Handle general conversational requests."""
        # Generate a conversational response
        base_response = await self._generate_response(request, context)

        content = f"""{base_response}

I'm here to help with your learning journey.

Would you like to:
• Learn about a specific topic?
• Test your knowledge with a quiz?
• Get recommendations for what to learn next?
• Or continue our conversation?

Just let me know what interests you!"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.6,
            data={"interaction_type": "general"},
            requires_follow_up=True
        )