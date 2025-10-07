# Learning Catalyst CLI - Developer Guide

## Overview

This guide provides comprehensive documentation for developers working with the Learning Catalyst CLI system. It covers the architecture, patterns, and best practices for developing and maintaining CLI commands.

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

## Troubleshooting

### Common Issues

1. **Command Not Found**
   - Check command registration
   - Verify command aliases
   - Ensure proper import paths

2. **Execution Errors**
   - Check context parameters
   - Verify argument parsing
   - Review error handling

3. **Performance Issues**
   - Profile command execution
   - Check database queries
   - Optimize resource usage

### Debugging Tips

1. Use logging for debugging
2. Test with different contexts
3. Verify command registration
4. Check error messages
5. Use debug mode for detailed output

## Conclusion

The Learning Catalyst CLI system provides a robust, extensible foundation for command-line interactions. By following the patterns and best practices outlined in this guide, developers can create consistent, maintainable, and user-friendly commands that integrate seamlessly with the existing system.

The modular architecture ensures that new commands can be added easily while maintaining consistency with existing functionality. The comprehensive testing framework and performance considerations ensure that the system remains reliable and efficient as it grows.