# Learning Catalyst Implementation Guide

This guide provides detailed implementation instructions for developers working on the Learning Catalyst project. It covers the core components, system commands, and architectural patterns used throughout the application.

## Table of Contents
1. [Project Structure](#project-structure)
2. [System Commands Implementation](#system-commands-implementation)
3. [Command Palette Implementation](#command-palette-implementation)
4. [Autocomplete Engine Implementation](#autocomplete-engine-implementation)
5. [Challenge Engine Implementation](#challenge-engine-implementation)
6. [Concept Building System Implementation](#concept-building-system-implementation)
7. [Testing Guidelines](#testing-guidelines)

## Project Structure Overview

The Learning Catalyst follows a modular architecture with clearly defined components, aligned with the requirements and architecture documents:

```
src/
├── __init__.py
├── cli/                    # Command-line interface components
│   ├── __init__.py
│   ├── main.py             # CLI entry point and core logic
│   ├── interface.py        # CLI interface implementation
│   ├── command_palette.py  # Command Palette for slash commands
│   ├── autocomplete.py     # Autocomplete suggestions for commands
│   ├── system_commands_handler.py  # System commands handler
│   └── commands/           # Individual command implementations
│       ├── __init__.py
│       ├── models.py
│       ├── tokens.py
│       ├── knowledge_map.py
│       ├── preference.py
│       ├── start_learning.py
│       ├── checkpoint.py
│       ├── concepts.py
│       ├── config.py
│       ├── help.py
│       ├── quit.py
│       └── reset.py
├── core/                   # Core application logic
│   ├── __init__.py
│   ├── catalyst_agent.py   # AI interaction and intent processing (CONV-R1)
│   ├── challenge_engine.py # Question generation and evaluation
│   ├── state_manager.py    # Application state persistence (STATE-R1, STATE-R2)
│   ├── knowledge_navigator.py # Knowledge Navigator for content indexing
│   ├── system_commands_handler.py  # System commands business logic
│   ├── assessment_engine.py # Assessment Engine for competency evaluation (ANALY-R3)
│   ├── basic_assessment_engine.py # Basic implementation of assessment engine
│   ├── analytics_dashboard.py # Analytics Dashboard for displaying progress (ANALY-R2)
│   ├── basic_analytics_dashboard.py # Basic implementation of analytics dashboard
│   ├── token_usage_analytics.py # Analytics for token usage tracking
│   ├── trend_analyzer.py   # Trend analysis for learning progress
│   └── weak_area_identifier.py # Weak area identification for learning gaps
├── data/                   # Data access layer
│   ├── __init__.py
│   ├── database_manager.py # SQLite database operations
│   ├── vector_storage.py   # Vector database operations (Phase 3+)
│   └── models/             # Data models
│       ├── __init__.py
│       ├── concept.py      # Concept data model
│       ├── challenge.py    # Challenge data model
│       └── user_profile.py # User profile data model
├── ai/                     # AI abstraction layer
│   ├── __init__.py
│   ├── abstraction.py      # Model abstraction interfaces
│   ├── service.py          # Model abstraction service implementation
│   └── providers/          # Individual AI provider implementations
│       ├── __init__.py
│       ├── openai_provider.py
│       ├── anthropic_provider.py
│       ├── chatglm_provider.py
│       ├── siliconflow_provider.py
│       ├── deepseek_provider.py
│       └── local_provider.py
└── utils/                  # Utility functions
    ├── __init__.py
    ├── preferences_manager.py # Preferences management (replaces config_manager.py)
    ├── workspace_manager.py # Workspace management
    ├── markdown_parser.py  # Markdown parsing utilities
    └── common.py
```

## IMPLEMENTATION STATUS & EXAMPLES

### ✅ Fully Implemented Features

**Multi-Provider AI Integration**: Complete abstraction layer supporting OpenAI, Anthropic, ChatGLM, and local models with provider switching and fallback handling.

**Command Palette System**: Interactive command discovery, autocomplete, and execution with rich help system and contextual suggestions.

**Configuration Management**: Comprehensive preferences system with JSON-based configuration and runtime updates.

**Basic Concept Extraction**: Markdown parsing with header-based concept extraction and metadata generation.

### 🔄 Currently Implementing (Based on User Examples)

**Interactive Knowledge Maps**: Visual navigation of learning concepts with progress tracking and AI-powered recommendations. See [Interactive Features Guide](interactive-features.md).

**AI-Powered Assessments**: Adaptive quiz generation with personalized difficulty adjustment and comprehensive feedback. See [Assessment Engine Guide](assessment-engine.md).

**Context-Aware Learning**: Integration with local Markdown files for grounded AI responses and personalized content recommendations.

**Progress Analytics**: Real-time dashboards showing learning progress, skill assessment, and improvement areas.

### ⏳ Implementation Roadmap

**Guided Startup Experience**: Dynamic welcome messages with personalized learning suggestions based on user history and local content analysis.

**Collaborative Learning**: Study groups, peer mentoring, and shared knowledge spaces with real-time collaboration.

**Advanced Knowledge Graph**: Semantic relationship detection, adaptive learning paths, and intelligent content recommendations.

## CURRENT IMPLEMENTATION GAPS

The following features shown in `docs/examples/` require implementation:

1. **Interactive Knowledge Map Visualization**: Examples show rich ASCII art knowledge maps with navigation, progress indicators, and AI recommendations. Current implementation has basic concept extraction but no visual navigation.

2. **AI-Powered Assessment Engine**: Examples demonstrate adaptive quizzes, personalized learning paths, and comprehensive skill assessment. Current implementation has basic challenge generation but no adaptive features.

3. **Context-Aware AI Responses**: Examples show AI mentorship based on user's learning history and local content. Current implementation lacks context optimization and personalization.

4. **Real-time Progress Analytics**: Examples display comprehensive dashboards with skill gaps, improvement areas, and AI coaching. Current implementation has basic token tracking only.

5. **Collaborative Learning Features**: Examples show study groups, peer tutoring, and shared knowledge spaces. No collaborative features currently implemented.

## System Commands Implementation

This section provides implementation details for the core system commands in Learning Catalyst, aligned with the requirements document (CONV-R1, CONF-R1, STATE-R3, ANALY-R1).

### Core Commands

#### `/models` Command

The `/models` command allows users to view and select available AI models (CONF-R1).

```python
@app.command()
def models():
    """List available AI models and select a model."""
    # Get available models from the configuration manager
    available_models = config_manager.get_available_models()
    
    # Display models to the user
    console.print("Available AI Models:", style="bold green")
    for i, model in enumerate(available_models):
        console.print(f"{i+1}. {model}")
    
    # Prompt user for selection
    try:
        selection = int(input("Select a model (enter number): ")) - 1
        if 0 <= selection < len(available_models):
            config_manager.set_active_model(available_models[selection])
            console.print(f"Model changed to: {available_models[selection]}", style="bold blue")
        else:
            console.print("Invalid selection", style="bold red")
    except ValueError:
        console.print("Please enter a valid number", style="bold red")
```

#### `/provider` Command

The `/provider` command allows users to switch between different AI service providers (CONF-R1).

```python
@app.command()
def provider():
    """List available AI providers and select a provider."""
    # Get available providers from the configuration manager
    available_providers = config_manager.get_available_providers()
    
    # Display providers to the user
    console.print("Available AI Providers:", style="bold green")
    for i, provider in enumerate(available_providers):
        console.print(f"{i+1}. {provider}")
    
    # Prompt user for selection
    try:
        selection = int(input("Select a provider (enter number): ")) - 1
        if 0 <= selection < len(available_providers):
            config_manager.set_active_provider(available_providers[selection])
            console.print(f"Provider changed to: {available_providers[selection]}", style="bold blue")
        else:
            console.print("Invalid selection", style="bold red")
    except ValueError:
        console.print("Please enter a valid number", style="bold red")
```

#### `/checkpoint` Command

The `/checkpoint` command allows users to manually save their current session state (STATE-R3).

```python
@app.command()
def checkpoint(name: str = None):
    """Create a manual checkpoint of the current session state."""
    # Generate a default name if not provided
    if name is None:
        name = f"checkpoint_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Create the checkpoint using the state manager
    success = state_manager.create_checkpoint(name)
    
    if success:
        console.print(f"Session checkpoint created: {name}", style="bold blue")
    else:
        console.print("Failed to create checkpoint", style="bold red")
```

#### `/tokens` Command

The `/tokens` command displays token usage statistics for the current session (ANALY-R1).

```python
@app.command()
def tokens():
    """Display token usage statistics for the current session."""
    # Get token statistics from the analytics engine
    token_stats = analytics_engine.get_token_statistics()
    
    # Display the statistics to the user
    console.print("Token Usage Statistics:", style="bold green")
    console.print(f"Total tokens used: {token_stats.total}")
    console.print(f"Prompt tokens: {token_stats.prompt}")
    console.print(f"Completion tokens: {token_stats.completion}")
    console.print(f"Token cost estimate: ${token_stats.estimated_cost:.4f}")
```

#### `/knowledge-map` Command

The `/knowledge-map` command displays the knowledge graph for the current learning session (KNOW-R3).

```python
@app.command()
def knowledge_map():
    """Display the knowledge map of concepts."""
    # Get concepts from the knowledge graph
    concepts = knowledge_graph.get_all_concepts()
    
    # Display the concepts in a hierarchical manner
    console.print("Knowledge Map:", style="bold green")
    
    # Group concepts by category
    concepts_by_category = {}
    for concept in concepts:
        if concept.category not in concepts_by_category:
            concepts_by_category[concept.category] = []
        concepts_by_category[concept.category].append(concept)
    
    # Print concepts grouped by category
    for category, category_concepts in concepts_by_category.items():
        console.print(f"\n{category}:", style="bold blue")
        for concept in category_concepts:
            console.print(f"  - {concept.name}")
```

### Example: Tokens Command Implementation

The `/tokens` command demonstrates how to handle both summary and detailed views:

```python
# src/cli/commands/tokens.py

import typer
from typing import Optional
import asyncio
from rich.console import Console
from rich.table import Table

from src.core.system_commands_handler import SystemCommandsHandlerImpl
from src.data.database import DatabaseManager
from src.ai.model_abstraction import ModelAbstractionService
from src.core.config_manager import PreferencesManager

app = typer.Typer()
console = Console()

@app.command()
def tokens(model_name: Optional[str] = typer.Argument(None)):
    """Display token usage statistics"""
    # Initialize required services
    db_manager = DatabaseManager()
    model_service = ModelAbstractionService(db_manager)
    preferences_manager = PreferencesManager()
    system_handler = SystemCommandsHandlerImpl(
        db_manager, model_service, preferences_manager
    )
    
    if model_name:
        # Show detailed usage for specific model
        detailed_usage = asyncio.run(
            system_handler.get_detailed_token_usage(model_name)
        )
        
        if not detailed_usage:
            console.print(f"[yellow]No token usage data found for model: {model_name}[/yellow]")
            return
            
        table = Table(
            title=f"📊 Detailed Token Usage for {model_name}",
            show_header=True,
            header_style="bold magenta"
        )
        table.add_column("Timestamp", style="cyan")
        table.add_column("Input Tokens", style="green", justify="right")
        table.add_column("Output Tokens", style="blue", justify="right")
        table.add_column("Context", style="white")
        
        for record in detailed_usage:
            table.add_row(
                record["timestamp"],
                str(record["input_tokens"]),
                str(record["output_tokens"]),
                record["context"]
            )
            
        console.print(table)
    else:
        # Show summary usage
        summary = asyncio.run(system_handler.get_token_usage())
        
        console.print("📊 Token Usage Summary:")
        console.print(f"  Total Tokens (Last 30 days): {summary['total_tokens']}")
        console.print(f"  Input Tokens: {summary['input_tokens']}")
        console.print(f"  Output Tokens: {summary['output_tokens']}")
```

### Example: Knowledge Map Command Implementation

The `/knowledge-map` command shows how to visualize relationships:

```python
# src/cli/commands/knowledge_map.py

import typer
import asyncio
from rich.console import Console

from src.core.system_commands_handler import SystemCommandsHandlerImpl
from src.data.database import DatabaseManager
from src.ai.model_abstraction import ModelAbstractionService
from src.core.config_manager import PreferencesManager

app = typer.Typer()
console = Console()

@app.command("knowledge-map")
def knowledge_map():
    """Display the knowledge structure"""
    # Initialize required services
    db_manager = DatabaseManager()
    model_service = ModelAbstractionService(db_manager)
    preferences_manager = PreferencesManager()
    system_handler = SystemCommandsHandlerImpl(
        db_manager, model_service, preferences_manager
    )
    
    # Get knowledge map data
    knowledge_data = asyncio.run(system_handler.get_knowledge_map())
    
    # Display concepts
    console.print("🗺️  Knowledge Map:", style="bold blue")
    console.print("  Concepts:", style="bold cyan")
    
    for concept in knowledge_data["concepts"]:
        console.print(f"    • {concept['title']} (ID: {concept['id']})")
    
    # Display relationships
    if knowledge_data["relationships"]:
        console.print("  Relationships:", style="bold cyan")
        for relationship in knowledge_data["relationships"]:
            console.print(
                f"    {relationship['source']} → {relationship['target']}",
                style="magenta"
            )
```

### Example: Preference Command Implementation

The `/preference` command demonstrates argument parsing and JSON handling:

```python
# src/cli/commands/preference.py

import typer
import json
from typing import Optional
import asyncio
from rich.console import Console
from rich.panel import Panel

from src.core.system_commands_handler import SystemCommandsHandlerImpl
from src.data.database import DatabaseManager
from src.ai.model_abstraction import ModelAbstractionService
from src.core.config_manager import PreferencesManager

app = typer.Typer()
console = Console()

def _parse_value(value_str: str):
    """Parse string value to appropriate type"""
    # Try to parse as JSON
    try:
        return json.loads(value_str)
    except json.JSONDecodeError:
        pass
    
    # Try to parse as number
    try:
        if '.' in value_str:
            return float(value_str)
        else:
            return int(value_str)
    except ValueError:
        pass
    
    # Try to parse as boolean
    if value_str.lower() in ('true', 'false'):
        return value_str.lower() == 'true'
    
    # Return as string
    return value_str

@app.command()
def preference(
    action: str = typer.Argument(..., help="Action to perform: 'list' or 'set'"),
    key: Optional[str] = typer.Argument(None, help="Preference key for 'set' action"),
    value: Optional[str] = typer.Argument(None, help="Preference value for 'set' action")
):
    """Manage application preferences"""
    # Initialize required services
    db_manager = DatabaseManager()
    model_service = ModelAbstractionService(db_manager)
    preferences_manager = PreferencesManager()
    system_handler = SystemCommandsHandlerImpl(
        db_manager, model_service, preferences_manager
    )
    
    if action == "list":
        # List all preferences
        prefs = asyncio.run(system_handler.list_preferences())
        console.print(Panel(json.dumps(prefs, indent=2), title="📋 Current Preferences"))
    elif action == "set":
        if not key or not value:
            console.print("[red]Both key and value are required for 'set' action[/red]")
            raise typer.Exit(code=1)
        
        # Parse the value and set preference
        parsed_value = _parse_value(value)
        success = asyncio.run(system_handler.set_preference(key, parsed_value))
        
        if success:
            console.print(f"✅ Preference {key} set to {value}")
        else:
            console.print(f"[red]Failed to set preference {key}[/red]")
    else:
        console.print(f"[red]Invalid action: {action}. Use 'list' or 'set'.[/red]")
        raise typer.Exit(code=1)
```

## Command Palette Implementation

The Command Palette provides a centralized interface for accessing all application features through slash commands.

### Core Implementation

The CommandPalette class handles command registration, parsing, and execution:

```python
# src/cli/command_palette.py

from typing import Dict, List, Callable, Optional, Tuple
import re

class CommandInfo:
    def __init__(self, name: str, description: str, handler: Callable, aliases: List[str] = None):
        self.name = name
        self.description = description
        self.handler = handler
        self.aliases = aliases or []

class CommandPalette:
    def __init__(self):
        self.commands: Dict[str, CommandInfo] = {}
        self.aliases: Dict[str, str] = {}  # alias -> command_name mapping
    
    def register_command(self, name: str, description: str, handler: Callable, aliases: List[str] = None):
        """Register a new command with the palette"""
        command_info = CommandInfo(name, description, handler, aliases or [])
        self.commands[name] = command_info
        
        # Register aliases
        for alias in command_info.aliases:
            self.aliases[alias] = name
    
    def parse_command(self, input_text: str) -> Tuple[Optional[str], str]:
        """Parse input text to extract command name and arguments"""
        if not input_text.startswith('/'):
            return None, input_text
        
        # Extract command and arguments
        parts = input_text[1:].split(' ', 1)
        command_name = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        # Resolve alias to actual command name
        if command_name in self.aliases:
            command_name = self.aliases[command_name]
        
        return command_name, args
    
    def execute_command(self, command_name: str, args: str = "") -> bool:
        """Execute a command by name with provided arguments"""
        if command_name not in self.commands:
            return False
        
        command_info = self.commands[command_name]
        try:
            # Call the command handler with arguments
            command_info.handler(args)
            return True
        except Exception as e:
            print(f"Error executing command '{command_name}': {str(e)}")
            return False
    
    def get_available_commands(self) -> List[CommandInfo]:
        """Get list of all registered commands"""
        return list(self.commands.values())
    
    def get_command_help(self, command_name: str) -> str:
        """Get help text for a specific command"""
        if command_name in self.commands:
            return self.commands[command_name].description
        return "Command not found."
```

### Command Registration Example

Commands are registered in the main CLI file:

```python
# In src/cli/main.py
from src.cli.command_palette import CommandPalette
from src.cli.commands import models, tokens, knowledge_map, preference

def setup_command_palette():
    """Initialize and register all commands with the palette"""
    palette = CommandPalette()
    
    # Register core commands
    palette.register_command(
        name="help",
        description="Show this help message",
        handler=handle_help_command,
        aliases=["h"]
    )
    
    palette.register_command(
        name="concepts",
        description="Show available learning concepts",
        handler=handle_concepts_command,
        aliases=["c"]
    )
    
    # Register system commands from individual modules
    palette.register_command(
        name="models",
        description="List all available AI models",
        handler=models.models,
        aliases=["m"]
    )
    
    palette.register_command(
        name="tokens",
        description="View token usage statistics",
        handler=tokens.tokens,
        aliases=["t"]
    )
    
    palette.register_command(
        name="knowledge-map",
        description="Display knowledge structure",
        handler=knowledge_map.knowledge_map,
        aliases=["km"]
    )
    
    palette.register_command(
        name="preference",
        description="Manage application preferences",
        handler=preference.preference,
        aliases=["pref"]
    )
    
    return palette
```

## Autocomplete Engine Implementation

The Autocomplete Engine provides real-time suggestions as users type commands.

### Core Implementation

```python
# src/cli/autocomplete.py

import readline
from typing import List, Callable

class AutocompleteEngine:
    def __init__(self, get_commands_callback: Callable[[], List[str]]):
        self.get_commands_callback = get_commands_callback
        self._setup_readline()
    
    def _setup_readline(self):
        """Configure readline for tab completion"""
        readline.parse_and_bind("tab: complete")
        readline.set_completer(self.complete)
    
    def complete(self, text: str, state: int) -> str:
        """Provide completions for the current text"""
        if state == 0:
            # Get fresh command list on first call
            self.matches = self._get_matches(text)
        
        try:
            return self.matches[state]
        except IndexError:
            return None
    
    def _get_matches(self, text: str) -> List[str]:
        """Get matching commands for the given text"""
        commands = self.get_commands_callback()
        if not text:
            return commands
        
        # Filter commands that start with the typed text
        matches = [cmd for cmd in commands if cmd.startswith(text)]
        return matches
    
    def refresh_commands(self):
        """Refresh the command list (called when commands change)"""
        pass  # Commands are fetched dynamically in _get_matches
```

### Integration Example

The autocomplete engine is integrated in the main CLI:

```python
# In src/cli/main.py
from src.cli.autocomplete import AutocompleteEngine

def get_available_commands():
    """Get list of all available slash commands"""
    return [f"/{cmd.name}" for cmd in command_palette.get_available_commands()] + \
           [f"/{alias}" for cmd in command_palette.get_available_commands() for alias in cmd.aliases]

# Initialize autocomplete engine
autocomplete_engine = AutocompleteEngine(get_available_commands)
```

## Challenge Engine Implementation

The Challenge Engine generates questions and evaluates answers to facilitate active learning.

### Core Implementation

```python
# src/core/challenge_engine.py

from typing import Optional, Dict, Any
from enum import Enum
from dataclasses import dataclass
import uuid
from datetime import datetime

class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    OPEN_ENDED = "open_ended"
    FILL_IN_BLANK = "fill_in_blank"

class DifficultyLevel(Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

@dataclass
class Question:
    id: str
    text: str
    type: QuestionType
    difficulty: DifficultyLevel
    choices: Optional[list] = None  # For multiple choice
    correct_answer: str = ""
    concept_id: str = ""
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if not self.id:
            self.id = str(uuid.uuid4())

@dataclass
class AnswerEvaluation:
    is_correct: bool
    feedback: str
    score: float = 0.0
    explanation: str = ""

class ChallengeEngine:
    def __init__(self, db_manager, model_service):
        self.db_manager = db_manager
        self.model_service = model_service
        self.current_challenge: Optional[Question] = None
    
    def generate_question(self, context: str, question_type: QuestionType, 
                         difficulty: DifficultyLevel) -> Question:
        """Generate a question based on the provided context"""
        # In a real implementation, this would use the model service
        # to generate appropriate questions based on the context
        
        if question_type == QuestionType.MULTIPLE_CHOICE:
            question = Question(
                id=str(uuid.uuid4()),
                text=f"What is the key concept in {context}?",
                type=question_type,
                difficulty=difficulty,
                choices=[
                    "Option A",
                    "Option B", 
                    "Option C",
                    "Option D"
                ],
                correct_answer="Option B"
            )
        else:
            question = Question(
                id=str(uuid.uuid4()),
                text=f"Explain the concept of {context}",
                type=question_type,
                difficulty=difficulty,
                correct_answer=f"A detailed explanation of {context}"
            )
        
        self.current_challenge = question
        return question
    
    def evaluate_answer(self, question: Question, user_answer: str) -> AnswerEvaluation:
        """Evaluate a user's answer to a question"""
        # In a real implementation, this would use the model service
        # to intelligently evaluate the answer
        
        # Simple string matching for demo purposes
        is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()
        
        if is_correct:
            evaluation = AnswerEvaluation(
                is_correct=True,
                feedback="✅ Correct! Well done.",
                score=1.0,
                explanation="Your answer matches the expected response."
            )
        else:
            evaluation = AnswerEvaluation(
                is_correct=False,
                feedback="❌ Not quite right. Let me help clarify.",
                score=0.0,
                explanation=f"The correct answer is: {question.correct_answer}"
            )
        
        # Store the Q&A pair
        self.store_qa_pair(question, user_answer, evaluation)
        return evaluation
    
    def store_qa_pair(self, question: Question, user_answer: str, evaluation: AnswerEvaluation):
        """Store the question-answer pair in the database"""
        qa_data = {
            'question': question.text,
            'user_answer': user_answer,
            'ai_feedback': evaluation.feedback,
            'timestamp': datetime.now(),
            'concept_id': question.concept_id
        }
        
        self.db_manager.insert_qa_history(qa_data)
    
    def get_current_challenge(self) -> Optional[Question]:
        """Get the current active challenge"""
        return self.current_challenge
    
    def clear_current_challenge(self):
        """Clear the current challenge"""
        self.current_challenge = None
```

## Concept Building System Implementation (KNOW-R1, KNOW-R2, KNOW-R3)

The Concept Building System is responsible for extracting structured learning concepts from Markdown files (KNOW-R1), building conceptual relationships between them (KNOW-R2), and storing them in a knowledge graph (KNOW-R3). This section provides detailed implementation guidelines for this component.

### Project Structure Changes

Add the following files to support the Concept Building System:

```
src/
└── core/
    └── concept_builder.py  # Core Concept Building System implementation (KNOW-R1)
└── utils/
    └── markdown_parser.py  # Markdown parsing utilities (KNOW-R2)
└── data/
    └── knowledge_graph.py  # Knowledge graph implementation for storing concept relationships (KNOW-R3)
```

### ConceptBuilder Class Implementation

Here's the implementation of the main `ConceptBuilder` class:

```python
# src/core/concept_builder.py

import os
import re
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import markdown
from bs4 import BeautifulSoup

from src.data.database import DatabaseManager
from src.ai.model_abstraction import ModelAbstractionService

@dataclass
class Concept:
    id: str
    title: str
    content: str
    source_file: str
    granularity: str
    level: int  # For hierarchical organization
    metadata: Dict[str, Any]
    timestamp: datetime

@dataclass
class ConceptRelationship:
    source_id: str
    target_id: str
    relationship_type: str
    strength: float

@dataclass
class ValidationResult:
    concept_id: str
    is_valid: bool
    issues: List[str]

@dataclass
class ConceptSummary:
    concept_id: str
    summary: str
    key_points: List[str]
    difficulty_score: float

class ConceptBuilder:
    def __init__(self, db_manager: DatabaseManager, model_service: ModelAbstractionService, knowledge_graph=None):
        """
        Initialize the ConceptBuilder with required dependencies
        
        Args:
            db_manager: Database manager for storing concepts
            model_service: AI model abstraction service for generating summaries
            knowledge_graph: Optional knowledge graph service for storing relationships (KNOW-R3)
        """
        self.db_manager = db_manager
        self.model_service = model_service
        self.knowledge_graph = knowledge_graph
        self.concepts = []
        self.relationships = []
    
    def extract_concepts_from_markdown(self, file_path: str, granularity: str) -> List[Concept]:
        """Extract concepts from a Markdown file based on specified granularity
        
        The system supports three extraction modes (KNOW-R1):
        - "headers": Extracts concepts based solely on Markdown headers, creating a separate concept for each section
        - "summaries": Extracts headers and generates AI-powered summaries of their content
        - "full_content": Creates a single concept for the entire document with detailed structural metadata
        
        Args:
            file_path: Path to the Markdown file
            granularity: Extraction mode ('headers', 'summaries', or 'full_content')
        
        Returns:
            List of extracted Concept objects
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        
        if granularity == "headers":
            return self._extract_headers_only(markdown_content, file_path)
        elif granularity == "summaries":
            return self._extract_with_summaries(markdown_content, file_path)
        elif granularity == "full_content":
            return self._extract_full_content(markdown_content, file_path)
        else:
            raise ValueError(f"Invalid granularity: {granularity}")
    
    def extract_concepts_from_directory(self, dir_path: str, granularity: str) -> List[Concept]:
        """Extract concepts from all Markdown files in a directory"""
        if not os.path.isdir(dir_path):
            raise NotADirectoryError(f"Directory not found: {dir_path}")
        
        all_concepts = []
        
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.lower().endswith('.md'):
                    file_path = os.path.join(root, file)
                    try:
                        concepts = self.extract_concepts_from_markdown(file_path, granularity)
                        all_concepts.extend(concepts)
                    except Exception as e:
                        print(f"Error processing {file_path}: {str(e)}")
        
        self.concepts = all_concepts
        return all_concepts
    
    def build_concept_relationships(self) -> List[ConceptRelationship]:
        """Build relationships between extracted concepts (KNOW-R2)
        
        This method detects conceptual relationships between extracted concepts
        and stores them in both the local relationships list and the knowledge graph
        if available (KNOW-R3).
        
        Returns:
            List of ConceptRelationship objects
        """
        if not self.concepts:
            return []
        
        relationships = []
        
        # Simple relationship detection based on keyword matching (KNOW-R2)
        for i, source_concept in enumerate(self.concepts):
            for j, target_concept in enumerate(self.concepts):
                if i != j:
                    # Check if source concept mentions target concept in its content
                    if target_concept.title.lower() in source_concept.content.lower():
                        relationship = ConceptRelationship(
                            source_id=source_concept.id,
                            target_id=target_concept.id,
                            relationship_type="mentions",
                            strength=0.7  # Default strength score
                        )
                        relationships.append(relationship)
        
        self.relationships = relationships
        return relationships
    
    def save_concepts_to_db(self) -> None:
        """Persist extracted concepts to the database and relationships to knowledge graph (KNOW-R1, KNOW-R3)
        
        This method saves extracted concepts to the database and also stores concept relationships
        in the knowledge graph if available, supporting the knowledge graph requirements (KNOW-R3).
        """
        for concept in self.concepts:
            concept_data = asdict(concept)
            # Convert datetime to string for database storage
            concept_data['timestamp'] = concept.timestamp.isoformat()
            # Convert metadata to JSON string
            concept_data['metadata'] = str(concept_data['metadata'])
            
            self.db_manager.insert_concept(concept_data)
        
        # Save relationships to database
        for relationship in self.relationships:
            relationship_data = asdict(relationship)
            self.db_manager.insert_concept_relationship(relationship_data)
            
            # Also store relationships in knowledge graph if available (KNOW-R3)
            if self.knowledge_graph:
                try:
                    self.knowledge_graph.add_relationship(
                        relationship.source_id,
                        relationship.target_id,
                        relationship.relationship_type,
                        relationship.strength
                    )
                except Exception as e:
                    print(f"Error storing relationship in knowledge graph: {str(e)}")
    
    def validate_concepts(self) -> List[ValidationResult]:
        """Validate extracted concepts for consistency and quality"""
        results = []
        
        for concept in self.concepts:
            issues = []
            
            # Check for empty fields
            if not concept.title or not concept.title.strip():
                issues.append("Concept title is empty")
            
            if not concept.content or not concept.content.strip():
                issues.append("Concept content is empty")
            
            # Check content length based on granularity
            content_length = len(concept.content.strip())
            if concept.granularity == "headers" and content_length > 1000:
                issues.append("Content too long for headers-only mode")
            
            is_valid = len(issues) == 0
            results.append(ValidationResult(
                concept_id=concept.id,
                is_valid=is_valid,
                issues=issues
            ))
        
        return results
    
    def detect_duplicate_concepts(self) -> List[List[Concept]]:
        """Identify and group duplicate concepts"""
        duplicates = []
        processed = set()
        
        # Simple duplicate detection based on title similarity
        for i, concept1 in enumerate(self.concepts):
            if i not in processed:
                similar_concepts = [concept1]
                processed.add(i)
                
                for j, concept2 in enumerate(self.concepts):
                    if j not in processed and i != j:
                        # Check if titles are similar enough
                        if self._title_similarity(concept1.title, concept2.title) > 0.8:
                            similar_concepts.append(concept2)
                            processed.add(j)
                
                if len(similar_concepts) > 1:
                    duplicates.append(similar_concepts)
        
        return duplicates
    
    def summarize_concepts(self) -> List[ConceptSummary]:
        """Generate summaries for extracted concepts"""
        summaries = []
        
        for concept in self.concepts:
            # Use AI model to generate summary
            prompt = f"Summarize the following concept in 2-3 sentences:\n{concept.content[:1000]}\n\nKey points (3-5):"
            
            try:
                summary_text = self.model_service.generate_response(prompt)
                
                # Simple parsing of the response to extract key points
                summary_parts = summary_text.split('Key points:')
                summary = summary_parts[0].strip() if len(summary_parts) > 0 else ""
                
                key_points = []
                if len(summary_parts) > 1:
                    key_points = [kp.strip() for kp in summary_parts[1].split('\n') if kp.strip()]
                
                # Generate a simple difficulty score based on content complexity
                difficulty_score = min(1.0, max(0.0, len(concept.content) / 5000))
                
                summaries.append(ConceptSummary(
                    concept_id=concept.id,
                    summary=summary,
                    key_points=key_points,
                    difficulty_score=difficulty_score
                ))
            except Exception as e:
                print(f"Error generating summary for concept {concept.id}: {str(e)}")
                # Add a fallback summary
                summaries.append(ConceptSummary(
                    concept_id=concept.id,
                    summary="Summary generation failed.",
                    key_points=[],
                    difficulty_score=0.5
                ))
        
        return summaries
    
    def _extract_headers_only(self, markdown_content: str, file_path: str) -> List[Concept]:
        """Extract concepts based solely on Markdown headers"""
        concepts = []
        
        # Split content by headers
        header_pattern = r'(^#{1,6}\s+.*$)'
        sections = re.split(header_pattern, markdown_content, flags=re.MULTILINE)
        
        current_header = None
        current_content = ""
        
        for section in sections:
            section = section.strip()
            if not section:
                continue
            
            # Check if this section is a header
            header_match = re.match(r'^(#{1,6})\s+(.*)$', section)
            if header_match:
                # If we have a previous header, save it
                if current_header:
                    concept = Concept(
                        id=str(uuid.uuid4()),
                        title=current_header['title'],
                        content=current_content.strip(),
                        source_file=file_path,
                        granularity="headers",
                        level=current_header['level'],
                        metadata={},
                        timestamp=datetime.now()
                    )
                    concepts.append(concept)
                    current_content = ""
                
                # Extract header level and text
                level = len(header_match.group(1))
                title = header_match.group(2).strip()
                current_header = {'level': level, 'title': title}
            else:
                # This is content under a header
                if current_header:
                    current_content += section + '\n'
        
        # Don't forget the last section
        if current_header:
            concept = Concept(
                id=str(uuid.uuid4()),
                title=current_header['title'],
                content=current_content.strip(),
                source_file=file_path,
                granularity="headers",
                level=current_header['level'],
                metadata={},
                timestamp=datetime.now()
            )
            concepts.append(concept)
        
        return concepts
    
    def _extract_with_summaries(self, markdown_content: str, file_path: str) -> List[Concept]:
        """Extract headers and generate summaries of their content"""
        # First extract headers only
        header_concepts = self._extract_headers_only(markdown_content, file_path)
        
        # Generate summaries for each concept
        for concept in header_concepts:
            # Use AI model to generate summary
            prompt = f"Summarize the following content in 2-3 sentences:\n{concept.content[:1000]}"
            
            try:
                summary = self.model_service.generate_response(prompt)
                concept.content = summary
                concept.granularity = "summaries"
            except Exception as e:
                print(f"Error generating summary for {concept.title}: {str(e)}")
        
        return header_concepts
    
    def _extract_full_content(self, markdown_content: str, file_path: str) -> List[Concept]:
        """Extract complete content with detailed structure"""
        # Parse Markdown to HTML to get detailed structure
        html_content = markdown.markdown(markdown_content)
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Create a single concept for the full document
        concept = Concept(
            id=str(uuid.uuid4()),
            title=os.path.basename(file_path)[:-3] or "Untitled Document",
            content=markdown_content,
            source_file=file_path,
            granularity="full_content",
            level=0,
            metadata={
                'structure': self._extract_document_structure(soup),
                'word_count': len(markdown_content.split()),
                'section_count': self._count_sections(markdown_content)
            },
            timestamp=datetime.now()
        )
        
        return [concept]
    
    def _title_similarity(self, title1: str, title2: str) -> float:
        """Calculate similarity between two titles (simple implementation)"""
        # Convert to lowercase and remove common words
        words1 = set(title1.lower().split())
        words2 = set(title2.lower().split())
        
        common_words = words1.intersection(words2)
        all_words = words1.union(words2)
        
        return len(common_words) / len(all_words) if all_words else 0.0
    
    def _extract_document_structure(self, soup: BeautifulSoup) -> Dict[str, int]:
        """Extract document structure information"""
        structure = {}
        
        # Count heading levels
        for level in range(1, 7):
            heading_count = len(soup.find_all(f'h{level}'))
            if heading_count > 0:
                structure[f'h{level}'] = heading_count
        
        # Count other elements
        structure['paragraphs'] = len(soup.find_all('p'))
        structure['lists'] = len(soup.find_all(['ul', 'ol']))
        structure['code_blocks'] = len(soup.find_all('pre'))
        
        return structure
    
    def _count_sections(self, markdown_content: str) -> int:
        """Count the number of sections in the document"""
        return len(re.findall(r'^#{1,6}\s+.*$', markdown_content, flags=re.MULTILINE))
```

### Markdown Parser Utility

Here's the implementation of the markdown parser utility module:

```python
# src/utils/markdown_parser.py

import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class MarkdownSection:
    level: int
    title: str
    content: str
    start_line: int
    end_line: int

class MarkdownParser:
    def __init__(self):
        # Regex pattern to match Markdown headers
        self.header_pattern = re.compile(r'^(#{1,6})\s+(.*)$')
        # Regex pattern to match code blocks
        self.code_block_pattern = re.compile(r'```(.*?)```', re.DOTALL)
        # Regex pattern to match inline code
        self.inline_code_pattern = re.compile(r'`([^`]+)`')
        # Regex pattern to match links
        self.link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
    
    def parse_sections(self, markdown_content: str) -> List[MarkdownSection]:
        """Parse Markdown content into sections based on headers"""
        lines = markdown_content.split('\n')
        sections = []
        current_section = None
        
        for line_num, line in enumerate(lines):
            header_match = self.header_pattern.match(line)
            
            if header_match:
                # Save the current section if we have one
                if current_section:
                    current_section.end_line = line_num - 1
                    sections.append(current_section)
                
                # Start a new section
                level = len(header_match.group(1))
                title = header_match.group(2).strip()
                
                current_section = MarkdownSection(
                    level=level,
                    title=title,
                    content="",
                    start_line=line_num,
                    end_line=line_num
                )
            elif current_section:
                # Add this line to the current section's content
                current_section.content += line + '\n'
        
        # Don't forget the last section
        if current_section:
            current_section.end_line = len(lines) - 1
            sections.append(current_section)
        
        return sections
    
    def extract_headings(self, markdown_content: str) -> List[Dict[str, Any]]:
        """Extract all headings from the Markdown content"""
        lines = markdown_content.split('\n')
        headings = []
        
        for line_num, line in enumerate(lines):
            header_match = self.header_pattern.match(line)
            
            if header_match:
                level = len(header_match.group(1))
                title = header_match.group(2).strip()
                
                headings.append({
                    'level': level,
                    'title': title,
                    'line_number': line_num
                })
        
        return headings
    
    def count_elements(self, markdown_content: str) -> Dict[str, int]:
        """Count various elements in the Markdown content"""
        # Count headers by level
        headers = self.extract_headings(markdown_content)
        header_counts = {f'h{i}': 0 for i in range(1, 7)}
        
        for header in headers:
            header_counts[f'h{header["level"]}'] += 1
        
        # Count other elements
        code_blocks = len(self.code_block_pattern.findall(markdown_content))
        inline_codes = len(self.inline_code_pattern.findall(markdown_content))
        links = len(self.link_pattern.findall(markdown_content))
        
        return {
            **header_counts,
            'code_blocks': code_blocks,
            'inline_codes': inline_codes,
            'links': links,
            'total_lines': len(markdown_content.split('\n'))
        }
    
    def sanitize_content(self, markdown_content: str) -> str:
        """Sanitize Markdown content by removing sensitive information"""
        # Remove API keys or secrets (simple pattern)
        sanitized = re.sub(r'api[_-]?key\s*=\s*["\'].*?["\']', 'api_key=***', markdown_content, flags=re.IGNORECASE)
        sanitized = re.sub(r'secret\s*=\s*["\'].*?["\']', 'secret=***', sanitized, flags=re.IGNORECASE)
        
        # Remove email addresses
        sanitized = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'user@example.com', sanitized)
        
        return sanitized
```

### Database Integration

Update the database module to support concept storage:

```python
# src/data/database.py (updated methods)

def insert_concept(self, concept_data: Dict[str, Any]) -> None:
    """Insert a new concept into the database"""
    query = '''
        INSERT INTO concepts (
            id, title, content, source_file, granularity, 
            level, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    '''
    
    params = (
        concept_data['id'],
        concept_data['title'],
        concept_data['content'],
        concept_data['source_file'],
        concept_data['granularity'],
        concept_data['level'],
        concept_data['metadata'],
        concept_data['timestamp']
    )
    
    self.execute_query(query, params)
    

def insert_concept_relationship(self, relationship_data: Dict[str, Any]) -> None:
    """Insert a new concept relationship into the database"""
    query = '''
        INSERT INTO concept_relationships (
            source_id, target_id, relationship_type, strength
        ) VALUES (?, ?, ?, ?)
    '''
    
    params = (
        relationship_data['source_id'],
        relationship_data['target_id'],
        relationship_data['relationship_type'],
        relationship_data['strength']
    )
    
    self.execute_query(query, params)


def get_concepts_by_source(self, source_file: str) -> List[Dict[str, Any]]:
    """Get all concepts from a specific source file"""
    query = "SELECT * FROM concepts WHERE source_file = ?"
    return self.fetch_query(query, (source_file,))


def get_concept_relationships(self, concept_id: str = None) -> List[Dict[str, Any]]:
    """Get relationships for a specific concept or all relationships"""
    if concept_id:
        query = "SELECT * FROM concept_relationships WHERE source_id = ? OR target_id = ?"
        return self.fetch_query(query, (concept_id, concept_id))
    else:
        query = "SELECT * FROM concept_relationships"
        return self.fetch_query(query)
```

### Usage Example

## Knowledge Graph Implementation (KNOW-R3)

The knowledge graph provides a structured way to store and query conceptual relationships, enabling advanced features like knowledge navigation and concept mapping.

```python
# src/data/knowledge_graph.py (KNOW-R3)

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import uuid
from datetime import datetime

@dataclass
class GraphRelationship:
    id: str
    source_id: str
    target_id: str
    relationship_type: str
    strength: float
    metadata: Dict[str, Any]
    timestamp: datetime

class KnowledgeGraph:
    def __init__(self):
        # In a real implementation, this would connect to a graph database
        # For demonstration, we'll use in-memory storage
        self.relationships = []
        
    def add_relationship(self, source_id: str, target_id: str, 
                        relationship_type: str, strength: float = 0.5, 
                        metadata: Optional[Dict[str, Any]] = None) -> str:
        """Add a relationship between two concepts
        
        Args:
            source_id: Source concept ID
            target_id: Target concept ID
            relationship_type: Type of relationship (e.g., "mentions", "depends_on", "related_to")
            strength: Strength of the relationship (0.0 to 1.0)
            metadata: Optional metadata for the relationship
            
        Returns:
            ID of the created relationship
        """
        relationship_id = str(uuid.uuid4())
        
        relationship = GraphRelationship(
            id=relationship_id,
            source_id=source_id,
            target_id=target_id,
            relationship_type=relationship_type,
            strength=strength,
            metadata=metadata or {},
            timestamp=datetime.now()
        )
        
        self.relationships.append(relationship)
        return relationship_id
    
    def get_related_concepts(self, concept_id: str, 
                            relationship_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get concepts related to a specific concept
        
        Args:
            concept_id: ID of the concept to find relationships for
            relationship_type: Optional filter for relationship type
            
        Returns:
            List of related concepts with relationship details
        """
        related = []
        
        for rel in self.relationships:
            # Check if concept is source or target of the relationship
            if rel.source_id == concept_id or rel.target_id == concept_id:
                # Check relationship type filter if provided
                if not relationship_type or rel.relationship_type == relationship_type:
                    # Determine the direction of the relationship
                    is_source = rel.source_id == concept_id
                    related_concept_id = rel.target_id if is_source else rel.source_id
                    
                    related.append({
                        'concept_id': related_concept_id,
                        'relationship_id': rel.id,
                        'relationship_type': rel.relationship_type,
                        'strength': rel.strength,
                        'direction': 'outgoing' if is_source else 'incoming',
                        'metadata': rel.metadata,
                        'timestamp': rel.timestamp
                    })
        
        # Sort by relationship strength (strongest first)
        return sorted(related, key=lambda x: x['strength'], reverse=True)
    
    def get_relationship_types(self) -> List[str]:
        """Get all distinct relationship types in the graph
        
        Returns:
            List of unique relationship type strings
        """
        return list({rel.relationship_type for rel in self.relationships})
    
    def delete_relationship(self, relationship_id: str) -> bool:
        """Delete a specific relationship by ID
        
        Args:
            relationship_id: ID of the relationship to delete
            
        Returns:
            True if the relationship was deleted, False if not found
        """
        original_length = len(self.relationships)
        self.relationships = [rel for rel in self.relationships if rel.id != relationship_id]
        return len(self.relationships) < original_length
    
    def update_relationship_strength(self, relationship_id: str, new_strength: float) -> bool:
        """Update the strength of a relationship
        
        Args:
            relationship_id: ID of the relationship to update
            new_strength: New strength value (0.0 to 1.0)
            
        Returns:
            True if the relationship was updated, False if not found
        """
        for rel in self.relationships:
            if rel.id == relationship_id:
                rel.strength = max(0.0, min(1.0, new_strength))  # Clamp between 0 and 1
                return True
        return False

## Concept Building System Usage Example

Here's how to use the Concept Building System in your application, including knowledge graph integration:

```python
# Example usage in main application

from src.core.concept_builder import ConceptBuilder
from src.data.database import DatabaseManager
from src.ai.model_abstraction import ModelAbstractionService
from src.data.knowledge_graph import KnowledgeGraph  # Import the knowledge graph (KNOW-R3)

# Initialize services
db_manager = DatabaseManager('learning_catalyst.db')
model_service = ModelAbstractionService()
knowledge_graph = KnowledgeGraph()  # Initialize knowledge graph (KNOW-R3)

# Create ConceptBuilder instance with knowledge graph
concept_builder = ConceptBuilder(db_manager, model_service, knowledge_graph)

# Extract concepts from a directory with headers-only mode
concepts = concept_builder.extract_concepts_from_directory('/path/to/notes', 'headers')
print(f"Extracted {len(concepts)} concepts from Markdown files")

# Validate the extracted concepts
validation_results = concept_builder.validate_concepts()

# Filter out invalid concepts
valid_concepts = [
    concept for concept, result in zip(concepts, validation_results)
    if result.is_valid
]
print(f"{len(valid_concepts)} valid concepts after validation")

# Build relationships between concepts
relationships = concept_builder.build_concept_relationships()
print(f"Built {len(relationships)} conceptual relationships")

# Generate summaries for each concept
summaries = concept_builder.summarize_concepts()

# Save everything to the database and knowledge graph (KNOW-R1, KNOW-R3)
concept_builder.save_concepts_to_db()
print("Concepts and relationships saved to database and knowledge graph")

# Example: Query related concepts using the knowledge graph
if knowledge_graph and concepts:
    sample_concept_id = concepts[0].id
    related_concepts = knowledge_graph.get_related_concepts(sample_concept_id)
    print(f"Found {len(related_concepts)} concepts related to '{concepts[0].title}'")

# Detect duplicate concepts
duplicate_groups = concept_builder.detect_duplicate_concepts()
if duplicate_groups:
    print(f"Detected {len(duplicate_groups)} groups of potentially duplicate concepts")

# Example: Use different extraction modes (KNOW-R1)
# Headers mode (default, most granular)
headers_concepts = concept_builder.extract_concepts_from_markdown('/path/to/notes/chapter1.md', 'headers')

# Summaries mode (headers with AI-generated summaries)
summaries_concepts = concept_builder.extract_concepts_from_markdown('/path/to/notes/chapter1.md', 'summaries')

# Full content mode (single concept with complete document structure)
full_content_concepts = concept_builder.extract_concepts_from_markdown('/path/to/notes/chapter1.md', 'full_content')

print(f"Extraction modes comparison: Headers={len(headers_concepts)}, Summaries={len(summaries_concepts)}, Full Content={len(full_content_concepts)}")
```

## Testing Guidelines

### Unit Testing System Commands

Each system command should have unit tests that verify:

1. Command registration and parsing
2. Service initialization
3. Business logic execution
4. Output formatting
5. Error handling

Example test for the models command:

```python
# tests/test_models_command.py

import unittest
from unittest.mock import patch, MagicMock
import asyncio

from src.cli.commands.models import models

class TestModelsCommand(unittest.TestCase):
    @patch('src.cli.commands.models.DatabaseManager')
    @patch('src.cli.commands.models.ModelAbstractionService')
    @patch('src.cli.commands.models.PreferencesManager')
    @patch('src.cli.commands.models.SystemCommandsHandlerImpl')
    def test_models_command_output(self, mock_handler, mock_prefs, mock_model, mock_db):
        # Setup mock data
        mock_handler_instance = MagicMock()
        mock_handler.return_value = mock_handler_instance
        
        mock_handler_instance.list_available_models = MagicMock(
            return_value=asyncio.Future()
        )
        mock_handler_instance.list_available_models.return_value.set_result([
            {
                "provider": "openai",
                "model": "gpt-4",
                "description": "Most capable GPT-4 model",
                "configured": True
            }
        ])
        
        # Execute command (in real scenario, we'd capture console output)
        models()
        
        # Verify interactions
        mock_handler_instance.list_available_models.assert_called_once()

if __name__ == '__main__':
    unittest.main()
```

### Integration Testing

Integration tests should verify that commands work correctly with actual services:

1. Database integration for commands that store/retrieve data
2. Model service integration for AI-dependent commands
3. End-to-end command execution flow

### Test Data Management

Use fixtures and test databases to ensure consistent test environments:

```python
# tests/conftest.py

import pytest
import tempfile
import os
from src.data.database import DatabaseManager

@pytest.fixture
def test_db():
    """Create a temporary database for testing"""
    with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as f:
        db_path = f.name
    
    db_manager = DatabaseManager(db_path)
    db_manager.initialize_database()
    
    yield db_manager
    
    # Cleanup
    os.unlink(db_path)
```

This implementation guide provides a comprehensive overview of how system commands are implemented in Learning Catalyst, with detailed examples and best practices for maintaining consistency and extensibility across the codebase.

## Critical Implementation Gaps

Based on the requirements specification, the following key features are not fully implemented in the current codebase:

1. **Guided Startup and Resumption Experience (START-R1)**: 
   - The application does load previous state but doesn't generate dynamic, context-aware welcome messages
   - No proactive suggestions to re-engage users upon resumption
   - New user onboarding lacks context-aware content suggestions based on local Markdown files

2. **Context-Aware Learning (CTX-R1)**: 
   - No integration with local Markdown files for content extraction in the main conversation loop
   - The application doesn't properly ground responses in user's local learning materials
   - Knowledge navigator doesn't parse or analyze local Markdown files for concept extraction in the primary flow

3. **Complete Conversation Loop Integration**:
   - The main conversation loop in `start_learning` function has incomplete implementation with placeholder messages
   - Intent classification and response generation are not fully integrated into the main application loop