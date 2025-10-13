"""
Recommendation agent for Learning Catalyst.

Suggests next learning steps and personalizes content.
"""

from typing import Dict, List, Any

from .base import Agent, AgentResponse, AgentType


class RecommendationAgent(Agent):
    """Agent specialized in learning recommendations and guidance."""

    def __init__(self, ai_provider=None):
        super().__init__(AgentType.RECOMMENDATION, ai_provider)

    async def process_request(
        self,
        request: str,
        context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """Process recommendation requests."""

        # Check if this is a recommendation-related request
        recommendation_keywords = [
            "recommend", "suggest", "what should i", "next", "where to start",
            "learning path", "what to learn", "guidance", "advice", "direction"
        ]

        request_lower = request.lower()
        is_recommendation_request = any(keyword in request_lower for keyword in recommendation_keywords)

        if not is_recommendation_request:
            return AgentResponse(
                content="I'm here to help with learning recommendations and guidance. Would you like suggestions for what to learn next or guidance on your learning path?",
                agent_type=self.agent_type,
                confidence=0.3,
                requires_follow_up=True
            )

        # Determine what type of recommendation is needed
        recommendation_type = self._determine_recommendation_type(request)

        # Extract context for personalization
        learning_context = self._extract_learning_context(context)

        if recommendation_type == "next_steps":
            return await self._suggest_next_steps(learning_context, tools)
        elif recommendation_type == "learning_path":
            return await self._create_learning_path(request, learning_context, tools)
        elif recommendation_type == "content":
            return await self._recommend_content(request, learning_context, tools)
        elif recommendation_type == "guidance":
            return await self._provide_guidance(request, learning_context)
        else:
            return await self._general_recommendations(learning_context)

    def get_capabilities(self) -> List[str]:
        """Get recommendation agent capabilities."""
        return [
            "Suggesting next learning steps",
            "Creating personalized learning paths",
            "Recommending learning resources",
            "Providing study guidance",
            "Adapting recommendations to progress",
            "Identifying learning opportunities"
        ]

    def can_handle(self, request: str, context: Dict[str, Any]) -> float:
        """Determine if this is a recommendation request."""
        recommendation_keywords = [
            "recommend", "suggest", "what should i", "next", "where to start",
            "learning path", "what to learn", "guidance", "advice", "direction",
            "help me choose", "where should i", "can you suggest"
        ]

        request_lower = request.lower()
        matches = sum(1 for keyword in recommendation_keywords if keyword in request_lower)

        return min(0.9, 0.4 + (matches * 0.2))

    def _determine_recommendation_type(self, request: str) -> str:
        """Determine what type of recommendation is requested."""
        request_lower = request.lower()

        if "next step" in request_lower or "what should i learn next" in request_lower:
            return "next_steps"
        elif "learning path" in request_lower or "path" in request_lower:
            return "learning_path"
        elif "resource" in request_lower or "content" in request_lower or "material" in request_lower:
            return "content"
        elif "guidance" in request_lower or "advice" in request_lower or "help me" in request_lower:
            return "guidance"
        else:
            return "general"

    def _extract_learning_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant learning context from the session."""
        learning_context = {}

        # Current topics
        if "current_topic" in context:
            learning_context["current_topic"] = context["current_topic"]
        if "recent_topics" in context:
            learning_context["recent_topics"] = context["recent_topics"]

        # Progress information
        if "learning_progress" in context:
            learning_context["progress"] = context["learning_progress"]
        if "quiz_scores" in context:
            learning_context["recent_performance"] = context["quiz_scores"]

        # User preferences
        if "learning_style" in context:
            learning_context["learning_style"] = context["learning_style"]
        if "difficulty_preference" in context:
            learning_context["difficulty_preference"] = context["difficulty_preference"]

        # Goals
        if "learning_goals" in context:
            learning_context["goals"] = context["learning_goals"]

        return learning_context

    async def _suggest_next_steps(self, learning_context: Dict[str, Any], tools: Dict[str, Any]) -> AgentResponse:
        """Suggest next learning steps based on context."""
        current_topic = learning_context.get("current_topic", "your current topic")

        # Try to get knowledge map for recommendations
        recommendations = ""
        if "get_knowledge_map" in tools and current_topic != "your current topic":
            try:
                recommendations = await tools["get_knowledge_map"](current_topic)
            except:
                pass

        if recommendations:
            content = f"""## Next Learning Steps

Based on your progress with {current_topic}:

{recommendations}

### Recommended Next Steps:
1. **Practice**: Apply what you've learned
2. **Related Topics**: Explore connected concepts
3. **Assessment**: Test your understanding
4. **Real-world Application**: Find practical uses

Would you like me to elaborate on any of these recommendations?"""
        else:
            content = f"""## Recommended Next Steps

Since you're working with {current_topic}, here are some suggested next steps:

### 🎯 **Immediate Actions**
1. **Practice Exercise**: Apply your knowledge with a hands-on activity
2. **Quick Quiz**: Test your understanding of key concepts
3. **Teach Back**: Try explaining it in your own words

### 📚 **Deeper Learning**
1. **Advanced Topics**: Explore more complex aspects
2. **Related Concepts**: Connect to other areas
3. **Real Applications**: Find practical uses

### 🚀 **Long-term Growth**
1. **Project Work**: Create something using this knowledge
2. **Community**: Discuss with others learning similar topics
3. **Teaching**: Help others learn (solidifies your own knowledge)

Which type of next step interests you most?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.8,
            data={"recommendation_type": "next_steps", "context": learning_context},
            requires_follow_up=True,
            suggested_tools=["get_knowledge_map", "update_quiz", "get_learning_statistics"]
        )

    async def _create_learning_path(
        self,
        request: str,
        learning_context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """Create a personalized learning path."""

        # Extract subject from request
        subject = self._extract_subject_from_request(request)

        if not subject:
            return AgentResponse(
                content="To create a learning path, I need to know what subject or skill you want to learn. What would you like to master?",
                agent_type=self.agent_type,
                confidence=0.7,
                requires_follow_up=True
            )

        content = f"""## Personalized Learning Path: {subject}

### 🎯 **Learning Goals**
• Master fundamental concepts
• Build practical skills
• Apply knowledge in real situations
• Connect to advanced topics

### 📈 **Phase 1: Foundation (Week 1-2)**
1. **Core Concepts**: Understanding the basics
2. **Key Terminology**: Learning the language
3. **Basic Applications**: Simple hands-on practice

### 🏗️ **Phase 2: Building Skills (Week 3-4)**
1. **Intermediate Concepts**: Deeper understanding
2. **Problem Solving**: Applying knowledge
3. **Practice Projects**: Hands-on experience

### 🚀 **Phase 3: Mastery (Week 5-6+)**
1. **Advanced Topics**: Complex concepts
2. **Real Projects**: Practical applications
3. **Teaching Others**: Solidifying knowledge

### 📊 **Progress Tracking**
• Weekly checkpoints
• Knowledge assessments
• Skill demonstrations
• Portfolio building

Would you like me to elaborate on any phase or adjust this path based on your current level and goals?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"subject": subject, "path_type": "comprehensive"},
            requires_follow_up=True
        )

    async def _recommend_content(
        self,
        request: str,
        learning_context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """Recommend learning content and resources."""

        subject = self._extract_subject_from_request(request) or learning_context.get("current_topic", "your topic")

        content = f"""## Learning Resources for {subject}

### 📚 **Study Materials**
• **Textbooks & Guides**: Comprehensive written resources
• **Online Courses**: Structured video lessons
• **Interactive Tutorials**: Hands-on learning experiences

### 🎥 **Visual Learning**
• **Video Tutorials**: Step-by-step demonstrations
• **Infographics**: Visual summaries of concepts
• **Diagrams & Charts**: Visual representations

### 🛠️ **Practical Resources**
• **Practice Problems**: Exercises to test understanding
• **Projects**: Real-world applications
• **Code Examples**: Working implementations

### 👥 **Community Learning**
• **Study Groups**: Collaborative learning
• **Forums**: Q&A and discussion
• **Mentorship**: Guidance from experienced learners

### 📱 **Mobile & Quick Learning**
• **Flashcards**: Quick concept review
• **Podcasts**: Audio learning on the go
• **Apps**: Interactive practice

What type of learning resource works best for you? I can provide more specific recommendations based on your learning style."""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.8,
            data={"subject": subject, "resource_types": ["study", "visual", "practical", "community", "mobile"]},
            requires_follow_up=True
        )

    async def _provide_guidance(
        self,
        request: str,
        learning_context: Dict[str, Any]
    ) -> AgentResponse:
        """Provide general learning guidance."""

        content = """## Learning Guidance & Strategy

### 🎯 **Setting Effective Goals**
• **Specific**: Define exactly what you want to learn
• **Measurable**: Track your progress with concrete metrics
• **Achievable**: Set realistic expectations
• **Relevant**: Connect to your broader objectives
• **Time-bound**: Set deadlines for motivation

### 📚 **Effective Learning Strategies**
• **Active Recall**: Test yourself regularly
• **Spaced Repetition**: Review at increasing intervals
• **Interleaving**: Mix different topics in study sessions
• **Elaboration**: Connect new info to what you already know
• **Dual Coding**: Combine visual and verbal information

### 🏃‍♂️ **Maintaining Momentum**
• **Consistent Schedule**: Study at regular times
• **Small Wins**: Celebrate daily progress
• **Accountability**: Share your goals with others
• **Flexibility**: Adjust your approach as needed

### 🤝 **Getting Help**
• **Ask Questions**: Don't hesitate to seek clarification
• **Find Study Partners**: Learn with others
• **Use Resources**: Take advantage of available materials
• **Seek Feedback**: Get input on your progress

What specific aspect of your learning journey would you like guidance on?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.9,
            data={"guidance_type": "comprehensive"},
            requires_follow_up=True
        )

    async def _general_recommendations(self, learning_context: Dict[str, Any]) -> AgentResponse:
        """Provide general recommendations when no specific type is identified."""

        content = """## Personalized Learning Recommendations

Based on your learning journey, here are some recommendations:

### 🎯 **Focus Areas**
• **Strengthen Foundations**: Ensure core concepts are solid
• **Practice Regularly**: Consistent application of knowledge
• **Connect Topics**: Build relationships between different areas

### 📈 **Growth Opportunities**
• **Challenge Yourself**: Push beyond comfort zone
• **Teach Others**: Share your knowledge to deepen understanding
• **Real Projects**: Apply learning to practical situations

### 🔄 **Learning Process**
• **Review Progress**: Regularly assess what you've learned
• **Adjust Methods**: Modify approach based on effectiveness
• **Set New Goals**: Continuously expand your horizons

Would you like specific recommendations for:
• Next learning steps?
• Study strategies?
• Resource suggestions?
• Project ideas?
• Something else?"""

        return AgentResponse(
            content=content,
            agent_type=self.agent_type,
            confidence=0.7,
            data={"recommendation_type": "general"},
            requires_follow_up=True
        )

    def _extract_subject_from_request(self, request: str) -> str:
        """Extract the subject/topic from the request."""
        request_lower = request.lower()

        # Look for patterns indicating subjects
        patterns = [
            "learn ", "study ", "master ", "understand ",
            "about ", "for ", "in ", "on "
        ]

        for pattern in patterns:
            if pattern in request_lower:
                start_idx = request_lower.find(pattern) + len(pattern)
                subject = request[start_idx:].strip()
                # Clean up the subject
                subject = subject.rstrip("?.,!")
                if len(subject) > 0 and len(subject) < 50:
                    return subject

        return ""