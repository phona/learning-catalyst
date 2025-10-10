"""
Unit tests for the knowledge graph module.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.core.knowledge_graph import KnowledgeGraph
from src.data.models.concept import Concept


class TestKnowledgeGraph:
    """Test cases for the KnowledgeGraph class."""

    @pytest.fixture
    def mock_db_manager(self):
        """Create a mock database manager."""
        manager = Mock()
        manager.get_concepts = AsyncMock(return_value=[])
        manager.save_concepts = Mock()
        manager.save_concept_relationships = Mock()
        return manager

    @pytest.fixture
    def knowledge_graph(self, mock_db_manager):
        """Create a KnowledgeGraph instance with mocked dependencies."""
        return KnowledgeGraph(mock_db_manager)

    @pytest.fixture
    def sample_concepts(self):
        """Create sample concepts for testing."""
        return [
            Concept(
                id="basic-concept",
                title="Basic Concept",
                content="Basic concept content",
                prerequisites=[],
                difficulty_level=1
            ),
            Concept(
                id="intermediate-concept",
                title="Intermediate Concept",
                content="Intermediate concept content",
                prerequisites=["basic-concept"],
                difficulty_level=3
            ),
            Concept(
                id="advanced-concept",
                title="Advanced Concept",
                content="Advanced concept content",
                prerequisites=["intermediate-concept"],
                difficulty_level=5
            ),
            Concept(
                id="parallel-concept",
                title="Parallel Concept",
                content="Parallel concept content",
                prerequisites=["basic-concept"],
                difficulty_level=2
            ),
            Concept(
                id="unrelated-concept",
                title="Unrelated Concept",
                content="Unrelated concept content",
                prerequisites=[],
                difficulty_level=1
            )
        ]

    def test_init_with_db_manager(self, knowledge_graph):
        """Test KnowledgeGraph initialization with database manager."""
        assert knowledge_graph.db_manager is not None
        assert knowledge_graph.concepts == {}
        assert knowledge_graph.adjacency_list == {}
        assert knowledge_graph.reverse_adjacency_list == {}
        assert knowledge_graph.visited == set()
        assert knowledge_graph.cycles == []
        assert knowledge_graph._loaded is False

    def test_init_without_db_manager(self):
        """Test KnowledgeGraph initialization without database manager."""
        kg = KnowledgeGraph()
        assert kg.db_manager is None
        assert kg.concepts == {}
        assert kg.adjacency_list == {}
        assert kg.reverse_adjacency_list == {}

    def test_add_concept(self, knowledge_graph, sample_concepts):
        """Test adding a concept to the knowledge graph."""
        # Arrange
        concept = sample_concepts[0]

        # Act
        knowledge_graph.add_concept(concept)

        # Assert
        assert concept.id in knowledge_graph.concepts
        assert knowledge_graph.concepts[concept.id] == concept
        assert len(knowledge_graph.adjacency_list) == 0  # No dependents
        assert len(knowledge_graph.reverse_adjacency_list) == 0  # No prerequisites

    def test_add_concept_with_prerequisites(self, knowledge_graph, sample_concepts):
        """Test adding a concept with prerequisites."""
        # Arrange
        basic_concept = sample_concepts[0]
        intermediate_concept = sample_concepts[1]

        # Act
        knowledge_graph.add_concept(basic_concept)
        knowledge_graph.add_concept(intermediate_concept)

        # Assert
        assert basic_concept.id in knowledge_graph.concepts
        assert intermediate_concept.id in knowledge_graph.concepts

        # Check adjacency lists
        assert intermediate_concept.id in knowledge_graph.adjacency_list[basic_concept.id]
        assert basic_concept.id in knowledge_graph.reverse_adjacency_list[intermediate_concept.id]

    def test_remove_concept(self, knowledge_graph, sample_concepts):
        """Test removing a concept from the knowledge graph."""
        # Arrange
        basic_concept = sample_concepts[0]
        intermediate_concept = sample_concepts[1]
        knowledge_graph.add_concept(basic_concept)
        knowledge_graph.add_concept(intermediate_concept)

        # Act
        knowledge_graph.remove_concept(basic_concept.id)

        # Assert
        assert basic_concept.id not in knowledge_graph.concepts
        assert basic_concept.id not in knowledge_graph.adjacency_list
        assert basic_concept.id not in knowledge_graph.reverse_adjacency_list

        # Check that dependent relationships are cleaned up
        assert basic_concept.id not in knowledge_graph.reverse_adjacency_list[intermediate_concept.id]

    def test_get_concept(self, knowledge_graph, sample_concepts):
        """Test getting a concept by ID."""
        # Arrange
        concept = sample_concepts[0]
        knowledge_graph.add_concept(concept)

        # Act
        result = knowledge_graph.get_concept(concept.id)

        # Assert
        assert result == concept

    def test_get_concept_nonexistent(self, knowledge_graph):
        """Test getting a non-existent concept."""
        # Act
        result = knowledge_graph.get_concept("nonexistent")

        # Assert
        assert result is None

    def test_get_all_concepts(self, knowledge_graph, sample_concepts):
        """Test getting all concepts."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        result = knowledge_graph.get_all_concepts()

        # Assert
        assert len(result) == len(sample_concepts)
        for concept in sample_concepts:
            assert concept in result

    def test_get_prerequisites(self, knowledge_graph, sample_concepts):
        """Test getting prerequisites for a concept."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        prerequisites = knowledge_graph.get_prerequisites("advanced-concept")

        # Assert
        assert "intermediate-concept" in prerequisites
        assert len(prerequisites) == 1

    def test_get_prerequisites_nonexistent(self, knowledge_graph):
        """Test getting prerequisites for a non-existent concept."""
        # Act
        prerequisites = knowledge_graph.get_prerequisites("nonexistent")

        # Assert
        assert prerequisites == []

    def test_get_dependents(self, knowledge_graph, sample_concepts):
        """Test getting concepts that depend on a given concept."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        dependents = knowledge_graph.get_dependents("basic-concept")

        # Assert
        assert "intermediate-concept" in dependents
        assert "parallel-concept" in dependents
        assert len(dependents) == 2

    def test_get_dependents_nonexistent(self, knowledge_graph):
        """Test getting dependents for a non-existent concept."""
        # Act
        dependents = knowledge_graph.get_dependents("nonexistent")

        # Assert
        assert dependents == []

    def test_find_learning_path_simple(self, knowledge_graph, sample_concepts):
        """Test finding a simple learning path."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        path = knowledge_graph.find_learning_path("basic-concept", "advanced-concept")

        # Assert
        assert path is not None
        assert len(path) == 3
        assert path[0] == "basic-concept"
        assert path[1] == "intermediate-concept"
        assert path[2] == "advanced-concept"

    def test_find_learning_path_nonexistent(self, knowledge_graph):
        """Test finding learning path with non-existent concepts."""
        # Act
        path = knowledge_graph.find_learning_path("nonexistent1", "nonexistent2")

        # Assert
        assert path is None

    def test_find_learning_path_no_path(self, knowledge_graph, sample_concepts):
        """Test finding learning path when no path exists."""
        # Arrange
        knowledge_graph.add_concept(sample_concepts[0])  # basic-concept
        knowledge_graph.add_concept(sample_concepts[4])  # unrelated-concept

        # Act
        path = knowledge_graph.find_learning_path("basic-concept", "unrelated-concept")

        # Assert
        assert path is None

    def test_topological_sort_simple(self, knowledge_graph, sample_concepts):
        """Test topological sort with a simple DAG."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        sorted_concepts = knowledge_graph.topological_sort()

        # Assert
        assert len(sorted_concepts) == 5
        # Basic concepts should come before dependent concepts
        basic_index = sorted_concepts.index("basic-concept")
        intermediate_index = sorted_concepts.index("intermediate-concept")
        advanced_index = sorted_concepts.index("advanced-concept")

        assert basic_index < intermediate_index < advanced_index

    def test_topological_sort_with_cycles(self, knowledge_graph):
        """Test topological sort with cycles in the graph."""
        # Arrange - Create concepts with cycles
        concept_a = Concept("a", "A", "Content A", ["b"], 1)
        concept_b = Concept("b", "B", "Content B", ["c"], 1)
        concept_c = Concept("c", "C", "Content C", ["a"], 1)  # Creates cycle

        knowledge_graph.add_concept(concept_a)
        knowledge_graph.add_concept(concept_b)
        knowledge_graph.add_concept(concept_c)

        # Act
        sorted_concepts = knowledge_graph.topological_sort()

        # Assert - Should return empty list when cycles exist
        assert len(sorted_concepts) == 0

    def test_detect_cycles_no_cycles(self, knowledge_graph, sample_concepts):
        """Test cycle detection when no cycles exist."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        cycles = knowledge_graph.detect_cycles()

        # Assert
        assert len(cycles) == 0

    def test_detect_cycles_with_cycles(self, knowledge_graph):
        """Test cycle detection when cycles exist."""
        # Arrange - Create a simple cycle
        concept_a = Concept("a", "A", "Content A", ["b"], 1)
        concept_b = Concept("b", "B", "Content B", ["a"], 1)

        knowledge_graph.add_concept(concept_a)
        knowledge_graph.add_concept(concept_b)

        # Act
        cycles = knowledge_graph.detect_cycles()

        # Assert
        assert len(cycles) == 1
        assert len(cycles[0]) == 3  # Cycle includes both nodes plus return to start
        assert "a" in cycles[0]
        assert "b" in cycles[0]

    def test_get_connected_components(self, knowledge_graph, sample_concepts):
        """Test getting connected components."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        components = knowledge_graph.get_connected_components()

        # Assert
        assert len(components) == 2  # Two components: main chain + unrelated concept

        # Check main component contains related concepts
        main_component_size = max(len(comp) for comp in components)
        assert main_component_size == 4  # basic, intermediate, advanced, parallel

        # Check unrelated component
        small_components = [comp for comp in components if len(comp) == 1]
        assert len(small_components) == 1
        assert "unrelated-concept" in small_components[0]

    def test_find_longest_path(self, knowledge_graph, sample_concepts):
        """Test finding the longest path in the graph."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        path, length = knowledge_graph.find_longest_path()

        # Assert
        assert len(path) == 3  # basic -> intermediate -> advanced
        assert length == 2  # 2 edges
        assert path[0] == "basic-concept"
        assert path[-1] == "advanced-concept"

    def test_find_longest_path_empty(self, knowledge_graph):
        """Test finding longest path in empty graph."""
        # Act
        path, length = knowledge_graph.find_longest_path()

        # Assert
        assert len(path) == 0
        assert length == 0

    def test_get_concept_depth(self, knowledge_graph, sample_concepts):
        """Test getting concept depth."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act & Assert
        assert knowledge_graph.get_concept_depth("basic-concept") == 0
        assert knowledge_graph.get_concept_depth("intermediate-concept") == 1
        assert knowledge_graph.get_concept_depth("advanced-concept") == 2
        assert knowledge_graph.get_concept_depth("parallel-concept") == 1
        assert knowledge_graph.get_concept_depth("unrelated-concept") == 0

    def test_get_concept_depth_nonexistent(self, knowledge_graph):
        """Test getting depth for non-existent concept."""
        # Act
        depth = knowledge_graph.get_concept_depth("nonexistent")

        # Assert
        assert depth == -1

    def test_get_ready_concepts(self, knowledge_graph, sample_concepts):
        """Test getting concepts ready to learn."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        user_completed = {"basic-concept"}

        # Act
        ready = knowledge_graph.get_ready_concepts(user_completed)

        # Assert
        assert "intermediate-concept" in ready
        assert "parallel-concept" in ready
        assert "advanced-concept" not in ready  # Prerequisites not met
        assert "unrelated-concept" in ready  # No prerequisites

    def test_get_ready_concepts_all_completed(self, knowledge_graph, sample_concepts):
        """Test getting ready concepts when all are completed."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        user_completed = {concept.id for concept in sample_concepts}

        # Act
        ready = knowledge_graph.get_ready_concepts(user_completed)

        # Assert
        assert len(ready) == 0

    def test_generate_text_visualization(self, knowledge_graph, sample_concepts):
        """Test generating text visualization."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        visualization = knowledge_graph.generate_text_visualization()

        # Assert
        assert "Knowledge Graph Visualization" in visualization
        assert "Total concepts:" in visualization
        assert "Total relationships:" in visualization
        assert "basic-concept" in visualization
        assert "intermediate-concept" in visualization
        assert "advanced-concept" in visualization

    def test_generate_text_visualization_empty(self, knowledge_graph):
        """Test generating text visualization for empty graph."""
        # Act
        visualization = knowledge_graph.generate_text_visualization()

        # Assert
        assert "Empty knowledge graph" in visualization

    def test_generate_text_visualization_with_cycles(self, knowledge_graph):
        """Test generating text visualization with cycles."""
        # Arrange - Create a cycle
        concept_a = Concept("a", "A", "Content A", ["b"], 1)
        concept_b = Concept("b", "B", "Content B", ["a"], 1)

        knowledge_graph.add_concept(concept_a)
        knowledge_graph.add_concept(concept_b)

        # Act
        visualization = knowledge_graph.generate_text_visualization()

        # Assert
        assert "Cycles detected:" in visualization
        assert "1" in visualization  # Number of cycles

    def test_to_dict(self, knowledge_graph, sample_concepts):
        """Test converting knowledge graph to dictionary."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        result = knowledge_graph.to_dict()

        # Assert
        assert "concepts" in result
        assert "relationships" in result
        assert "statistics" in result

        assert len(result["concepts"]) == 5
        assert len(result["relationships"]) == 3  # basic->intermediate, intermediate->advanced, basic->parallel

        # Check statistics
        stats = result["statistics"]
        assert stats["total_concepts"] == 5
        assert stats["total_relationships"] == 3
        assert stats["cycles"] == 0
        assert stats["connected_components"] == 2
        assert stats["max_depth"] == 2

    def test_to_json(self, knowledge_graph, sample_concepts):
        """Test converting knowledge graph to JSON."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        json_str = knowledge_graph.to_json()

        # Assert
        assert isinstance(json_str, str)
        assert "concepts" in json_str
        assert "relationships" in json_str
        assert "statistics" in json_str

        # Should be valid JSON
        import json
        parsed = json.loads(json_str)
        assert "concepts" in parsed
        assert "relationships" in parsed

    def test_from_knowledge_map(self, knowledge_graph):
        """Test loading concepts from KnowledgeMap."""
        # Arrange
        from src.data.models.extended_models import KnowledgeMap

        knowledge_map = KnowledgeMap(
            concepts=[
                {"id": "concept-1", "title": "Concept 1", "content": "Content 1", "prerequisites": [], "difficulty_level": 1},
                {"id": "concept-2", "title": "Concept 2", "content": "Content 2", "prerequisites": ["concept-1"], "difficulty_level": 2}
            ],
            relationships=[
                {"from": "concept-1", "to": "concept-2"}
            ]
        )

        # Act
        knowledge_graph.from_knowledge_map(knowledge_map)

        # Assert
        assert len(knowledge_graph.concepts) == 2
        assert "concept-1" in knowledge_graph.concepts
        assert "concept-2" in knowledge_graph.concepts
        assert "concept-2" in knowledge_graph.adjacency_list["concept-1"]

    @pytest.mark.asyncio
    async def test_load_from_database(self, knowledge_graph):
        """Test loading knowledge graph from database."""
        # Arrange
        mock_concepts = [
            {"id": "concept-1", "title": "Concept 1", "content": "Content 1", "prerequisites": [], "difficulty_level": 1},
            {"id": "concept-2", "title": "Concept 2", "content": "Content 2", "prerequisites": ["concept-1"], "difficulty_level": 2}
        ]

        knowledge_graph.db_manager.get_concepts = AsyncMock(return_value=mock_concepts)

        # Act
        progress_updates = []
        async for update in knowledge_graph.load_from_database():
            progress_updates.append(update)

        # Assert
        assert len(progress_updates) >= 2  # Should have at least loading and completion updates
        assert knowledge_graph.is_loaded()

        final_update = progress_updates[-1]
        assert final_update["percentage"] == 100
        assert final_update["status"] == "completed"
        assert "statistics" in final_update

        # Check concepts were loaded
        assert len(knowledge_graph.concepts) == 2
        assert "concept-1" in knowledge_graph.concepts
        assert "concept-2" in knowledge_graph.concepts

    @pytest.mark.asyncio
    async def test_load_from_database_no_db_manager(self):
        """Test loading from database without database manager."""
        # Arrange
        kg = KnowledgeGraph()  # No database manager

        # Act & Assert
        with pytest.raises(ValueError, match="Database manager not provided"):
            async for _ in kg.load_from_database():
                pass

    def test_is_loaded(self, knowledge_graph):
        """Test checking if knowledge graph is loaded."""
        # Initially not loaded
        assert not knowledge_graph.is_loaded()

        # Mark as loaded
        knowledge_graph._loaded = True
        assert knowledge_graph.is_loaded()

    def test_get_statistics(self, knowledge_graph, sample_concepts):
        """Test getting knowledge graph statistics."""
        # Arrange
        for concept in sample_concepts:
            knowledge_graph.add_concept(concept)

        # Act
        stats = knowledge_graph.get_statistics()

        # Assert
        assert stats["total_concepts"] == 5
        assert stats["total_relationships"] == 3
        assert stats["cycles_detected"] == 0
        assert stats["connected_components"] == 2
        assert stats["max_depth"] == 2
        assert stats["is_loaded"] == False
        assert stats["has_cycles"] == False

    def test_get_statistics_empty(self, knowledge_graph):
        """Test getting statistics for empty graph."""
        # Act
        stats = knowledge_graph.get_statistics()

        # Assert
        assert stats["total_concepts"] == 0
        assert stats["total_relationships"] == 0
        assert stats["cycles_detected"] == 0
        assert stats["connected_components"] == 0
        assert stats["max_depth"] == 0
        assert stats["is_loaded"] == False
        assert stats["has_cycles"] == False