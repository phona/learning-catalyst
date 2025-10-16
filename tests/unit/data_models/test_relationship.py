"""
TDD tests for Relationship data model.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Relationship entity before implementation. Tests cover relationship validation,
graph traversal, and dependency management based on the API documentation.
"""

import pytest
from datetime import datetime, timedelta
from typing import Dict, Any, List
from tests.test_helpers import (
    assert_valid_uuid,
    generate_mock_concept,
    assert_raises_specific_error
)


class TestRelationshipModel:
    """Test cases for Relationship data model following TDD principles."""

    @pytest.mark.unit
    def test_relationship_creation_with_valid_data(self):
        """Test that relationship can be created with valid data (TDD: Red phase)."""
        # This test will initially fail until Relationship model is implemented
        from src.data.models.relationship import Relationship, RelationshipType

        relationship_data = {
            "id": "rel_001",
            "source_concept_id": "con_python_variables",
            "target_concept_id": "con_python_data_types",
            "relationship_type": RelationshipType.PREREQUISITE,
            "strength": 0.9,
            "description": "Variables must be understood before data types",
            "created_at": datetime.now().isoformat(),
            "metadata": {
                "discovered_via": "semantic",
                "confidence_score": 0.85
            }
        }

        relationship = Relationship(**relationship_data)

        assert relationship.id == "rel_001"
        assert relationship.source_concept_id == "con_python_variables"
        assert relationship.target_concept_id == "con_python_data_types"
        assert relationship.relationship_type == RelationshipType.PREREQUISITE
        assert relationship.strength == 0.9

    @pytest.mark.unit
    def test_relationship_validation_required_fields(self):
        """Test that relationship validation enforces required fields."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Test missing required fields
        with pytest.raises(ValueError, match="Missing required field: id"):
            Relationship(
                source_concept_id="concept1",
                target_concept_id="concept2",
                relationship_type=RelationshipType.PREREQUISITE
            )

        with pytest.raises(ValueError, match="Missing required field: source_concept_id"):
            Relationship(
                id="rel_001",
                target_concept_id="concept2",
                relationship_type=RelationshipType.PREREQUISITE
            )

        with pytest.raises(ValueError, match="Missing required field: target_concept_id"):
            Relationship(
                id="rel_001",
                source_concept_id="concept1",
                relationship_type=RelationshipType.PREREQUISITE
            )

    @pytest.mark.unit
    def test_relationship_type_validation(self):
        """Test that relationship types are properly validated."""
        from src.data.models.relationship import Relationship, RelationshipType

        valid_types = [
            RelationshipType.PREREQUISITE,
            RelationshipType.ENABLES,
            RelationshipType.RELATED_TO,
            RelationshipType.CONTAINS
        ]

        for rel_type in valid_types:
            relationship = Relationship(
                id="rel_001",
                source_concept_id="concept1",
                target_concept_id="concept2",
                relationship_type=rel_type,
                strength=0.8
            )
            assert relationship.relationship_type == rel_type

        # Test invalid relationship type
        with pytest.raises(ValueError, match="Invalid relationship type"):
            Relationship(
                id="rel_001",
                source_concept_id="concept1",
                target_concept_id="concept2",
                relationship_type="invalid_type",
                strength=0.8
            )

    @pytest.mark.unit
    def test_relationship_strength_validation(self):
        """Test that relationship strength is properly validated."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Test valid strength values
        valid_strengths = [0.0, 0.1, 0.5, 0.9, 1.0]
        for strength in valid_strengths:
            relationship = Relationship(
                id="rel_001",
                source_concept_id="concept1",
                target_concept_id="concept2",
                relationship_type=RelationshipType.PREREQUISITE,
                strength=strength
            )
            assert relationship.strength == strength

        # Test invalid strength values
        invalid_strengths = [-0.1, 1.1, 2.0, "invalid"]
        for strength in invalid_strengths:
            with pytest.raises(ValueError, match="Strength must be between 0.0 and 1.0"):
                Relationship(
                    id="rel_001",
                    source_concept_id="concept1",
                    target_concept_id="concept2",
                    relationship_type=RelationshipType.PREREQUISITE,
                    strength=strength
                )

    @pytest.mark.unit
    def test_relationship_circular_dependency_detection(self):
        """Test that circular dependencies can be detected."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create relationships that form a cycle
        rel1 = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.9
        )

        rel2 = Relationship(
            id="rel_002",
            source_concept_id="concept_b",
            target_concept_id="concept_c",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.8
        )

        rel3 = Relationship(
            id="rel_003",
            source_concept_id="concept_c",
            target_concept_id="concept_a",  # Creates cycle
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.7
        )

        # Detect circular dependency
        relationships = [rel1, rel2, rel3]
        cycle = Relationship.detect_circular_dependency(relationships)

        assert cycle is not None
        assert len(cycle) == 3
        assert cycle[0].source_concept_id == "concept_a"
        assert cycle[-1].target_concept_id == "concept_a"

    @pytest.mark.unit
    def test_relationship_bidirectional_detection(self):
        """Test that bidirectional relationships can be detected."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create bidirectional relationships
        rel1 = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.RELATED_TO,
            strength=0.8
        )

        rel2 = Relationship(
            id="rel_002",
            source_concept_id="concept_b",
            target_concept_id="concept_a",
            relationship_type=RelationshipType.RELATED_TO,
            strength=0.7
        )

        # Detect bidirectional relationship
        bidirectional = Relationship.detect_bidirectional([rel1, rel2])
        assert len(bidirectional) == 1
        assert bidirectional[0][0].source_concept_id == "concept_a"
        assert bidirectional[0][1].source_concept_id == "concept_b"

    @pytest.mark.unit
    def test_relationship_strength_update(self):
        """Test that relationship strength can be updated based on feedback."""
        from src.data.models.relationship import Relationship, RelationshipType

        relationship = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.7,
            metadata={"confidence_score": 0.8}
        )

        # Update strength with positive feedback
        relationship.update_strength(0.85, "user_positive_feedback")
        assert relationship.strength == 0.85
        assert relationship.metadata["last_feedback"] == "user_positive_feedback"

        # Update strength with negative feedback
        relationship.update_strength(0.6, "user_negative_feedback")
        assert relationship.strength == 0.6
        assert relationship.metadata["last_feedback"] == "user_negative_feedback"

    @pytest.mark.unit
    def test_relationship_transitive_closure(self):
        """Test that transitive relationships can be computed."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create transitive relationships: A -> B -> C
        rel1 = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.9
        )

        rel2 = Relationship(
            id="rel_002",
            source_concept_id="concept_b",
            target_concept_id="concept_c",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.8
        )

        # Compute transitive closure
        relationships = [rel1, rel2]
        transitive = Relationship.compute_transitive_closure(relationships)

        # Should include transitive relationship A -> C
        transitive_ac = next(
            (rel for rel in transitive
             if rel.source_concept_id == "concept_a" and rel.target_concept_id == "concept_c"),
            None
        )
        assert transitive_ac is not None
        # Transitive strength should be product of individual strengths
        assert transitive_ac.strength == 0.9 * 0.8  # 0.72

    @pytest.mark.unit
    def test_relationship_shortest_path(self):
        """Test that shortest path can be found between concepts."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create a graph: A -> B -> C, A -> D -> C
        relationships = [
            Relationship(id="rel_1", source_concept_id="A", target_concept_id="B",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.9),
            Relationship(id="rel_2", source_concept_id="B", target_concept_id="C",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.8),
            Relationship(id="rel_3", source_concept_id="A", target_concept_id="D",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.7),
            Relationship(id="rel_4", source_concept_id="D", target_concept_id="C",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.6),
        ]

        # Find shortest path from A to C
        path = Relationship.find_shortest_path(relationships, "A", "C")

        # Should find path A -> B -> C (stronger path)
        assert len(path) == 3
        assert path[0] == "A"
        assert path[1] == "B"
        assert path[2] == "C"

    @pytest.mark.unit
    def test_relationship_dependency_analysis(self):
        """Test that concept dependencies can be analyzed."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create dependency graph
        relationships = [
            Relationship(id="rel_1", source_concept_id="basics", target_concept_id="variables",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.9),
            Relationship(id="rel_2", source_concept_id="variables", target_concept_id="functions",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.8),
            Relationship(id="rel_3", source_concept_id="functions", target_concept_id="classes",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.7),
            Relationship(id="rel_4", source_concept_id="basics", target_concept_id="loops",
                        relationship_type=RelationshipType.ENABLES, strength=0.6),
        ]

        # Analyze dependencies for "classes"
        deps = Relationship.analyze_dependencies(relationships, "classes")

        assert deps["direct_prerequisites"] == ["functions"]
        assert "variables" in deps["indirect_prerequisites"]
        assert "basics" in deps["indirect_prerequisites"]
        assert deps["dependency_depth"] == 3

    @pytest.mark.unit
    def test_relationship_strength_decay(self):
        """Test that relationship strength can decay over time."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create old relationship
        old_time = datetime.now() - timedelta(days=30)
        relationship = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.RELATED_TO,
            strength=0.9,
            created_at=old_time.isoformat(),
            metadata={"original_strength": 0.9}
        )

        # Apply decay
        relationship.apply_strength_decay(decay_rate=0.1, days_threshold=7)

        # Strength should be decayed
        assert relationship.strength < 0.9
        assert "decay_applied" in relationship.metadata

    @pytest.mark.unit
    def test_relationship_merge_similar(self):
        """Test that similar relationships can be merged."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create similar relationships
        rel1 = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.RELATED_TO,
            strength=0.8,
            metadata={"discovered_via": "semantic"}
        )

        rel2 = Relationship(
            id="rel_002",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.RELATED_TO,
            strength=0.7,
            metadata={"discovered_via": "structural"}
        )

        # Merge similar relationships
        merged = Relationship.merge_similar([rel1, rel2])

        assert len(merged) == 1
        # Merged strength should be average or weighted
        assert merged[0].strength == 0.75  # (0.8 + 0.7) / 2
        assert "merged_from" in merged[0].metadata

    @pytest.mark.unit
    def test_relationship_reverse_engineering(self):
        """Test that relationship metadata can be reverse engineered."""
        from src.data.models.relationship import Relationship, RelationshipType

        relationship = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.9
        )

        # Analyze relationship patterns
        analysis = relationship.analyze_patterns()

        assert "confidence_score" in analysis
        assert "suggested_improvements" in analysis
        assert "similar_relationships" in analysis

    @pytest.mark.unit
    def test_relationship_validation_graph_integrity(self):
        """Test that relationship maintains graph integrity."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create relationships with missing concepts
        relationships = [
            Relationship(id="rel_1", source_concept_id="concept_a", target_concept_id="concept_b",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.9),
            Relationship(id="rel_2", source_concept_id="concept_b", target_concept_id="concept_c",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.8),
            # This relationship references non-existent concept
            Relationship(id="rel_3", source_concept_id="concept_c", target_concept_id="concept_d",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.7),
        ]

        existing_concepts = {"concept_a", "concept_b", "concept_c"}

        # Validate graph integrity
        validation = Relationship.validate_graph_integrity(relationships, existing_concepts)

        assert validation["is_valid"] is False
        assert len(validation["missing_concepts"]) == 1
        assert "concept_d" in validation["missing_concepts"]
        assert len(validation["orphaned_relationships"]) == 1

    @pytest.mark.unit
    def test_relationship_export_import(self):
        """Test that relationships can be exported and imported."""
        from src.data.models.relationship import Relationship, RelationshipType
        import json

        relationship = Relationship(
            id="rel_001",
            source_concept_id="concept_a",
            target_concept_id="concept_b",
            relationship_type=RelationshipType.PREREQUISITE,
            strength=0.9,
            description="Test relationship",
            metadata={"test": True}
        )

        # Export to JSON
        json_data = relationship.to_json()
        parsed_data = json.loads(json_data)
        assert parsed_data["id"] == "rel_001"

        # Import from JSON
        imported = Relationship.from_json(json_data)
        assert imported.id == relationship.id
        assert imported.source_concept_id == relationship.source_concept_id

    @pytest.mark.unit
    def test_relationship_batch_operations(self):
        """Test batch operations on relationships."""
        from src.data.models.relationship import Relationship, RelationshipType

        # Create batch of relationships
        relationships = [
            Relationship(
                id=f"rel_{i}",
                source_concept_id=f"concept_{i}",
                target_concept_id=f"concept_{i+1}",
                relationship_type=RelationshipType.PREREQUISITE,
                strength=0.8 - (i * 0.1)
            )
            for i in range(5)
        ]

        # Batch update strength
        Relationship.batch_update_strength(relationships, 0.9, "batch_update")

        for rel in relationships:
            assert rel.strength == 0.9
            assert rel.metadata["last_feedback"] == "batch_update"

        # Batch filter by type
        prereq_rels = Relationship.batch_filter_by_type(relationships, RelationshipType.PREREQUISITE)
        assert len(prereq_rels) == len(relationships)

    @pytest.mark.unit
    def test_relationship_visualization_data(self):
        """Test that relationships can generate visualization data."""
        from src.data.models.relationship import Relationship, RelationshipType

        relationships = [
            Relationship(id="rel_1", source_concept_id="A", target_concept_id="B",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.9),
            Relationship(id="rel_2", source_concept_id="B", target_concept_id="C",
                        relationship_type=RelationshipType.PREREQUISITE, strength=0.8),
            Relationship(id="rel_3", source_concept_id="A", target_concept_id="C",
                        relationship_type=RelationshipType.RELATED_TO, strength=0.6),
        ]

        # Generate visualization data
        viz_data = Relationship.generate_visualization_data(relationships)

        assert "nodes" in viz_data
        assert "edges" in viz_data
        assert len(viz_data["nodes"]) == 3  # A, B, C
        assert len(viz_data["edges"]) == 3

        # Check node data
        node_ids = {node["id"] for node in viz_data["nodes"]}
        assert node_ids == {"A", "B", "C"}

        # Check edge data
        edge_sources = {edge["source"] for edge in viz_data["edges"]}
        edge_targets = {edge["target"] for edge in viz_data["edges"]}
        assert edge_sources == {"A", "B", "A"}
        assert edge_targets == {"B", "C", "C"}