# Knowledge Systems Development Guide

---
title: Building Interactive Knowledge Maps and Concept Systems
description: Comprehensive guide to implementing knowledge graphs, concept extraction, and interactive learning navigation
version: 2.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers the implementation of Learning Catalyst's knowledge systems, including interactive knowledge maps, concept extraction from Markdown files, knowledge graph traversal, and learning path generation. These features transform static learning materials into dynamic, navigable learning experiences.

**Perfect for**: Feature developers building interactive learning features, system integrators working with knowledge graphs, and developers implementing concept-based navigation

**Key Features:**
- Interactive knowledge map visualization and navigation
- Automatic concept extraction from Markdown files
- Knowledge graph construction and relationship mapping
- Progress-based concept highlighting and mastery tracking
- Learning path generation and recommendation algorithms
- Real-time concept discovery and exploration

## 📚 Table of Contents

1. [Getting Started with Knowledge Systems](#getting-started-with-knowledge-systems)
2. [Concept Extraction System](#concept-extraction-system)
3. [Knowledge Graph Implementation](#knowledge-graph-implementation)
4. [Interactive Knowledge Maps](#interactive-knowledge-maps)
5. [Learning Path Generation](#learning-path-generation)
6. [Progress Tracking Integration](#progress-tracking-integration)
7. [Real-World Implementation Examples](#real-world-implementation-examples)
8. [Testing Knowledge Systems](#testing-knowledge-systems)

## 🚀 Getting Started with Knowledge Systems

### User Experience Examples

From the examples directory, users interact with knowledge systems like this:

```bash
# Interactive Knowledge Map Navigation
Learning Catalyst > /knowledge-map
🗺️ Your Interactive Learning Space:
┌─ Computer Science ─────────────────────────────────────┐
│  [✅] Basic Programming (Mastered)                     │
│  [🔄] Data Structures (75% Complete)                  │
│     ├── [✅] Arrays & Strings                          │
│     ├── [✅] Linked Lists                             │
│     └── [🔄] Trees & Graphs (In Progress)             │
│  [⏳] Algorithms (Not Started)                        │
│     └── prerequisites: Data Structures                │
└───────────────────────────────────────────────────────┘
Navigation: ↑↓←→ Move | Enter: Zoom In | (e)xplain | (a)sk AI | (q)uit
```

```bash
# Concept Discovery and Exploration
Learning Catalyst > /concepts discover python
🔍 **Discovering Python Concepts in Workspace...**

Found 12 Python concepts:
📚 Basic Concepts (6 mastered)
  ✅ Variables and Data Types
  ✅ Functions and Scope
  ✅ Control Flow
  ✅ Data Structures
  ✅ Object-Oriented Programming
  🔄 Error Handling (in progress)

📚 Advanced Topics (4 not started)
  ⏳ Decorators
  ⏳ Generators
  ⏳ Metaclasses
  ⏳ Async Programming

💡 **Recommended Next:** Start with Decorators (prerequisites: OOP complete)
```

### Development Environment Setup

```bash
# Set up development environment for knowledge systems
cd /path/to/learning-catalyst
python -m venv venv
source venv/bin/activate

# Install development dependencies
pip install -e ".[dev]"

# Test knowledge system components
python -c "
from src.core.knowledge_graph import KnowledgeGraph
from src.core.concept_builder import ConceptBuilder
print('✅ Knowledge system imports working')
"
```

## 🧠 Concept Extraction System

### Architecture Overview

The concept extraction system processes Markdown files to identify learning concepts and build structured knowledge representations:

```python
# Core concept extraction pipeline
class ConceptExtractionPipeline:
    def __init__(self, db_manager, ai_service):
        self.db_manager = db_manager
        self.ai_service = ai_service
        self.markdown_parser = MarkdownParser()
        self.concept_builder = ConceptBuilder(db_manager, ai_service)

    async def extract_from_workspace(self, workspace_path: str) -> List[Concept]:
        """Extract concepts from all Markdown files in workspace"""

        # 1. Scan workspace for Markdown files
        markdown_files = self._scan_markdown_files(workspace_path)

        # 2. Extract concepts from each file
        all_concepts = []
        for file_path in markdown_files:
            concepts = await self.extract_from_file(file_path)
            all_concepts.extend(concepts)

        # 3. Build relationships between concepts
        relationships = await self._build_relationships(all_concepts)

        # 4. Save to database
        await self._save_concepts_and_relationships(all_concepts, relationships)

        return all_concepts
```

### Implementation Patterns

**Header-Based Concept Extraction:**

```python
# src/core/concept_builder.py
class ConceptBuilder:
    def extract_from_headers(self, file_path: str) -> List[Concept]:
        """Extract concepts from Markdown headers (# ## ###)"""

        concepts = []
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse headers
        headers = self._parse_headers(content)

        for header in headers:
            concept = Concept(
                id=self._generate_concept_id(header['text']),
                title=header['text'],
                level=header['level'],  # H1, H2, H3
                content=header['following_content'],
                file_path=file_path,
                position=header['position'],
                metadata={
                    'extraction_method': 'header',
                    'confidence': 0.9,
                    'word_count': len(header['following_content'].split())
                }
            )
            concepts.append(concept)

        return concepts

    def _parse_headers(self, content: str) -> List[Dict[str, Any]]:
        """Parse Markdown headers and their following content"""
        import re

        # Pattern to match headers and capture following content
        header_pattern = r'^(#{1,6})\s+(.+?)(?=\n#{1,6}|\n\n|$)'
        headers = re.findall(header_pattern, content, re.MULTILINE | re.DOTALL)

        parsed_headers = []
        for match in headers:
            level = len(match[0])  # Count # symbols
            text = match[1].strip()

            # Extract content following this header
            header_start = content.find(f"{'#' * level} {text}")
            next_header_match = re.search(r'\n#{1,6}\s+', content[header_start + 1:])

            if next_header_match:
                following_content = content[header_start:header_start + next_header_match.start()]
            else:
                following_content = content[header_start:]

            parsed_headers.append({
                'level': level,
                'text': text,
                'following_content': following_content,
                'position': header_start
            })

        return parsed_headers
```

**AI-Enhanced Concept Detection:**

```python
class AIConceptExtractor:
    def __init__(self, ai_service):
        self.ai_service = ai_service

    async def extract_concepts_with_ai(self, content: str, context: Dict[str, Any]) -> List[Concept]:
        """Use AI to identify learning concepts in content"""

        prompt = f"""
        Analyze the following educational content and identify key learning concepts.

        Content: {content[:2000]}...

        Extract concepts that:
        1. Represent distinct learning topics
        2. Have clear educational objectives
        3. Can be learned independently
        4. Relate to other concepts through prerequisites

        Return in JSON format:
        {{
            "concepts": [
                {{
                    "title": "Concept Title",
                    "description": "Brief description",
                    "difficulty": "beginner|intermediate|advanced",
                    "estimated_time": "time in minutes",
                    "prerequisites": ["prereq1", "prereq2"],
                    "confidence": 0.9
                }}
            ]
        }}
        """

        response = await self.ai_service.generate_response(prompt, context)

        # Parse AI response and create Concept objects
        concepts = []
        try:
            ai_result = json.loads(response.content)
            for concept_data in ai_result.get('concepts', []):
                concept = Concept(
                    id=self._generate_concept_id(concept_data['title']),
                    title=concept_data['title'],
                    description=concept_data['description'],
                    difficulty=concept_data['difficulty'],
                    estimated_time=concept_data['estimated_time'],
                    prerequisites=concept_data.get('prerequisites', []),
                    metadata={
                        'extraction_method': 'ai',
                        'confidence': concept_data['confidence'],
                        'ai_model': context.get('model_used')
                    }
                )
                concepts.append(concept)
        except json.JSONDecodeError:
            # Fallback to basic extraction
            concepts = self._fallback_extraction(content)

        return concepts
```

## 🕸️ Knowledge Graph Implementation

### Core Data Structures

```python
# src/core/knowledge_graph.py
from typing import Dict, List, Set, Optional, Tuple
from collections import defaultdict, deque
from dataclasses import dataclass

@dataclass
class ConceptNode:
    """Node in the knowledge graph representing a learning concept"""
    id: str
    title: str
    description: str
    difficulty: str
    mastery_level: float  # 0.0 to 1.0
    prerequisites: Set[str]
    dependents: Set[str]
    metadata: Dict[str, Any]

class KnowledgeGraph:
    def __init__(self, db_manager=None):
        self.db_manager = db_manager
        self.nodes: Dict[str, ConceptNode] = {}
        self.adjacency_list: Dict[str, List[str]] = defaultdict(list)
        self.reverse_adjacency: Dict[str, List[str]] = defaultdict(list)

    def add_concept(self, concept: Concept) -> None:
        """Add a concept to the knowledge graph"""
        node = ConceptNode(
            id=concept.id,
            title=concept.title,
            description=concept.description or "",
            difficulty=concept.difficulty or "intermediate",
            mastery_level=0.0,  # Initially not mastered
            prerequisites=set(concept.prerequisites or []),
            dependents=set(),
            metadata=concept.metadata or {}
        )

        self.nodes[concept.id] = node

        # Update adjacency lists
        for prereq in concept.prerequisites:
            self.adjacency_list[prereq].append(concept.id)
            self.reverse_adjacency[concept.id].append(prereq)

    def get_learning_path(self, target_concept: str, max_concepts: int = 10) -> List[str]:
        """Generate a learning path to reach the target concept"""

        if target_concept not in self.nodes:
            return []

        # BFS to find shortest path from mastered concepts
        path = []
        visited = set()
        queue = deque([(target_concept, [])])

        while queue and len(path) < max_concepts:
            current, current_path = queue.popleft()

            if current in visited:
                continue

            visited.add(current)
            full_path = current_path + [current]

            # Check if user has mastery of this concept
            if self.nodes[current].mastery_level >= 0.8:
                path = full_path
                break

            # Add prerequisites to queue
            for prereq in self.nodes[current].prerequisites:
                if prereq not in visited:
                    queue.append((prereq, full_path))

        return list(reversed(path))  # Reverse for learning order

    def get_ready_concepts(self, user_id: str) -> List[str]:
        """Get concepts that user is ready to learn (prerequisites met)"""
        ready_concepts = []

        for concept_id, node in self.nodes.items():
            # Skip if already mastered
            if node.mastery_level >= 0.8:
                continue

            # Check if all prerequisites are mastered
            prerequisites_met = all(
                self.nodes[prereq].mastery_level >= 0.7
                for prereq in node.prerequisites
                if prereq in self.nodes
            )

            if prerequisites_met and not node.prerequisites:
                ready_concepts.append(concept_id)

        # Sort by difficulty and estimated time
        ready_concepts.sort(key=lambda cid: (
            self.nodes[cid].difficulty,
            self.nodes[cid].metadata.get('estimated_time', 30)
        ))

        return ready_concepts
```

### Graph Visualization Implementation

```python
# src/core/knowledge_visualizer.py
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from typing import List, Dict, Any

class KnowledgeMapVisualizer:
    def __init__(self, console: Console = None):
        self.console = console or Console()

    def render_interactive_map(self, concepts: List[Concept], user_progress: Dict[str, float]) -> Panel:
        """Render an interactive knowledge map visualization"""

        # Build tree structure from concepts
        tree = self._build_concept_tree(concepts, user_progress)

        # Create visual representation
        map_content = self._render_tree(tree)

        return Panel(
            map_content,
            title="🗺️ Your Interactive Learning Space",
            border_style="blue",
            padding=(1, 2)
        )

    def _build_concept_tree(self, concepts: List[Concept], user_progress: Dict[str, float]) -> Dict[str, Any]:
        """Build hierarchical tree structure from concepts"""

        # Group concepts by category/level
        categories = defaultdict(list)

        for concept in concepts:
            # Determine category from metadata or path
            category = concept.metadata.get('category', 'General')
            mastery = user_progress.get(concept.id, 0.0)

            status = self._get_mastery_status(mastery)

            categories[category].append({
                'concept': concept,
                'mastery': mastery,
                'status': status,
                'prerequisites': concept.prerequisites or []
            })

        return dict(categories)

    def _get_mastery_status(self, mastery: float) -> str:
        """Get visual status indicator based on mastery level"""
        if mastery >= 0.8:
            return "✅"  # Mastered
        elif mastery >= 0.3:
            return "🔄"  # In Progress
        else:
            return "⏳"  # Not Started

    def _render_tree(self, tree: Dict[str, Any]) -> str:
        """Render the tree structure as text"""

        output = []

        for category, concepts in tree.items():
            output.append(f"┌─ {category} {'─' * (50 - len(category))}┐")

            for i, concept_data in enumerate(concepts):
                concept = concept_data['concept']
                status = concept_data['status']
                mastery = concept_data['mastery']

                # Create progress bar
                progress_bar = self._create_progress_bar(mastery)

                # Format line
                line = f"│  {status} {concept.title[:40]:<40} {progress_bar}"
                output.append(line)

                # Add sub-concepts (prerequisites)
                if concept.prerequisites:
                    for prereq in concept.prerequisites[:2]:  # Limit display
                        output.append(f"│     ├── {prereq}")

            output.append(f"└─{'─' * 50}┘")
            output.append("")

        # Add navigation help
        output.append("Navigation: ↑↓←→ Move | Enter: Zoom In | (e)xplain | (a)sk AI | (q)uit")

        return "\n".join(output)

    def _create_progress_bar(self, mastery: float, width: int = 8) -> str:
        """Create a visual progress bar"""
        filled = int(width * mastery)
        bar = "█" * filled + "░" * (width - filled)
        return f"[{bar}] {mastery*100:.0f}%"
```

## 🗺️ Interactive Knowledge Maps

### User Interaction Implementation

```python
# src/cli/commands/learning/knowledge_map.py
from src.cli.commands.base import BaseCommand
from src.core.knowledge_graph import KnowledgeGraph
from src.core.knowledge_visualizer import KnowledgeMapVisualizer
import asyncio

class KnowledgeMapCommand(BaseCommand):
    """Interactive knowledge map navigation command"""

    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="knowledge-map",
            description="Navigate your interactive knowledge map",
            usage="/knowledge-map [topic]",
            aliases=["km", "map"],
            category="Learning"
        )
        self.visualizer = KnowledgeMapVisualizer()

    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute interactive knowledge map navigation"""

        try:
            # Get knowledge graph from context
            knowledge_graph = context.get("knowledge_graph")
            if not knowledge_graph:
                knowledge_graph = await self._load_knowledge_graph(context)

            # Get user progress
            user_progress = await self._get_user_progress(context)

            # Filter concepts if topic specified
            if args:
                topic = args[0].lower()
                concepts = self._filter_concepts_by_topic(knowledge_graph, topic)
            else:
                concepts = list(knowledge_graph.nodes.values())

            # Start interactive navigation
            await self._start_interactive_navigation(concepts, user_progress, context)

            return CommandResult(success=True, data={"navigation_completed": True})

        except Exception as e:
            return CommandResult(
                success=False,
                error=f"Failed to load knowledge map: {str(e)}"
            )

    async def _start_interactive_navigation(self, concepts: List[ConceptNode],
                                         user_progress: Dict[str, float],
                                         context: Dict[str, Any]) -> None:
        """Start interactive knowledge map navigation"""

        current_selection = 0
        selected_concepts = concepts[:10]  # Show first 10 concepts

        while True:
            # Render knowledge map
            map_panel = self.visualizer.render_interactive_map(selected_concepts, user_progress)
            self.cli_interface.display_content(map_panel)

            # Get user input
            user_input = await self._get_navigation_input()

            if user_input.lower() in ['q', 'quit']:
                break
            elif user_input.lower() in ['e', 'explain']:
                # Explain selected concept
                if current_selection < len(selected_concepts):
                    concept = selected_concepts[current_selection]
                    await self._explain_concept(concept, context)
            elif user_input.lower() in ['a', 'ask']:
                # Ask AI about selected concept
                if current_selection < len(selected_concepts):
                    concept = selected_concepts[current_selection]
                    await self._ask_ai_about_concept(concept, context)
            elif user_input == 'UP':
                current_selection = max(0, current_selection - 1)
            elif user_input == 'DOWN':
                current_selection = min(len(selected_concepts) - 1, current_selection + 1)
            elif user_input == 'ENTER':
                # Zoom into selected concept
                if current_selection < len(selected_concepts):
                    concept = selected_concepts[current_selection]
                    await self._zoom_into_concept(concept, context)

    async def _get_navigation_input(self) -> str:
        """Get navigation input from user"""
        # This would integrate with the CLI input system
        # For now, return a placeholder
        return input("Navigation: ")

    async def _explain_concept(self, concept: ConceptNode, context: Dict[str, Any]) -> None:
        """Get AI explanation for selected concept"""

        ai_service = context.get("model_service")
        if not ai_service:
            self.cli_interface.display_error("AI service not available")
            return

        prompt = f"Explain {concept.title} in a clear, educational way. Include practical examples."

        try:
            response = await ai_service.generate_response(prompt)
            self.cli_interface.display_header(f"💡 {concept.title} Explained")
            self.cli_interface.display_content(response.content)
        except Exception as e:
            self.cli_interface.display_error(f"Failed to get explanation: {str(e)}")
```

## 🎯 Learning Path Generation

### Adaptive Learning Path Algorithm

```python
# src/core/learning_path_generator.py
class LearningPathGenerator:
    def __init__(self, knowledge_graph: KnowledgeGraph, assessment_engine):
        self.knowledge_graph = knowledge_graph
        self.assessment_engine = assessment_engine

    async def generate_personalized_path(self, user_id: str, learning_goals: List[str],
                                       time_constraint: int = 60) -> Dict[str, Any]:
        """Generate a personalized learning path based on user goals and constraints"""

        # 1. Assess current knowledge state
        current_mastery = await self._assess_current_mastery(user_id)

        # 2. Analyze learning goals
        goal_analysis = await self._analyze_learning_goals(learning_goals)

        # 3. Generate candidate paths
        candidate_paths = await self._generate_candidate_paths(
            user_id, learning_goals, current_mastery
        )

        # 4. Optimize path based on constraints
        optimal_path = await self._optimize_path(
            candidate_paths, time_constraint, current_mastery
        )

        # 5. Add milestones and checkpoints
        enhanced_path = await self._add_learning_milestones(optimal_path)

        return {
            "path": enhanced_path,
            "estimated_time": self._calculate_path_time(enhanced_path),
            "difficulty_progression": self._analyze_difficulty_progression(enhanced_path),
            "prerequisites_satisfied": self._check_prerequisites(enhanced_path, current_mastery),
            "adaptation_points": self._identify_adaptation_points(enhanced_path)
        }

    async def _generate_candidate_paths(self, user_id: str, goals: List[str],
                                      current_mastery: Dict[str, float]) -> List[List[str]]:
        """Generate multiple candidate learning paths"""

        paths = []

        for goal in goals:
            # Get learning path to each goal
            path_to_goal = self.knowledge_graph.get_learning_path(goal)

            if path_to_goal:
                # Filter out already mastered concepts
                filtered_path = [
                    concept_id for concept_id in path_to_goal
                    if current_mastery.get(concept_id, 0) < 0.8
                ]

                if filtered_path:
                    paths.append(filtered_path)

        # Combine and optimize paths
        if len(paths) > 1:
            # Find common concepts and merge paths intelligently
            merged_path = self._merge_learning_paths(paths)
            paths.append(merged_path)

        return paths

    def _merge_learning_paths(self, paths: List[List[str]]) -> List[str]:
        """Merge multiple learning paths into an optimal sequence"""

        # Use topological sort with dependency resolution
        all_concepts = set()
        dependencies = defaultdict(set)

        for path in paths:
            for concept in path:
                all_concepts.add(concept)

        # Build dependency graph
        for concept_id in all_concepts:
            if concept_id in self.knowledge_graph.nodes:
                for prereq in self.knowledge_graph.nodes[concept_id].prerequisites:
                    if prereq in all_concepts:
                        dependencies[concept_id].add(prereq)

        # Topological sort
        result = []
        visited = set()
        temp_visited = set()

        def visit(concept_id: str):
            if concept_id in temp_visited:
                raise ValueError(f"Circular dependency detected: {concept_id}")
            if concept_id in visited:
                return

            temp_visited.add(concept_id)
            for prereq in dependencies[concept_id]:
                visit(prereq)
            temp_visited.remove(concept_id)
            visited.add(concept_id)
            result.append(concept_id)

        for concept_id in all_concepts:
            if concept_id not in visited:
                visit(concept_id)

        return result
```

## 📊 Progress Tracking Integration

### Mastery Assessment Implementation

```python
# src/core/mastery_tracker.py
class MasteryTracker:
    def __init__(self, assessment_engine, knowledge_graph):
        self.assessment_engine = assessment_engine
        self.knowledge_graph = knowledge_graph

    async def update_mastery_from_assessment(self, user_id: str, concept_id: str,
                                          assessment_result: Dict[str, Any]) -> float:
        """Update concept mastery based on assessment results"""

        # Get current mastery
        current_mastery = await self._get_current_mastery(user_id, concept_id)

        # Calculate new mastery using weighted average
        assessment_score = assessment_result.get('score', 0.0)
        confidence = assessment_result.get('confidence', 0.5)

        # Exponential moving average for mastery updates
        alpha = 0.3  # Learning rate
        new_mastery = (current_mastery * (1 - alpha)) + (assessment_score * alpha * confidence)

        # Update knowledge graph
        if concept_id in self.knowledge_graph.nodes:
            self.knowledge_graph.nodes[concept_id].mastery_level = new_mastery

        # Save to database
        await self._save_mastery_update(user_id, concept_id, new_mastery, assessment_result)

        # Update related concepts (prerequisites and dependents)
        await self._update_related_concepts(user_id, concept_id, new_mastery)

        return new_mastery

    async def _update_related_concepts(self, user_id: str, concept_id: str, mastery: float) -> None:
        """Update mastery of related concepts based on new mastery"""

        concept_node = self.knowledge_graph.nodes.get(concept_id)
        if not concept_node:
            return

        # Update dependents (concepts that depend on this one)
        for dependent_id in concept_node.dependents:
            dependent_node = self.knowledge_graph.nodes.get(dependent_id)
            if dependent_node:
                # Check if all prerequisites are now better satisfied
                prereq_masteries = [
                    self.knowledge_graph.nodes[prereq].mastery_level
                    for prereq in dependent_node.prerequisites
                    if prereq in self.knowledge_graph.nodes
                ]

                if prereq_masteries:
                    avg_prereq_mastery = sum(prereq_masteries) / len(prereq_masteries)

                    # Boost dependent concept readiness if prerequisites improved
                    if avg_prereq_mastery > 0.7:
                        readiness_boost = min(0.1, avg_prereq_mastery - 0.7) * 0.5
                        dependent_node.mastery_level = min(1.0,
                            dependent_node.mastery_level + readiness_boost)
```

## 🎨 Real-World Implementation Examples

### Complete Knowledge Map Workflow

```bash
# User workflow showing complete knowledge map functionality
Learning Catalyst > /knowledge-map python
🗺️ **Python Programming Knowledge Map**

┌─ Python Fundamentals ─────────────────────────────────────┐
│  ✅ Variables and Data Types (Mastered: 95%)              │
│  ✅ Functions and Scope (Mastered: 87%)                   │
│  🔄 Control Flow (In Progress: 65%)                      │
│  ⏳ Error Handling (Not Started - Prereqs met)           │
└──────────────────────────────────────────────────────────┘

┌─ Data Structures ────────────────────────────────────────┐
│  ✅ Lists and Tuples (Mastered: 92%)                     │
│  ✅ Dictionaries (Mastered: 88%)                         │
│  🔄 Sets (In Progress: 45%)                              │
│  ⏳ Custom Classes (Prereqs: 80% complete)               │
└──────────────────────────────────────────────────────────┘

🎯 **Current Focus: Control Flow**
📊 **Progress**: 65% complete - 2 more exercises needed
💡 **Next Recommended**: Error Handling (all prerequisites met)

Navigation: ↑↓ Navigate | Enter Select | (e)xplain | (q)uit

# User selects Error Handling
Learning Catalyst > /knowledge-map python --focus error-handling
📚 **Error Handling Deep Dive**

🎯 **Learning Objectives:**
✅ Understand exception types and hierarchy
✅ Learn try-except-else-finally patterns
✅ Master custom exception creation
✅ Practice error handling in real scenarios

📊 **Your Readiness:** 85% (Control Flow: 65%, Functions: 87%)
⏱️ **Estimated Time:** 45 minutes
🎓 **Difficulty:** Intermediate

🚀 **Start Learning?** [y]es / [n]o / [m]ore info
```

### Interactive Concept Discovery

```bash
# Automatic concept discovery from workspace
Learning Catalyst > /concepts discover --workspace ./python-tutorial/
🔍 **Analyzing Workspace for Learning Concepts...**

📁 **Scanned Files:** 24 Markdown files
📚 **Concepts Found:** 47 unique concepts
🔗 **Relationships Identified:** 63 prerequisite relationships

📊 **Discovery Summary:**
┌─ Category: Python Basics ────────────────────────────────┐
│  ✅ Variables (100% - Already Mastered)                 │
│  ✅ Data Types (95% - Review Recommended)               │
│  🔄 Operators (72% - In Progress)                       │
│  ⏳ Type Conversion (New - Ready to Learn)              │
└──────────────────────────────────────────────────────────┘

┌─ Category: Control Structures ──────────────────────────┐
│  🔄 If Statements (68% - Practice Needed)               │
│  🔄 Loops (45% - More Practice Required)                │
│  ⏳ List Comprehensions (New - Prereqs 70% met)         │
└──────────────────────────────────────────────────────────┘

💡 **AI Recommendations:**
1. **Focus on Type Conversion** - All prerequisites met, builds on current knowledge
2. **Practice If Statements** - Reinforce fundamentals before advanced topics
3. **Start List Comprehensions** - Bridge to advanced Python concepts

🎯 **Generate Learning Path?** [y]es / [c]ustomize / [s]kip
```

## 🧪 Testing Knowledge Systems

### Unit Testing Patterns

```python
# tests/unit/core/test_knowledge_graph.py
import pytest
from src.core.knowledge_graph import KnowledgeGraph, ConceptNode
from src.data.models.concept import Concept

class TestKnowledgeGraph:
    @pytest.fixture
    def sample_graph(self):
        graph = KnowledgeGraph()

        # Add sample concepts
        concepts = [
            Concept("basic-python", "Basic Python", difficulty="beginner"),
            Concept("functions", "Functions", difficulty="intermediate", prerequisites=["basic-python"]),
            Concept("decorators", "Decorators", difficulty="advanced", prerequisites=["functions"]),
        ]

        for concept in concepts:
            graph.add_concept(concept)

        return graph

    def test_learning_path_generation(self, sample_graph):
        """Test learning path generation"""
        path = sample_graph.get_learning_path("decorators")

        assert "basic-python" in path
        assert "functions" in path
        assert "decorators" in path
        assert path.index("basic-python") < path.index("functions")
        assert path.index("functions") < path.index("decorators")

    def test_ready_concepts_identification(self, sample_graph):
        """Test identification of concepts ready to learn"""

        # Mark basic concept as mastered
        sample_graph.nodes["basic-python"].mastery_level = 0.9

        ready = sample_graph.get_ready_concepts("user123")

        assert "functions" in ready
        assert "decorators" not in ready  # Prerequisites not fully met

# tests/unit/core/test_concept_builder.py
class TestConceptBuilder:
    @pytest.mark.asyncio
    async def test_header_extraction(self, temp_markdown_file):
        """Test concept extraction from Markdown headers"""

        builder = ConceptBuilder(mock_db_manager, mock_ai_service)
        concepts = builder.extract_from_headers(str(temp_markdown_file))

        assert len(concepts) > 0
        assert all(concept.title for concept in concepts)
        assert all(concept.level in [1, 2, 3, 4, 5, 6] for concept in concepts)

    @pytest.mark.asyncio
    async def test_ai_concept_extraction(self):
        """Test AI-enhanced concept extraction"""

        extractor = AIConceptExtractor(mock_ai_service)

        content = """
        # Python Programming Guide

        ## Variables and Data Types
        Python supports various data types including integers, floats, strings, and booleans.

        ## Functions and Modules
        Functions are reusable blocks of code that perform specific tasks.
        """

        concepts = await extractor.extract_concepts_with_ai(content, {})

        assert len(concepts) >= 2
        assert any("Variables" in c.title for c in concepts)
        assert any("Functions" in c.title for c in concepts)
```

### Integration Testing

```python
# tests/integration/test_knowledge_system_integration.py
class TestKnowledgeSystemIntegration:
    @pytest.mark.asyncio
    async def test_complete_workflow(self, temp_workspace, mock_ai_service):
        """Test complete knowledge system workflow"""

        # 1. Set up knowledge system
        db_manager = DatabaseManager(str(temp_workspace / "data.db"))
        concept_builder = ConceptBuilder(db_manager, mock_ai_service)
        knowledge_graph = KnowledgeGraph(db_manager)

        # 2. Extract concepts from workspace
        concepts = await concept_builder.extract_from_workspace(str(temp_workspace))
        assert len(concepts) > 0

        # 3. Build knowledge graph
        for concept in concepts:
            knowledge_graph.add_concept(concept)

        # 4. Test learning path generation
        if concepts:
            path = knowledge_graph.get_learning_path(concepts[-1].id)
            assert len(path) >= 1

        # 5. Test progress tracking
        mastery_tracker = MasteryTracker(mock_assessment_engine, knowledge_graph)

        assessment_result = {"score": 0.85, "confidence": 0.9}
        new_mastery = await mastery_tracker.update_mastery_from_assessment(
            "user123", concepts[0].id, assessment_result
        )

        assert 0.8 <= new_mastery <= 1.0
```

---

*Last updated: October 8, 2025*
*Version: 2.0.0*
*See also: [Interactive Features Guide](interactive-features.md), [Assessment Engine Guide](assessment-engine.md), [User Examples](../../examples/basic-workflows.md)*