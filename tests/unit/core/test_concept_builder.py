"""
Unit tests for the concept builder module.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

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

    @pytest.mark.asyncio
    async def test_extract_concepts_from_markdown_headers_mode(self, concept_builder):
        """Test concept extraction from markdown in headers mode."""
        # Arrange
        file_path = "test_file.md"
        granularity = "headers"

        with patch('src.core.concept_builder.MarkdownParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser

            mock_parser.find_concepts_in_file.return_value = [
                {
                    'id': 'concept-1',
                    'title': 'Test Concept 1',
                    'content': 'Test content 1',
                    'level': 1
                },
                {
                    'id': 'concept-2',
                    'title': 'Test Concept 2',
                    'content': 'Test content 2',
                    'level': 2
                }
            ]

            # Act
            concepts = await concept_builder.extract_concepts_from_markdown(file_path, granularity)

            # Assert
            assert len(concepts) == 2
            assert concepts[0].title == "Test Concept 1"
            assert concepts[1].title == "Test Concept 2"
            assert concepts[0].difficulty_level == 1
            assert concepts[1].difficulty_level == 2

    @pytest.mark.asyncio
    async def test_extract_concepts_from_markdown_summaries_mode(self, concept_builder, mock_model_service):
        """Test concept extraction from markdown in summaries mode."""
        # Arrange
        file_path = "test_file.md"
        granularity = "summaries"

        with patch('src.core.concept_builder.MarkdownParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser

            mock_parser.find_concepts_in_file.return_value = [
                {
                    'id': 'concept-1',
                    'title': 'Test Concept 1',
                    'content': 'Test content 1',
                    'level': 1
                }
            ]

            # Act
            concepts = await concept_builder.extract_concepts_from_markdown(file_path, granularity)

            # Assert
            assert len(concepts) == 1
            assert concepts[0].title == "Test Concept 1"
            assert concepts[0].content == "Test summary"  # Should be replaced by summary
            mock_model_service.generate_summary.assert_called_once_with("Test content 1")

    @pytest.mark.asyncio
    async def test_extract_concepts_from_markdown_full_content_mode(self, concept_builder):
        """Test concept extraction from markdown in full content mode."""
        # Arrange
        file_path = "test_file.md"
        granularity = "full_content"

        with patch('src.core.concept_builder.MarkdownParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser

            mock_parser.find_concepts_in_file.return_value = [
                {
                    'id': 'concept-1',
                    'title': 'Test Concept 1',
                    'content': 'Test content 1',
                    'level': 1
                }
            ]

            # Act
            concepts = await concept_builder.extract_concepts_from_markdown(file_path, granularity)

            # Assert
            assert len(concepts) == 1
            assert concepts[0].title == "Test Concept 1"
            assert concepts[0].content == "Test content 1"  # Should remain unchanged

    @pytest.mark.asyncio
    async def test_extract_concepts_from_directory(self, concept_builder):
        """Test concept extraction from a directory."""
        # Arrange
        dir_path = "test_dir"
        granularity = "headers"

        with patch('src.core.concept_builder.extract_all_concepts') as mock_extract:
            mock_extract.return_value = [
                {
                    'id': 'concept-1',
                    'title': 'Test Concept 1',
                    'content': 'Test content 1',
                    'level': 1
                }
            ]

            # Act
            concepts = await concept_builder.extract_concepts_from_directory(dir_path, granularity)

            # Assert
            assert len(concepts) == 1
            assert concepts[0].title == "Test Concept 1"
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
        concept_builder.concepts = [
            Concept(
                id="concept-1",
                title="Parent Concept",
                content="Parent content",
                prerequisites=[],
                difficulty_level=1
            ),
            Concept(
                id="concept-2",
                title="Child Concept",
                content="Child content",
                prerequisites=[],
                difficulty_level=2
            )
        ]

        # Act
        relationships = concept_builder.build_concept_relationships()

        # Assert
        assert len(relationships) > 0
        # Should have at least one relationship based on hierarchy
        assert any(r.source_id == "concept-1" and r.target_id == "concept-2" for r in relationships)

    def test_save_concepts_to_db(self, concept_builder, mock_db_manager):
        """Test saving concepts to database."""
        # Arrange
        concept_builder.concepts = [
            Concept(
                id="concept-1",
                title="Test Concept",
                content="Test content",
                prerequisites=[],
                difficulty_level=1
            )
        ]

        # Act
        concept_builder.save_concepts_to_db()

        # Assert
        mock_db_manager.save_concepts.assert_called_once_with(concept_builder.concepts)

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
            Concept(
                id="concept-1",
                title="Test Concept",
                content="Test content",
                prerequisites=[],
                difficulty_level=1
            )
        ]

        # Act
        results = concept_builder.validate_concepts()

        # Assert
        assert len(results) == 1
        assert results[0].concept_id == "concept-1"
        assert results[0].is_valid is True
        assert len(results[0].issues) == 0

    def test_validate_concepts_invalid(self, concept_builder):
        """Test validating invalid concepts."""
        # Arrange
        concept_builder.concepts = [
            Concept(
                id="",  # Invalid empty ID
                title="",  # Invalid empty title
                content="",  # Invalid empty content
                prerequisites=[],
                difficulty_level=1
            )
        ]

        # Act
        results = concept_builder.validate_concepts()

        # Assert
        assert len(results) == 1
        assert results[0].is_valid is False
        assert len(results[0].issues) > 0

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
            Concept(
                id="concept-1",
                title="Test Concept 1",
                content="Test content 1",
                prerequisites=[],
                difficulty_level=1
            ),
            Concept(
                id="concept-2",
                title="Test Concept 2",
                content="Test content 2",
                prerequisites=[],
                difficulty_level=1
            )
        ]

        # Act
        duplicates = concept_builder.detect_duplicate_concepts()

        # Assert
        assert len(duplicates) == 0

    def test_detect_duplicate_concepts_with_duplicates(self, concept_builder):
        """Test detecting duplicates when they exist."""
        # Arrange
        concept_builder.concepts = [
            Concept(
                id="concept-1",
                title="Test Concept",
                content="Test content",
                prerequisites=[],
                difficulty_level=1
            ),
            Concept(
                id="concept-2",
                title="Test Concept",  # Same title
                content="Different content",
                prerequisites=[],
                difficulty_level=1
            )
        ]

        # Act
        duplicates = concept_builder.detect_duplicate_concepts()

        # Assert
        assert len(duplicates) == 1
        assert len(duplicates[0]) == 2  # Two concepts in the duplicate group

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
    async def test_summarize_concepts_with_concepts(self, concept_builder, mock_model_service):
        """Test summarizing concepts."""
        # Arrange
        concept_builder.concepts = [
            Concept(
                id="concept-1",
                title="Test Concept",
                content="Test content",
                prerequisites=[],
                difficulty_level=1
            )
        ]

        mock_model_service.generate_summary.return_value = "Test summary"
        mock_model_service.extract_key_points.return_value = ["Point 1", "Point 2"]
        mock_model_service.calculate_difficulty.return_value = 0.5

        # Act
        summaries = await concept_builder.summarize_concepts()

        # Assert
        assert len(summaries) == 1
        assert summaries[0].concept_id == "concept-1"
        assert summaries[0].summary == "Test summary"
        assert summaries[0].key_points == ["Point 1", "Point 2"]
        assert summaries[0].difficulty_score == 0.5
