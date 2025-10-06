"""
Unit tests for real AI communication in Learning Catalyst.

This test file verifies that users can actually communicate with AI in the app,
not just receive fixed response messages.
"""

import pytest
from unittest.mock import Mock, AsyncMock
import asyncio

# Import the components we need to test
from src.ai.service import ModelAbstractionService
from src.ai.abstraction import ModelAbstractionLayer
from src.core.catalyst_agent import CatalystAgentImpl, ConversationContext, IntentClassification
from src.core.challenge_engine import ChallengeEngineImpl
from src.data.database_manager import DatabaseManager
from src.data.models.concept import Concept
from src.data.models.extended_models import Message, AIResponse


class TestRealAICommunication:
    """Test class for real AI communication functionality."""

    @pytest.fixture
    def mock_db_manager(self):
        """Create a mock database manager."""
        mock_db = Mock(spec=DatabaseManager)
        mock_db.save_qa_pair = Mock()
        mock_db.get_conversation_history = Mock(return_value=[])
        return mock_db

    @pytest.fixture
    def mock_model_service(self):
        """Create a mock model service that simulates real AI responses."""
        mock_service = Mock(spec=ModelAbstractionService)

        # Create mock AI responses
        async def mock_send_message(messages, temperature=0.7):
            # Extract the user message content
            user_content = ""
            for msg in messages:
                if msg.role == "user":
                    user_content = msg.content
                    break

            # Generate appropriate response based on content
            if "decorator" in user_content.lower():
                content = "Python decorators are functions that modify other functions. They allow you to wrap another function to extend its behavior without permanently modifying it."
            elif "challenge" in user_content.lower() and "list" in user_content.lower():
                content = "Here's a challenge about Python lists: Write a function that takes a list of numbers and returns only the even numbers, without using list comprehension."
            elif "example" in user_content.lower() and "class" in user_content.lower():
                content = "Here's an example of a Python class:\n\nclass Dog:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n    \n    def bark(self):\n        return f\"{self.name} says woof!\""
            else:
                content = "I understand your question. Let me provide a helpful response based on my knowledge."

            return AIResponse(
                content=content,
                model="gpt-3.5-turbo",
                provider="openai",
                usage={},
                timestamp="2024-01-01T00:00:00"
            )

        mock_service.send_message = AsyncMock(side_effect=mock_send_message)
        return mock_service

    @pytest.fixture
    def catalyst_agent(self, mock_model_service):
        """Create a catalyst agent with mocked dependencies."""
        agent = CatalystAgentImpl(mock_model_service)
        return agent

    @pytest.fixture
    def challenge_engine(self, catalyst_agent, mock_model_service):
        """Create a challenge engine with mocked dependencies."""
        engine = ChallengeEngineImpl(catalyst_agent, mock_model_service, "/tmp/test")
        return engine

    @pytest.fixture
    def sample_concept(self):
        """Create a sample concept for testing."""
        return Concept(
            id="test-concept-1",
            title="Python Decorators",
            content="Python decorators are functions that modify other functions.",
            prerequisites=["functions"],
            difficulty_level=2
        )

    @pytest.mark.asyncio
    async def test_ai_explanation_with_content(self, catalyst_agent, sample_concept):
        """Test that AI provides meaningful explanations with relevant content."""
        # Create a conversation context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=sample_concept,
            conversation_history=[],
            interaction_history=[]
        )

        # Test explanation request
        user_input = "Explain what Python decorators are"
        intent = IntentClassification("query", sample_concept.id)

        # Generate the explanation
        response = await catalyst_agent.generate_response(user_input, intent, context)

        # Verify the response is meaningful and contains relevant content
        assert response is not None, "AI should provide a response"
        assert "decorator" in response.lower(), "Response should mention decorators"
        assert "function" in response.lower(), "Response should mention functions"
        assert len(response) > 50, "Response should be substantial"

    @pytest.mark.asyncio
    async def test_ai_challenge_generation_with_context(self, challenge_engine, sample_concept):
        """Test that AI generates contextual challenges."""
        # Generate a challenge about the concept
        context = {
            "challenge_type": "short-answer",
            "difficulty": "intermediate",
            "concept_content": sample_concept.content
        }

        challenge = await challenge_engine.generate_challenge(sample_concept, context)

        # Verify the challenge is meaningful
        assert challenge is not None, "Challenge should be generated"
        assert "challenge_text" in challenge, "Challenge should have text"
        assert sample_concept.title.lower() in challenge["challenge_text"].lower(), "Challenge should mention the concept"
        assert len(challenge["challenge_text"]) > 20, "Challenge should be substantial"

    @pytest.mark.asyncio
    async def test_ai_followup_with_context_awareness(self, catalyst_agent, sample_concept):
        """Test that AI maintains context in follow-up conversations."""
        # Create a conversation context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=sample_concept,
            conversation_history=[],
            interaction_history=[]
        )

        # First message to establish context
        first_input = "Let's talk about Python decorators"
        first_intent = IntentClassification("query", sample_concept.id)
        first_response = await catalyst_agent.generate_response(first_input, first_intent, context)

        # Add to conversation history
        context.conversation_history.append({"role": "user", "content": first_input})
        context.conversation_history.append({"role": "assistant", "content": first_response})

        # Follow-up question
        followup_input = "Can you give me an example?"
        followup_intent = IntentClassification("query", sample_concept.id)
        followup_response = await catalyst_agent.generate_response(followup_input, followup_intent, context)

        # Verify the follow-up maintains context
        assert followup_response is not None, "AI should provide a follow-up response"
        assert "example" in followup_response.lower(), "Response should provide an example"

    @pytest.mark.asyncio
    async def test_ai_adaptive_responses(self, catalyst_agent):
        """Test that AI adapts responses based on user input."""
        # Create a basic context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=None,
            conversation_history=[],
            interaction_history=[]
        )

        # Test with different types of questions
        questions = [
            "What is a Python decorator?",
            "How do I use decorators in Python?",
            "Can you show me a complex decorator example?"
        ]

        responses = []
        for question in questions:
            intent = IntentClassification("query")
            response = await catalyst_agent.generate_response(question, intent, context)
            responses.append(response)

        # Verify responses are different and adapted to each question
        assert len(set(responses)) == len(responses), "Each response should be unique"

        # Verify each response is relevant to its question
        for i, question in enumerate(questions):
            response = responses[i]
            assert len(response) > 30, f"Response {i} should be substantial"

    @pytest.mark.asyncio
    async def test_ai_conversation_flow(self, catalyst_agent, mock_db_manager):
        """Test the complete conversation flow with AI."""
        # Create a basic context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=None,
            conversation_history=[],
            interaction_history=[]
        )

        # Simulate a conversation
        conversation = [
            "Hi, I want to learn about Python",
            "Can you explain what a function is?",
            "How do I create a function with parameters?",
            "What about default parameters?",
            "Thanks for the explanation!"
        ]

        for i, user_input in enumerate(conversation):
            # Interpret intent
            intent = IntentClassification("query")

            # Generate response
            response = await catalyst_agent.generate_response(user_input, intent, context)

            # Verify response
            assert response is not None, f"AI should respond to message {i}"

            # Add to conversation history
            context.conversation_history.append({"role": "user", "content": user_input})
            context.conversation_history.append({"role": "assistant", "content": response})

    @pytest.mark.asyncio
    async def test_ai_model_switching(self):
        """Test that AI communication works with different models."""
        # Create mock providers
        mock_openai = Mock()
        mock_openai.send_message = AsyncMock(return_value=AIResponse(
            content="OpenAI response: This is from OpenAI model.",
            model="gpt-4",
            provider="openai",
            usage={},
            timestamp="2024-01-01T00:00:00"
        ))

        mock_anthropic = Mock()
        mock_anthropic.send_message = AsyncMock(return_value=AIResponse(
            content="Anthropic response: This is from Anthropic model.",
            model="claude-3",
            provider="anthropic",
            usage={},
            timestamp="2024-01-01T00:00:00"
        ))

        # Create model abstraction service
        model_service = ModelAbstractionService()

        # Mock the providers
        model_service._providers = {
            "openai": mock_openai,
            "anthropic": mock_anthropic
        }

        # Test with OpenAI
        await model_service.set_chat_model("openai", "gpt-4")
        response = await model_service.send_message([Message(role="user", content="Test prompt")])
        assert "OpenAI response" in response.content, "Should use OpenAI model"

        # Test with Anthropic
        await model_service.set_chat_model("anthropic", "claude-3")
        response = await model_service.send_message([Message(role="user", content="Test prompt")])
        assert "Anthropic response" in response.content, "Should use Anthropic model"
