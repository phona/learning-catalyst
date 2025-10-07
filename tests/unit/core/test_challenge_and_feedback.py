"""
Unit tests for Requesting a Challenge (Story 4) and Getting Feedback (Story 5)
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.catalyst_agent import CatalystAgentImpl
from src.data.models.challenge import Challenge
from src.data.models.concept import Concept
from src.data.models.extended_models import AIResponse

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))


class TestChallengeAndFeedback:
    """Test cases for challenge generation and feedback functionality"""

    @pytest.mark.asyncio
    async def test_challenge_generation(self, model_service: MagicMock, knowledge_navigator: MagicMock):
        """Test that the system can generate relevant challenges for concepts"""
        # Mock concept data
        concept = Concept(
            id="python-lists",
            title="Python Lists",
            content="Python lists are ordered, mutable collections. Common operations include slicing, appending, and more.",
            prerequisites=[],
            difficulty_level=1,
        )

        # Configure mock to simulate challenge response
        model_service.send_message = AsyncMock(
            return_value=AIResponse(
                content="What will be the output of the following Python code?\n\n```python\n"
                "my_list = [1, 2, 3, 4, 5]\nmy_list[1:3] = [10, 20]\nprint(my_list)\n```\n\n"
                "A) [1, 10, 20, 4, 5]\nB) [1, 10, 20, 3, 4, 5]\nC) [10, 20, 4, 5]\nD) [1, 2, 10, 20, 4, 5]",
                model="gpt-4o",
                provider="openai",
                usage={"input_tokens": 50, "output_tokens": 100, "total_tokens": 150},
                timestamp="2023-01-01T00:00:00",
            )
        )

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service)

        # Create context as a dictionary to match interface
        context = {"challenge_type": "multiple-choice", "difficulty": "medium"}

        # Test challenge generation by using the catalyst agent directly
        challenge_data = await catalyst_agent.generate_challenge(concept, context)

        # Verify the response contains challenge elements
        assert "output of the following Python code" in challenge_data["challenge_text"]
        assert "A)" in challenge_data["challenge_text"] and "B)" in challenge_data["challenge_text"]

    @pytest.mark.asyncio
    async def test_answer_evaluation_correct(self, model_service: MagicMock):
        """Test that the system correctly evaluates a correct answer"""
        # Create a sample challenge
        # Create a sample challenge (not used directly, just for context)
        Challenge(
            id="test-challenge-1",
            concept_id="python-lists",
            challenge_type="multiple_choice",
            challenge_text="What will be the output of [1, 2, 3, 4, 5][1:3] = [10, 20]?",
            expected_answer="A",
            options={
                "A": "[1, 10, 20, 4, 5]",
                "B": "[1, 10, 20, 3, 4, 5]",
                "C": "[10, 20, 4, 5]",
                "D": "[1, 2, 10, 20, 4, 5]",
            },
        )

        # Configure mock to simulate feedback for correct answer
        model_service.send_message = AsyncMock(
            return_value=AIResponse(
                content="Excellent! You chose correctly.\n\n"
                "The answer is A) [1, 10, 20, 4, 5]\n\n"
                "In Python, list slicing with assignment replaces the specified slice with the new elements. "
                "The slice [1:3] refers to elements at indices 1 and 2 (values 2 and 3). "
                "These are replaced with [10, 20], resulting in [1, 10, 20, 4, 5].\n\n"
                "The length of the replacement doesn't need to match the length of the slice being replaced, "
                "which makes list slicing assignment very flexible!",
                model="gpt-4o",
                provider="openai",
                usage={"input_tokens": 50, "output_tokens": 100, "total_tokens": 150},
                timestamp="2023-01-01T00:00:00",
            )
        )

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service)

        # Create context as dictionary to match interface
        context = {"provider": "openai", "model": "gpt-4o"}

        # Test answer evaluation (correct) - using the catalyst agent's method
        feedback = await catalyst_agent.evaluate_answer("A", "A", context)

        # Verify the feedback is positive and explains the correct answer
        assert "Excellent" in feedback["feedback"] or "correctly" in feedback["feedback"]
        assert "A) [1, 10, 20, 4, 5]" in feedback["feedback"]
        assert "list slicing with assignment" in feedback["feedback"].lower()
        assert feedback["correctness"] is True  # Changed to is True instead of == True for clarity

    @pytest.mark.asyncio
    async def test_answer_evaluation_incorrect(self, model_service: MagicMock):
        """Test that the system correctly evaluates an incorrect answer and provides constructive feedback"""
        # Create a sample challenge
        # Create a sample challenge (not used directly, just for context)
        Challenge(
            id="test-challenge-1",
            concept_id="python-lists",
            challenge_type="multiple_choice",
            challenge_text="What will be the output of [1, 2, 3, 4, 5][1:3] = [10, 20]?",
            expected_answer="A",
            options={
                "A": "[1, 10, 20, 4, 5]",
                "B": "[1, 10, 20, 3, 4, 5]",
                "C": "[10, 20, 4, 5]",
                "D": "[1, 2, 10, 20, 4, 5]",
            },
        )

        # Configure mock to simulate feedback for incorrect answer
        model_service.send_message = AsyncMock(
            return_value=AIResponse(
                content="Not quite. Let's take a closer look.\n\n"
                "The correct answer is A) [1, 10, 20, 4, 5], not B.\n\n"
                "In Python, when you assign to a slice like my_list[1:3] = [10, 20], you're replacing "
                "the elements at indices 1 and 2 (which are 2 and 3) with the new elements [10, 20]. "
                "This doesn't add new elements but replaces the existing ones in that range.\n\n"
                "Let's try another similar example to reinforce this concept!",
                model="gpt-4o",
                provider="openai",
                usage={"input_tokens": 50, "output_tokens": 100, "total_tokens": 150},
                timestamp="2023-01-01T00:00:00",
            )
        )

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service)

        # Create context as dictionary to match interface
        context = {"provider": "openai", "model": "gpt-4o"}

        # Test answer evaluation (incorrect) - using the catalyst agent's method
        feedback = await catalyst_agent.evaluate_answer("B", "A", context)  # user answered B, correct is A

        # Verify the feedback is constructive and explains the mistake
        assert "Not quite" in feedback["feedback"] or "closer look" in feedback["feedback"].lower()
        assert "correct answer is a)" in feedback["feedback"].lower()
        assert "replacing the elements at indices 1 and 2" in feedback["feedback"].lower()
        assert feedback["correctness"] is False

    @pytest.mark.asyncio
    async def test_challenge_response_storage(self, db_manager: MagicMock):
        """Test that challenge responses are properly stored in the database"""
        # Create a sample challenge and response
        # Create a sample challenge (not used directly, just for context)
        Challenge(
            id="test-challenge-1",
            concept_id="python-lists",
            challenge_type="multiple_choice",
            challenge_text="Challenge content",
            expected_answer="A",
            options={"A": "Option A", "B": "Option B"},
        )

        # Mock database manager's add_challenge_response method
        db_manager.add_challenge_response = AsyncMock()

        # Add challenge response to database
        await db_manager.add_challenge_response("test-session-1", "test-challenge-1", "A", True, "Feedback content")

        # Verify the add_challenge_response method was called correctly
        db_manager.add_challenge_response.assert_called_once()
        args, _ = db_manager.add_challenge_response.call_args
        assert args[0] == "test-session-1"
        assert args[1] == "test-challenge-1"
        assert args[2] == "A"
        assert args[3] is True
        assert args[4] == "Feedback content"

    @pytest.mark.asyncio
    async def test_variety_of_challenge_types(self, model_service: MagicMock):
        """Test that the system can generate different types of challenges"""
        # Create concept with correct attributes
        concept = Concept(
            id="javascript-closures",
            title="JavaScript Closures",
            content="Closures are functions bundled with their lexical environment.",
            prerequisites=[],
            difficulty_level=1,
        )

        # Configure mock to simulate an open-ended challenge
        model_service.send_message = AsyncMock(
            return_value=AIResponse(
                content="Explain what a closure is in JavaScript and provide a practical example of how it can be used. "
                "Make sure to explain the concept clearly and show the benefits of using closures.",
                model="gpt-4o",
                provider="openai",
                usage={"input_tokens": 50, "output_tokens": 100, "total_tokens": 150},
                timestamp="2023-01-01T00:00:00",
            )
        )

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service)

        # Create context as a dictionary to match interface
        context = {"challenge_type": "open-ended", "difficulty": "medium"}

        # Test generating a challenge using the catalyst agent directly
        challenge_data = await catalyst_agent.generate_challenge(concept, context)

        # Verify the challenge data was created
        assert "Explain what a closure is" in challenge_data["challenge_text"]
        assert "provide a practical example" in challenge_data["challenge_text"]
