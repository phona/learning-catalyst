"""
Unit tests for the startup guide module.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from datetime import datetime

from src.core.startup_guide import StartupGuide
from src.core.state_manager import ApplicationState
from src.data.models.concept import Concept


class TestStartupGuide:
    """Test cases for the StartupGuide class."""

    @pytest.fixture
    def mock_workspace_path(self):
        """Create a mock workspace path."""
        return "/test/workspace"

    @pytest.fixture
    def mock_knowledge_navigator(self):
        """Create a mock knowledge navigator."""
        navigator = Mock()
        navigator.get_available_concepts = AsyncMock(return_value=[])
        return navigator

    @pytest.fixture
    def mock_state_manager(self):
        """Create a mock state manager."""
        manager = Mock()
        manager.load_last_state = AsyncMock(return_value=None)
        return manager

    @pytest.fixture
    def startup_guide(self, mock_workspace_path, mock_knowledge_navigator, mock_state_manager):
        """Create a StartupGuide instance with mocked dependencies."""
        return StartupGuide(mock_workspace_path, mock_knowledge_navigator, mock_state_manager)

    @pytest.mark.asyncio
    async def test_generate_startup_message_first_time_user(self, startup_guide):
        """Test startup message generation for first-time users."""
        # Act
        message = await startup_guide.generate_startup_message(is_first_time=True, has_previous_state=False)

        # Assert
        assert "Welcome to Learning Catalyst" in message
        assert "first time" in message.lower()
        assert "/help" in message

    @pytest.mark.asyncio
    async def test_generate_startup_message_returning_user(self, startup_guide, mock_state_manager):
        """Test startup message generation for returning users with previous state."""
        # Arrange
        mock_state = ApplicationState(
            user_profile={"learning_style": "visual"},
            conversation_context={"current_concept": "Python Basics"},
            conversation_messages=[],
            current_state_metadata={"last_access": datetime.now().isoformat()}
        )
        mock_state_manager.load_last_state.return_value = mock_state

        # Act
        message = await startup_guide.generate_startup_message(is_first_time=False, has_previous_state=True)

        # Assert
        assert "Welcome back" in message
        assert "Python Basics" in message
        assert "continue" in message.lower()

    @pytest.mark.asyncio
    async def test_generate_startup_message_standard(self, startup_guide):
        """Test standard startup message generation."""
        # Act
        message = await startup_guide.generate_startup_message(is_first_time=False, has_previous_state=False)

        # Assert
        assert "Welcome to Learning Catalyst" in message
        assert "/concepts" in message
        assert "/help" in message

    def test_get_first_time_welcome(self, startup_guide):
        """Test first time welcome message."""
        # Act
        message = startup_guide._get_first_time_welcome()

        # Assert
        assert "Welcome to Learning Catalyst" in message
        assert "first time" in message.lower()

    @pytest.mark.asyncio
    async def test_get_returning_user_message_with_state(self, startup_guide, mock_state_manager, mock_knowledge_navigator):
        """Test returning user message with previous state."""
        # Arrange
        mock_state = ApplicationState(
            user_profile={},
            conversation_context={"current_concept": "Python Basics"},
            conversation_messages=[],
            current_state_metadata={"last_access": datetime.now().isoformat()}
        )
        mock_state_manager.load_last_state.return_value = mock_state

        concepts = [
            Concept(
                id="python-basics",
                title="Python Basics",
                content="Basic Python programming concepts",
                prerequisites=[],
                difficulty_level=1
            )
        ]
        mock_knowledge_navigator.get_available_concepts.return_value = concepts

        # Act
        message = await startup_guide._get_returning_user_message()

        # Assert
        assert "Welcome back" in message
        assert "Python Basics" in message

    @pytest.mark.asyncio
    async def test_get_returning_user_message_no_state(self, startup_guide, mock_state_manager):
        """Test returning user message with no previous state."""
        # Arrange
        mock_state_manager.load_last_state.return_value = None

        # Act
        message = await startup_guide._get_returning_user_message()

        # Assert
        assert message == startup_guide._get_standard_welcome()

    def test_get_standard_welcome(self, startup_guide):
        """Test standard welcome message."""
        # Act
        message = startup_guide._get_standard_welcome()

        # Assert
        assert "Welcome to Learning Catalyst" in message
        assert "/concepts" in message
        assert "/help" in message

    def test_get_progress_summary_no_concepts(self, startup_guide):
        """Test progress summary when no concepts are available."""
        # Act
        summary = startup_guide._get_progress_summary([])

        # Assert
        assert "No concepts available" in summary

    def test_get_progress_summary_with_concepts(self, startup_guide):
        """Test progress summary when concepts are available."""
        # Arrange
        concepts = [
            Concept(
                id="python-basics",
                title="Python Basics",
                content="Basic Python programming concepts",
                prerequisites=[],
                difficulty_level=1
            ),
            Concept(
                id="data-structures",
                title="Data Structures",
                content="Common data structures in programming",
                prerequisites=[],
                difficulty_level=2
            )
        ]

        # Act
        summary = startup_guide._get_progress_summary(concepts)

        # Assert
        assert "2 concepts available" in summary

    @pytest.mark.asyncio
    async def test_get_contextual_suggestions_no_concepts(self, startup_guide, mock_knowledge_navigator):
        """Test contextual suggestions when no concepts are available."""
        # Arrange
        mock_knowledge_navigator.get_available_concepts.return_value = []
        user_profile = {}

        # Act
        suggestions = await startup_guide.get_contextual_suggestions(user_profile)

        # Assert
        assert len(suggestions) > 0
        assert any(s["type"] == "setup" for s in suggestions)
        assert any("/help" in s["command"] for s in suggestions)

    @pytest.mark.asyncio
    async def test_get_contextual_suggestions_with_concepts(self, startup_guide, mock_knowledge_navigator):
        """Test contextual suggestions when concepts are available."""
        # Arrange - Add more than 3 concepts to trigger "explore" suggestions
        concepts = [
            Concept(
                id="python-basics",
                title="Python Basics",
                content="Basic Python programming concepts",
                prerequisites=[],
                difficulty_level=1
            ),
            Concept(
                id="data-structures",
                title="Data Structures",
                content="Common data structures in programming",
                prerequisites=[],
                difficulty_level=2
            ),
            Concept(
                id="algorithms",
                title="Algorithms",
                content="Algorithm design and analysis",
                prerequisites=[],
                difficulty_level=2
            ),
            Concept(
                id="oop",
                title="Object-Oriented Programming",
                content="OOP concepts and principles",
                prerequisites=[],
                difficulty_level=3
            ),
            Concept(
                id="testing",
                title="Testing",
                content="Software testing methodologies",
                prerequisites=[],
                difficulty_level=2
            )
        ]
        mock_knowledge_navigator.get_available_concepts.return_value = concepts
        user_profile = {"learning_style": "visual"}

        # Act
        suggestions = await startup_guide.get_contextual_suggestions(user_profile)

        # Assert
        assert len(suggestions) > 0
        assert any(s["type"] == "continue" for s in suggestions)
        assert any(s["type"] == "explore" for s in suggestions)
        assert any(s["type"] == "challenge" for s in suggestions)

    @pytest.mark.asyncio
    async def test_get_contextual_suggestions_no_ai_config(self, startup_guide, mock_knowledge_navigator):
        """Test contextual suggestions when AI config is not set up."""
        # Arrange
        concepts = [
            Concept(
                id="python-basics",
                title="Python Basics",
                content="Basic Python programming concepts",
                prerequisites=[],
                difficulty_level=1
            )
        ]
        mock_knowledge_navigator.get_available_concepts.return_value = concepts
        user_profile = {"ai_config": {}}

        # Act
        suggestions = await startup_guide.get_contextual_suggestions(user_profile)

        # Assert
        assert len(suggestions) > 0
        assert any(s["type"] == "config" for s in suggestions)
        assert any("/set-config" in s["command"] for s in suggestions)

    @pytest.mark.asyncio
    async def test_generate_proactive_suggestions_with_current_concept(self, startup_guide):
        """Test proactive suggestions with current concept in context."""
        # Arrange
        conversation_context = {"current_concept": "Python Basics"}

        # Act
        suggestions = await startup_guide.generate_proactive_suggestions(conversation_context)

        # Assert
        assert len(suggestions) > 0
        assert any("Python Basics" in s for s in suggestions)
        assert any("quiz" in s.lower() for s in suggestions)

    @pytest.mark.asyncio
    async def test_generate_proactive_suggestions_no_current_concept(self, startup_guide):
        """Test proactive suggestions with no current concept in context."""
        # Arrange
        conversation_context = {}

        # Act
        suggestions = await startup_guide.generate_proactive_suggestions(conversation_context)

        # Assert
        assert len(suggestions) > 0
        assert any("concepts" in s.lower() for s in suggestions)
        assert any("configuration" in s.lower() for s in suggestions)

    def test_format_suggestions_empty(self, startup_guide):
        """Test formatting empty suggestions."""
        # Act
        formatted = startup_guide.format_suggestions([])

        # Assert
        assert formatted == ""

    def test_format_suggestions_with_data(self, startup_guide):
        """Test formatting suggestions with data."""
        # Arrange
        suggestions = [
            {
                "title": "Test Suggestion",
                "description": "Test description",
                "command": "/test"
            }
        ]

        # Act
        formatted = startup_guide.format_suggestions(suggestions)

        # Assert
        assert "Test Suggestion" in formatted
        assert "Test description" in formatted
        assert "/test" in formatted
        assert "Suggestions for you" in formatted

    @pytest.mark.asyncio
    async def test_should_offer_challenge(self, startup_guide):
        """Test if challenge should be offered."""
        # Arrange
        concept = Concept(
            id="python-basics",
            title="Python Basics",
            content="Basic Python programming concepts",
            prerequisites=[],
            difficulty_level=1
        )
        user_profile = {}

        # Act
        should_offer = await startup_guide.should_offer_challenge(concept, user_profile)

        # Assert
        assert should_offer is True

    @pytest.mark.asyncio
    async def test_get_challenge_suggestion(self, startup_guide):
        """Test challenge suggestion generation."""
        # Arrange
        concept = Concept(
            id="python-basics",
            title="Python Basics",
            content="Basic Python programming concepts",
            prerequisites=[],
            difficulty_level=1
        )

        # Act
        suggestion = await startup_guide.get_challenge_suggestion(concept)

        # Assert
        assert "Python Basics" in suggestion
        assert "/quiz" in suggestion
        assert "Would you like to test" in suggestion
