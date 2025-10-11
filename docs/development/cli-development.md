# CLI Development Guide

---
title: Learning Catalyst CLI Development Guide
description: Comprehensive guide for developing CLI commands and interactive features in Learning Catalyst
version: 2.0.0
last_updated: 2025-10-08
---

## Overview

This guide provides comprehensive documentation for developers working with the Learning Catalyst CLI system. It covers the architecture, patterns, and best practices for developing and maintaining CLI commands with practical examples and real-world scenarios.

**Perfect for**: New developers joining the project, feature developers adding new commands, and maintainers extending CLI functionality

**Key Features:**
- Complete command development patterns with real examples
- Interactive CLI architecture and best practices
- Tab completion and navigation systems
- Configuration management patterns
- Power user features and advanced workflows
- Testing strategies for CLI commands
- Performance optimization and deployment guidelines
- Troubleshooting common development issues

## ✅ Current Implementation Status

**User-Validated CLI Features**:
- **Navigation System**: Tab completion, arrow key navigation, keyboard shortcuts - *User Validation*: [Advanced Workflows - Power User Navigation](../examples/advanced.md#workflow-3-advanced-session-management)
- **Configuration Management**: Multi-provider setup, model switching, configuration persistence - *User Validation*: [Integration Examples - Provider Management](../examples/integration.md)
- **Interactive Commands**: Knowledge maps, quiz systems, progress tracking - *User Validation*: [Basic Workflows - Daily Learning](../examples/basic-workflows.md#workflow-1-daily-learning-routine)
- **Power User Features**: Checkpoints, optimization strategies, advanced configuration - *User Validation*: [Advanced Workflows - Configuration Optimization](../examples/advanced.md#workflow-1-power-user-configuration-optimization)

## Getting Started

### Prerequisites
- Python 3.11+ development environment
- Understanding of async/await patterns
- Familiarity with Rich CLI libraries
- Git and basic development tools

### Quick Start for Developers

**Scenario**: Adding your first command to Learning Catalyst

```bash
# 1. Set up development environment
git clone <repository>
cd learning_catalyst
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e .

# 2. Create a new command file
touch src/cli/commands/learning/mycommand.py

# 3. Test your command
python -m src.cli.main
Learning Catalyst > /mycommand
# *User Validation*: See [Basic Workflows - First Time User](../examples/basic-workflows.md#workflow-1-daily-learning-routine)
```

### Development Workflow Examples

**Scenario**: Creating a new learning command

```bash
# Step 1: Define command requirements
Learning Catalyst > /help learning
# Shows existing learning commands for consistency
# *Reference*: [Basic Workflows - Topic Deep Dive](../examples/basic-workflows.md#workflow-2-topic-specific-deep-dive)

# Step 2: Implement command class
# (See code examples below)

# Step 3: Register command in appropriate __init__.py
# Step 4: Test with unit tests
# Step 5: Test integration with full CLI
# *User Experience*: Create workflow in ../examples/basic-workflows.md
```

### Real Development Example: SuggestCommand Implementation

```bash
# User need identified: Learning recommendations
Learning Catalyst > /help suggest
= Unknown command: /suggest

# Developer creates implementation
# File: src/cli/commands/learning/suggest.py (636 lines)
# Features: 6 suggestion types, AI-powered, 24 helper methods

# User gets new capability (after registration)
Learning Catalyst > /suggest concepts
💡 **Concept Learning Suggestions**
1. Python Decorators (Intermediate)
   📚 Difficulty: 3
   💭 Based on your progress in functions and classes
   ⭐ Priority: high
```

**User Workflow Validation:**
- **Implementation**: See [SuggestCommand](src/cli/commands/learning/suggest.py)
- **User Experience**: Add to [Basic Workflows](../examples/basic-workflows.md) when complete
- **Testing**: Verify with real user scenarios

## Architecture Overview

The Learning Catalyst CLI system is built on a modular, extensible architecture centered around a unified command registry. The system follows a clear separation of concerns with standardized interfaces and patterns.

### Core Components

1. **Command Registry** (`src/cli/commands/registry.py`)
   - Central hub for command registration and execution
   - Manages command discovery and routing
   - Handles command aliases and context management

2. **Command Interfaces** (`src/cli/commands/core/`)
   - `command.py`: Base command interface and abstract classes
   - `interfaces.py`: Core interfaces for CLI operations
   - `types.py`: Type definitions and data structures

3. **CLI Interface** (`src/cli/commands/core/rich_interface.py`)
   - Provides rich formatting and user interaction
   - Handles display operations and user input
   - Manages error presentation and user feedback

4. **Command Categories**
   - **System Commands** (`src/cli/commands/system/`): Basic system operations
   - **Configuration Commands** (`src/cli/commands/config/`): Configuration management
   - **Learning Commands** (`src/cli/commands/learning/`): Learning-related operations
   - **Analytics Commands** (`src/cli/commands/analytics/`): Analytics and statistics

## Command Development Patterns

### Base Command Structure

All commands should inherit from the `BaseCommand` class and follow the established patterns:

```python
from src.cli.commands.core.command import BaseCommand, CommandInfo, CommandResult
from src.cli.commands.core.interfaces import CLIInterface

class ExampleCommand(BaseCommand):
    """Example command implementation"""
    
    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="example",
            description="Example command description",
            aliases=["ex", "example"],
            usage="/example [options]",
            category="General"
        )
    
    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the command with given arguments and context"""
        try:
            # Command implementation here
            result_data = {"message": "Example executed successfully"}
            return CommandResult(success=True, data=result_data)
        except Exception as e:
            return CommandResult(success=False, error=str(e))
```

### Command Registration

Commands are registered with the command registry:

```python
from src.cli.commands.registry import CommandRegistry
from src.cli.commands.system import ExampleCommand

# Create registry
registry = CommandRegistry(cli_interface)

# Register command
registry.register_command(ExampleCommand())
```

### Command Categories

Commands should be organized into logical categories:

- **System**: Basic system operations (help, quit, clear)
- **Configuration**: Configuration management (models, preferences, config)
- **Learning**: Learning-related operations (concepts, explain, quiz, knowledge-map)
- **Analytics**: Analytics and statistics (tokens, statistics)

## Best Practices

### 1. Command Design

#### Naming Conventions
- Use clear, descriptive names
- Follow snake_case for file names
- Use PascalCase for class names
- Provide meaningful aliases for common use cases

#### Argument Handling
- Use consistent argument parsing patterns
- Provide clear help text for arguments
- Validate arguments and provide helpful error messages
- Support both required and optional arguments

#### Error Handling
- Use try-catch blocks for error handling
- Provide meaningful error messages
- Return appropriate CommandResult objects
- Log errors for debugging purposes

### 2. Code Organization

#### File Structure
```
src/cli/commands/
├── core/
│   ├── command.py
│   ├── interfaces.py
│   ├── types.py
│   └── rich_interface.py
├── registry.py
├── system/
│   ├── __init__.py
│   ├── help.py
│   ├── quit.py
│   └── clear.py
├── config/
│   ├── __init__.py
│   ├── models.py
│   ├── preferences.py
│   └── config.py
├── learning/
│   ├── __init__.py
│   ├── concepts.py
│   ├── explain.py
│   ├── quiz.py
│   └── knowledge_map.py
└── analytics/
    ├── __init__.py
    ├── tokens.py
    └── statistics.py
```

#### Import Patterns
- Use explicit imports for better readability
- Group imports by type (standard library, third-party, local)
- Avoid wildcard imports
- Use relative imports for local modules

### 3. User Experience

#### Help System
- Provide comprehensive help for all commands
- Include usage examples in help text
- Support help for specific commands and subcommands
- Use consistent formatting for help output

#### Error Messages
- Use clear, actionable error messages
- Include suggestions for fixing errors
- Use consistent formatting for error output
- Provide context-specific error information

#### Progress Indicators
- Show progress for long-running operations
- Use appropriate progress indicators
- Provide feedback for user actions
- Handle user interruption gracefully

## Implementation Examples

### Simple Command Example

```python
from src.cli.commands.core.command import BaseCommand, CommandInfo, CommandResult
from src.cli.commands.core.interfaces import CLIInterface
from typing import List, Dict, Any

class StatusCommand(BaseCommand):
    """Show system status"""
    
    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="status",
            description="Show current system status",
            aliases=["stat", "st"],
            usage="/status",
            category="System"
        )
    
    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the status command"""
        try:
            # Get workspace path from context
            workspace_path = context.get("workspace_path", ".")
            
            # Collect status information
            status_info = {
                "workspace": workspace_path,
                "commands_registered": len(self.registry.commands) if hasattr(self, 'registry') else 0,
                "timestamp": datetime.now().isoformat()
            }
            
            # Format status message
            status_message = f"📊 System Status:\n"
            status_message += f"  Workspace: {status_info['workspace']}\n"
            status_message += f"  Commands Registered: {status_info['commands_registered']}\n"
            status_message += f"  Timestamp: {status_info['timestamp']}"
            
            # Display status
            self.cli_interface.display_info(status_message)
            
            return CommandResult(success=True, data=status_info)
            
        except Exception as e:
            error_message = f"Failed to get status: {str(e)}"
            self.cli_interface.display_error(error_message)
            return CommandResult(success=False, error=error_message)
```

### Complex Command Example

```python
from src.cli.commands.core.command import BaseCommand, CommandInfo, CommandResult
from src.cli.commands.core.interfaces import CLIInterface
from typing import List, Dict, Any, Optional
import asyncio

class AnalyzeCommand(BaseCommand):
    """Analyze learning data and provide insights"""
    
    def __init__(self):
        super().__init__()
        self.info = CommandInfo(
            name="analyze",
            description="Analyze learning data and provide insights",
            aliases=["analysis", "anal"],
            usage="/analyze [type] [options]",
            category="Analytics"
        )
    
    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the analyze command"""
        try:
            # Parse arguments
            if not args:
                return self._show_help()
            
            analysis_type = args[0].lower()
            options = args[1:] if len(args) > 1 else []
            
            # Route to appropriate analysis method
            if analysis_type == "progress":
                return await self._analyze_progress(options, context)
            elif analysis_type == "concepts":
                return await self._analyze_concepts(options, context)
            elif analysis_type == "tokens":
                return await self._analyze_tokens(options, context)
            else:
                return CommandResult(
                    success=False,
                    error=f"Unknown analysis type: {analysis_type}. "
                          f"Available types: progress, concepts, tokens"
                )
        
        except Exception as e:
            error_message = f"Analysis failed: {str(e)}"
            self.cli_interface.display_error(error_message)
            return CommandResult(success=False, error=error_message)
    
    def _show_help(self) -> CommandResult:
        """Show help for the analyze command"""
        help_text = """
📊 Analysis Command Help:

Usage: /analyze <type> [options]

Available Analysis Types:
  progress    - Analyze learning progress
  concepts    - Analyze concept mastery
  tokens      - Analyze token usage

Examples:
  /analyze progress --days=30
  /analyze concepts --difficulty=intermediate
  /analyze tokens --provider=openai
        """
        self.cli_interface.display_info(help_text)
        return CommandResult(success=True, data={"help_shown": True})
    
    async def _analyze_progress(self, options: List[str], context: Dict[str, Any]) -> CommandResult:
        """Analyze learning progress"""
        # Parse options
        days = 30
        for option in options:
            if option.startswith("--days="):
                days = int(option.split("=")[1])
        
        # Get workspace path
        workspace_path = context.get("workspace_path", ".")
        
        # Show progress indicator
        with self.cli_interface.progress("Analyzing progress...") as progress:
            progress.update(50, description="Gathering data...")
            
            # Simulate analysis work
            await asyncio.sleep(0.5)

## Advanced CLI Patterns

### Tab Completion System

Learning Catalyst features intelligent tab completion for commands, options, and navigation:

```python
# src/cli/completion/completion_engine.py

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import re

@dataclass
class CompletionItem:
    """Tab completion item"""
    text: str
    description: str
    type: str  # command, provider, model, option
    priority: int = 0

class TabCompletionEngine:
    """Intelligent tab completion system"""

    def __init__(self, command_registry):
        self.command_registry = command_registry
        self.completion_cache = {}

    def get_completions(self, input_text: str, cursor_position: int) -> List[CompletionItem]:
        """Get tab completions for current input"""
        # Parse command context
        context = self._parse_command_context(input_text[:cursor_position])

        # Generate relevant completions
        if context['level'] == 'root':
            return self._get_root_completions()
        elif context['level'] == 'command':
            return self._get_command_completions(context)
        elif context['level'] == 'subcommand':
            return self._get_subcommand_completions(context)
        elif context['level'] == 'options':
            return self._get_option_completions(context)

        return []

    def _parse_command_context(self, text: str) -> Dict[str, Any]:
        """Parse command context for intelligent completion"""
        parts = text.strip().split()
        context = {
            'parts': parts,
            'level': 'root',
            'command': None,
            'subcommand': None,
            'partial_input': ''
        }

        if text.endswith(' '):
            # Complete at level boundary
            if len(parts) == 1:
                context['level'] = 'command'
                context['command'] = parts[0]
            elif len(parts) == 2:
                context['level'] = 'subcommand'
                context['command'] = parts[0]
                context['subcommand'] = parts[1]
            else:
                context['level'] = 'options'
        else:
            # Completing partial word
            context['partial_input'] = parts[-1] if parts else ''

            if len(parts) == 1:
                context['level'] = 'root'
            elif len(parts) == 2:
                context['level'] = 'command'
                context['command'] = parts[0]
            else:
                context['level'] = 'subcommand'
                context['command'] = parts[0]
                context['subcommand'] = parts[1]

        return context

    def _get_root_completions(self) -> List[CompletionItem]:
        """Get root-level command completions"""
        commands = [
            CompletionItem('/config', 'Configuration management', 'command', 100),
            CompletionItem('/explain', 'Explain concepts', 'command', 90),
            CompletionItem('/quiz', 'Take quizzes', 'command', 80),
            CompletionItem('/suggest', 'Get suggestions', 'command', 70),
            CompletionItem('/knowledge-map', 'Navigate knowledge', 'command', 60),
            CompletionItem('/help', 'Show help', 'command', 50),
            CompletionItem('/quit', 'Exit application', 'command', 40)
        ]

        # Filter by partial input if present
        # Implementation would filter commands based on context['partial_input']

        return commands
```

### Interactive Navigation System

```python
# src/cli/navigation/interactive_navigator.py

from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import asyncio
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

class NavigationMode(Enum):
    NORMAL = "normal"
    INSERT = "insert"
    COMMAND = "command"

@dataclass
class NavigationAction:
    """Navigation action definition"""
    key: str
    description: str
    action: Callable
    category: str

class InteractiveNavigator:
    """Handles interactive navigation and keyboard shortcuts"""

    def __init__(self, console: Console):
        self.console = console
        self.mode = NavigationMode.NORMAL
        self.keybindings = self._initialize_keybindings()
        self.navigation_history = []
        self.current_position = 0

    def _initialize_keybindings(self) -> Dict[str, NavigationAction]:
        """Initialize keyboard shortcuts and navigation actions"""
        return {
            # Arrow keys and basic navigation
            'up': NavigationAction('↑', 'Move up', self._navigate_up, 'navigation'),
            'down': NavigationAction('↓', 'Move down', self._navigate_down, 'navigation'),
            'left': NavigationAction('←', 'Move left', self._navigate_left, 'navigation'),
            'right': NavigationAction('→', 'Move right', self._navigate_right, 'navigation'),
            'enter': NavigationAction('Enter', 'Select/Confirm', self._select_item, 'action'),
            'escape': NavigationAction('Esc', 'Cancel/Back', self._go_back, 'navigation'),

            # Quick actions
            'q': NavigationAction('q', 'Quit', self._quit_action, 'action'),
            'h': NavigationAction('h', 'Help', self._show_help, 'action'),
            's': NavigationAction('s', 'Start learning', self._start_learning, 'action'),
            'e': NavigationAction('e', 'Explain concept', self._explain_concept, 'action'),
            'a': NavigationAction('a', 'Ask AI', self._ask_ai, 'action'),

            # Knowledge map specific
            'z': NavigationAction('z', 'Zoom in', self._zoom_in, 'navigation'),
            'x': NavigationAction('x', 'Zoom out', self._zoom_out, 'navigation'),
            'f': NavigationAction('f', 'Find/Search', self._find_action, 'action'),
            'b': NavigationAction('b', 'Bookmark', self._bookmark_action, 'action'),
        }

    async def handle_key_input(self, key: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle keyboard input with context-aware actions"""
        if key in self.keybindings:
            action = self.keybindings[key]
            return await action.action(context)

        # Handle tab completion
        elif key == 'tab':
            return await self._handle_tab_completion(context)

        # Handle mode switching
        elif key == ':':
            self.mode = NavigationMode.COMMAND
            return {'action': 'enter_command_mode'}

        elif key == 'i':
            self.mode = NavigationMode.INSERT
            return {'action': 'enter_insert_mode'}

        return None

    async def _navigate_up(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Navigate up in menus or lists"""
        current_list = context.get('current_list', [])
        current_index = context.get('current_index', 0)

        if current_index > 0:
            new_index = current_index - 1
            return {
                'action': 'navigate',
                'direction': 'up',
                'new_index': new_index,
                'selected_item': current_list[new_index] if current_list else None
            }

        return {'action': 'noop'}

    async def _navigate_down(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Navigate down in menus or lists"""
        current_list = context.get('current_list', [])
        current_index = context.get('current_index', 0)

        if current_index < len(current_list) - 1:
            new_index = current_index + 1
            return {
                'action': 'navigate',
                'direction': 'down',
                'new_index': new_index,
                'selected_item': current_list[new_index] if current_list else None
            }

        return {'action': 'noop'}

    async def _select_item(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Select the current item"""
        current_item = context.get('current_item')
        view_type = context.get('view_type', 'menu')

        if view_type == 'knowledge_map':
            return await self._handle_knowledge_map_selection(current_item, context)
        elif view_type == 'quiz':
            return await self._handle_quiz_selection(current_item, context)
        else:
            return {
                'action': 'select',
                'item': current_item,
                'context': context
            }

    async def _handle_knowledge_map_selection(self, item: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle selection in knowledge map view"""
        if not item:
            return {'action': 'noop'}

        item_type = item.get('type', 'concept')

        if item_type == 'concept':
            return {
                'action': 'enter_concept',
                'concept': item,
                'context': context
            }
        elif item_type == 'category':
            return {
                'action': 'zoom_category',
                'category': item,
                'context': context
            }

        return {'action': 'noop'}

    def show_navigation_help(self) -> None:
        """Display navigation help"""
        help_text = "🎯 **Navigation Help:**\n\n"

        # Group actions by category
        categories = {}
        for key, action in self.keybindings.items():
            if action.category not in categories:
                categories[action.category] = []
            categories[action.category].append(action)

        # Display by category
        for category, actions in categories.items():
            if category == 'navigation':
                help_text += "**Movement:**\n"
            elif category == 'action':
                help_text += "**Actions:**\n"
            else:
                help_text += f"**{category.title()}:**\n"

            for action in actions:
                help_text += f"  {action.key:4} - {action.description}\n"
            help_text += "\n"

        help_text += "**Modes:**\n"
        help_text += "  :    - Command mode (type commands)\n"
        help_text += "  i    - Insert mode (text input)\n"
        help_text += "  Esc  - Return to normal mode\n"
        help_text += "  Tab  - Tab completion\n"

        help_panel = Panel(
            help_text.strip(),
            title="Navigation",
            border_style="cyan",
            padding=(1, 2)
        )

        self.console.print(help_panel)
```

### Configuration Management Patterns

```python
# src/cli/configuration/config_manager.py

from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import json
import asyncio

@dataclass
class ProviderConfig:
    """Provider configuration data"""
    name: str
    provider_type: str
    api_key: str
    base_url: Optional[str] = None
    models: List[str] = None
    default_model: Optional[str] = None
    max_tokens: int = 1000
    temperature: float = 0.7
    enabled: bool = True

@dataclass
class UserPreferences:
    """User preference settings"""
    learning_style: str = "visual"
    skill_level: str = "intermediate"
    preferred_provider: Optional[str] = None
    cost_optimization: bool = False
    daily_token_limit: int = 50000
    cost_alert_threshold: float = 10.0

class ConfigurationManager:
    """Manages CLI configuration with persistence and validation"""

    def __init__(self, config_dir: str = "~/.learning_catalyst"):
        self.config_dir = Path(config_dir).expanduser()
        self.config_dir.mkdir(parents=True, exist_ok=True)

        self.config_file = self.config_dir / "config.json"
        self.providers_file = self.config_dir / "providers.json"
        self.preferences_file = self.config_dir / "preferences.json"

        self.config = {}
        self.providers = {}
        self.preferences = UserPreferences()

        self._load_configuration()

    def _load_configuration(self) -> None:
        """Load all configuration files"""
        try:
            # Load main config
            if self.config_file.exists():
                self.config = json.loads(self.config_file.read_text())

            # Load providers
            if self.providers_file.exists():
                providers_data = json.loads(self.providers_file.read_text())
                for name, data in providers_data.items():
                    self.providers[name] = ProviderConfig(**data)

            # Load preferences
            if self.preferences_file.exists():
                prefs_data = json.loads(self.preferences_file.read_text())
                self.preferences = UserPreferences(**prefs_data)

        except Exception as e:
            print(f"⚠️ Warning: Failed to load configuration: {e}")

    async def add_provider(self, provider_config: ProviderConfig) -> bool:
        """Add a new AI provider configuration"""
        try:
            # Test provider connection
            if not await self._test_provider_connection(provider_config):
                return False

            # Save provider
            self.providers[provider_config.name] = provider_config
            await self._save_providers()

            # Set as default if first provider
            if not self.preferences.preferred_provider:
                self.preferences.preferred_provider = provider_config.name
                await self._save_preferences()

            return True

        except Exception as e:
            print(f"❌ Failed to add provider: {e}")
            return False

    async def switch_provider(self, provider_name: str) -> bool:
        """Switch active provider"""
        if provider_name not in self.providers:
            print(f"❌ Provider '{provider_name}' not found")
            return False

        try:
            # Test connection before switching
            provider = self.providers[provider_name]
            if not await self._test_provider_connection(provider):
                return False

            # Update preferences
            self.preferences.preferred_provider = provider_name
            await self._save_preferences()

            return True

        except Exception as e:
            print(f"❌ Failed to switch provider: {e}")
            return False

    async def save_configuration_preset(self, name: str) -> bool:
        """Save current configuration as a named preset"""
        try:
            preset = {
                'providers': {name: asdict(provider) for name, provider in self.providers.items()},
                'preferences': asdict(self.preferences),
                'timestamp': datetime.now().isoformat()
            }

            preset_file = self.config_dir / f"preset_{name}.json"
            preset_file.write_text(json.dumps(preset, indent=2))

            return True

        except Exception as e:
            print(f"❌ Failed to save preset: {e}")
            return False

    async def load_configuration_preset(self, name: str) -> bool:
        """Load a saved configuration preset"""
        try:
            preset_file = self.config_dir / f"preset_{name}.json"

            if not preset_file.exists():
                print(f"❌ Preset '{name}' not found")
                return False

            preset_data = json.loads(preset_file.read_text())

            # Load providers
            for provider_name, provider_data in preset_data['providers'].items():
                self.providers[provider_name] = ProviderConfig(**provider_data)

            # Load preferences
            self.preferences = UserPreferences(**preset_data['preferences'])

            # Save loaded configuration
            await self._save_providers()
            await self._save_preferences()

            return True

        except Exception as e:
            print(f"❌ Failed to load preset: {e}")
            return False

    async def optimize_for_goal(self, goal: str) -> Dict[str, Any]:
        """Optimize configuration for specific goals"""
        optimization_results = {
            'goal': goal,
            'changes': [],
            'recommendations': []
        }

        if goal == "speed":
            # Switch to fastest model
            fastest_provider = await self._find_fastest_provider()
            if fastest_provider:
                await self.switch_provider(fastest_provider.name)
                optimization_results['changes'].append(f"Switched to {fastest_provider.name} for speed")

            # Reduce context window for faster responses
            for provider in self.providers.values():
                provider.max_tokens = min(provider.max_tokens, 1000)
            optimization_results['changes'].append("Reduced context window for faster responses")

        elif goal == "cost":
            # Switch to cheapest provider
            cheapest_provider = await self._find_cheapest_provider()
            if cheapest_provider:
                await self.switch_provider(cheapest_provider.name)
                optimization_results['changes'].append(f"Switched to {cheapest_provider.name} for cost efficiency")

            # Enable cost optimization
            self.preferences.cost_optimization = True
            optimization_results['changes'].append("Enabled cost optimization features")

        elif goal == "quality":
            # Switch to highest quality provider
            quality_provider = await self._find_highest_quality_provider()
            if quality_provider:
                await self.switch_provider(quality_provider.name)
                optimization_results['changes'].append(f"Switched to {quality_provider.name} for quality")

            # Increase context window for better responses
            for provider in self.providers.values():
                provider.max_tokens = max(provider.max_tokens, 4000)
            optimization_results['changes'].append("Increased context window for quality")

        # Save changes
        await self._save_providers()
        await self._save_preferences()

        return optimization_results

    async def _test_provider_connection(self, provider: ProviderConfig) -> bool:
        """Test connection to a provider"""
        try:
            # Implementation would test actual API connection
            # For now, simulate connection test
            await asyncio.sleep(0.1)  # Simulate network call
            return True
        except Exception:
            return False

    async def _find_fastest_provider(self) -> Optional[ProviderConfig]:
        """Find the fastest configured provider"""
        # Implementation would benchmark providers
        return next(iter(self.providers.values())) if self.providers else None

    async def _find_cheapest_provider(self) -> Optional[ProviderConfig]:
        """Find the most cost-effective provider"""
        # Implementation would compare pricing
        return next(iter(self.providers.values())) if self.providers else None

    async def _find_highest_quality_provider(self) -> Optional[ProviderConfig]:
        """Find the highest quality provider"""
        # Implementation would rank by quality metrics
        return next(iter(self.providers.values())) if self.providers else None

    async def _save_providers(self) -> None:
        """Save provider configuration"""
        providers_data = {name: asdict(provider) for name, provider in self.providers.items()}
        self.providers_file.write_text(json.dumps(providers_data, indent=2))

    async def _save_preferences(self) -> None:
        """Save user preferences"""
        self.preferences_file.write_text(json.dumps(asdict(self.preferences), indent=2))
```

### Power User Features

```python
# src/cli/power/power_features.py

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import json
import asyncio

@dataclass
class Checkpoint:
    """Learning session checkpoint"""
    name: str
    timestamp: datetime
    session_data: Dict[str, Any]
    learning_state: Dict[str, Any]
    metadata: Dict[str, Any]

class PowerUserFeatures:
    """Advanced features for power users"""

    def __init__(self, session_manager, config_manager, console):
        self.session_manager = session_manager
        self.config_manager = config_manager
        self.console = console
        self.checkpoints = {}
        self.shortcuts = {}

    async def create_checkpoint(self, name: str, context: Dict[str, Any]) -> bool:
        """Create a learning session checkpoint"""
        try:
            # Get current session state
            current_session = await self.session_manager.get_active_session(context.get('user_id'))

            if not current_session:
                self.console.print("❌ No active session to checkpoint", style="red")
                return False

            checkpoint = Checkpoint(
                name=name,
                timestamp=datetime.now(),
                session_data={
                    'concepts_explored': current_session.concepts_explored,
                    'concepts_completed': current_session.concepts_completed,
                    'learning_progress': current_session.learning_progress
                },
                learning_state={
                    'current_concept': context.get('current_concept'),
                    'recent_concepts': context.get('recent_concepts', []),
                    'weak_areas': context.get('weak_areas', []),
                    'mastered_concepts': context.get('mastered_concepts', [])
                },
                metadata={
                    'session_duration': str(datetime.now() - current_session.start_time),
                    'interactions_count': len(current_session.interactions),
                    'user_context': context
                }
            )

            self.checkpoints[name] = checkpoint
            await self._save_checkpoints()

            self.console.print(f"✅ Checkpoint saved: {name}", style="green")
            return True

        except Exception as e:
            self.console.print(f"❌ Failed to create checkpoint: {e}", style="red")
            return False

    async def restore_checkpoint(self, name: str, context: Dict[str, Any]) -> bool:
        """Restore a learning session checkpoint"""
        try:
            if name not in self.checkpoints:
                self.console.print(f"❌ Checkpoint '{name}' not found", style="red")
                return False

            checkpoint = self.checkpoints[name]

            # Create new session with restored state
            session_id = await self.session_manager.create_session(context.get('user_id'))

            # Restore learning state
            for concept in checkpoint.session_data['concepts_explored']:
                await self.session_manager.update_session(
                    session_id, 'concept_explored', {'concept': concept}
                )

            for concept in checkpoint.session_data['concepts_completed']:
                await self.session_manager.update_session(
                    session_id, 'concept_completed', {'concept': concept}
                )

            # Update context with restored state
            context.update(checkpoint.learning_state)
            context['restored_from_checkpoint'] = name
            context['checkpoint_timestamp'] = checkpoint.timestamp.isoformat()

            self.console.print(f"✅ Restored checkpoint: {name}", style="green")
            self.console.print(f"   Session from: {checkpoint.timestamp.strftime('%Y-%m-%d %H:%M')}")
            self.console.print(f"   Concepts explored: {len(checkpoint.session_data['concepts_explored'])}")

            return True

        except Exception as e:
            self.console.print(f"❌ Failed to restore checkpoint: {e}", style="red")
            return False

    async def list_checkpoints(self) -> None:
        """List all available checkpoints"""
        if not self.checkpoints:
            self.console.print("No checkpoints available", style="yellow")
            return

        from rich.table import Table

        table = Table(title="📁 Available Checkpoints")
        table.add_column("Name", style="cyan")
        table.add_column("Created", style="white")
        table.add_column("Concepts", style="green")
        table.add_column("Duration", style="yellow")

        for name, checkpoint in sorted(self.checkpoints.items(), key=lambda x: x[1].timestamp, reverse=True):
            concepts_count = len(checkpoint.session_data['concepts_explored'])
            duration = checkpoint.metadata.get('session_duration', 'Unknown')

            table.add_row(
                name,
                checkpoint.timestamp.strftime('%Y-%m-%d %H:%M'),
                str(concepts_count),
                duration
            )

        self.console.print(table)

    async def create_shortcut(self, name: str, command_sequence: List[str]) -> bool:
        """Create a custom command shortcut"""
        try:
            self.shortcuts[name] = {
                'sequence': command_sequence,
                'created_at': datetime.now().isoformat(),
                'usage_count': 0
            }

            await self._save_shortcuts()
            self.console.print(f"✅ Shortcut created: {name}", style="green")
            self.console.print(f"   Sequence: {' → '.join(command_sequence)}")

            return True

        except Exception as e:
            self.console.print(f"❌ Failed to create shortcut: {e}", style="red")
            return False

    async def execute_shortcut(self, name: str, context: Dict[str, Any]) -> bool:
        """Execute a saved shortcut"""
        try:
            if name not in self.shortcuts:
                self.console.print(f"❌ Shortcut '{name}' not found", style="red")
                return False

            shortcut = self.shortcuts[name]
            sequence = shortcut['sequence']

            self.console.print(f"🚀 Executing shortcut: {name}", style="blue")

            # Execute command sequence
            for command in sequence:
                self.console.print(f"   Executing: {command}")
                # Implementation would execute each command
                await asyncio.sleep(0.1)  # Simulate execution

            # Update usage count
            shortcut['usage_count'] += 1
            await self._save_shortcuts()

            self.console.print(f"✅ Shortcut completed: {name}", style="green")
            return True

        except Exception as e:
            self.console.print(f"❌ Failed to execute shortcut: {e}", style="red")
            return False

    async def batch_operation(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute batch operations for power users"""
        results = {
            'total': len(operations),
            'successful': 0,
            'failed': 0,
            'errors': []
        }

        self.console.print(f"🔄 Executing {len(operations)} batch operations...", style="blue")

        for i, operation in enumerate(operations, 1):
            try:
                op_type = operation.get('type')
                op_data = operation.get('data', {})

                self.console.print(f"[{i}/{len(operations)}] {op_type}...", end=" ")

                # Execute operation based on type
                if op_type == 'checkpoint':
                    success = await self.create_checkpoint(op_data.get('name'), op_data.get('context', {}))
                elif op_type == 'config_preset':
                    success = await self.config_manager.save_configuration_preset(op_data.get('name'))
                elif op_type == 'optimize':
                    success = await self.config_manager.optimize_for_goal(op_data.get('goal'))
                else:
                    success = False
                    results['errors'].append(f"Unknown operation type: {op_type}")

                if success:
                    results['successful'] += 1
                    self.console.print("✅", style="green")
                else:
                    results['failed'] += 1
                    self.console.print("❌", style="red")

            except Exception as e:
                results['failed'] += 1
                results['errors'].append(str(e))
                self.console.print("❌", style="red")

        # Summary
        self.console.print(f"\n📊 Batch operation complete:")
        self.console.print(f"   Total: {results['total']}")
        self.console.print(f"   Successful: {results['successful']}")
        self.console.print(f"   Failed: {results['failed']}")

        if results['errors']:
            self.console.print("\n❌ Errors:")
            for error in results['errors']:
                self.console.print(f"   • {error}")

        return results

    async def _save_checkpoints(self) -> None:
        """Save checkpoints to file"""
        checkpoints_file = self.config_manager.config_dir / "checkpoints.json"

        checkpoints_data = {}
        for name, checkpoint in self.checkpoints.items():
            checkpoints_data[name] = {
                'name': checkpoint.name,
                'timestamp': checkpoint.timestamp.isoformat(),
                'session_data': checkpoint.session_data,
                'learning_state': checkpoint.learning_state,
                'metadata': checkpoint.metadata
            }

        checkpoints_file.write_text(json.dumps(checkpoints_data, indent=2))

    async def _save_shortcuts(self) -> None:
        """Save shortcuts to file"""
        shortcuts_file = self.config_manager.config_dir / "shortcuts.json"
        shortcuts_file.write_text(json.dumps(self.shortcuts, indent=2))
```

These advanced CLI patterns complete the CLI Development Guide with all the sophisticated features shown in the examples directory. The guide now covers:

1. **Tab Completion System** - Intelligent command completion
2. **Interactive Navigation** - Keyboard shortcuts and navigation modes
3. **Configuration Management** - Multi-provider setup, presets, optimization
4. **Power User Features** - Checkpoints, shortcuts, batch operations
5. **Advanced Session Management** - State persistence and restoration

This comprehensive implementation ensures developers have all the patterns needed to build the sophisticated CLI experience that users see in the examples.
            
            progress.update(100, description="Generating insights...")
        
        # Generate analysis results
        analysis_results = {
            "type": "progress",
            "period_days": days,
            "insights": [
                "You've been consistent with your learning schedule",
                "Consider focusing more on practical exercises",
                "Your concept understanding is improving steadily"
            ],
            "metrics": {
                "concepts_learned": 12,
                "quizzes_completed": 8,
                "study_hours": 24.5
            }
        }
        
        # Display results
        self._display_analysis_results(analysis_results)
        
        return CommandResult(success=True, data=analysis_results)
    
    async def _analyze_concepts(self, options: List[str], context: Dict[str, Any]) -> CommandResult:
        """Analyze concept mastery"""
        # Implementation similar to _analyze_progress
        pass
    
    async def _analyze_tokens(self, options: List[str], context: Dict[str, Any]) -> CommandResult:
        """Analyze token usage"""
        # Implementation similar to _analyze_progress
        pass
    
    def _display_analysis_results(self, results: Dict[str, Any]) -> None:
        """Display analysis results in a formatted way"""
        self.cli_interface.display_header(f"📊 {results['type'].title()} Analysis")
        
        # Display insights
        if "insights" in results:
            self.cli_interface.display_section("Key Insights", "\n".join(f"• {insight}" for insight in results["insights"]))
        
        # Display metrics
        if "metrics" in results:
            metrics_text = "\n".join(f"  {key}: {value}" for key, value in results["metrics"].items())
            self.cli_interface.display_section("Metrics", metrics_text)
```

## Testing Guidelines

### Unit Testing

Each command should have comprehensive unit tests:

```python
import pytest
from unittest.mock import Mock, patch
from src.cli.commands.system.status import StatusCommand

class TestStatusCommand:
    def setup_method(self):
        """Setup test fixtures"""
        self.mock_cli_interface = Mock()
        self.command = StatusCommand()
        self.command.cli_interface = self.mock_cli_interface
    
    @pytest.mark.asyncio
    async def test_status_command_success(self):
        """Test successful status command execution"""
        # Setup
        context = {"workspace_path": "/test/workspace"}
        
        # Execute
        result = await self.command.execute([], context)
        
        # Assert
        assert result.success is True
        assert "workspace" in result.data
        assert result.data["workspace"] == "/test/workspace"
        self.mock_cli_interface.display_info.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_status_command_with_error(self):
        """Test status command with error"""
        # Setup
        context = {"workspace_path": None}
        
        # Execute
        result = await self.command.execute([], context)
        
        # Assert
        assert result.success is False
        assert "error" in result
        self.mock_cli_interface.display_error.assert_called_once()
```

### Integration Testing

Integration tests should verify command interactions:

```python
import pytest
from src.cli.commands.registry import CommandRegistry
from src.cli.commands.system import StatusCommand
from src.cli.core.rich_interface import RichInterface

class TestCommandIntegration:
    def setup_method(self):
        """Setup test fixtures"""
        self.cli_interface = RichInterface()
        self.registry = CommandRegistry(self.cli_interface)
        self.registry.register_command(StatusCommand())
    
    def test_command_registration(self):
        """Test command registration"""
        command = self.registry.get_command("/status")
        assert command is not None
        assert command.info.name == "status"
    
    def test_command_execution(self):
        """Test command execution through registry"""
        result = self.registry.execute_command("/status", {"workspace_path": "/test"})
        assert result.success is True
```

## Performance Considerations

### 1. Command Loading
- Use lazy loading for resource-intensive commands
- Cache frequently accessed data
- Optimize database queries

### 2. Memory Usage
- Avoid memory leaks in long-running operations
- Use appropriate data structures
- Clean up resources properly

### 3. Concurrency
- Use async/await for I/O operations
- Implement proper locking for shared resources
- Handle concurrent command execution

## Deployment Guidelines

### 1. Version Management
- Use semantic versioning for commands
- Maintain backward compatibility
- Document breaking changes

### 2. Configuration
- Use environment-specific configurations
- Provide sensible defaults
- Support configuration validation

### 3. Monitoring
- Log command execution metrics
- Monitor error rates
- Track performance indicators

## Real Command Examples

### Example 1: Interactive Learning Command

```bash
# Real user interaction with a learning command
Learning Catalyst > /explain Python decorators
🧠 [AI Processing with deepseek-chat model...]

💡 **Python Decorators Explained:**

Decorators are functions that modify the behavior of other functions.
They wrap functions to extend their functionality without changing the source code.

```python
# Basic decorator syntax
@timing_decorator
def my_function():
    # Function code here
    pass
```

**Key Concepts:**
✅ Functions as first-class objects
✅ Higher-order functions
✅ Syntactic sugar for function wrapping
✅ Real-world use cases (logging, caching, timing)

Would you like to see practical examples or create your own decorator?
```

### Example 2: Configuration Command with Validation

```bash
Learning Catalyst > /config provider openai
🔧 **OpenAI Provider Configuration**

Enter your OpenAI API key: sk-proj-*********************************

✅ Testing API connection... Success!
✅ Fetching available models from OpenAI...

🤖 **Available Models:**
1. gpt-4o (128K context, $0.005/1K input, $0.015/1K output)
2. gpt-4o-mini (128K context, $0.00015/1K input, $0.0006/1K output)
3. gpt-4-turbo (128K context, $0.01/1K input, $0.03/1K output)

Select model (1-3) [default: 1]: 2
✅ Model set to: gpt-4o-mini

💰 **Cost Estimate:** ~$0.75 per 1M tokens
📊 **Performance:** Fast response times, high quality
```

### Example 3: Analytics Command with Visual Output

```bash
Learning Catalyst > /analytics progress
📊 **Learning Progress Analysis**

📅 **Time Period:** Last 30 days (2024-09-08 to 2024-10-08)

🎯 **Overall Progress: ████████░░ 80%**

**Key Metrics:**
📚 Concepts Studied: 24 (+8 this month)
🧪 Quizzes Completed: 15 (+5 this month)
⏱️ Study Time: 12.5 hours (+3.2 hours this month)
🎯 Success Rate: 87% (↑ from 82% last month)

**Recent Achievements:**
🏆 Mastered Python decorators
🏆 Completed Advanced SQL module
🏆 7-day learning streak!

**Recommendations:**
💡 Focus on practical exercises for reinforcement
💡 Schedule review sessions for previously learned concepts
💡 Explore related topics in machine learning
```

## Troubleshooting

### Common Development Issues

1. **Command Not Found**
   ```bash
   # Check if command is registered
   Learning Catalyst > /help | grep "your-command"

   # Verify import in appropriate __init__.py
   # Check command spelling and aliases
   ```

2. **Import Errors**
   ```bash
   # Verify module structure
   python -c "from src.cli.commands.learning.yourcommand import YourCommand"

   # Check Python path and virtual environment
   echo $PYTHONPATH
   which python
   ```

3. **Async Command Issues**
   ```bash
   # Test command in isolation
   python -c "
   import asyncio
   from src.cli.commands.learning.yourcommand import YourCommand
   cmd = YourCommand()
   asyncio.run(cmd.execute([], {}))
   "
   ```

### Real Debugging Scenarios

**Scenario**: Command hangs indefinitely
```bash
# Check for blocking operations
# Look for missing await statements
# Verify database connections are properly closed

# Add debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test with timeout
timeout 10s learning-catalyst /your-command
```

**Scenario**: Rich formatting not working
```bash
# Check terminal compatibility
echo $TERM

# Test rich components separately
python -c "from rich.console import Console; Console().print('[bold green]Test[/bold green]')"

# Verify color support
python -c "import colorama; print(colorama.Fore.GREEN + 'Test' + colorama.Fore.RESET)"
```

### Performance Debugging

```bash
# Profile command execution
python -m cProfile -o profile.stats -c "
from src.cli.commands.learning.yourcommand import YourCommand
import asyncio
cmd = YourCommand()
asyncio.run(cmd.execute([], {}))
"

# Analyze results
python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative').print_stats(10)
"
```

## Testing in Development

### Quick Test Commands

```bash
# Run specific command tests
pytest tests/unit/cli/test_your_command.py -v

# Test CLI integration
pytest tests/integration/test_cli_integration.py::test_your_command

# Manual testing workflow
python -m src.cli.main --test-mode
Learning Catalyst (test) > /your-command --test-data
```

### Mock Testing Examples

```python
# Mock AI responses for consistent testing
@patch('src.ai.providers.openai.OpenAIProvider.generate_response')
async def test_command_with_mock_ai(mock_ai):
    mock_ai.return_value = {"response": "Test AI response"}

    command = YourCommand()
    result = await command.execute(["test"], {})

    assert result.success is True
    assert "Test AI response" in str(result.data)
```

## Best Practices Summary

### ✅ Do's
- Use async/await for all I/O operations
- Provide rich, informative output
- Include comprehensive help text
- Handle errors gracefully with user-friendly messages
- Write comprehensive tests
- Follow the established naming conventions
- Use progress indicators for long operations

### ❌ Don'ts
- Don't use blocking operations in async commands
- Don't ignore error handling
- Don't hardcode configuration values
- Don't skip testing edge cases
- Don't use print() - use the CLI interface methods
- Don't forget to register commands in __init__.py

## Conclusion

The Learning Catalyst CLI system provides a robust, extensible foundation for building interactive learning experiences. By following the patterns, examples, and best practices outlined in this guide, developers can create consistent, maintainable, and user-friendly commands that integrate seamlessly with the existing system.

The modular architecture ensures that new commands can be added easily while maintaining consistency with existing functionality. The comprehensive testing framework, performance considerations, and real-world examples ensure that the system remains reliable and efficient as it grows.

---

*Last updated: October 8, 2025*
*Version: 2.0.0*
*See also: [Interactive Features Guide](interactive-features.md), [AI Integration Guide](ai-integration.md)*