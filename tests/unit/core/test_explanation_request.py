"""
Unit tests for Requesting an Explanation (Story 3) functionality
"""
import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.core.catalyst_agent import CatalystAgentImpl
from src.data.models.concept import Concept

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))


class TestExplanationRequest:
    @pytest.mark.asyncio
    async def test_explanation_generation(self, model_service_mock, knowledge_navigator_mock):
        """Test that the AI can generate clear explanations for concepts"""
        # Mock concept data
        concept = Concept(
            id="python-recursion",
            name="Recursion",
            content="Recursion is a programming technique where a function calls itself to solve a problem. "
            "It's like a Russian nesting doll - each call works on a smaller version of the same problem.",
            source_path="test.md",
            parent_id=None,
            depth=1
        )

        # Mock knowledge navigator to return the concept
        knowledge_navigator_mock.get_concept_by_name.return_value = concept

        # Configure mock to simulate explanation response
        model_service_mock.generate_response.return_value = {
            'content': "I'd be happy to help you understand recursion in Python!\n\n" \
                      "Recursion is a programming technique where a function calls itself to solve a problem. " \
                      "It's like a Russian nesting doll - each call works on a smaller version of the same problem.\n\n" \
                      "Let's look at a classic example - calculating factorial:\n\n" \
                      "```python\ndef factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    else:\n        return n * factorial(n-1)\n```\n\n" \
                      "Every recursive function has two key parts:\n\n" \
                      "1. Base case: The condition that stops the recursion (n == 0 or n == 1)\n" \
                      "2. Recursive case: Where the function calls itself with a smaller problem (n * factorial(n-1))"
        }

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service_mock)

        # Test explanation generation
        explanation = await catalyst_agent.generate_explanation("recursion", knowledge_navigator_mock)

        # Verify the response contains a clear explanation
        assert "recursion" in explanation.lower()
        assert "function calls itself" in explanation.lower()
        assert "factorial" in explanation.lower()
        assert "base case" in explanation.lower()
        assert "recursive case" in explanation.lower()

    @pytest.mark.asyncio
    async def test_concept_grounding(self, model_service_mock, knowledge_navigator_mock):
        """Test that explanations are grounded in the user's local Markdown files"""
        # Mock concept data with specific content
        concept = Concept(
            id="python-lists",
            name="Python Lists",
            content="Python lists are ordered, mutable collections of items. They are defined by square brackets []."
            "Lists can contain items of different types. Some common list operations include append(), extend(), "
            "insert(), remove(), pop(), and more.",
            source_path="python-notes.md",
            parent_id=None,
            depth=1
        )

        # Mock knowledge navigator to return the concept
        knowledge_navigator_mock.get_concept_by_name.return_value = concept

        # Configure mock to simulate response grounded in concept content
        model_service_mock.generate_response.return_value = {
            'content': "Python lists are ordered, mutable collections of items. They are defined by square brackets [] and "
            "can contain items of different types. Some common operations you can perform on lists include:\n\n"
            "- append(): Add an item to the end of the list\n"
            "- extend(): Add multiple items to the end of the list\n"
            "- insert(): Insert an item at a specific position\n"
            "- remove(): Remove the first occurrence of a value\n"
            "- pop(): Remove and return an item at a specific position"
        }

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service_mock)

        # Test concept grounding
        explanation = await catalyst_agent.generate_explanation("python lists", knowledge_navigator_mock)

        # Verify the explanation is grounded in the source content
        assert "ordered, mutable collections" in explanation
        assert "defined by square brackets []" in explanation
        assert "append()" in explanation
        assert "extend()" in explanation
        assert "insert()" in explanation
        assert "remove()" in explanation
        assert "pop()" in explanation

    @pytest.mark.asyncio
    async def test_conversation_history_updating(self, db_manager_mock):
        """Test that explanations are added to the conversation history"""
        # Create mock conversation entries
        user_query = "Explain Python dictionaries"
        ai_response = "Python dictionaries are unordered collections of key-value pairs..."

        # Mock database manager's add_conversation method
        db_manager_mock.add_conversation = AsyncMock()

        # Add user query to conversation
        await db_manager_mock.add_conversation("test-session-1", "user", user_query)

        # Add AI response to conversation
        await db_manager_mock.add_conversation("test-session-1", "ai", ai_response)

        # Verify the add_conversation method was called correctly
        assert db_manager_mock.add_conversation.call_count == 2

        # Check the parameters of the second call (AI response)
        args, kwargs = db_manager_mock.add_conversation.call_args_list[1]
        assert args[0] == "test-session-1"
        assert args[1] == "ai"
        assert args[2] == ai_response

    @pytest.mark.asyncio
    async def test_explanation_format_consistency(self, model_service_mock):
        """Test that explanations have a consistent format with code examples when appropriate"""
        # Configure mock to simulate explanation with code example
        model_service_mock.generate_response.return_value = {
            'content': "In Python, a dictionary is a collection of key-value pairs. Here's how you can create and use one:\n\n" \
                      "```python\n# Create a dictionary\nperson = {'name': 'John', 'age': 30, 'city': 'New York'}\n\n# Access values\nprint(person['name'])  # Output: John\n\n# Add or update a key-value pair\nperson['job'] = 'Developer'\n\n# Remove a key-value pair\ndel person['age']\n```\n\n" \
                      "Dictionaries are mutable, unordered (in Python 3.6 and earlier), and allow fast lookups based on keys."
        }

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service_mock)

        # Test explanation format
        explanation = await catalyst_agent.generate_explanation("python dictionaries", None)

        # Verify the explanation has a consistent format with code example
        assert "```python" in explanation
        assert "```" in explanation
        assert "Create a dictionary" in explanation or "# Create a dictionary" in explanation
        assert "Access values" in explanation or "# Access values" in explanation

    @pytest.mark.asyncio
    async def test_non_existent_concept_handling(self, model_service_mock, knowledge_navigator_mock):
        """Test how the system handles requests for explanations of concepts that don't exist in the user's materials"""
        # Mock knowledge navigator to return None for non-existent concept
        knowledge_navigator_mock.get_concept_by_name.return_value = None

        # Configure mock to simulate response for non-existent concept
        model_service_mock.generate_response.return_value = {
            'content': "I don't see any specific materials about quantum computing in your notes. " \
                      "Would you like me to explain it based on my general knowledge, or would you prefer to " \
                      "add materials about quantum computing to your learning space first?"
        }

        # Initialize Catalyst Agent
        catalyst_agent = CatalystAgentImpl(model_service_mock)

        # Test handling of non-existent concept
        response = await catalyst_agent.generate_explanation("quantum computing", knowledge_navigator_mock)

        # Verify the system handles the non-existent concept gracefully
        assert "don't see any specific materials" in response.lower()
        assert "explain it based on my general knowledge" in response.lower() or "general knowledge" in response.lower()
        assert "add materials" in response.lower()
