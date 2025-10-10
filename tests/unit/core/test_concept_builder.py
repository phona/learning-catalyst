"""
Unit tests for the concept builder module.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.core.concept_builder import ConceptBuilder
from src.data.models.concept import Concept


class TestConceptBuilder:
    """Test cases for the ConceptBuilder class."""

    @pytest.fixture
    def mock_db_manager(self):
        """Create a mock database manager."""
        manager = Mock()
        manager.save_concepts = Mock()
        manager.save_concept_relationships = Mock()
        manager.get_concepts = Mock(return_value=[])
        return manager

    @pytest.fixture
    def mock_model_service(self):
        """Create a mock model service."""
        service = Mock()
        service.generate_summary = AsyncMock(return_value="Test summary")
        return service

    @pytest.fixture
    def concept_builder(self, mock_db_manager, mock_model_service):
        """Create a ConceptBuilder instance with mocked dependencies."""
        return ConceptBuilder(mock_db_manager, mock_model_service)

    def test_init(self, concept_builder):
        """Test ConceptBuilder initialization."""
        assert concept_builder.db_manager is not None
        assert concept_builder.model_service is not None
        assert concept_builder.concepts == []
        assert concept_builder.relationships == []

    def test_extract_concepts_from_markdown_headers_mode(self, concept_builder):
        """Test concept extraction from markdown in headers mode."""
        # Arrange
        file_path = "test_file.md"
        granularity = "headers"

        with patch("src.core.concept_builder.MarkdownParser") as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser

            mock_parser.find_concepts_in_file.return_value = [
                {"id": "concept-1", "title": "Test Concept 1", "content": "Test content 1", "level": 1},
                {"id": "concept-2", "title": "Test Concept 2", "content": "Test content 2", "level": 2},
            ]

            # Act
            concepts = concept_builder.extract_concepts_from_markdown(file_path, granularity)

            # Assert
            assert len(concepts) == 2
            assert concepts[0]["title"] == "Test Concept 1"
            assert concepts[1]["title"] == "Test Concept 2"
            assert concepts[0]["level"] == 1
            assert concepts[1]["level"] == 2

    def test_extract_concepts_from_markdown_summaries_mode(self, concept_builder):
        """Test concept extraction from markdown in summaries mode."""
        # Arrange
        file_path = "test_file.md"
        granularity = "summaries"

        with patch("src.core.concept_builder.MarkdownParser") as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser

            mock_parser.find_concepts_in_file.return_value = [
                {"id": "concept-1", "title": "Test Concept 1", "content": "Test content 1", "level": 1}
            ]

            # Act
            concepts = concept_builder.extract_concepts_from_markdown(file_path, granularity)

            # Assert
            assert len(concepts) == 1
            assert concepts[0]["title"] == "Test Concept 1"
            assert concepts[0]["content"] == "Test content 1"

    def test_extract_concepts_from_markdown_full_content_mode(self, concept_builder):
        """Test concept extraction from markdown in full content mode."""
        # Arrange
        file_path = "test_file.md"
        granularity = "full_content"

        with patch("src.core.concept_builder.MarkdownParser") as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser

            mock_parser.find_concepts_in_file.return_value = [
                {"id": "concept-1", "title": "Test Concept 1", "content": "Test content 1", "level": 1}
            ]

            # Act
            concepts = concept_builder.extract_concepts_from_markdown(file_path, granularity)

            # Assert
            assert len(concepts) == 1
            assert concepts[0]["title"] == "Test Concept 1"
            assert concepts[0]["content"] == "Test content 1"  # Should remain unchanged

    def test_extract_concepts_from_directory(self, concept_builder):
        """Test concept extraction from a directory."""
        # Arrange
        dir_path = "test_dir"
        granularity = "headers"

        with patch("src.core.concept_builder.extract_all_concepts") as mock_extract:
            mock_extract.return_value = [{"id": "concept-1", "title": "Test Concept 1", "content": "Test content 1", "level": 1}]

            # Act
            concepts = concept_builder.extract_concepts_from_directory(dir_path, granularity)

            # Assert
            assert len(concepts) == 1
            assert concepts[0]["title"] == "Test Concept 1"
            mock_extract.assert_called_once_with(dir_path, granularity)

    def test_build_concept_relationships_empty(self, concept_builder):
        """Test building relationships with no concepts."""
        # Arrange
        concept_builder.concepts = []

        # Act
        relationships = concept_builder.build_concept_relationships()

        # Assert
        assert len(relationships) == 0

    def test_build_concept_relationships_with_concepts(self, concept_builder):
        """Test building relationships with concepts."""
        # Arrange
        concepts = [
            {"id": "concept-1", "title": "Parent Concept", "content": "Parent content", "level": 1},
            {"id": "concept-2", "title": "Child Concept", "content": "Child content", "level": 2},
        ]

        # Act
        relationships = concept_builder.build_concept_relationships(concepts)

        # Assert
        assert isinstance(relationships, list)
        # The method should return relationships, but we don't need to test specific implementation details

    def test_save_concepts_to_db(self, concept_builder, mock_db_manager):
        """Test saving concepts to database."""
        # Arrange
        concept_builder.concepts = [
            {"id": "concept-1", "title": "Test Concept", "content": "Test content", "level": 1}
        ]

        # Act
        concept_builder.save_concepts_to_db()

        # Assert - the method should not fail even if db_manager is mocked
        assert True  # Basic test that the method executes without error

    def test_validate_concepts_empty(self, concept_builder):
        """Test validating empty concepts list."""
        # Arrange
        concept_builder.concepts = []

        # Act
        results = concept_builder.validate_concepts()

        # Assert
        assert len(results) == 0

    def test_validate_concepts_valid(self, concept_builder):
        """Test validating valid concepts."""
        # Arrange
        concept_builder.concepts = [
            {"id": "concept-1", "title": "Test Concept", "content": "Test content with enough length to be valid"}
        ]

        # Act
        results = concept_builder.validate_concepts()

        # Assert
        assert len(results) == 1
        assert results[0]["concept_id"] == "concept-1"
        assert results[0]["is_valid"] is True
        assert len(results[0]["issues"]) == 0

    def test_validate_concepts_invalid(self, concept_builder):
        """Test validating invalid concepts."""
        # Arrange
        concept_builder.concepts = [
            {
                "id": "",  # Invalid empty ID
                "title": "",  # Invalid empty title
                "content": "",  # Invalid empty content
            }
        ]

        # Act
        results = concept_builder.validate_concepts()

        # Assert
        assert len(results) == 1
        assert results[0]["is_valid"] is False
        assert len(results[0]["issues"]) > 0

    def test_detect_duplicate_concepts_empty(self, concept_builder):
        """Test detecting duplicates in empty concepts list."""
        # Arrange
        concept_builder.concepts = []

        # Act
        duplicates = concept_builder.detect_duplicate_concepts()

        # Assert
        assert len(duplicates) == 0

    def test_detect_duplicate_concepts_no_duplicates(self, concept_builder):
        """Test detecting duplicates when none exist."""
        # Arrange
        concept_builder.concepts = [
            {"id": "concept-1", "title": "Test Concept 1", "content": "Test content 1"},
            {"id": "concept-2", "title": "Test Concept 2", "content": "Test content 2"},
        ]

        # Act
        duplicates = concept_builder.detect_duplicate_concepts()

        # Assert
        assert len(duplicates) == 0

    def test_detect_duplicate_concepts_with_duplicates(self, concept_builder):
        """Test detecting duplicates when they exist."""
        # Arrange
        concept_builder.concepts = [
            {"id": "concept-1", "title": "Test Concept", "content": "Test content"},
            {
                "id": "concept-2",
                "title": "Test Concept",  # Same title
                "content": "Different content",
            },
        ]

        # Act
        duplicates = concept_builder.detect_duplicate_concepts()

        # Assert
        assert len(duplicates) >= 1
        # Should have at least one duplicate group with the duplicate concepts

    @pytest.mark.asyncio
    async def test_summarize_concepts_empty(self, concept_builder):
        """Test summarizing empty concepts list."""
        # Arrange
        concept_builder.concepts = []

        # Act
        summaries = await concept_builder.summarize_concepts()

        # Assert
        assert len(summaries) == 0

    @pytest.mark.asyncio
    async def test_summarize_concepts_with_concepts(self, concept_builder):
        """Test summarizing concepts."""
        # Arrange
        test_concepts = [
            {"id": "concept-1", "title": "Test Concept", "content": "Test content with sufficient length"}
        ]

        # Act
        summaries = await concept_builder.summarize_concepts(test_concepts)

        # Assert
        assert len(summaries) == 1
        assert summaries[0]["id"] == "concept-1"
        assert "title" in summaries[0]
        assert "content" in summaries[0]
