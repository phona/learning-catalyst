"""
TDD tests for Concept data model.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Concept entity before implementation. Tests cover validation rules, business logic,
and data integrity requirements based on the API documentation.
"""

import pytest
from datetime import datetime
from typing import Dict, Any, List
from tests.test_helpers import (
    assert_valid_uuid,
    assert_valid_concept_structure,
    generate_mock_concept,
    generate_edge_case_concepts,
    assert_raises_specific_error,
    create_temp_config_file
)


class TestConceptModel:
    """Test cases for Concept data model following TDD principles."""

    @pytest.mark.unit
    def test_concept_creation_with_valid_data(self, sample_concept_data):
        """Test that concept can be created with valid data (TDD: Red phase)."""
        # This test will initially fail until Concept model is implemented
        from src.data.models.concept import Concept

        concept = Concept(**sample_concept_data)

        # Validate concept structure
        assert_valid_concept_structure(concept.to_dict())
        assert concept.id == sample_concept_data["id"]
        assert concept.title == sample_concept_data["title"]
        assert concept.domain == sample_concept_data["domain"]
        assert 1 <= concept.difficulty <= 10

    @pytest.mark.unit
    def test_concept_validation_required_fields(self):
        """Test that concept validation enforces required fields."""
        from src.data.models.concept import Concept

        # Test missing required fields
        with pytest.raises(ValueError, match="Missing required field: id"):
            Concept(title="Test", description="Test", domain="test")

        with pytest.raises(ValueError, match="Missing required field: title"):
            Concept(id="test", description="Test", domain="test")

        with pytest.raises(ValueError, match="Missing required field: description"):
            Concept(id="test", title="Test", domain="test")

        with pytest.raises(ValueError, match="Missing required field: domain"):
            Concept(id="test", title="Test", description="Test")

    @pytest.mark.unit
    @pytest.mark.parametrize("difficulty", [0, -1, 11, 3.5, "invalid"])
    def test_concept_difficulty_validation(self, difficulty):
        """Test that concept difficulty validation enforces valid range (1-10)."""
        from src.data.models.concept import Concept

        with pytest.raises(ValueError, match="Difficulty must be an integer between 1 and 10"):
            Concept(
                id="test",
                title="Test",
                description="Test description",
                domain="test",
                difficulty=difficulty
            )

    @pytest.mark.unit
    @pytest.mark.parametrize("valid_difficulty", [1, 5, 10])
    def test_concept_valid_difficulty_values(self, valid_difficulty):
        """Test that concept accepts valid difficulty values."""
        from src.data.models.concept import Concept

        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=valid_difficulty
        )
        assert concept.difficulty == valid_difficulty

    @pytest.mark.unit
    def test_concept_prerequisites_validation(self):
        """Test that concept prerequisites are properly validated."""
        from src.data.models.concept import Concept

        # Test valid prerequisites (list of strings)
        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3,
            prerequisites=["concept1", "concept2"]
        )
        assert concept.prerequisites == ["concept1", "concept2"]

        # Test invalid prerequisites (non-string items)
        with pytest.raises(ValueError, match="Prerequisites must be a list of concept IDs"):
            Concept(
                id="test",
                title="Test",
                description="Test description",
                domain="test",
                difficulty=3,
                prerequisites=["concept1", 123]
            )

    @pytest.mark.unit
    def test_concept_content_references_validation(self):
        """Test that concept content references are properly validated."""
        from src.data.models.concept import Concept

        # Test valid content references
        valid_reference = {
            "type": "markdown",
            "path": "docs/test.md",
            "description": "Test documentation",
            "relevance_score": 0.8,
            "last_updated": datetime.now().isoformat()
        }

        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3,
            content_references=[valid_reference]
        )
        assert len(concept.content_references) == 1

        # Test invalid relevance score
        invalid_reference = valid_reference.copy()
        invalid_reference["relevance_score"] = 1.5

        with pytest.raises(ValueError, match="Relevance score must be between 0.0 and 1.0"):
            Concept(
                id="test",
                title="Test",
                description="Test description",
                domain="test",
                difficulty=3,
                content_references=[invalid_reference]
            )

    @pytest.mark.unit
    def test_concept_metadata_validation(self):
        """Test that concept metadata is properly validated."""
        from src.data.models.concept import Concept

        valid_metadata = {
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "tags": ["python", "programming", "test"]
        }

        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3,
            metadata=valid_metadata
        )
        assert concept.metadata["tags"] == ["python", "programming", "test"]

        # Test invalid created_at format
        invalid_metadata = valid_metadata.copy()
        invalid_metadata["created_at"] = "invalid-date"

        with pytest.raises(ValueError, match="Invalid datetime format for created_at"):
            Concept(
                id="test",
                title="Test",
                description="Test description",
                domain="test",
                difficulty=3,
                metadata=invalid_metadata
            )

    @pytest.mark.unit
    def test_concept_to_dict_serialization(self, sample_concept_data):
        """Test that concept can be serialized to dictionary."""
        from src.data.models.concept import Concept

        concept = Concept(**sample_concept_data)
        concept_dict = concept.to_dict()

        assert isinstance(concept_dict, dict)
        assert_valid_concept_structure(concept_dict)
        assert concept_dict["id"] == sample_concept_data["id"]
        assert concept_dict["title"] == sample_concept_data["title"]

    @pytest.mark.unit
    def test_concept_from_dict_deserialization(self, sample_concept_data):
        """Test that concept can be deserialized from dictionary."""
        from src.data.models.concept import Concept

        concept = Concept.from_dict(sample_concept_data)

        assert concept.id == sample_concept_data["id"]
        assert concept.title == sample_concept_data["title"]
        assert concept.domain == sample_concept_data["domain"]

    @pytest.mark.unit
    def test_concept_equality(self):
        """Test concept equality comparison."""
        from src.data.models.concept import Concept

        concept1 = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3
        )
        concept2 = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3
        )
        concept3 = Concept(
            id="different",
            title="Different",
            description="Different description",
            domain="test",
            difficulty=3
        )

        assert concept1 == concept2
        assert concept1 != concept3

    @pytest.mark.unit
    def test_concept_hash(self):
        """Test concept hash for use in sets and dictionaries."""
        from src.data.models.concept import Concept

        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3
        )

        # Should be hashable
        concept_hash = hash(concept)
        assert isinstance(concept_hash, int)

        # Equal concepts should have same hash
        concept2 = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3
        )
        assert hash(concept) == hash(concept2)

    @pytest.mark.unit
    def test_concept_str_representation(self):
        """Test concept string representation."""
        from src.data.models.concept import Concept

        concept = Concept(
            id="test",
            title="Test Concept",
            description="Test description",
            domain="test",
            difficulty=3
        )

        str_repr = str(concept)
        assert "Test Concept" in str_repr
        assert "test" in str_repr
        assert "difficulty=3" in str_repr

    @pytest.mark.unit
    def test_concept_repr(self):
        """Test concept repr for debugging."""
        from src.data.models.concept import Concept

        concept = Concept(
            id="test",
            title="Test Concept",
            description="Test description",
            domain="test",
            difficulty=3
        )

        repr_str = repr(concept)
        assert "Concept" in repr_str
        assert "id='test'" in repr_str
        assert "title='Test Concept'" in repr_str

    @pytest.mark.unit
    @pytest.mark.parametrize("edge_concept", generate_edge_case_concepts())
    def test_concept_edge_cases(self, edge_concept):
        """Test concept creation with edge case data."""
        from src.data.models.concept import Concept

        # Should handle edge cases gracefully
        concept = Concept(**edge_concept)
        assert concept.id == edge_concept["id"]

    @pytest.mark.unit
    def test_concept_circular_dependency_detection(self):
        """Test that concept can detect circular dependencies in prerequisites."""
        from src.data.models.concept import Concept

        # Create concepts with circular dependency
        concept_a = Concept(
            id="concept_a",
            title="Concept A",
            description="Description A",
            domain="test",
            difficulty=3,
            prerequisites=["concept_b"]
        )

        concept_b = Concept(
            id="concept_b",
            title="Concept B",
            description="Description B",
            domain="test",
            difficulty=3,
            prerequisites=["concept_a"]
        )

        # Should detect circular dependency
        with pytest.raises(ValueError, match="Circular dependency detected"):
            concept_a.validate_prerequisites([concept_b])

    @pytest.mark.unit
    def test_concept_learning_time_estimation(self):
        """Test concept learning time estimation based on difficulty and content."""
        from src.data.models.concept import Concept

        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=5,  # Medium difficulty
            estimated_time_minutes=60
        )

        # Should calculate adjusted time based on various factors
        adjusted_time = concept.calculate_learning_time()
        assert isinstance(adjusted_time, int)
        assert adjusted_time > 0

    @pytest.mark.unit
    def test_concept_update_metadata(self):
        """Test that concept metadata can be updated."""
        from src.data.models.concept import Concept

        concept = Concept(
            id="test",
            title="Test",
            description="Test description",
            domain="test",
            difficulty=3
        )

        # Update metadata
        new_tags = ["python", "advanced"]
        concept.update_metadata({"tags": new_tags})

        assert concept.metadata["tags"] == new_tags
        assert concept.metadata["updated_at"] > concept.metadata["created_at"]

    @pytest.mark.unit
    def test_concept_json_serialization(self, sample_concept_data):
        """Test that concept can be serialized to JSON."""
        from src.data.models.concept import Concept
        import json

        concept = Concept(**sample_concept_data)
        json_str = concept.to_json()

        # Should be valid JSON
        parsed = json.loads(json_str)
        assert_valid_concept_structure(parsed)

    @pytest.mark.unit
    def test_concept_json_deserialization(self, sample_concept_data):
        """Test that concept can be deserialized from JSON."""
        from src.data.models.concept import Concept
        import json

        json_str = json.dumps(sample_concept_data)
        concept = Concept.from_json(json_str)

        assert concept.id == sample_concept_data["id"]
        assert concept.title == sample_concept_data["title"]