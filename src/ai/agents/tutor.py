"""
Tutor agent for Learning Catalyst.

Provides explanations, breaks down concepts, and adapts teaching style.
"""

from typing import Dict, List, Any

from .base import Agent, AgentResponse, AgentType


class TutorAgent(Agent):
    """Agent specialized in tutoring and concept explanation."""

    def __init__(self, ai_provider=None):
        super().__init__(AgentType.TUTOR, ai_provider)

    async def process_request(
        self,
        request: str,
        context: Dict[str, Any],
        tools: Dict[str, Any]
    ) -> AgentResponse:
        """Process tutoring requests."""

        # Check if this is a tutoring-related request
        tutoring_keywords = [
            "explain", "what is", "how does", "help me understand",
            "teach me", "concept", "learn", "understand", "clarify"
        ]

        request_lower = request.lower()
        is_tutoring_request = any(keyword in request_lower for keyword in tutoring_keywords)

        if not is_tutoring_request:
            return AgentResponse(
                content="I'm here to help with learning and explanation. Could you rephrase your question as a request for explanation or help with a concept?",
                agent_type=self.agent_type,
                confidence=0.3,
                requires_follow_up=True
            )

        # Extract the concept/topic from the request
        concept = self._extract_concept(request)

        # Try to get concept information if available
        concept_info = ""
        if "get_concept" in tools and concept:
            try:
                concept_info = await tools["get_concept"](concept)
            except:
                concept_info = ""

        # Generate explanation
        if concept_info:
            explanation = f"**{concept}**\n\n{concept_info}\n\n"
            explanation += "Would you like me to break this down further or provide an example?"
        else:
            explanation = await self._generate_explanation(request, concept, context)

        return AgentResponse(
            content=explanation,
            agent_type=self.agent_type,
            confidence=0.8 if concept_info else 0.6,
            data={"concept": concept, "has_concept_info": bool(concept_info)},
            requires_follow_up=True,
            suggested_tools=["get_concept"] if concept else []
        )

    def get_capabilities(self) -> List[str]:
        """Get tutor agent capabilities."""
        return [
            "Explaining complex concepts",
            "Breaking down topics into understandable parts",
            "Providing examples and analogies",
            "Adapting explanations to learning level",
            "Answering conceptual questions"
        ]

    def can_handle(self, request: str, context: Dict[str, Any]) -> float:
        """Determine if this is a tutoring request."""
        tutoring_keywords = [
            "explain", "what is", "how does", "help me understand",
            "teach me", "concept", "learn", "understand", "clarify",
            "definition", "meaning", "describe"
        ]

        request_lower = request.lower()
        matches = sum(1 for keyword in tutoring_keywords if keyword in request_lower)

        # Also consider if user is asking about a specific concept
        if any(word in request_lower for word in ["python", "math", "science", "history", "programming"]):
            return 0.9

        return min(0.9, 0.3 + (matches * 0.2))

    def _extract_concept(self, request: str) -> str:
        """Extract the main concept from a request."""
        # Simple concept extraction - look for "what is X", "explain X", etc.
        request_lower = request.lower()

        # Patterns to extract concepts
        patterns = [
            "what is ", "explain ", "tell me about ", "help me understand ",
            "what does ", "how does ", "define ", "describe "
        ]

        for pattern in patterns:
            if pattern in request_lower:
                start_idx = request_lower.find(pattern) + len(pattern)
                concept = request[start_idx:].strip()
                # Remove trailing punctuation and question words
                concept = concept.rstrip("?.,!")
                for suffix in [" in simple terms", " in simple words", " easily"]:
                    if concept.endswith(suffix):
                        concept = concept[:-len(suffix)].strip()
                return concept

        # If no pattern matches, try to find the first significant noun phrase
        words = request.split()
        if len(words) > 2:
            return " ".join(words[:3])  # Return first 3 words as potential concept

        return ""

    async def _generate_explanation(
        self,
        request: str,
        concept: str,
        context: Dict[str, Any]
    ) -> str:
        """Generate a basic explanation."""

        base_explanation = await self._generate_response(request, context)

        # Add tutoring-specific structure
        if concept:
            structured_explanation = f"""## Understanding {concept}

{base_explanation}

### Key Points to Remember:
• Start with the basic definition
• Look for real-world examples
• Connect to what you already know
• Practice with exercises

Would you like me to:
1. Provide a specific example?
2. Break this down into simpler terms?
3. Show you how this applies in practice?"""
        else:
            structured_explanation = f"""## Learning Explanation

{base_explanation}

I'd be happy to help you understand this better. Could you tell me:
• What specific part is confusing?
• What you already know about this topic?
• How you learn best (examples, analogies, step-by-step)?"""

        return structured_explanation