# Interactive Features Guide

---
title: Building Rich Terminal Interfaces and Knowledge Maps
description: Guide to implementing interactive CLI features, knowledge visualization, and engaging learning experiences
version: 2.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers the implementation of interactive features that make Learning Catalyst engaging and effective. These features transform the CLI from a simple question-answer tool into a rich, interactive learning environment with visual knowledge maps, adaptive assessments, and personalized guidance.

**Perfect for**: UI/UX developers, frontend developers, interactive feature developers

**Key Features:**
- Rich terminal interface development with modern libraries
- Interactive knowledge map visualization and navigation
- Progress indicators and real-time feedback systems
- User experience patterns for CLI applications
- Practical examples with real command outputs

## 📚 Table of Contents

1. [Getting Started with Interactive Features](#getting-started-with-interactive-features)
2. [Rich Terminal Interface Basics](#rich-terminal-interface-basics)
3. [Interactive Knowledge Maps](#interactive-knowledge-maps)
4. [Progress Visualization](#progress-visualization)
5. [User Input Handling](#user-input-handling)
6. [Real-time Feedback Systems](#real-time-feedback-systems)
7. [Advanced Interactive Patterns](#advanced-interactive-patterns)
8. [Testing Interactive Features](#testing-interactive-features)

## 🚀 Getting Started with Interactive Features

### Interactive Feature Development Scenarios

**Scenario 1: Creating an Interactive Progress Bar**

```bash
# User interaction example:
Learning Catalyst > /learn python
📚 **Starting Python Learning Journey**

🎯 Loading your learning profile...
███████████████████████████████████████ 100% Complete!

✅ Ready! Found 3 concepts in progress, 2 mastered
# *Validation*: [Basic Workflows - Daily Learning](../examples/basic-workflows.md#workflow-1-daily-learning-routine)
```

**Implementation Steps:**
```python
# Step 1: Basic progress indicator
from rich.progress import Progress, SpinnerColumn, TextColumn

with Progress(
    SpinnerColumn(),
    TextColumn("[progress.description]{task.description}"),
) as progress:
    task = progress.add_task("Loading learning profile...", total=100)

    # Simulate loading
    for i in range(100):
        progress.update(task, advance=1)
        time.sleep(0.01)

# Step 2: Add to your command
class LearnCommand(BaseCommand):
    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        # Show loading progress
        await self._show_loading_progress("Loading learning profile...")

        # Continue with learning logic
        return CommandResult(success=True, data={})
# *User Experience*: Working in daily learning examples
```

**Scenario 2: Building an Interactive Menu**

```bash
# User interaction example:
Learning Catalyst > /knowledge-map
🗺️ **Interactive Knowledge Map**

? Select a topic to explore:
❯ Python Programming
  Data Structures
  Algorithms
  Web Development
  Machine Learning

[↑↓ Move] [Enter Select] [q Quit] [? Help]
# *Validation*: [Advanced Workflows - Knowledge Map](../examples/advanced.md#workflow-2-advanced-session-management)
```

**Implementation Pattern:**
```python
from rich.prompt import Prompt, IntPrompt, Confirm
from rich.console import Console

class InteractiveMenu:
    def __init__(self):
# *Working Implementation*: See KnowledgeMapCommand in src/cli/commands/learning/knowledge_map.py
        self.console = Console()

    def show_topic_selector(self, topics: List[str]) -> str:
        """Display interactive topic selection menu"""

        self.console.print("🗺️ **Interactive Knowledge Map**", style="bold blue")
        self.console.print("")

        # Create interactive selection
        choice = Prompt.ask(
            "? Select a topic to explore",
            choices=topics,
            default=topics[0],
            show_choices=True
        )

        return choice
```

### Setting Up Your Interactive Development Environment

```bash
# Install required dependencies for rich interfaces
pip install rich textual

# Test your rich terminal capabilities
python -c "
from rich.console import Console
from rich.panel import Panel
console = Console()
console.print(Panel('Hello, Rich Terminal!', title='Test'))
"

# Verify color support in your terminal
python -c "
from rich.console import Console
console = Console()
console.print('[bold red]Red[/bold red] [bold green]Green[/bold green] [bold blue]Blue[/bold blue]')
"
```

## 🎨 Rich Terminal Interface Basics

### Core Rich Library Components

**Rich Console and Formatting:**
```python
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

class RichInterface:
    def __init__(self):
        self.console = Console()

    def show_welcome_message(self, user_name: str) -> None:
        """Display formatted welcome message"""

        welcome_text = Text()
        welcome_text.append("🎓 Welcome back, ", style="bold")
        welcome_text.append(user_name, style="bold blue")
        welcome_text.append("! 🚀", style="bold")

        panel = Panel(
            welcome_text,
            title="Learning Catalyst",
            border_style="green",
            padding=(1, 2)
        )

        self.console.print(panel)
        self.console.print("")
```

**Tables for Structured Data:**
```python
from rich.table import Table

def display_progress_table(self, progress_data: List[Dict[str, Any]]) -> None:
    """Display learning progress in a formatted table"""

    table = Table(title="📊 Learning Progress", show_header=True, header_style="bold magenta")
    table.add_column("Concept", style="cyan", no_wrap=True)
    table.add_column("Status", justify="center")
    table.add_column("Progress", justify="center")
    table.add_column("Last Studied", justify="right")

    for item in progress_data:
        status = "✅" if item['completed'] else "🔄" if item['in_progress'] else "⏳"
        progress_bar = self._create_mini_progress_bar(item['progress'])

        table.add_row(
            item['concept'],
            status,
            progress_bar,
            item['last_studied']
        )

    self.console.print(table)
```

### Rich Layouts for Complex Interfaces

```python
from rich.layout import Layout
from rich.align import Align

def create_dashboard_layout(self) -> Layout:
    """Create a multi-panel dashboard layout"""

    layout = Layout()

    # Define layout structure
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="main", ratio=1),
        Layout(name="footer", size=3)
    )

    layout["main"].split_row(
        Layout(name="knowledge_map", ratio=2),
        Layout(name="progress_panel", ratio=1)
    )

    # Add content to panels
    layout["header"].update(Align.center("🎓 Learning Dashboard", style="bold blue"))
    layout["footer"].update(Align.center("[dim]Press '?' for help | 'q' to quit[/dim]"))

    return layout
```

## 🗺️ Interactive Knowledge Maps

### User Examples Reference

From `docs/examples/basic-workflows.md`, users interact with knowledge maps like this:

```
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

### Implementation Architecture

```python
# src/core/interactive_knowledge_map.py

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

class ConceptStatus(Enum):
    NOT_STARTED = "⏳"
    IN_PROGRESS = "🔄"
    MASTERED = "✅"
    LOCKED = "🔒"

@dataclass
class KnowledgeNode:
    id: str
    title: str
    status: ConceptStatus
    progress: float  # 0.0 to 1.0
    prerequisites: List[str]
    children: List[str]
    description: str
    estimated_time: str
    difficulty: str

class InteractiveKnowledgeMap:
    def __init__(self, knowledge_graph, ai_service, console: Console):
        self.knowledge_graph = knowledge_graph
        self.ai_service = ai_service
        self.console = console
        self.current_position = 0
        self.selected_nodes = []
        self.zoom_level = 0  # 0 = overview, 1 = detailed view
        self.navigation_history = []

    async def display_interactive_map(self, user_context: Dict[str, Any]) -> None:
        """Display the main interactive knowledge map interface"""
        while True:
            self._clear_screen()

            if self.zoom_level == 0:
                await self._display_overview_map(user_context)
            else:
                await self._display_detailed_node_view(user_context)

            action = await self._get_user_input()

            if action == 'quit':
                break
            elif action == 'back':
                self._navigate_back()
            elif action == 'help':
                await self._show_help()
            else:
                await self._handle_navigation_action(action, user_context)

    async def _display_overview_map(self, user_context: Dict[str, Any]) -> None:
        """Display the overview knowledge map with visual layout"""
        # Create main layout
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="main"),
            Layout(name="footer", size=3)
        )

        # Header with user context
        header_content = self._create_header_panel(user_context)
        layout["header"].update(header_content)

        # Main knowledge map area
        map_content = await self._create_knowledge_map_panel(user_context)
        layout["main"].update(map_content)

        # Footer with navigation hints
        footer_content = self._create_navigation_panel()
        layout["footer"].update(footer_content)

        self.console.print(layout)

    async def _create_knowledge_map_panel(self, user_context: Dict[str, Any]) -> Panel:
        """Create the main knowledge map visualization"""
        # Get current domain/concept area
        current_domain = user_context.get('current_domain', 'General Learning')

        # Get nodes for current view
        visible_nodes = await self._get_visible_nodes(current_domain, self.zoom_level)

        # Create ASCII art representation
        map_art = self._generate_map_ascii_art(visible_nodes, user_context)

        # Add AI recommendations if available
        ai_insights = await self._get_ai_recommendations(user_context, visible_nodes)

        content = f"{map_art}\n\n{ai_insights}"

        return Panel(
            content,
            title=f"🗺️ {current_domain} Knowledge Map",
            border_style="blue",
            padding=(1, 2)
        )

    def _generate_map_ascii_art(self, nodes: List[KnowledgeNode], user_context: Dict[str, Any]) -> str:
        """Generate ASCII art representation of knowledge map"""
        if not nodes:
            return "No knowledge nodes available for this area."

        # Sort nodes by dependencies and status
        sorted_nodes = self._sort_nodes_by_dependencies(nodes)

        # Build the ASCII map
        map_lines = ["┌─ " + user_context.get('current_domain', 'Learning Domain') + " ─" + "─" * 50 + "┐"]

        current_category = None
        for i, node in enumerate(sorted_nodes):
            # Add category separators
            if node.category != current_category:
                if current_category is not None:
                    map_lines.append("│" + " " * 58 + "│")
                current_category = node.category
                map_lines.append(f"│  {current_category}:" + " " * (45 - len(current_category)) + "│")

            # Create node line with status and progress
            status_icon = node.status.value
            progress_bar = self._create_progress_bar(node.progress)
            node_line = f"│  {status_icon} {node.title} ({progress_bar}) {node.difficulty}"

            # Add connection lines for prerequisites
            if node.prerequisites:
                prereq_text = ", ".join(node.prerequisites[:2])  # Show first 2
                if len(node.prerequisites) > 2:
                    prereq_text += f" +{len(node.prerequisites)-2}"
                node_line += f" ← {prereq_text}"

            # Truncate if too long
            if len(node_line) > 56:
                node_line = node_line[:53] + "..."

            node_line += " " * (58 - len(node_line)) + "│"
            map_lines.append(node_line)

        map_lines.append("└" + "─" * 58 + "┘")

        return "\n".join(map_lines)

    def _create_progress_bar(self, progress: float) -> str:
        """Create a visual progress bar"""
        filled = int(progress * 10)
        empty = 10 - filled
        return "█" * filled + "░" * empty

    async def _get_ai_recommendations(self, user_context: Dict[str, Any], nodes: List[KnowledgeNode]) -> str:
        """Get AI-powered recommendations for current learning state"""
        try:
            # Prepare context for AI
            learning_context = {
                'current_progress': user_context.get('overall_progress', 0),
                'recent_activity': user_context.get('recent_concepts', []),
                'weak_areas': user_context.get('weak_areas', []),
                'available_nodes': [
                    {
                        'title': node.title,
                        'status': node.status.value,
                        'progress': node.progress,
                        'prerequisites_met': all(p in user_context.get('mastered_concepts', []) for p in node.prerequisites)
                    }
                    for node in nodes
                ]
            }

            # Generate AI recommendations
            prompt = f"""
            Based on the user's learning context, provide personalized recommendations:

            Current Progress: {learning_context['current_progress']}%
            Recent Activity: {', '.join(learning_context['recent_activity'])}
            Weak Areas: {', '.join(learning_context['weak_areas'])}

            Available learning nodes with their status:
            {self._format_nodes_for_ai(learning_context['available_nodes'])}

            Provide 2-3 specific, actionable recommendations in this format:
            🎯 **Priority 1**: [Specific recommendation with rationale]
            🎯 **Priority 2**: [Specific recommendation with rationale]
            💡 **Quick Tip**: [Helpful tip for current situation]

            Keep recommendations concise and actionable.
            """

            ai_response = await self.ai_service.generate_response(prompt)

            return f"🤖 **AI Learning Coach:**\n{ai_response}"

        except Exception as e:
            return "💡 **Tip**: Focus on completing current prerequisites before advancing to more complex topics."

    async def _display_detailed_node_view(self, user_context: Dict[str, Any]) -> None:
        """Display detailed view of a specific knowledge node"""
        if not self.selected_nodes:
            return

        current_node = self.selected_nodes[-1]

        # Create detailed node panel
        detailed_content = await self._create_detailed_node_panel(current_node, user_context)

        # Create layout with node details and actions
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="node_details"),
            Layout(name="actions", size=10),
            Layout(name="footer", size=3)
        )

        layout["header"].update(Panel(f"🔍 {current_node.title}", style="bold blue"))
        layout["node_details"].update(detailed_content)
        layout["actions"].update(await self._create_action_panel(current_node, user_context))
        layout["footer"].update(self._create_navigation_panel())

        self.console.print(layout)

    async def _create_detailed_node_panel(self, node: KnowledgeNode, user_context: Dict[str, Any]) -> Panel:
        """Create detailed information panel for a knowledge node"""
        # Get node statistics
        mastery_level = await self._calculate_mastery_level(node, user_context)
        related_concepts = await self._get_related_concepts(node, user_context)

        # Create detailed content
        content = f"""
**Description**: {node.description}

**Learning Statistics**:
  • Mastery Level: {mastery_level}% {self._create_progress_bar(mastery_level/100)}
  • Estimated Time: {node.estimated_time}
  • Difficulty: {node.difficulty}
  • Status: {node.status.value}

**Prerequisites**: {', '.join(node.prerequisites) if node.prerequisites else 'None'}

**Leads To**: {', '.join(node.children) if node.children else 'Advanced topics'}

**Related Concepts**: {', '.join(related_concepts) if related_concepts else 'Explored as you learn'}
        """

        return Panel(
            content,
            title=f"📚 {node.title}",
            border_style="green",
            padding=(1, 2)
        )

    async def _create_action_panel(self, node: KnowledgeNode, user_context: Dict[str, Any]) -> Panel:
        """Create action panel for the current node"""
        actions = []

        # Learning actions based on node status
        if node.status == ConceptStatus.NOT_STARTED:
            if all(p in user_context.get('mastered_concepts', []) for p in node.prerequisites):
                actions.append("(s)tart learning - Begin with this concept")
            else:
                missing_prereqs = [p for p in node.prerequisites if p not in user_context.get('mastered_concepts', [])]
                actions.append(f"(p)rerequisites - Complete: {', '.join(missing_prereqs)}")

        elif node.status == ConceptStatus.IN_PROGRESS:
            actions.extend([
                "(c)ontinue learning - Resume where you left off",
                "(p)ractice problems - Test your understanding",
                "(e)xplain concept - Get AI-powered explanation"
            ])

        elif node.status == ConceptStatus.MASTERED:
            actions.extend([
                "(r)eview - Refresh your knowledge",
                "(a)dvanced topics - Explore related concepts",
                "(t)each others - Help others learn this"
            ])

        # General actions
        actions.extend([
            "(a)sk AI - Get personalized help",
            "(b)ack to map - Return to knowledge map"
        ])

        action_text = "\n".join(f"  • {action}" for action in actions)

        return Panel(
            action_text,
            title="🎯 Available Actions",
            border_style="yellow",
            padding=(1, 2)
        )

    def _create_navigation_panel(self) -> Panel:
        """Create navigation help panel"""
        nav_text = """
Navigation: ↑↓←→ Move | Enter: Select | (s)tart | (e)xplain | (a)sk AI | (b)ack | (q)uit | (h)elp
        """

        return Panel(
            nav_text.strip(),
            title="Navigation",
            border_style="cyan"
        )

    async def _get_user_input(self) -> str:
        """Get and process user input"""
        # In a real implementation, this would use rich's input methods
        # For now, simulate the input
        self.console.print("\n🎯 Enter action (or 'help' for options): ", style="bold green", end="")

        # This would be replaced with actual input capture
        import sys
        action = sys.stdin.readline().strip().lower()

        return action

    async def _handle_navigation_action(self, action: str, user_context: Dict[str, Any]) -> None:
        """Handle user navigation actions"""
        if action in ['s', 'start'] and self.selected_nodes:
            await self._start_learning_session(self.selected_nodes[-1], user_context)
        elif action in ['e', 'explain'] and self.selected_nodes:
            await self._explain_concept(self.selected_nodes[-1], user_context)
        elif action in ['a', 'ask ai']:
            await self._ask_ai_assistant(user_context)
        elif action in ['p', 'practice'] and self.selected_nodes:
            await self._start_practice_session(self.selected_nodes[-1], user_context)
        elif action in ['r', 'review'] and self.selected_nodes:
            await self._review_concept(self.selected_nodes[-1], user_context)
        else:
            self.console.print("❓ Unknown action. Type 'help' for available actions.", style="red")

    async def _start_learning_session(self, node: KnowledgeNode, user_context: Dict[str, Any]) -> None:
        """Start an interactive learning session for the selected node"""
        self.console.print(f"\n🚀 Starting learning session for: {node.title}", style="bold green")

        # Update node status
        node.status = ConceptStatus.IN_PROGRESS

        # Generate personalized learning content
        learning_content = await self._generate_learning_content(node, user_context)

        # Display learning content with interactive elements
        await self._display_learning_content(learning_content, node, user_context)

    async def _generate_learning_content(self, node: KnowledgeNode, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI-powered learning content for the concept"""
        try:
            prompt = f"""
            Create an interactive learning experience for: {node.title}

            User Context:
            - Current Level: {user_context.get('skill_level', 'intermediate')}
            - Known Concepts: {', '.join(user_context.get('mastered_concepts', []))}
            - Learning Style: {user_context.get('learning_style', 'visual')}

            Node Information:
            - Description: {node.description}
            - Difficulty: {node.difficulty}
            - Prerequisites: {', '.join(node.prerequisites)}

            Create content in this JSON format:
            {{
                "introduction": "Engaging introduction to the concept",
                "key_points": ["Point 1", "Point 2", "Point 3"],
                "examples": [
                    {{
                        "title": "Example 1",
                        "description": "Clear explanation",
                        "code": "code example if applicable"
                    }}
                ],
                "interactive_exercises": [
                    {{
                        "type": "multiple_choice",
                        "question": "Question text",
                        "options": ["A", "B", "C", "D"],
                        "correct": 0,
                        "explanation": "Why this is correct"
                    }}
                ],
                "next_steps": ["What to learn next"]
            }}
            """

            response = await self.ai_service.generate_response(prompt)

            # Parse JSON response (in real implementation, add proper error handling)
            import json
            content = json.loads(response)

            return content

        except Exception as e:
            # Fallback content
            return {
                "introduction": f"Let's learn about {node.title}!",
                "key_points": [f"Key concept 1 for {node.title}", f"Key concept 2 for {node.title}"],
                "examples": [{"title": "Basic Example", "description": node.description}],
                "interactive_exercises": [],
                "next_steps": node.children
            }

    async def _display_learning_content(self, content: Dict[str, Any], node: KnowledgeNode, user_context: Dict[str, Any]) -> None:
        """Display learning content with interactive elements"""
        # Introduction
        intro_panel = Panel(
            content["introduction"],
            title=f"📖 Introduction to {node.title}",
            border_style="blue"
        )
        self.console.print(intro_panel)

        # Key points
        if content["key_points"]:
            points_table = Table(title="🎯 Key Points")
            points_table.add_column("Point", style="green")
            points_table.add_column("Explanation", style="white")

            for i, point in enumerate(content["key_points"], 1):
                points_table.add_row(f"{i}.", point)

            self.console.print(points_table)

        # Examples
        for example in content.get("examples", []):
            example_panel = Panel(
                example["description"],
                title=f"💡 {example['title']}",
                border_style="yellow"
            )
            self.console.print(example_panel)

            if "code" in example:
                self.console.print(f"```python\n{example['code']}\n```", style="cyan")

        # Interactive exercises
        if content.get("interactive_exercises"):
            await self._run_interactive_exercises(content["interactive_exercises"], node, user_context)

        # Next steps
        if content.get("next_steps"):
            next_panel = Panel(
                "\n".join(f"• {step}" for step in content["next_steps"]),
                title="🚀 Next Steps",
                border_style="green"
            )
            self.console.print(next_panel)

        # Update progress
        node.progress = min(1.0, node.progress + 0.1)  # Increment progress

        input("\nPress Enter to continue...")

    async def _run_interactive_exercises(self, exercises: List[Dict[str, Any]], node: KnowledgeNode, user_context: Dict[str, Any]) -> None:
        """Run interactive exercises for the learning content"""
        for exercise in exercises:
            if exercise["type"] == "multiple_choice":
                await self._run_multiple_choice_exercise(exercise, node, user_context)

            # Add more exercise types as needed

    async def _run_multiple_choice_exercise(self, exercise: Dict[str, Any], node: KnowledgeNode, user_context: Dict[str, Any]) -> None:
        """Run a multiple choice exercise"""
        question_panel = Panel(
            exercise["question"],
            title="❓ Practice Question",
            border_style="magenta"
        )
        self.console.print(question_panel)

        # Display options
        for i, option in enumerate(exercise["options"]):
            self.console.print(f"  {chr(65+i)}. {option}")

        # Get user answer
        while True:
            self.console.print("\nYour answer (A-D): ", end="")
            answer = input().strip().upper()

            if answer in ['A', 'B', 'C', 'D']:
                break
            self.console.print("Please enter A, B, C, or D.", style="red")

        # Check answer
        correct_index = exercise["correct"]
        correct_letter = chr(65 + correct_index)

        if answer == correct_letter:
            self.console.print("✅ Correct! Great job!", style="green bold")
            node.progress = min(1.0, node.progress + 0.05)  # Small progress increase
        else:
            self.console.print(f"❌ Not quite. The correct answer is {correct_letter}.", style="red")
            self.console.print(exercise["explanation"], style="yellow")

        input("\nPress Enter to continue...")

    # Helper methods would continue here...

    def _sort_nodes_by_dependencies(self, nodes: List[KnowledgeNode]) -> List[KnowledgeNode]:
        """Sort nodes by their dependencies (prerequisites first)"""
        # Simple topological sort implementation
        sorted_nodes = []
        remaining_nodes = nodes.copy()

        while remaining_nodes:
            # Find nodes with no remaining prerequisites
            ready_nodes = [
                node for node in remaining_nodes
                if all(p not in [n.id for n in remaining_nodes] for p in node.prerequisites)
            ]

            if not ready_nodes:
                # Circular dependency - just add remaining nodes
                sorted_nodes.extend(remaining_nodes)
                break

            sorted_nodes.extend(ready_nodes)
            for node in ready_nodes:
                remaining_nodes.remove(node)

        return sorted_nodes

    def _calculate_mastery_level(self, node: KnowledgeNode, user_context: Dict[str, Any]) -> float:
        """Calculate mastery level for a node based on user data"""
        # In a real implementation, this would consider:
        # - Quiz performance
        # - Time spent learning
        # - Practice problems completed
        # - Related concept mastery

        base_progress = node.progress

        # Boost from related concepts
        related_mastery = 0
        for child_id in node.children:
            if child_id in user_context.get('mastered_concepts', []):
                related_mastery += 0.1

        return min(100.0, (base_progress + related_mastery) * 100)
```

### Usage Integration

```python
# src/cli/commands/learning/knowledge_map.py

import asyncio
from typing import Dict, Any
from src.core.interactive_knowledge_map import InteractiveKnowledgeMap
from src.cli.commands.core.command import BaseCommand, CommandResult

class KnowledgeMapCommand(BaseCommand):
    """Interactive knowledge map command"""

    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="knowledge-map",
            description="Navigate your interactive knowledge map",
            aliases=["km", "map"],
            usage="/knowledge-map [domain]",
            category="Learning"
        )

    async def execute(self, args: list, context: Dict[str, Any]) -> CommandResult:
        """Execute the knowledge map command"""
        try:
            # Initialize required services
            knowledge_graph = context.get('knowledge_graph')
            ai_service = context.get('ai_service')
            console = context.get('console')

            if not all([knowledge_graph, ai_service, console]):
                return CommandResult(
                    success=False,
                    error="Required services not available"
                )

            # Get user context
            user_context = await self._get_user_context(context)

            # Create and run interactive knowledge map
            interactive_map = InteractiveKnowledgeMap(
                knowledge_graph=knowledge_graph,
                ai_service=ai_service,
                console=console
            )

            # Set initial domain if provided
            if args:
                user_context['current_domain'] = args[0]

            # Run the interactive map
            await interactive_map.display_interactive_map(user_context)

            return CommandResult(success=True, data={"action": "knowledge_map_completed"})

        except KeyboardInterrupt:
            return CommandResult(success=True, data={"action": "user_interrupted"})
        except Exception as e:
            return CommandResult(success=False, error=str(e))

    async def _get_user_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get user context for personalized experience"""
        user_profile = context.get('user_profile', {})

        return {
            'user_id': user_profile.get('id'),
            'skill_level': user_profile.get('skill_level', 'intermediate'),
            'learning_style': user_profile.get('learning_style', 'visual'),
            'current_domain': user_profile.get('current_domain', 'General Learning'),
            'overall_progress': user_profile.get('overall_progress', 0.0),
            'recent_concepts': user_profile.get('recent_concepts', []),
            'mastered_concepts': user_profile.get('mastered_concepts', []),
            'weak_areas': user_profile.get('weak_areas', []),
            'preferences': user_profile.get('preferences', {})
        }
```

## Assessment Engine Integration

### Interactive Quiz System

```python
# src/core/interactive_assessment.py

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
import json
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, BarColumn, TextColumn
from rich.table import Table

class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    FILL_BLANK = "fill_blank"
    CODE_COMPLETION = "code_completion"
    EXPLANATION = "explanation"

@dataclass
class AssessmentQuestion:
    id: str
    type: QuestionType
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    difficulty: str
    concept_id: str
    hints: List[str] = None

class InteractiveAssessment:
    def __init__(self, assessment_engine, ai_service, console: Console):
        self.assessment_engine = assessment_engine
        self.ai_service = ai_service
        self.console = console
        self.current_session = None
        self.responses = []

    async def start_adaptive_assessment(self, concept_id: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Start an adaptive assessment session"""
        self.console.print("🎯 Starting Adaptive Assessment Session", style="bold green")

        # Initialize assessment session
        session_data = await self._initialize_session(concept_id, user_context)
        self.current_session = session_data

        # Run adaptive assessment loop
        while not session_data.get('completed', False):
            question = await self._generate_adaptive_question(session_data, user_context)

            if not question:
                break

            result = await self._present_question(question, user_context)
            self.responses.append(result)

            # Update session based on response
            await self._update_session(session_data, result, user_context)

            # Check if assessment should continue
            if await self._should_continue_assessment(session_data):
                continue
            else:
                break

        # Generate final assessment results
        results = await self._generate_assessment_results(session_data, user_context)
        await self._display_assessment_results(results)

        return results

    async def _generate_adaptive_question(self, session_data: Dict[str, Any], user_context: Dict[str, Any]) -> Optional[AssessmentQuestion]:
        """Generate the next question based on current performance"""
        try:
            # Analyze current performance
            performance_analysis = self._analyze_performance(session_data, user_context)

            # Determine question difficulty and type
            next_difficulty = self._determine_next_difficulty(performance_analysis)
            question_type = self._select_question_type(performance_analysis)

            # Generate AI-powered question
            prompt = f"""
            Generate an adaptive assessment question based on:

            Performance Analysis:
            - Correct Answers: {performance_analysis['correct_count']}/{performance_analysis['total_count']}
            - Average Response Time: {performance_analysis['avg_response_time']}s
            - Current Difficulty: {performance_analysis['current_difficulty']}
            - Weak Areas: {', '.join(performance_analysis['weak_areas'])}

            User Context:
            - Skill Level: {user_context.get('skill_level', 'intermediate')}
            - Learning Style: {user_context.get('learning_style', 'visual')}
            - Mastered Concepts: {', '.join(user_context.get('mastered_concepts', []))}

            Generate a {question_type.value} question with {next_difficulty} difficulty.

            Return in this JSON format:
            {{
                "question": "Clear, engaging question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "A",
                "explanation": "Detailed explanation of why this is correct",
                "hints": ["Hint 1", "Hint 2"],
                "estimated_time": 30
            }}

            Make the question challenging but fair, and relevant to the user's learning goals.
            """

            response = await self.ai_service.generate_response(prompt)
            question_data = json.loads(response)

            return AssessmentQuestion(
                id=f"q_{len(self.responses) + 1}",
                type=question_type,
                question=question_data["question"],
                options=question_data.get("options"),
                correct_answer=question_data["correct_answer"],
                explanation=question_data["explanation"],
                difficulty=next_difficulty,
                concept_id=session_data['concept_id'],
                hints=question_data.get("hints", [])
            )

        except Exception as e:
            self.console.print(f"❌ Error generating question: {str(e)}", style="red")
            return None

    async def _present_question(self, question: AssessmentQuestion, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Present a question to the user and collect response"""
        start_time = asyncio.get_event_loop().time()

        # Display question
        await self._display_question(question)

        # Collect user response
        user_answer = await self._collect_user_answer(question)

        # Calculate response time
        response_time = asyncio.get_event_loop().time() - start_time

        # Evaluate answer
        is_correct = self._evaluate_answer(question, user_answer)

        # Provide immediate feedback
        await self._provide_feedback(question, user_answer, is_correct, user_context)

        return {
            'question_id': question.id,
            'question_type': question.type.value,
            'user_answer': user_answer,
            'correct_answer': question.correct_answer,
            'is_correct': is_correct,
            'response_time': response_time,
            'hints_used': getattr(self, '_hints_used', 0),
            'difficulty': question.difficulty
        }

    async def _display_question(self, question: AssessmentQuestion) -> None:
        """Display the question with rich formatting"""
        # Question header with progress
        progress_text = f"Question {len(self.responses) + 1} • {question.difficulty.title()} • {question.type.value.replace('_', ' ').title()}"

        question_panel = Panel(
            question.question,
            title=progress_text,
            border_style="blue",
            padding=(1, 2)
        )
        self.console.print(question_panel)

        # Display options if applicable
        if question.type == QuestionType.MULTIPLE_CHOICE and question.options:
            options_table = Table(show_header=False, box=None)
            options_table.add_column("Choice", style="bold cyan")
            options_table.add_column("Option", style="white")

            for i, option in enumerate(question.options):
                options_table.add_row(f"{chr(65+i)}.", option)

            self.console.print(options_table)

        # Show available hints
        if question.hints:
            hint_text = f"💡 Hints available: {len(question.hints)} (type 'hint' for help)"
            self.console.print(hint_text, style="yellow")

    async def _collect_user_answer(self, question: AssessmentQuestion) -> str:
        """Collect and validate user answer"""
        self._hints_used = 0

        while True:
            if question.type == QuestionType.MULTIPLE_CHOICE:
                self.console.print("\nYour answer (A-D): ", style="bold green", end="")
                answer = input().strip().upper()

                if answer in ['A', 'B', 'C', 'D']:
                    return answer
                elif answer.lower() == 'hint' and question.hints and self._hints_used < len(question.hints):
                    hint = question.hints[self._hints_used]
                    self.console.print(f"💡 Hint: {hint}", style="yellow")
                    self._hints_used += 1
                    continue
                else:
                    self.console.print("Please enter A, B, C, or D, or 'hint' for help.", style="red")

            # Handle other question types...
            else:
                self.console.print("\nYour answer: ", style="bold green", end="")
                return input().strip()

    async def _provide_feedback(self, question: AssessmentQuestion, user_answer: str, is_correct: bool, user_context: Dict[str, Any]) -> None:
        """Provide immediate feedback on the answer"""
        if is_correct:
            feedback_text = "✅ Correct! Well done!"
            feedback_style = "bold green"
        else:
            feedback_text = f"❌ Not quite. The correct answer is: {question.correct_answer}"
            feedback_style = "bold red"

        self.console.print(feedback_text, style=feedback_style)

        # Show explanation
        explanation_panel = Panel(
            question.explanation,
            title="📚 Explanation",
            border_style="yellow",
            padding=(1, 2)
        )
        self.console.print(explanation_panel)

        # AI-powered personalized feedback
        if not is_correct:
            await self._provide_personalized_feedback(question, user_answer, user_context)

        input("\nPress Enter to continue...")

    async def _provide_personalized_feedback(self, question: AssessmentQuestion, user_answer: str, user_context: Dict[str, Any]) -> None:
        """Provide AI-powered personalized feedback"""
        try:
            prompt = f"""
            Provide personalized feedback for a student who got this question wrong:

            Question: {question.question}
            Student's Answer: {user_answer}
            Correct Answer: {question.correct_answer}

            Student Context:
            - Skill Level: {user_context.get('skill_level', 'intermediate')}
            - Recent Learning: {', '.join(user_context.get('recent_concepts', [])[-3:])}
            - Weak Areas: {', '.join(user_context.get('weak_areas', []))}

            Provide encouraging, specific feedback in 2-3 sentences that:
            1. Acknowledges their effort
            2. Identifies the misconception
            3. Suggests specific improvement
            """

            feedback = await self.ai_service.generate_response(prompt)

            feedback_panel = Panel(
                feedback,
                title="🤖 Personalized Feedback",
                border_style="cyan",
                padding=(1, 2)
            )
            self.console.print(feedback_panel)

        except Exception as e:
            # Fallback feedback
            self.console.print("💡 Keep practicing! Understanding comes with repetition.", style="cyan")
```

## Integration with Main CLI

```python
# src/cli/commands/learning/quiz.py

import asyncio
from typing import Dict, Any
from src.core.interactive_assessment import InteractiveAssessment
from src.cli.commands.core.command import BaseCommand, CommandResult

class QuizCommand(BaseCommand):
    """Interactive quiz command with adaptive assessment"""

    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="quiz",
            description="Take an adaptive quiz on any topic",
            aliases=["q", "test"],
            usage="/quiz [topic] [difficulty]",
            category="Learning"
        )

    async def execute(self, args: list, context: Dict[str, Any]) -> CommandResult:
        """Execute the quiz command"""
        try:
            # Parse arguments
            topic = args[0] if args else None
            difficulty = args[1] if len(args) > 1 else "adaptive"

            # Get user context
            user_context = await self._get_user_context(context)

            # Determine what to quiz on
            if topic:
                concept_id = await self._find_concept_by_name(topic, context)
            else:
                # Use AI to suggest quiz topic based on user context
                concept_id = await self._suggest_quiz_topic(user_context, context)

            if not concept_id:
                return CommandResult(
                    success=False,
                    error="Could not find a suitable topic for quiz"
                )

            # Initialize interactive assessment
            assessment_engine = context.get('assessment_engine')
            ai_service = context.get('ai_service')
            console = context.get('console')

            interactive_quiz = InteractiveAssessment(
                assessment_engine=assessment_engine,
                ai_service=ai_service,
                console=console
            )

            # Run adaptive assessment
            results = await interactive_quiz.start_adaptive_assessment(
                concept_id=concept_id,
                user_context=user_context
            )

            return CommandResult(success=True, data=results)

        except KeyboardInterrupt:
            return CommandResult(success=True, data={"action": "quiz_interrupted"})
        except Exception as e:
            return CommandResult(success=False, error=str(e))

    async def _suggest_quiz_topic(self, user_context: Dict[str, Any], context: Dict[str, Any]) -> Optional[str]:
        """Use AI to suggest an appropriate quiz topic"""
        try:
            ai_service = context.get('ai_service')

            prompt = f"""
            Suggest an appropriate quiz topic based on the user's learning context:

            Current Progress: {user_context.get('overall_progress', 0)}%
            Recent Learning: {', '.join(user_context.get('recent_concepts', []))}
            Weak Areas: {', '.join(user_context.get('weak_areas', []))}
            Skill Level: {user_context.get('skill_level', 'intermediate')}

            Suggest ONE specific concept that would be good for practice right now.
            Return only the concept name, no additional text.
            """

            suggestion = await ai_service.generate_response(prompt)
            return suggestion.strip()

        except Exception as e:
            return None
```

## Testing Interactive Features

```python
# tests/unit/core/test_interactive_knowledge_map.py

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from src.core.interactive_knowledge_map import InteractiveKnowledgeMap, KnowledgeNode, ConceptStatus

class TestInteractiveKnowledgeMap:
    @pytest.fixture
    def mock_knowledge_graph(self):
        return Mock()

    @pytest.fixture
    def mock_ai_service(self):
        service = AsyncMock()
        service.generate_response.return_value = "Test AI response"
        return service

    @pytest.fixture
    def mock_console(self):
        return Mock()

    @pytest.fixture
    def interactive_map(self, mock_knowledge_graph, mock_ai_service, mock_console):
        return InteractiveKnowledgeMap(
            knowledge_graph=mock_knowledge_graph,
            ai_service=mock_ai_service,
            console=mock_console
        )

    @pytest.fixture
    def sample_nodes(self):
        return [
            KnowledgeNode(
                id="basic_python",
                title="Basic Python",
                status=ConceptStatus.MASTERED,
                progress=1.0,
                prerequisites=[],
                children=["advanced_python"],
                description="Fundamental Python concepts",
                estimated_time="2 hours",
                difficulty="beginner"
            ),
            KnowledgeNode(
                id="advanced_python",
                title="Advanced Python",
                status=ConceptStatus.IN_PROGRESS,
                progress=0.6,
                prerequisites=["basic_python"],
                children=["python_optimization"],
                description="Advanced Python features",
                estimated_time="4 hours",
                difficulty="intermediate"
            )
        ]

    def test_generate_map_ascii_art(self, interactive_map, sample_nodes):
        """Test ASCII art generation for knowledge map"""
        user_context = {"current_domain": "Programming"}

        ascii_art = interactive_map._generate_map_ascii_art(sample_nodes, user_context)

        assert "Programming Knowledge Map" in ascii_art
        assert "Basic Python" in ascii_art
        assert "Advanced Python" in ascii_art
        assert "✅" in ascii_art  # Mastered status
        assert "🔄" in ascii_art  # In progress status

    def test_create_progress_bar(self, interactive_map):
        """Test progress bar creation"""
        # Test full progress
        full_bar = interactive_map._create_progress_bar(1.0)
        assert full_bar == "██████████"

        # Test half progress
        half_bar = interactive_map._create_progress_bar(0.5)
        assert half_bar == "█████░░░░░"

        # Test empty progress
        empty_bar = interactive_map._create_progress_bar(0.0)
        assert empty_bar == "░░░░░░░░░░"

    def test_sort_nodes_by_dependencies(self, interactive_map, sample_nodes):
        """Test topological sorting of nodes"""
        sorted_nodes = interactive_map._sort_nodes_by_dependencies(sample_nodes)

        # Basic Python should come before Advanced Python
        basic_index = next(i for i, node in enumerate(sorted_nodes) if node.id == "basic_python")
        advanced_index = next(i for i, node in enumerate(sorted_nodes) if node.id == "advanced_python")

        assert basic_index < advanced_index

    @pytest.mark.asyncio
    async def test_get_ai_recommendations(self, interactive_map, sample_nodes):
        """Test AI recommendation generation"""
        user_context = {
            "overall_progress": 60,
            "recent_concepts": ["basic_python"],
            "weak_areas": ["algorithms"],
            "mastered_concepts": ["basic_python"]
        }

        recommendations = await interactive_map._get_ai_recommendations(user_context, sample_nodes)

        assert "AI Learning Coach" in recommendations
        assert interactive_map.ai_service.generate_response.called

    @pytest.mark.asyncio
    async def test_generate_learning_content(self, interactive_map, sample_nodes):
        """Test learning content generation"""
        node = sample_nodes[1]  # Advanced Python
        user_context = {
            "skill_level": "intermediate",
            "mastered_concepts": ["basic_python"],
            "learning_style": "visual"
        }

        # Mock AI service to return structured content
        interactive_map.ai_service.generate_response.return_value = '''
        {
            "introduction": "Welcome to Advanced Python!",
            "key_points": ["Decorators", "Generators", "Metaclasses"],
            "examples": [{"title": "Decorator Example", "description": "Function decorators"}],
            "interactive_exercises": [],
            "next_steps": ["Python Optimization"]
        }
        '''

        content = await interactive_map._generate_learning_content(node, user_context)

        assert "introduction" in content
        assert "key_points" in content
        assert "examples" in content
        assert content["key_points"] == ["Decorators", "Generators", "Metaclasses"]
```

## Best Practices for Interactive Features

### 1. User Experience Design
- Use rich formatting and visual elements to enhance engagement
- Provide clear navigation instructions and help text
- Implement progress indicators for long-running operations
- Offer keyboard shortcuts for common actions

### 2. Performance Optimization
- Use async/await for all AI operations and I/O
- Implement caching for frequently accessed content
- Preload content when possible to reduce latency
- Use lazy loading for large knowledge maps

### 3. Error Handling
- Gracefully handle AI service failures with fallbacks
- Provide helpful error messages and recovery options
- Implement timeout handling for AI operations
- Log errors for debugging while maintaining user experience

### 4. Personalization
- Adapt difficulty based on user performance
- Track learning history and preferences
- Provide contextual recommendations
- Remember user navigation choices and progress

### 5. Testing Strategy
- Mock AI services for unit testing
- Test user interaction flows end-to-end
- Verify accessibility and usability
- Test performance with large knowledge graphs

## Guided Startup Experience

### User Onboarding System

```python
# src/core/onboarding_manager.py

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt, Confirm

class UserType(Enum):
    FIRST_TIME = "first_time"
    RETURNING = "returning"
    STANDARD = "standard"

@dataclass
class OnboardingContext:
    user_id: str
    user_type: UserType
    last_session: Optional[Dict[str, Any]]
    configuration_status: str
    learning_progress: Dict[str, Any]
    ai_provider_configured: bool

class OnboardingManager:
    """Manages user onboarding and guided startup experience"""

    def __init__(self, session_manager, config_manager, ai_service, console: Console):
        self.session_manager = session_manager
        self.config_manager = config_manager
        self.ai_service = ai_service
        self.console = console

    async def run_guided_startup(self, user_id: str) -> OnboardingContext:
        """Run the guided startup experience based on user type"""
        # Determine user type and context
        context = await self._analyze_user_context(user_id)

        # Display appropriate welcome experience
        if context.user_type == UserType.FIRST_TIME:
            await self._first_time_onboarding(context)
        elif context.user_type == UserType.RETURNING:
            await self._returning_user_welcome(context)
        else:
            await self._standard_welcome(context)

        return context

    async def _analyze_user_context(self, user_id: str) -> OnboardingContext:
        """Analyze user context to determine appropriate onboarding flow"""
        # Check if user exists
        user_exists = await self.session_manager.user_exists(user_id)

        if not user_exists:
            return OnboardingContext(
                user_id=user_id,
                user_type=UserType.FIRST_TIME,
                last_session=None,
                configuration_status="not_configured",
                learning_progress={},
                ai_provider_configured=False
            )

        # Get user session data
        last_session = await self.session_manager.get_last_session(user_id)
        config_status = await self.config_manager.get_configuration_status(user_id)

        # Determine user type
        if not last_session or not last_session.get('completed_topics'):
            user_type = UserType.RETURNING
        else:
            user_type = UserType.STANDARD

        return OnboardingContext(
            user_id=user_id,
            user_type=user_type,
            last_session=last_session,
            configuration_status=config_status,
            learning_progress=last_session.get('learning_progress', {}),
            ai_provider_configured=await self.config_manager.is_ai_configured()
        )

    async def _first_time_onboarding(self, context: OnboardingContext) -> None:
        """Guide first-time users through initial setup"""
        # Welcome message
        welcome_panel = Panel(
            "🎓 Welcome to Learning Catalyst! 🚀\n\n"
            "This appears to be your first time using Learning Catalyst. "
            "Let's get you set up with an AI provider so you can start learning!",
            title="Welcome!",
            border_style="green",
            padding=(1, 2)
        )
        self.console.print(welcome_panel)

        # Check if AI provider is configured
        if not context.ai_provider_configured:
            await self._setup_ai_provider(context)
        else:
            self.console.print("✅ AI provider already configured!", style="green")

        # Show getting started guide
        await self._show_getting_started_guide()

    async def _setup_ai_provider(self, context: OnboardingContext) -> None:
        """Interactive AI provider setup for first-time users"""
        self.console.print("\n🔧 **AI Provider Setup**", style="bold blue")

        # Provider selection
        provider_table = Table(title="Choose your AI provider")
        provider_table.add_column("Option", style="cyan")
        provider_table.add_column("Provider", style="white")
        provider_table.add_column("Models", style="dim")

        providers = [
            ("1", "openai", "GPT models (GPT-4, GPT-3.5-turbo)"),
            ("2", "deepseek", "Cost-effective models (deepseek-chat, deepseek-coder)"),
            ("3", "siliconflow", "Multiple Chinese models (Qwen2, Baichuan, ChatGLM)"),
            ("4", "chatglm", "Chinese language models (ChatGLM3, ChatGLM4)"),
            ("5", "custom", "Your own OpenAI-compatible API endpoint")
        ]

        for option, provider, models in providers:
            provider_table.add_row(option, provider, models)

        self.console.print(provider_table)

        # Get user choice
        choice = Prompt.ask("Select provider (1-5)", choices=["1", "2", "3", "4", "5"])

        # Configure selected provider
        if choice == "5":
            await self._setup_custom_provider()
        else:
            provider_name = providers[int(choice) - 1][1]
            await self._setup_standard_provider(provider_name)

    async def _setup_standard_provider(self, provider_name: str) -> None:
        """Setup standard AI provider"""
        self.console.print(f"\n🤖 **{provider_name.title()} Configuration**", style="bold blue")

        # Get API key
        api_key = Prompt.ask(f"Enter your {provider_name.title()} API key", password=True)

        # Test connection
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            task = progress.add_task("Testing API connection...", total=None)

            try:
                # Test the API connection
                test_result = await self.config_manager.test_provider(provider_name, api_key)
                progress.update(task, description="✅ Success!")

                if test_result['success']:
                    # Fetch available models
                    progress.update(task, description="Fetching available models...")
                    models = await self.config_manager.get_available_models(provider_name, api_key)

                    # Display model selection
                    await self._show_model_selection(provider_name, models, api_key)
                else:
                    self.console.print(f"❌ Failed to connect to {provider_name}: {test_result['error']}", style="red")

            except Exception as e:
                progress.update(task, description=f"❌ Error: {str(e)}")
                self.console.print(f"❌ Configuration failed: {str(e)}", style="red")

    async def _setup_custom_provider(self) -> None:
        """Setup custom AI provider"""
        self.console.print("\n🚀 **Custom Provider Configuration**", style="bold blue")

        # Get custom provider details
        provider_name = Prompt.ask("Enter provider name")
        base_url = Prompt.ask("Enter API base URL")
        api_key = Prompt.ask("Enter API key", password=True, default="")

        # Test custom provider
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            task = progress.add_task("Testing custom provider connection...", total=None)

            try:
                test_result = await self.config_manager.test_custom_provider(
                    provider_name, base_url, api_key
                )

                if test_result['success']:
                    progress.update(task, description="✅ Success!")

                    # Fetch available models
                    models = test_result.get('models', [])
                    await self._show_model_selection_for_custom(provider_name, models, base_url, api_key)
                else:
                    self.console.print(f"❌ Failed to connect to custom provider: {test_result['error']}", style="red")

            except Exception as e:
                progress.update(task, description=f"❌ Error: {str(e)}")
                self.console.print(f"❌ Configuration failed: {str(e)}", style="red")

    async def _show_model_selection(self, provider_name: str, models: List[Dict[str, Any]], api_key: str) -> None:
        """Show model selection interface"""
        self.console.print(f"\n✅ Fetching available models from {provider_name.title()}...", style="green")

        model_table = Table(title="Available models")
        model_table.add_column("Option", style="cyan")
        model_table.add_column("Model", style="white")
        model_table.add_column("Context", style="dim")
        model_table.add_column("Cost", style="yellow")

        for i, model in enumerate(models[:5], 1):  # Show first 5 models
            model_table.add_row(
                str(i),
                model['name'],
                f"{model.get('context_window', 'N/A')} context",
                f"${model.get('cost_per_1k', 'N/A')}/1K"
            )

        self.console.print(model_table)

        choice = Prompt.ask(
            "Select model (1-5) or enter custom model name",
            default="1"
        )

        if choice.isdigit() and int(choice) <= len(models):
            selected_model = models[int(choice) - 1]['name']
        else:
            selected_model = choice

        # Save configuration
        await self.config_manager.save_configuration({
            'provider': provider_name,
            'model': selected_model,
            'api_key': api_key
        })

        self.console.print(
            f"\n🎉 Configuration complete! I've set up {selected_model} as your default model.",
            style="green bold"
        )
        self.console.print("You're all ready to start learning!", style="green")

    async def _returning_user_welcome(self, context: OnboardingContext) -> None:
        """Welcome returning users with context-aware suggestions"""
        self.console.print("🎓 Welcome back to Learning Catalyst! 🚀", style="bold green")

        if context.last_session:
            last_activity = context.last_session.get('last_activity', {})
            last_concept = last_activity.get('concept', 'Unknown')
            last_date = last_activity.get('date', 'Unknown')

            # Show progress summary
            progress_panel = Panel(
                f"Great to see you again! Here's where you left off:\n\n"
                f"📚 Your Learning Progress:\n"
                f"• {context.learning_progress.get('total_concepts', 0)} concepts available for learning\n\n"
                f"🔍 Last Activity:\n"
                f"• Last accessed: {last_date}\n"
                f"• Last concept: {last_concept}",
                title="Welcome Back!",
                border_style="blue",
                padding=(1, 2)
            )
            self.console.print(progress_panel)

            # Generate AI-powered suggestions
            await self._generate_context_suggestions(context)

    async def _generate_context_suggestions(self, context: OnboardingContext) -> None:
        """Generate AI-powered suggestions based on user context"""
        try:
            suggestion_prompt = f"""
            Based on the user's learning context, provide personalized suggestions:

            Last concept studied: {context.last_session.get('last_activity', {}).get('concept', 'Unknown')}
            Progress: {context.learning_progress.get('completion_percentage', 0)}% complete
            Recent concepts: {', '.join(context.learning_progress.get('recent_concepts', []))}
            Weak areas: {', '.join(context.learning_progress.get('weak_areas', []))}

            Provide 4 specific, actionable suggestions in this format:
            1. [Action type]: [Specific suggestion] - [Brief rationale]
            2. [Action type]: [Specific suggestion] - [Brief rationale]
            3. [Action type]: [Specific suggestion] - [Brief rationale]
            4. [Action type]: [Specific suggestion] - [Brief rationale]

            Action types: Continue learning, Test knowledge, Explore new, Practice challenges, Change configuration
            """

            suggestions = await self.ai_service.generate_response(suggestion_prompt)

            suggestions_panel = Panel(
                f"💡 Suggestions:\n{suggestions}",
                title="AI-Powered Suggestions",
                border_style="yellow",
                padding=(1, 2)
            )
            self.console.print(suggestions_panel)

        except Exception as e:
            # Fallback suggestions
            fallback_suggestions = """
            💡 Suggestions for you:
            1. Continue learning: Pick up where you left off
            2. Test your knowledge: Take a quiz to reinforce learning
            3. Explore new: Discover related concepts
            4. Practice challenges: Apply what you've learned
            """

            suggestions_panel = Panel(
                fallback_suggestions,
                title="Suggestions",
                border_style="yellow",
                padding=(1, 2)
            )
            self.console.print(suggestions_panel)

    async def _standard_welcome(self, context: OnboardingContext) -> None:
        """Standard welcome for regular users"""
        self.console.print("🎓 Welcome to Learning Catalyst! 🚀", style="bold green")

        quick_actions_panel = Panel(
            "Ready to continue your learning journey?\n\n"
            "💡 Quick Actions:\n"
            "• View available concepts by asking \"what can I learn?\"\n"
            "• Get help with commands: /help\n"
            "• Check your configuration: /config",
            title="Quick Start",
            border_style="cyan",
            padding=(1, 2)
        )
        self.console.print(quick_actions_panel)

    async def _show_getting_started_guide(self) -> None:
        """Show getting started guide for first-time users"""
        guide_panel = Panel(
            "💡 Now, what would you like to learn about today?\n\n"
            "Try asking me about:\n"
            "• \"What is Python?\" - Learn programming fundamentals\n"
            "• \"Explain machine learning\" - Explore AI concepts\n"
            "• \"Teach me about web development\" - Start building websites\n"
            "• \"What can I learn?\" - See all available topics\n\n"
            "Or use commands like:\n"
            "• /help - See all available commands\n"
            "• /knowledge-map - Visualize your learning journey\n"
            "• /quiz - Test your knowledge",
            title="Getting Started",
            border_style="green",
            padding=(1, 2)
        )
        self.console.print(guide_panel)
```

## Context-Aware Suggestion System

### AI-Powered Follow-up Suggestions

```python
# src/core/suggestion_engine.py

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

class SuggestionType(Enum):
    CONTINUE_LEARNING = "continue_learning"
    TEST_KNOWLEDGE = "test_knowledge"
    EXPLORE_RELATED = "explore_related"
    PRACTICE_CHALLENGES = "practice_challenges"
    CONFIGURE_SYSTEM = "configure_system"

@dataclass
class Suggestion:
    type: SuggestionType
    title: str
    description: str
    confidence: float
    context: Dict[str, Any]

class ContextAwareSuggestionEngine:
    """Generates intelligent suggestions based on user context and interactions"""

    def __init__(self, ai_service, knowledge_graph, user_profile_manager, console: Console):
        self.ai_service = ai_service
        self.knowledge_graph = knowledge_graph
        self.user_profile_manager = user_profile_manager
        self.console = console
        self.suggestion_history = []

    async def generate_suggestions(
        self,
        user_context: Dict[str, Any],
        interaction_context: Optional[Dict[str, Any]] = None
    ) -> List[Suggestion]:
        """Generate context-aware suggestions for the user"""
        suggestions = []

        # Analyze current context
        context_analysis = await self._analyze_current_context(user_context, interaction_context)

        # Generate different types of suggestions
        suggestions.extend(await self._generate_continue_learning_suggestions(context_analysis))
        suggestions.extend(await self._generate_test_knowledge_suggestions(context_analysis))
        suggestions.extend(await self._generate_explore_related_suggestions(context_analysis))
        suggestions.extend(await self._generate_practice_suggestions(context_analysis))

        # Sort by confidence and relevance
        suggestions.sort(key=lambda x: x.confidence, reverse=True)

        # Return top suggestions
        return suggestions[:4]

    async def _analyze_current_context(
        self,
        user_context: Dict[str, Any],
        interaction_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Analyze the current context for suggestion generation"""
        analysis = {
            'current_concept': user_context.get('current_concept'),
            'recent_concepts': user_context.get('recent_concepts', []),
            'mastered_concepts': user_context.get('mastered_concepts', []),
            'weak_areas': user_context.get('weak_areas', []),
            'learning_style': user_context.get('learning_style', 'visual'),
            'skill_level': user_context.get('skill_level', 'intermediate'),
            'session_duration': user_context.get('session_duration', 0),
            'recent_performance': user_context.get('recent_performance', {}),
            'interaction_type': interaction_context.get('type') if interaction_context else None,
            'completion_status': interaction_context.get('completion_status') if interaction_context else None
        }

        return analysis

    async def _generate_continue_learning_suggestions(
        self,
        context_analysis: Dict[str, Any]
    ) -> List[Suggestion]:
        """Generate suggestions for continuing learning"""
        suggestions = []

        current_concept = context_analysis['current_concept']
        if current_concept:
            # Check if concept was just completed
            if context_analysis.get('completion_status') == 'completed':
                # Suggest next logical concept
                next_concepts = await self.knowledge_graph.get_next_concepts(
                    current_concept,
                    context_analysis['mastered_concepts']
                )

                if next_concepts:
                    suggestions.append(Suggestion(
                        type=SuggestionType.CONTINUE_LEARNING,
                        title=f"Continue with {next_concepts[0]}",
                        description=f"Build on what you just learned by exploring {next_concepts[0]}",
                        confidence=0.9,
                        context={'next_concept': next_concepts[0]}
                    ))

            # Check if concept is in progress
            elif context_analysis.get('completion_status') == 'in_progress':
                suggestions.append(Suggestion(
                    type=SuggestionType.CONTINUE_LEARNING,
                    title=f"Continue learning {current_concept}",
                    description=f"Pick up where you left off with {current_concept}",
                    confidence=0.8,
                    context={'continue_concept': current_concept}
                ))

        return suggestions

    async def _generate_test_knowledge_suggestions(
        self,
        context_analysis: Dict[str, Any]
    ) -> List[Suggestion]:
        """Generate suggestions for testing knowledge"""
        suggestions = []

        # Suggest quiz on recently completed concepts
        recent_concepts = context_analysis['recent_concepts'][-3:]  # Last 3 concepts
        if recent_concepts:
            test_concept = recent_concepts[-1]  # Most recent
            suggestions.append(Suggestion(
                type=SuggestionType.TEST_KNOWLEDGE,
                title=f"Test your understanding of {test_concept}",
                description=f"Take a quick quiz to reinforce your learning of {test_concept}",
                confidence=0.75,
                context={'test_concept': test_concept}
            ))

        # Suggest quiz on weak areas
        weak_areas = context_analysis['weak_areas']
        if weak_areas:
            weak_area = weak_areas[0]  # Most problematic area
            suggestions.append(Suggestion(
                type=SuggestionType.TEST_KNOWLEDGE,
                title=f"Practice {weak_area} fundamentals",
                description=f"Strengthen your understanding of {weak_area} with targeted practice",
                confidence=0.7,
                context={'test_concept': weak_area}
            ))

        return suggestions

    async def _generate_explore_related_suggestions(
        self,
        context_analysis: Dict[str, Any]
    ) -> List[Suggestion]:
        """Generate suggestions for exploring related concepts"""
        suggestions = []

        current_concept = context_analysis['current_concept']
        if current_concept:
            # Get related concepts
            related_concepts = await self.knowledge_graph.get_related_concepts(
                current_concept,
                max_depth=2,
                exclude_mastered=context_analysis['mastered_concepts']
            )

            if related_concepts:
                related_concept = related_concepts[0]
                suggestions.append(Suggestion(
                    type=SuggestionType.EXPLORE_RELATED,
                    title=f"Explore {related_concept}",
                    description=f"Discover how {related_concept} connects to what you're learning",
                    confidence=0.6,
                    context={'explore_concept': related_concept}
                ))

        return suggestions

    async def _generate_practice_suggestions(
        self,
        context_analysis: Dict[str, Any]
    ) -> List[Suggestion]:
        """Generate suggestions for practice challenges"""
        suggestions = []

        # Suggest practice for concepts that need reinforcement
        if context_analysis['recent_performance'].get('accuracy', 1.0) < 0.8:
            current_concept = context_analysis['current_concept']
            if current_concept:
                suggestions.append(Suggestion(
                    type=SuggestionType.PRACTICE_CHALLENGES,
                    title=f"Practice {current_concept} challenges",
                    description=f"Apply your knowledge with hands-on {current_concept} exercises",
                    confidence=0.65,
                    context={'practice_concept': current_concept}
                ))

        return suggestions

    async def display_suggestions(
        self,
        suggestions: List[Suggestion],
        context: Dict[str, Any]
    ) -> None:
        """Display suggestions to the user in an interactive format"""
        if not suggestions:
            return

        # Create suggestion panel
        suggestion_text = "💡 **AI-Powered Follow-up Suggestions:**\n\n"

        for i, suggestion in enumerate(suggestions, 1):
            suggestion_text += f"{i}. **{suggestion.title}**\n"
            suggestion_text += f"   {suggestion.description}\n\n"

        suggestion_text += "💡 **You can:**\n"
        suggestion_text += "• Say 'yes' to accept the first suggestion\n"
        suggestion_text += "• Choose a number (1-4) for specific suggestions\n"
        suggestion_text += "• Say 'no thanks' to skip suggestions\n"
        suggestion_text += "• Ask 'tell me more about [suggestion]' for details"

        suggestion_panel = Panel(
            suggestion_text,
            title="Personalized Suggestions",
            border_style="cyan",
            padding=(1, 2)
        )
        self.console.print(suggestion_panel)

    async def handle_suggestion_response(
        self,
        response: str,
        suggestions: List[Suggestion],
        user_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Handle user response to suggestions"""
        response = response.strip().lower()

        # Handle positive responses
        if response in ['yes', 'y', 'sure', 'okay']:
            if suggestions:
                selected_suggestion = suggestions[0]
                return await self._execute_suggestion(selected_suggestion, user_context)

        # Handle numbered selection
        elif response.isdigit():
            selection = int(response)
            if 1 <= selection <= len(suggestions):
                selected_suggestion = suggestions[selection - 1]
                return await self._execute_suggestion(selected_suggestion, user_context)

        # Handle "tell me more" responses
        elif response.startswith('tell me more'):
            concept = response.replace('tell me more about', '').strip()
            if concept:
                for suggestion in suggestions:
                    if concept.lower() in suggestion.title.lower():
                        return await self._provide_suggestion_details(suggestion, user_context)

        # Handle negative responses
        elif response in ['no', 'no thanks', 'skip']:
            return {'action': 'skip_suggestions'}

        return None

    async def _execute_suggestion(
        self,
        suggestion: Suggestion,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute the selected suggestion"""
        if suggestion.type == SuggestionType.CONTINUE_LEARNING:
            next_concept = suggestion.context.get('next_concept') or suggestion.context.get('continue_concept')
            if next_concept:
                return {
                    'action': 'start_learning',
                    'concept': next_concept,
                    'context': 'continuation'
                }

        elif suggestion.type == SuggestionType.TEST_KNOWLEDGE:
            test_concept = suggestion.context.get('test_concept')
            if test_concept:
                return {
                    'action': 'start_quiz',
                    'concept': test_concept,
                    'difficulty': 'adaptive'
                }

        elif suggestion.type == SuggestionType.EXPLORE_RELATED:
            explore_concept = suggestion.context.get('explore_concept')
            if explore_concept:
                return {
                    'action': 'explain_concept',
                    'concept': explore_concept,
                    'context': 'exploration'
                }

        elif suggestion.type == SuggestionType.PRACTICE_CHALLENGES:
            practice_concept = suggestion.context.get('practice_concept')
            if practice_concept:
                return {
                    'action': 'practice_exercises',
                    'concept': practice_concept,
                    'difficulty': 'intermediate'
                }

        return {'action': 'unknown'}

    async def _provide_suggestion_details(
        self,
        suggestion: Suggestion,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Provide more details about a suggestion"""
        try:
            details_prompt = f"""
            Provide more details about this learning suggestion:

            Suggestion: {suggestion.title}
            Description: {suggestion.description}
            User Context: {user_context.get('current_concept', 'General learning')}
            Skill Level: {user_context.get('skill_level', 'intermediate')}

            Explain what this suggestion involves and why it's beneficial for the user's learning journey.
            Keep it concise (2-3 sentences) and encouraging.
            """

            details = await self.ai_service.generate_response(details_prompt)

            return {
                'action': 'show_details',
                'suggestion': suggestion,
                'details': details
            }

        except Exception as e:
            return {
                'action': 'show_details',
                'suggestion': suggestion,
                'details': f"This suggestion helps you {suggestion.description.lower()}"
            }
```

## Enhanced Session Management

### Persistent Learning Sessions

```python
# src/core/session_manager.py

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import asyncio
from pathlib import Path

@dataclass
class LearningSession:
    id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime]
    concepts_explored: List[str]
    concepts_completed: List[str]
    quizzes_taken: List[Dict[str, Any]]
    interactions: List[Dict[str, Any]]
    learning_progress: Dict[str, Any]
    session_state: Dict[str, Any]

@dataclass
class SessionMetrics:
    total_time: timedelta
    concepts_count: int
    completion_rate: float
    quiz_accuracy: float
    engagement_score: float

class SessionManager:
    """Manages persistent learning sessions with context tracking"""

    def __init__(self, storage_path: str = "data/sessions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.active_sessions = {}

    async def create_session(self, user_id: str) -> str:
        """Create a new learning session"""
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"

        session = LearningSession(
            id=session_id,
            user_id=user_id,
            start_time=datetime.now(),
            end_time=None,
            concepts_explored=[],
            concepts_completed=[],
            quizzes_taken=[],
            interactions=[],
            learning_progress={},
            session_state={}
        )

        self.active_sessions[session_id] = session
        await self._save_session(session)

        return session_id

    async def get_active_session(self, user_id: str) -> Optional[LearningSession]:
        """Get the current active session for a user"""
        user_sessions = [
            session for session in self.active_sessions.values()
            if session.user_id == user_id and session.end_time is None
        ]

        return user_sessions[0] if user_sessions else None

    async def update_session(
        self,
        session_id: str,
        interaction_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Update session with new interaction data"""
        if session_id not in self.active_sessions:
            return

        session = self.active_sessions[session_id]

        # Add interaction
        interaction = {
            'timestamp': datetime.now().isoformat(),
            'type': interaction_type,
            'data': data
        }
        session.interactions.append(interaction)

        # Update concepts
        if interaction_type == 'concept_explored':
            concept = data.get('concept')
            if concept and concept not in session.concepts_explored:
                session.concepts_explored.append(concept)

        elif interaction_type == 'concept_completed':
            concept = data.get('concept')
            if concept and concept not in session.concepts_completed:
                session.concepts_completed.append(concept)

        elif interaction_type == 'quiz_completed':
            session.quizzes_taken.append(data)

        # Update learning progress
        await self._update_learning_progress(session, interaction_type, data)

        # Save session
        await self._save_session(session)

    async def end_session(self, session_id: str) -> SessionMetrics:
        """End a session and calculate metrics"""
        if session_id not in self.active_sessions:
            return SessionMetrics(timedelta(0), 0, 0.0, 0.0, 0.0)

        session = self.active_sessions[session_id]
        session.end_time = datetime.now()

        # Calculate metrics
        metrics = await self._calculate_session_metrics(session)

        # Save final session state
        await self._save_session(session)

        # Remove from active sessions
        del self.active_sessions[session_id]

        return metrics

    async def get_user_history(
        self,
        user_id: str,
        days: int = 30
    ) -> List[LearningSession]:
        """Get user's session history"""
        cutoff_date = datetime.now() - timedelta(days=days)
        user_sessions = []

        # Load sessions from storage
        session_files = list(self.storage_path.glob(f"{user_id}_session_*.json"))

        for file_path in session_files:
            try:
                session_data = json.loads(file_path.read_text())
                session = self._deserialize_session(session_data)

                if session.start_time >= cutoff_date:
                    user_sessions.append(session)

            except Exception as e:
                print(f"Error loading session {file_path}: {e}")

        # Sort by start time
        user_sessions.sort(key=lambda x: x.start_time, reverse=True)
        return user_sessions

    async def _update_learning_progress(
        self,
        session: LearningSession,
        interaction_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Update learning progress based on interaction"""
        progress = session.learning_progress

        if interaction_type == 'concept_completed':
            concept = data.get('concept')
            if concept:
                if 'completed_concepts' not in progress:
                    progress['completed_concepts'] = []
                if concept not in progress['completed_concepts']:
                    progress['completed_concepts'].append(concept)

        elif interaction_type == 'quiz_completed':
            accuracy = data.get('accuracy', 0.0)
            if 'quiz_scores' not in progress:
                progress['quiz_scores'] = []
            progress['quiz_scores'].append(accuracy)

        # Update completion percentage
        total_concepts = len(session.concepts_explored)
        completed_concepts = len(session.concepts_completed)
        if total_concepts > 0:
            progress['completion_percentage'] = (completed_concepts / total_concepts) * 100

        # Calculate average quiz accuracy
        if 'quiz_scores' in progress and progress['quiz_scores']:
            progress['average_quiz_accuracy'] = sum(progress['quiz_scores']) / len(progress['quiz_scores'])

    async def _calculate_session_metrics(self, session: LearningSession) -> SessionMetrics:
        """Calculate session metrics"""
        total_time = session.end_time - session.start_time if session.end_time else datetime.now() - session.start_time

        concepts_count = len(session.concepts_explored)
        completion_rate = (len(session.concepts_completed) / concepts_count * 100) if concepts_count > 0 else 0

        # Calculate quiz accuracy
        quiz_accuracy = 0.0
        if session.quizzes_taken:
            total_accuracy = sum(q.get('accuracy', 0) for q in session.quizzes_taken)
            quiz_accuracy = total_accuracy / len(session.quizzes_taken)

        # Calculate engagement score
        engagement_score = await self._calculate_engagement_score(session)

        return SessionMetrics(
            total_time=total_time,
            concepts_count=concepts_count,
            completion_rate=completion_rate,
            quiz_accuracy=quiz_accuracy,
            engagement_score=engagement_score
        )

    async def _calculate_engagement_score(self, session: LearningSession) -> float:
        """Calculate engagement score based on interaction patterns"""
        score = 0.0

        # Base score for having interactions
        if session.interactions:
            score += 0.2

        # Concept exploration score
        if session.concepts_explored:
            score += min(0.3, len(session.concepts_explored) * 0.1)

        # Completion score
        if session.concepts_completed:
            completion_ratio = len(session.concepts_completed) / len(session.concepts_explored) if session.concepts_explored else 0
            score += completion_ratio * 0.3

        # Quiz participation score
        if session.quizzes_taken:
            score += min(0.2, len(session.quizzes_taken) * 0.05)

        return min(score, 1.0)

    async def _save_session(self, session: LearningSession) -> None:
        """Save session to storage"""
        session_file = self.storage_path / f"{session.user_id}_{session.id}.json"

        session_data = asdict(session)
        # Convert datetime objects to strings for JSON serialization
        session_data['start_time'] = session.start_time.isoformat()
        if session.end_time:
            session_data['end_time'] = session.end_time.isoformat()

        session_file.write_text(json.dumps(session_data, indent=2))

    def _deserialize_session(self, session_data: Dict[str, Any]) -> LearningSession:
        """Deserialize session data from JSON"""
        # Convert string timestamps back to datetime objects
        session_data['start_time'] = datetime.fromisoformat(session_data['start_time'])
        if session_data.get('end_time'):
            session_data['end_time'] = datetime.fromisoformat(session_data['end_time'])

        return LearningSession(**session_data)
```

This enhanced Interactive Features Guide now includes the missing patterns from the examples directory:

1. **Guided Startup Experience** - Complete onboarding system for first-time and returning users
2. **Context-Aware Suggestion System** - AI-powered follow-up suggestions based on user context
3. **Enhanced Session Management** - Persistent learning sessions with comprehensive tracking
4. **Interactive Provider Setup** - Rich configuration interfaces for AI providers

These additions complete the Interactive Features Guide with all the user-facing interactive patterns shown in the examples directory.

This implementation guide provides the foundation for creating rich, interactive learning experiences that engage users and adapt to their individual learning needs. The combination of visual knowledge maps, adaptive assessments, guided onboarding, and AI-powered personalization creates a comprehensive learning environment that goes far beyond traditional CLI applications.