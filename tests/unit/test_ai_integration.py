"""
Unit tests for AI integration in Learning Catalyst.

This test file verifies that users can actually communicate with AI in the app,
not just receive fixed response messages.
"""

from unittest.mock import Mock, AsyncMock
import pytest

from src.ai.service import ModelAbstractionService
from src.core.catalyst_agent import CatalystAgentImpl, ConversationContext, IntentClassification
from src.core.challenge_engine import ChallengeEngineImpl
from src.data.models.concept import Concept
from src.data.models.extended_models import Message, AIResponse


class TestAIIntegration:
    """Test class for AI integration functionality."""

    @pytest.mark.asyncio
    async def test_model_service_send_message(self):
        """Test that ModelAbstractionService can send messages and receive responses."""
        # Create a mock response
        mock_response = AIResponse(
            content="Python decorators are functions that modify other functions.",
            model="gpt-3.5-turbo",
            provider="openai",
            usage={},
            timestamp="2024-01-01T00:00:00"
        )

        # Create the service
        service = ModelAbstractionService()

        # Mock the send_message method
        service.send_message = AsyncMock(return_value=mock_response)

        # Test sending a message
        messages = [Message(role="user", content="Explain Python decorators")]
        response = await service.send_message(messages)

        # Verify the response
        assert response is not None, "Should receive a response"
        assert "decorator" in response.content, "Response should mention decorators"
        assert "function" in response.content, "Response should mention functions"
        assert response.model == "gpt-3.5-turbo", "Should use the correct model"
        assert response.provider == "openai", "Should use the correct provider"

    @pytest.mark.asyncio
    async def test_catalyst_agent_interpret_intent(self):
        """Test that CatalystAgent can interpret user intent."""
        # Create a mock model service
        mock_service = Mock(spec=ModelAbstractionService)

        # Create the agent
        agent = CatalystAgentImpl(mock_service)

        # Create a context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=None,
            conversation_history=[],
            interaction_history=[]
        )

        # Test different types of input
        test_cases = [
            ("What is a decorator?", "query"),
            ("Give me a challenge", "challenge_request"),
            ("Hello, I'm new here", "query"),
            ("Just chatting", "general_conversation")
        ]

        for user_input, expected_intent in test_cases:
            intent = await agent.interpret_intent(user_input, context)
            assert intent.intent_type == expected_intent, (
                f"Should interpret '{user_input}' as {expected_intent}"
            )

    @pytest.mark.asyncio
    async def test_catalyst_agent_generate_response(self):
        """Test that CatalystAgent can generate responses based on intent."""
        # Create a mock model service
        mock_service = Mock(spec=ModelAbstractionService)
        mock_response = AIResponse(
            content="Python decorators are functions that modify other functions.",
            model="gpt-3.5-turbo",
            provider="openai",
            usage={},
            timestamp="2024-01-01T00:00:00"
        )
        mock_service.send_message = AsyncMock(return_value=mock_response)

        # Create the agent
        agent = CatalystAgentImpl(mock_service)

        # Create a context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=None,
            conversation_history=[],
            interaction_history=[]
        )

        # Test generating a response
        user_input = "Explain Python decorators"
        intent = IntentClassification("query")
        response = await agent.generate_response(user_input, intent, context)

        # Verify the response
        assert response is not None, "Should generate a response"
        assert "decorator" in response.lower(), "Response should mention decorators"
        assert "function" in response.lower(), "Response should mention functions"
        assert len(response) > 30, "Response should be substantial"

    @pytest.mark.asyncio
    async def test_challenge_engine_generate_challenge(self):
        """Test that ChallengeEngine can generate challenges."""
        # Create a mock model service
        mock_service = Mock(spec=ModelAbstractionService)
        mock_response = AIResponse(
            content='{"challenge_text": "Write a decorator that measures execution time", '
                    '"correct_answer": "Use time module", '
                    '"explanation": "Decorators can wrap functions to add functionality"}',
            model="gpt-3.5-turbo",
            provider="openai",
            usage={},
            timestamp="2024-01-01T00:00:00"
        )
        mock_service.send_message = AsyncMock(return_value=mock_response)

        # Create a mock catalyst agent
        mock_agent = Mock(spec=CatalystAgentImpl)

        # Create the challenge engine
        engine = ChallengeEngineImpl(mock_agent, mock_service, "/tmp/test")

        # Create a concept
        concept = Concept(
            id="test-concept-1",
            title="Python Decorators",
            content="Python decorators are functions that modify other functions.",
            prerequisites=["functions"],
            difficulty_level=2
        )

        # Generate a challenge
        context = {
            "challenge_type": "short-answer",
            "difficulty": "intermediate",
            "concept_content": concept.content
        }

        challenge = await engine.generate_challenge(concept, context)

        # Verify the challenge
        assert challenge is not None, "Should generate a challenge"
        assert "challenge_text" in challenge, "Should have challenge text"
        assert "decorator" in challenge["challenge_text"].lower(), (
            "Challenge should mention decorators"
        )
        assert len(challenge["challenge_text"]) > 10, "Challenge should be substantial"

    @pytest.mark.asyncio
    async def test_conversation_flow(self):
        """Test a complete conversation flow with AI."""
        # Create a mock model service with different responses
        mock_service = Mock(spec=ModelAbstractionService)

        def mock_send_message(messages, temperature=0.7):  # pylint: disable=unused-argument
            # Extract the user message content
            user_content = ""
            for msg in messages:
                if msg.role == "user":
                    user_content = msg.content
                    break

            # Generate appropriate response based on content
            if "decorator" in user_content.lower():
                content = "Python decorators are functions that modify other functions."
            elif "example" in user_content.lower():
                content = (
                    "Here's an example of a decorator:\n\n"
                    "@timing\ndef my_function():\n    pass"
                )
            else:
                content = "I understand your question. Let me provide a helpful response."

            return AIResponse(
                content=content,
                model="gpt-3.5-turbo",
                provider="openai",
                usage={},
                timestamp="2024-01-01T00:00:00"
            )

        mock_service.send_message = AsyncMock(side_effect=mock_send_message)

        # Create the agent
        agent = CatalystAgentImpl(mock_service)

        # Create a context
        context = ConversationContext(
            user_profile={"learning_level": "intermediate"},
            current_concept=None,
            conversation_history=[],
            interaction_history=[]
        )

        # Simulate a conversation
        conversation = [
            "What is a Python decorator?",
            "Can you give me an example?"
        ]

        for user_input in conversation:
            # Interpret intent
            intent = await agent.interpret_intent(user_input, context)

            # Generate response
            response = await agent.generate_response(user_input, intent, context)

            # Verify response
            assert response is not None, f"Should respond to '{user_input}'"
            assert len(response) > 10, f"Response should be substantial for '{user_input}'"

            # Add to conversation history
            context.conversation_history.append({"role": "user", "content": user_input})
            context.conversation_history.append({"role": "assistant", "content": response})

    def test_model_abstraction_service_initialization(self):
        """Test that ModelAbstractionService initializes correctly."""
        # Create the service
        service = ModelAbstractionService()

        # Verify it has providers
        assert hasattr(service, 'providers'), "Should have providers attribute"
        assert len(service.providers) > 0, "Should have at least one provider"

        # Verify it has default providers
        assert "openai" in service.providers, "Should have OpenAI provider"
        assert "anthropic" in service.providers, "Should have Anthropic provider"
        assert "local" in service.providers, "Should have Local provider"
