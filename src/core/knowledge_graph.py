"""
Knowledge Graph implementation for Learning Catalyst
Handles concept relationships, graph traversal, dependency tracking, and visualization
"""

import json
from collections import defaultdict, deque
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Set, Tuple

from src.data.models.concept import Concept
from src.data.models.extended_models import KnowledgeMap

if TYPE_CHECKING:
    from src.data.database_manager import DatabaseManager


class KnowledgeGraph:
    """Manages the knowledge graph of concepts and their relationships."""

    def __init__(self, db_manager: Optional["DatabaseManager"] = None):
        self.db_manager = db_manager
        self.concepts: Dict[str, Concept] = {}
        self.adjacency_list: Dict[str, List[str]] = defaultdict(list)
        self.reverse_adjacency_list: Dict[str, List[str]] = defaultdict(list)
        self.visited: Set[str] = set()
        self.cycles: List[List[str]] = []
        self._loaded = False

    def add_concept(self, concept: Concept) -> None:
        """Add a concept to the knowledge graph."""
        self.concepts[concept.id] = concept
        # Build adjacency lists based on prerequisites
        for prereq in concept.prerequisites:
            self.adjacency_list[prereq].append(concept.id)
            self.reverse_adjacency_list[concept.id].append(prereq)

    def remove_concept(self, concept_id: str) -> None:
        """Remove a concept from the knowledge graph."""
        if concept_id in self.concepts:
            concept = self.concepts[concept_id]
            # Remove from adjacency lists
            for prereq in concept.prerequisites:
                if concept_id in self.adjacency_list[prereq]:
                    self.adjacency_list[prereq].remove(concept_id)
            # Remove reverse connections
            for dependent in self.reverse_adjacency_list[concept_id]:
                if concept_id in self.adjacency_list[dependent]:
                    self.adjacency_list[dependent].remove(concept_id)
            # Clean up data structures
            del self.concepts[concept_id]
            self.adjacency_list.pop(concept_id, None)
            self.reverse_adjacency_list.pop(concept_id, None)

    def get_concept(self, concept_id: str) -> Optional[Concept]:
        """Get a concept by ID."""
        return self.concepts.get(concept_id)

    def get_all_concepts(self) -> List[Concept]:
        """Get all concepts in the graph."""
        return list(self.concepts.values())

    def get_prerequisites(self, concept_id: str) -> List[str]:
        """Get direct prerequisites for a concept."""
        concept = self.get_concept(concept_id)
        return concept.prerequisites if concept else []

    def get_dependents(self, concept_id: str) -> List[str]:
        """Get concepts that depend on this concept."""
        return self.adjacency_list.get(concept_id, [])

    def find_learning_path(self, start_concept: str, end_concept: str) -> Optional[List[str]]:
        """Find the shortest learning path between two concepts."""
        if start_concept not in self.concepts or end_concept not in self.concepts:
            return None

        queue = deque([(start_concept, [start_concept])])
        visited = {start_concept}

        while queue:
            current, path = queue.popleft()
            if current == end_concept:
                return path

            for neighbor in self.adjacency_list[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return None

    def topological_sort(self) -> List[str]:
        """Return concepts in topological order (prerequisites first)."""
        in_degree = defaultdict(int)

        # Calculate in-degrees
        for concept_id in self.concepts:
            in_degree[concept_id] = len(self.get_prerequisites(concept_id))

        # Queue for nodes with no incoming edges
        queue = deque([concept_id for concept_id, degree in in_degree.items() if degree == 0])
        result = []

        while queue:
            current = queue.popleft()
            result.append(current)

            # Reduce in-degree for neighbors
            for neighbor in self.adjacency_list[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        return result if len(result) == len(self.concepts) else []

    def detect_cycles(self) -> List[List[str]]:
        """Detect cycles in the knowledge graph using DFS."""
        self.cycles = []
        self.visited = set()
        rec_stack = set()
        path = []

        def dfs(concept_id: str):
            if concept_id in rec_stack:
                # Found a cycle
                cycle_start = path.index(concept_id)
                cycle = path[cycle_start:] + [concept_id]
                self.cycles.append(cycle)
                return

            if concept_id in self.visited:
                return

            self.visited.add(concept_id)
            rec_stack.add(concept_id)
            path.append(concept_id)

            for neighbor in self.adjacency_list[concept_id]:
                dfs(neighbor)

            path.pop()
            rec_stack.remove(concept_id)

        for concept_id in self.concepts:
            if concept_id not in self.visited:
                dfs(concept_id)

        return self.cycles

    def get_connected_components(self) -> List[List[str]]:
        """Get connected components in the knowledge graph."""
        visited = set()
        components = []

        def dfs(concept_id: str, component: List[str]):
            visited.add(concept_id)
            component.append(concept_id)

            # Check both prerequisites and dependents
            neighbors = (self.get_prerequisites(concept_id) +
                        self.get_dependents(concept_id))

            for neighbor in neighbors:
                if neighbor in self.concepts and neighbor not in visited:
                    dfs(neighbor, component)

        for concept_id in self.concepts:
            if concept_id not in visited:
                component = []
                dfs(concept_id, component)
                components.append(component)

        return components

    def find_longest_path(self) -> Tuple[List[str], int]:
        """Find the longest learning path in the graph."""
        topo_order = self.topological_sort()
        if not topo_order:
            return [], 0

        # Initialize distances and predecessors
        distances = {concept_id: 0 for concept_id in self.concepts}
        predecessors = {concept_id: None for concept_id in self.concepts}

        for concept_id in topo_order:
            for neighbor in self.adjacency_list[concept_id]:
                if distances[neighbor] < distances[concept_id] + 1:
                    distances[neighbor] = distances[concept_id] + 1
                    predecessors[neighbor] = concept_id

        # Find the concept with maximum distance
        max_concept = max(self.concepts.keys(), key=lambda x: distances[x])
        max_distance = distances[max_concept]

        # Reconstruct the path
        path = []
        current = max_concept
        while current is not None:
            path.append(current)
            current = predecessors[current]

        return path[::-1], max_distance

    def get_concept_depth(self, concept_id: str) -> int:
        """Get the depth of a concept (length of longest prerequisite chain)."""
        if concept_id not in self.concepts:
            return -1

        # Memoization for depths
        depth_cache = {}

        def calculate_depth(cid: str) -> int:
            if cid in depth_cache:
                return depth_cache[cid]

            prereqs = self.get_prerequisites(cid)
            if not prereqs:
                depth_cache[cid] = 0
                return 0

            max_prereq_depth = max(calculate_depth(prereq) for prereq in prereqs if prereq in self.concepts)
            depth_cache[cid] = max_prereq_depth + 1
            return depth_cache[cid]

        return calculate_depth(concept_id)

    def get_ready_concepts(self, user_completed: Set[str]) -> List[str]:
        """Get concepts that are ready to learn (prerequisites satisfied)."""
        ready = []
        for concept_id, concept in self.concepts.items():
            if concept_id in user_completed:
                continue

            # Check if all prerequisites are completed
            prereqs_satisfied = all(prereq in user_completed for prereq in concept.prerequisites)
            if prereqs_satisfied:
                ready.append(concept_id)

        return ready

    def generate_text_visualization(self, max_depth: int = 3) -> str:
        """Generate a text-based visualization of the knowledge graph."""
        if not self.concepts:
            return "Empty knowledge graph"

        # Get concepts sorted by depth
        concepts_by_depth = defaultdict(list)
        for concept_id in self.concepts:
            depth = min(self.get_concept_depth(concept_id), max_depth)
            concepts_by_depth[depth].append(concept_id)

        lines = []
        lines.append("Knowledge Graph Visualization")
        lines.append("=" * 40)

        for depth in range(max_depth + 1):
            if depth in concepts_by_depth:
                lines.append(f"\nLevel {depth}:")
                for concept_id in concepts_by_depth[depth]:
                    concept = self.concepts[concept_id]
                    prereqs = ", ".join(concept.prerequisites) if concept.prerequisites else "None"
                    dependents = ", ".join(self.get_dependents(concept_id)[:3])  # Limit display
                    if len(self.get_dependents(concept_id)) > 3:
                        dependents += f" (+{len(self.get_dependents(concept_id)) - 3} more)"

                    lines.append(f"  ├── {concept.title} ({concept_id})")
                    lines.append(f"  │   ├── Prerequisites: {prereqs}")
                    lines.append(f"  │   ├── Dependents: {dependents}")
                    lines.append(f"  │   └── Difficulty: {concept.difficulty_level}")

        # Add cycle information
        cycles = self.detect_cycles()
        if cycles:
            lines.append(f"\n⚠️  Cycles detected: {len(cycles)}")
            for i, cycle in enumerate(cycles[:3]):  # Show first 3 cycles
                cycle_names = [self.concepts[cid].title for cid in cycle if cid in self.concepts]
                lines.append(f"  Cycle {i+1}: {' → '.join(cycle_names)}")

        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Convert knowledge graph to dictionary representation."""
        return {
            "concepts": {
                concept_id: {
                    "title": concept.title,
                    "content": concept.content,
                    "prerequisites": concept.prerequisites,
                    "difficulty_level": concept.difficulty_level
                }
                for concept_id, concept in self.concepts.items()
            },
            "relationships": [
                {"from": prereq, "to": concept_id}
                for concept_id, concept in self.concepts.items()
                for prereq in concept.prerequisites
            ],
            "statistics": {
                "total_concepts": len(self.concepts),
                "total_relationships": sum(len(c.prerequisites) for c in self.concepts.values()),
                "cycles": len(self.detect_cycles()),
                "connected_components": len(self.get_connected_components()),
                "max_depth": max((self.get_concept_depth(cid) for cid in self.concepts), default=0)
            }
        }

    def to_json(self) -> str:
        """Convert knowledge graph to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

    def from_knowledge_map(self, knowledge_map: KnowledgeMap) -> None:
        """Load concepts from a KnowledgeMap."""
        for concept_data in knowledge_map.concepts:
            concept = Concept(
                id=concept_data["id"],
                title=concept_data["title"],
                content=concept_data.get("content", ""),
                prerequisites=concept_data.get("prerequisites", []),
                difficulty_level=concept_data.get("difficulty_level", 1)
            )
            self.add_concept(concept)

    async def load_from_database(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Load knowledge graph from database with progress tracking."""
        if not self.db_manager:
            raise ValueError("Database manager not provided")

        concepts = await self.db_manager.get_concepts()
        total_concepts = len(concepts)
        loaded_count = 0

        # Clear existing graph
        self.concepts.clear()
        self.adjacency_list.clear()
        self.reverse_adjacency_list.clear()

        for concept_data in concepts:
            concept = Concept(
                id=concept_data["id"],
                title=concept_data["title"],
                content=concept_data["content"],
                prerequisites=concept_data.get("prerequisites", []),
                difficulty_level=concept_data.get("difficulty_level", 1)
            )
            self.add_concept(concept)
            loaded_count += 1

            # Progress tracking
            if loaded_count % 10 == 0 or loaded_count == total_concepts:
                progress = {
                    "loaded": loaded_count,
                    "total": total_concepts,
                    "percentage": (loaded_count / total_concepts * 100) if total_concepts > 0 else 100,
                    "status": "loading_concepts"
                }
                yield progress

        self._loaded = True

        # Final progress report
        cycles = self.detect_cycles()
        yield {
            "loaded": loaded_count,
            "total": total_concepts,
            "percentage": 100,
            "status": "completed",
            "statistics": {
                "total_concepts": total_concepts,
                "total_relationships": sum(len(c.prerequisites) for c in self.concepts.values()),
                "cycles_detected": len(cycles),
                "connected_components": len(self.get_connected_components()),
                "graph_ready": True
            }
        }

    def is_loaded(self) -> bool:
        """Check if the knowledge graph is loaded."""
        return self._loaded

    def get_statistics(self) -> Dict[str, Any]:
        """Get knowledge graph statistics."""
        cycles = self.detect_cycles()
        return {
            "total_concepts": len(self.concepts),
            "total_relationships": sum(len(c.prerequisites) for c in self.concepts.values()),
            "cycles_detected": len(cycles),
            "connected_components": len(self.get_connected_components()),
            "max_depth": max((self.get_concept_depth(cid) for cid in self.concepts), default=0),
            "is_loaded": self._loaded,
            "has_cycles": len(cycles) > 0
        }