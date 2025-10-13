"""
Assessment agent for Learning Catalyst.

Creates challenges, evaluates answers, and tracks progress.
"""

from typing import Dict, List, Any

from .base import Agent, AgentResponse, AgentType


class AssessmentAgent(Agent):
    """Agent specialized in assessment and evaluation."""

    def __init__(self, ai_provider=None):
        super().__init__(AgentType.ASSESSMENT, ai_provider)

    async def process_request(
        self,
        request: str,
        context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """Process assessment requests."""

        # Check if this is an assessment-related request
        assessment_keywords = [
            "quiz", "test", "challenge", "practice", "assess",
            "evaluate", "check my knowledge", "how well do i know",
            "question", "exercise", "problem"
        ]

        request_lower = request.lower()
        is_assessment_request = any(keyword in request_lower for keyword in assessment_keywords)

        if not is_assessment_request:
            return AgentResponse(
                content="I'm here to help with assessment and practice. Would you like me to create a quiz, challenge, or evaluate your knowledge on a topic?",
                agent_type=self.agent_type,
                confidence=0.3,
                requires_follow_up=True
            )

        # Determine what type of assessment is needed
        assessment_type = self._determine_assessment_type(request)

        # Extract the topic if specified
        topic = self._extract_topic(request, context)

        if assessment_type == "quiz":
            return await self._create_quiz(topic, tools)
        elif assessment_type == "evaluation":
            return await self._evaluate_knowledge(topic, context, tools)
        elif assessment_type == "practice":
            return await self._suggest_practice(topic, tools)
        else:
            return await self._general_assessment_help(topic)

    def get_capabilities(self) -> List[str]:
        """Get assessment agent capabilities."""
        return [
            "Creating quizzes and tests",
            "Evaluating knowledge level",
            "Generating practice exercises",
            "Tracking learning progress",
            "Identifying knowledge gaps",
            "Providing feedback on answers"
        ]

    def can_handle(self, request: str, context: Dict[str, Any]) -> float:
        """Determine if this is an assessment request."""
        assessment_keywords = [
            "quiz", "test", "challenge", "practice", "assess",
            "evaluate", "check my", "how well", "question", "exercise"
        ]

        request_lower = request.lower()
        matches = sum(1 for keyword in assessment_keywords if keyword in request_lower)

        return min(0.9, 0.4 + (matches * 0.25))

    def _determine_assessment_type(self, request: str) -> str:
        """Determine what type of assessment is requested."""
        request_lower = request.lower()

        if "quiz" in request_lower or "test" in request_lower:
            return "quiz"
        elif "evaluate" in request_lower or "check my" in request_lower or "how well" in request_lower:
            return "evaluation"
        elif "practice" in request_lower or "exercise" in request_lower:
            return "practice"
        else:
            return "general"

    def _extract_topic(self, request: str, context: Dict[str, Any]) -> str:
        """Extract the topic for assessment."""
        # Look for topic in request
        request_lower = request.lower()

        # Patterns to extract topics
        patterns = [
            "quiz on ", "test on ", "about ", "regarding ",
            "in ", "for ", "with "
        ]

        for pattern in patterns:
            if pattern in request_lower:
                start_idx = request_lower.find(pattern) + len(pattern)
                topic = request[start_idx:].strip()
                # Clean up the topic
                topic = topic.rstrip("?.,!")
                if len(topic) > 0 and len(topic) < 50:  # Reasonable topic length
                    return topic

        # Check context for current topic
        if "current_topic" in context:
            return context["current_topic"]

        return ""

    async def _create_quiz(self, topic: str, tools: Dict[str, Any]) -> AgentResponse:
        """Create a quiz for the given topic."""
        if not topic:
            return AgentResponse(
                content="To create a quiz, I need to know what topic you'd like to be quizzed on. What subject or concept would you like to test?",
                agent_type=self.agent_type,
                confidence=0.7,
                requires_follow_up=True
            )

        # Try to get quiz questions from tools
        quiz_data = None
        if "get_quiz" in tools:
            try:
                quiz_data = await tools["get_quiz"](topic, difficulty="medium", num_questions=3)
            except:
                pass

        if quiz_data:
            content = f"## Quiz: {topic}\n\n{quiz_data}\n\nTake your time and answer each question. I'll evaluate your responses when you're ready!"
        else:
            # Generate a simple quiz
            content = f"""## Quiz: {topic}

Here are 3 questions to test your knowledge:

1. What is the fundamental concept of {topic}?
2. How would you apply {topic} in a practical situation?
3. What are the key components or principles of {topic}?

Please answer each question, and I'll provide feedback on your responses."""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.8,
            data={"topic": topic, "quiz_type": "generated"},
            requires_follow_up=True,
            suggested_tools=["update_quiz", "get_learning_statistics"]
        )

    async def _evaluate_knowledge(self, topic: str, context: Dict[str, Any], tools: Dict[str, Any]) -> AgentResponse:
        """Evaluate user's knowledge on a topic."""
        content = f"""## Knowledge Evaluation: {topic}

To evaluate your understanding of {topic}, I'll assess your knowledge through several criteria:

### Evaluation Areas:
1. **Conceptual Understanding**: Can you define and explain the core concepts?
2. **Application**: Can you apply the knowledge to practical situations?
3. **Connections**: Can you relate this to other topics you know?

### How This Works:
• I'll ask targeted questions
• You can respond in your own words
• I'll provide feedback and identify areas for improvement

Ready to start? Or would you prefer a different approach to evaluation?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"topic": topic, "evaluation_type": "comprehensive"},
            requires_follow_up=True
        )

    async def _suggest_practice(self, topic: str, tools: Dict[str, Any]) -> AgentResponse:
        """Suggest practice exercises for a topic."""
        if not topic:
            return AgentResponse(
                content="What topic would you like to practice exercises for?",
                agent_type=self.agent_type,
                confidence=0.7,
                requires_follow_up=True
            )

        content = f"""## Practice Exercises: {topic}

Here are some practice activities to strengthen your understanding:

### 📝 Beginner Exercises:
1. **Definition Practice**: Write a definition in your own words
2. **Example Finding**: Find 3 real-world examples
3. **Teaching Exercise**: Explain it to someone else

### 🎯 Intermediate Challenges:
1. **Problem Solving**: Apply the concept to a specific problem
2. **Comparison**: Compare and contrast with related concepts
3. **Creation**: Create something using this knowledge

### 🚀 Advanced Application:
1. **Integration**: Connect this to other areas of knowledge
2. **Innovation**: Think of novel applications
3. **Evaluation**: Critically analyze limitations or edge cases

Which level would you like to start with?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.8,
            data={"topic": topic, "practice_levels": ["beginner", "intermediate", "advanced"]},
            requires_follow_up=True
        )

    async def _general_assessment_help(self, topic: str) -> AgentResponse:
        """Provide general assessment help."""
        content = """## Assessment & Learning Support

I can help you assess your learning in several ways:

### 📊 **Knowledge Assessment**
- **Quizzes**: Test your understanding with targeted questions
- **Self-Evaluation**: Reflect on your confidence and comprehension
- **Progress Tracking**: Monitor your improvement over time

### 🎯 **Practice Opportunities**
- **Exercises**: Apply what you've learned
- **Challenges**: Push your understanding further
- **Real Problems**: Work with practical applications

### 📈 **Learning Insights**
- **Gap Analysis**: Identify what you need to work on
- **Strength Recognition**: See where you excel
- **Next Steps**: Get personalized recommendations

What type of assessment would be most helpful for your learning goals right now?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.7,
            requires_follow_up=True
        )