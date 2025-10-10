# Adding New Commands

---
title: Learning Catalyst Command Development Guide
description: Step-by-step guide for creating new CLI commands with examples and best practices
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide provides comprehensive instructions for adding new commands to Learning Catalyst's CLI interface. It covers command structure, argument parsing, response formatting, integration patterns, and testing strategies.

## Command Architecture Overview

### Command Processing Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                   Command Processing Pipeline               │
│                                                             │
│  User Input → Command Parser → Command Router → Executor     │
│                    ↓                    ↓                  ↓    │
│               Validation           Context          Response │
│                    ↓                    ↓                  ↓    │
│               Authorization       Session           Display  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Command Components

1. **Command Definition**: Command metadata and registration
2. **Argument Parser**: Command-line argument parsing and validation
3. **Executor**: Core command logic and business operations
4. **Response Formatter**: Output formatting and display
5. **Error Handler**: Error processing and user feedback

## Creating a New Command

### Step 1: Define Command Class

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import argparse
import asyncio

from src.api.response import Response
from src.session.session_manager import SessionManager
from src.ai.ai_manager import AIManager

@dataclass
class CommandContext:
    """Context object passed to commands."""
    user_id: str
    session_id: str
    session_manager: SessionManager
    ai_manager: AIManager
    config: Dict[str, Any]

class BaseCommand(ABC):
    """Base class for all CLI commands."""

    def __init__(self):
        self.name = ""
        self.description = ""
        self.aliases = []
        self.category = "general"
        self.requires_ai = False
        self.requires_auth = False

    @abstractmethod
    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add command-specific arguments to parser."""
        pass

    @abstractmethod
    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute the command with parsed arguments and context."""
        pass

    def get_help_text(self) -> str:
        """Get help text for the command."""
        help_text = f"{self.name}"
        if self.aliases:
            help_text += f" (aliases: {', '.join(self.aliases)})"
        help_text += f"\n  {self.description}"
        return help_text

    def validate_args(self, args: argparse.Namespace) -> Optional[str]:
        """Validate arguments before execution."""
        return None
```

### Step 2: Implement Command Logic

```python
class BookmarksCommand(BaseCommand):
    """Command for managing learning bookmarks."""

    def __init__(self):
        super().__init__()
        self.name = "bookmarks"
        self.description = "Manage learning bookmarks and saved topics"
        self.aliases = ["bm", "bookmark"]
        self.category = "learning"
        self.requires_auth = True

    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add bookmark-specific arguments."""
        subparsers = parser.add_subparsers(dest='action', help='Bookmark actions')

        # Add bookmark
        add_parser = subparsers.add_parser('add', help='Add a new bookmark')
        add_parser.add_argument('topic', help='Topic to bookmark')
        add_parser.add_argument('--description', '-d', help='Description of the bookmark')
        add_parser.add_argument('--tags', '-t', nargs='*', help='Tags for the bookmark')

        # List bookmarks
        list_parser = subparsers.add_parser('list', help='List all bookmarks')
        list_parser.add_argument('--tag', help='Filter bookmarks by tag')
        list_parser.add_argument('--recent', action='store_true', help='Show recent bookmarks only')

        # Remove bookmark
        remove_parser = subparsers.add_parser('remove', help='Remove a bookmark')
        remove_parser.add_argument('topic', help='Topic to remove')

        # Search bookmarks
        search_parser = subparsers.add_parser('search', help='Search bookmarks')
        search_parser.add_argument('query', help='Search query')
        search_parser.add_argument('--in', choices=['topic', 'description', 'tags'],
                                   default='all', help='Search field')

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute bookmark command based on action."""
        try:
            if args.action == 'add':
                return await self._add_bookmark(args, context)
            elif args.action == 'list':
                return await self._list_bookmarks(args, context)
            elif args.action == 'remove':
                return await self._remove_bookmark(args, context)
            elif args.action == 'search':
                return await self._search_bookmarks(args, context)
            else:
                return Response.error(
                    "INVALID_ACTION",
                    f"Unknown action: {args.action}",
                    suggestions=['add', 'list', 'remove', 'search']
                )
        except Exception as e:
            return Response.error(
                "COMMAND_ERROR",
                f"Error executing bookmark command: {str(e)}"
            )

    async def _add_bookmark(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Add a new bookmark."""
        # Validate bookmark doesn't exist
        existing = await context.session_manager.get_bookmark(context.user_id, args.topic)
        if existing:
            return Response.error(
                "BOOKMARK_EXISTS",
                f"Bookmark for '{args.topic}' already exists",
                existing_bookmark=existing
            )

        # Create bookmark data
        bookmark_data = {
            'topic': args.topic,
            'description': args.description or '',
            'tags': args.tags or [],
            'created_at': datetime.now().isoformat(),
            'last_accessed': None,
            'access_count': 0
        }

        # Save bookmark
        bookmark_id = await context.session_manager.add_bookmark(context.user_id, bookmark_data)

        # Log interaction
        await context.session_manager.log_interaction(
            context.user_id,
            'bookmark_added',
            {'topic': args.topic, 'bookmark_id': bookmark_id}
        )

        return Response.success({
            'message': f"Bookmark '{args.topic}' added successfully",
            'bookmark_id': bookmark_id,
            'topic': args.topic,
            'tags': args.tags or []
        })

    async def _list_bookmarks(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """List user bookmarks."""
        bookmarks = await context.session_manager.get_bookmarks(
            context.user_id,
            tag=args.tag,
            recent_only=args.recent
        )

        if not bookmarks:
            return Response.success({
                'message': 'No bookmarks found',
                'bookmarks': []
            })

        # Format bookmarks for display
        formatted_bookmarks = []
        for bookmark in bookmarks:
            formatted_bookmarks.append({
                'topic': bookmark['topic'],
                'description': bookmark['description'][:100] + '...' if len(bookmark['description']) > 100 else bookmark['description'],
                'tags': bookmark['tags'],
                'created_at': bookmark['created_at'],
                'access_count': bookmark['access_count']
            })

        return Response.success({
            'bookmarks': formatted_bookmarks,
            'count': len(formatted_bookmarks),
            'filter_tag': args.tag,
            'recent_only': args.recent
        })

    async def _remove_bookmark(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Remove a bookmark."""
        bookmark = await context.session_manager.get_bookmark(context.user_id, args.topic)
        if not bookmark:
            return Response.error(
                "BOOKMARK_NOT_FOUND",
                f"Bookmark for '{args.topic}' not found",
                suggestions=[
                    'Use /bookmarks list to see available bookmarks',
                    'Check topic spelling'
                ]
            )

        # Remove bookmark
        success = await context.session_manager.remove_bookmark(context.user_id, args.topic)

        if success:
            await context.session_manager.log_interaction(
                context.user_id,
                'bookmark_removed',
                {'topic': args.topic}
            )

            return Response.success({
                'message': f"Bookmark '{args.topic}' removed successfully"
            })
        else:
            return Response.error(
                "REMOVAL_FAILED",
                f"Failed to remove bookmark '{args.topic}'"
            )

    async def _search_bookmarks(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Search bookmarks."""
        results = await context.session_manager.search_bookmarks(
            context.user_id,
            args.query,
            search_field=args.in
        )

        if not results:
            return Response.success({
                'message': f"No bookmarks found matching '{args.query}'",
                'results': []
            })

        return Response.success({
            'query': args.query,
            'search_field': args.in,
            'results': results,
            'count': len(results)
        })

    def validate_args(self, args: argparse.Namespace) -> Optional[str]:
        """Validate bookmark command arguments."""
        if not args.action:
            return "Action is required. Use: add, list, remove, or search"

        if args.action in ['add', 'remove', 'search'] and not hasattr(args, 'topic') and not hasattr(args, 'query'):
            return f"Topic or query is required for '{args.action}' action"

        if args.action == 'add' and args.tags:
            if len(args.tags) > 10:
                return "Maximum 10 tags allowed per bookmark"

            for tag in args.tags:
                if len(tag) > 50:
                    return f"Tag '{tag}' is too long (max 50 characters)"

        return None
```

### Step 3: Register Command

```python
class CommandRegistry:
    """Registry for managing CLI commands."""

    def __init__(self):
        self.commands: Dict[str, BaseCommand] = {}
        self.categories: Dict[str, List[str]] = {}

    def register(self, command: BaseCommand):
        """Register a new command."""
        # Register primary command name
        self.commands[command.name] = command

        # Register aliases
        for alias in command.aliases:
            self.commands[alias] = command

        # Add to category
        if command.category not in self.categories:
            self.categories[command.category] = []
        if command.name not in self.categories[command.category]:
            self.categories[command.category].append(command.name)

    def get_command(self, name: str) -> Optional[BaseCommand]:
        """Get command by name or alias."""
        return self.commands.get(name)

    def list_commands(self, category: Optional[str] = None) -> List[BaseCommand]:
        """List all commands, optionally filtered by category."""
        if category:
            command_names = self.categories.get(category, [])
            return [self.commands[name] for name in command_names if name in self.commands]
        else:
            # Return unique commands (exclude aliases)
            unique_commands = {}
            for name, command in self.commands.items():
                if command.name not in unique_commands:
                    unique_commands[command.name] = command
            return list(unique_commands.values())

    def get_categories(self) -> List[str]:
        """Get all command categories."""
        return list(self.categories.keys())

# Global command registry
command_registry = CommandRegistry()

# Register the bookmarks command
command_registry.register(BookmarksCommand())
```

## Advanced Command Features

### Interactive Commands

```python
class InteractiveCommand(BaseCommand):
    """Base class for interactive commands."""

    def __init__(self):
        super().__init__()
        self.interactive = True

    async def execute_interactive(self, context: CommandContext) -> Response:
        """Execute interactive command loop."""
        while True:
            try:
                # Get user input
                user_input = await self._get_user_input()

                # Handle special commands
                if user_input.lower() in ['exit', 'quit', 'q']:
                    return Response.success({"message": "Interactive session ended"})

                # Process input
                response = await self._process_interactive_input(user_input, context)

                # Display response
                await self._display_response(response)

                # Check if command signals completion
                if response.metadata.get('complete', False):
                    break

            except KeyboardInterrupt:
                return Response.success({"message": "Interactive session cancelled"})
            except Exception as e:
                error_response = Response.error("INTERACTIVE_ERROR", str(e))
                await self._display_response(error_response)

        return Response.success({"message": "Interactive session completed"})

    async def _get_user_input(self) -> str:
        """Get user input interactively."""
        # This would be implemented based on the CLI framework
        pass

    async def _process_interactive_input(self, user_input: str, context: CommandContext) -> Response:
        """Process user input in interactive mode."""
        # Subclass implementation
        pass

    async def _display_response(self, response: Response):
        """Display response to user."""
        # This would be implemented based on the CLI framework
        pass
```

### Batch Processing Commands

```python
class BatchCommand(BaseCommand):
    """Base class for batch processing commands."""

    def __init__(self):
        super().__init__()
        self.supports_batch = True

    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add batch-specific arguments."""
        super().add_arguments(parser)
        parser.add_argument('--batch', action='store_true', help='Enable batch processing')
        parser.add_argument('--input-file', help='Input file for batch processing')
        parser.add_argument('--output-file', help='Output file for batch results')
        parser.add_argument('--parallel', type=int, default=1, help='Number of parallel workers')
        parser.add_argument('--continue-on-error', action='store_true', help='Continue processing on errors')

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute command with optional batch processing."""
        if args.batch or args.input_file:
            return await self._execute_batch(args, context)
        else:
            return await self._execute_single(args, context)

    async def _execute_batch(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute batch processing."""
        # Read input items
        items = await self._read_batch_items(args)

        if not items:
            return Response.error("NO_INPUT_ITEMS", "No items to process")

        # Process items
        results = await self._process_batch_items(items, args, context)

        # Save results if requested
        if args.output_file:
            await self._save_batch_results(results, args.output_file)

        return Response.success({
            'processed_items': len(items),
            'successful_items': sum(1 for r in results if r.success),
            'failed_items': sum(1 for r in results if not r.success),
            'results': results
        })

    async def _execute_single(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute single item processing."""
        # Subclass implementation
        pass

    async def _read_batch_items(self, args: argparse.Namespace) -> List[Any]:
        """Read items for batch processing."""
        # Subclass implementation
        pass

    async def _process_batch_items(self, items: List[Any], args: argparse.Namespace,
                                 context: CommandContext) -> List[Response]:
        """Process items in batch."""
        if args.parallel > 1:
            return await self._process_parallel(items, args, context)
        else:
            return await self._process_sequential(items, args, context)

    async def _process_sequential(self, items: List[Any], args: argparse.Namespace,
                                 context: CommandContext) -> List[Response]:
        """Process items sequentially."""
        results = []
        for item in items:
            try:
                result = await self._process_single_item(item, args, context)
                results.append(result)
            except Exception as e:
                if args.continue_on_error:
                    results.append(Response.error("ITEM_ERROR", str(e)))
                else:
                    raise

        return results

    async def _process_parallel(self, items: List[Any], args: argparse.Namespace,
                               context: CommandContext) -> List[Response]:
        """Process items in parallel."""
        import asyncio

        semaphore = asyncio.Semaphore(args.parallel)

        async def process_with_semaphore(item):
            async with semaphore:
                try:
                    return await self._process_single_item(item, args, context)
                except Exception as e:
                    return Response.error("ITEM_ERROR", str(e))

        tasks = [process_with_semaphore(item) for item in items]
        return await asyncio.gather(*tasks)

    async def _process_single_item(self, item: Any, args: argparse.Namespace,
                                  context: CommandContext) -> Response:
        """Process a single item in batch."""
        # Subclass implementation
        pass

    async def _save_batch_results(self, results: List[Response], output_file: str):
        """Save batch results to file."""
        import json

        output_data = {
            'timestamp': datetime.now().isoformat(),
            'total_items': len(results),
            'successful_items': sum(1 for r in results if r.success),
            'failed_items': sum(1 for r in results if not r.success),
            'results': [r.to_dict() for r in results]
        }

        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2)
```

### Command with AI Integration

```python
class AICommand(BaseCommand):
    """Base class for commands that require AI interaction."""

    def __init__(self):
        super().__init__()
        self.requires_ai = True

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute command with AI integration."""
        # Validate AI is available
        if not context.ai_manager.is_configured():
            return Response.error(
                "AI_NOT_CONFIGURED",
                "AI provider not configured",
                suggestions=[
                    'Run /config provider setup',
                    'Configure API keys for AI services'
                ]
            )

        # Check AI credits/rate limits
        credit_status = await context.ai_manager.check_credits()
        if not credit_status['available']:
            return Response.error(
                "INSUFFICIENT_CREDITS",
                f"Insufficient AI credits: {credit_status['message']}",
                suggestions=[
                    'Check your account balance',
                    'Wait for credit renewal',
                    'Use more efficient AI settings'
                ]
            )

        # Execute AI command
        return await self._execute_with_ai(args, context)

    async def _execute_with_ai(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute command with AI assistance."""
        # Subclass implementation
        pass

    async def _get_ai_response(self, prompt: str, context: CommandContext,
                             model: Optional[str] = None) -> str:
        """Get AI response with error handling."""
        try:
            response = await context.ai_manager.generate_response(
                prompt=prompt,
                model=model or context.config.get('ai', {}).get('default_model'),
                context=context
            )

            # Log AI usage
            await context.session_manager.log_ai_usage(
                context.user_id,
                response.model,
                response.tokens_used,
                response.response_time
            )

            return response.content

        except Exception as e:
            raise CommandError(f"AI request failed: {str(e)}")

    def _build_ai_prompt(self, args: argparse.Namespace, context: CommandContext) -> str:
        """Build AI prompt from command arguments."""
        # Subclass implementation
        pass
```

## Command Testing

### Unit Testing Framework

```python
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import tempfile
import json

class TestBookmarksCommand(unittest.IsolatedAsyncioTestCase):
    """Test cases for BookmarksCommand."""

    async def asyncSetUp(self):
        """Set up test environment."""
        self.command = BookmarksCommand()

        # Mock dependencies
        self.mock_session_manager = AsyncMock()
        self.mock_ai_manager = AsyncMock()
        self.mock_config = {}

        # Create command context
        self.context = CommandContext(
            user_id="test_user",
            session_id="test_session",
            session_manager=self.mock_session_manager,
            ai_manager=self.mock_ai_manager,
            config=self.mock_config
        )

    async def test_add_bookmark_success(self):
        """Test successful bookmark addition."""
        # Arrange
        args = MagicMock()
        args.action = 'add'
        args.topic = 'Python Programming'
        args.description = 'Learn Python basics'
        args.tags = ['python', 'programming']

        self.mock_session_manager.get_bookmark.return_value = None
        self.mock_session_manager.add_bookmark.return_value = "bookmark_123"

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertTrue(response.success)
        self.assertEqual(response.data['topic'], 'Python Programming')
        self.assertEqual(response.data['tags'], ['python', 'programming'])

        # Verify mock calls
        self.mock_session_manager.get_bookmark.assert_called_once_with(
            "test_user", "Python Programming"
        )
        self.mock_session_manager.add_bookmark.assert_called_once()
        self.mock_session_manager.log_interaction.assert_called_once_with(
            "test_user", "bookmark_added",
            {'topic': 'Python Programming', 'bookmark_id': 'bookmark_123'}
        )

    async def test_add_bookmark_already_exists(self):
        """Test adding bookmark that already exists."""
        # Arrange
        args = MagicMock()
        args.action = 'add'
        args.topic = 'Existing Topic'
        args.description = 'Description'
        args.tags = []

        existing_bookmark = {
            'topic': 'Existing Topic',
            'description': 'Old description',
            'tags': ['old'],
            'created_at': '2025-10-08T10:00:00'
        }
        self.mock_session_manager.get_bookmark.return_value = existing_bookmark

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertFalse(response.success)
        self.assertEqual(response.error.code, 'BOOKMARK_EXISTS')
        self.assertIn('already exists', response.error.message)

    async def test_list_bookmarks_empty(self):
        """Test listing bookmarks when none exist."""
        # Arrange
        args = MagicMock()
        args.action = 'list'
        args.tag = None
        args.recent = False

        self.mock_session_manager.get_bookmarks.return_value = []

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertTrue(response.success)
        self.assertEqual(response.data['bookmarks'], [])
        self.assertEqual(response.data['count'], 0)

    async def test_list_bookmarks_with_items(self):
        """Test listing bookmarks with existing items."""
        # Arrange
        args = MagicMock()
        args.action = 'list'
        args.tag = None
        args.recent = False

        mock_bookmarks = [
            {
                'topic': 'Python Basics',
                'description': 'Learn Python fundamentals',
                'tags': ['python', 'basics'],
                'created_at': '2025-10-08T10:00:00',
                'access_count': 5
            },
            {
                'topic': 'Advanced Python',
                'description': 'Advanced Python concepts and patterns',
                'tags': ['python', 'advanced'],
                'created_at': '2025-10-08T11:00:00',
                'access_count': 2
            }
        ]
        self.mock_session_manager.get_bookmarks.return_value = mock_bookmarks

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertTrue(response.success)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['bookmarks']), 2)

        # Verify formatting
        formatted = response.data['bookmarks']
        self.assertEqual(formatted[0]['topic'], 'Python Basics')
        self.assertEqual(formatted[1]['topic'], 'Advanced Python')

    async def test_remove_bookmark_success(self):
        """Test successful bookmark removal."""
        # Arrange
        args = MagicMock()
        args.action = 'remove'
        args.topic = 'Python Basics'

        existing_bookmark = {'topic': 'Python Basics', 'description': 'Learn Python'}
        self.mock_session_manager.get_bookmark.return_value = existing_bookmark
        self.mock_session_manager.remove_bookmark.return_value = True

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertTrue(response.success)
        self.assertIn('removed successfully', response.data['message'])

        # Verify mock calls
        self.mock_session_manager.remove_bookmark.assert_called_once_with(
            "test_user", "Python Basics"
        )
        self.mock_session_manager.log_interaction.assert_called_once_with(
            "test_user", "bookmark_removed", {'topic': 'Python Basics'}
        )

    async def test_remove_bookmark_not_found(self):
        """Test removing bookmark that doesn't exist."""
        # Arrange
        args = MagicMock()
        args.action = 'remove'
        args.topic = 'Nonexistent Topic'

        self.mock_session_manager.get_bookmark.return_value = None

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertFalse(response.success)
        self.assertEqual(response.error.code, 'BOOKMARK_NOT_FOUND')
        self.assertIn('not found', response.error.message)

    async def test_search_bookmarks_with_results(self):
        """Test searching bookmarks with matching results."""
        # Arrange
        args = MagicMock()
        args.action = 'search'
        args.query = 'python'
        args.in = 'all'

        mock_results = [
            {
                'topic': 'Python Basics',
                'description': 'Learn Python fundamentals',
                'tags': ['python', 'basics'],
                'relevance_score': 0.95
            }
        ]
        self.mock_session_manager.search_bookmarks.return_value = mock_results

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertTrue(response.success)
        self.assertEqual(response.data['query'], 'python')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'], mock_results)

    async def test_search_bookmarks_no_results(self):
        """Test searching bookmarks with no results."""
        # Arrange
        args = MagicMock()
        args.action = 'search'
        args.query = 'nonexistent'
        args.in = 'all'

        self.mock_session_manager.search_bookmarks.return_value = []

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertTrue(response.success)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    async def test_invalid_action(self):
        """Test command with invalid action."""
        # Arrange
        args = MagicMock()
        args.action = 'invalid'

        # Act
        response = await self.command.execute(args, self.context)

        # Assert
        self.assertFalse(response.success)
        self.assertEqual(response.error.code, 'INVALID_ACTION')
        self.assertIn('suggestions', response.error.metadata)

    def test_validate_args_valid(self):
        """Test argument validation with valid arguments."""
        # Test valid add action
        args = MagicMock()
        args.action = 'add'
        args.topic = 'Test Topic'
        args.tags = ['tag1', 'tag2']

        error = self.command.validate_args(args)
        self.assertIsNone(error)

        # Test valid list action
        args.action = 'list'
        error = self.command.validate_args(args)
        self.assertIsNone(error)

    def test_validate_args_invalid(self):
        """Test argument validation with invalid arguments."""
        # Test missing action
        args = MagicMock()
        args.action = None
        error = self.command.validate_args(args)
        self.assertIsNotNone(error)
        self.assertIn('Action is required', error)

        # Test too many tags
        args = MagicMock()
        args.action = 'add'
        args.tags = [f'tag{i}' for i in range(15)]  # More than 10 tags
        error = self.command.validate_args(args)
        self.assertIsNotNone(error)
        self.assertIn('Maximum 10 tags', error)

        # Test tag too long
        args = MagicMock()
        args.action = 'add'
        args.tags = ['a' * 51]  # 51 characters
        error = self.command.validate_args(args)
        self.assertIsNotNone(error)
        self.assertIn('is too long', error)

if __name__ == '__main__':
    unittest.main()
```

### Integration Testing

```python
import pytest
import asyncio
from tempfile import TemporaryDirectory
import json

class TestBookmarksIntegration:
    """Integration tests for bookmarks command."""

    @pytest.fixture
    def setup_environment(self):
        """Set up test environment with real dependencies."""
        # Create temporary directory for test data
        self.temp_dir = TemporaryDirectory()

        # Initialize real session manager
        self.session_manager = SessionManager(
            db_path=f"{self.temp_dir.name}/test.db"
        )

        # Create command context
        self.context = CommandContext(
            user_id="integration_test_user",
            session_id="test_session",
            session_manager=self.session_manager,
            ai_manager=None,  # Not needed for this test
            config={}
        )

        # Initialize command
        self.command = BookmarksCommand()

    async def test_full_bookmark_workflow(self, setup_environment):
        """Test complete bookmark workflow: add, list, search, remove."""
        # Add bookmarks
        bookmark1_data = {
            'topic': 'Python Basics',
            'description': 'Learn Python fundamentals',
            'tags': ['python', 'basics']
        }

        bookmark1_id = await self.session_manager.add_bookmark(
            self.context.user_id, bookmark1_data
        )
        assert bookmark1_id is not None

        bookmark2_data = {
            'topic': 'Advanced Python',
            'description': 'Advanced Python concepts',
            'tags': ['python', 'advanced']
        }

        bookmark2_id = await self.session_manager.add_bookmark(
            self.context.user_id, bookmark2_data
        )
        assert bookmark2_id is not None

        # Test list command
        list_args = MagicMock()
        list_args.action = 'list'
        list_args.tag = None
        list_args.recent = False

        list_response = await self.command.execute(list_args, self.context)
        assert list_response.success
        assert len(list_response.data['bookmarks']) == 2

        # Test search command
        search_args = MagicMock()
        search_args.action = 'search'
        search_args.query = 'python'
        search_args.in = 'all'

        search_response = await self.command.execute(search_args, self.context)
        assert search_response.success
        assert search_response.data['count'] == 2

        # Test tag-based search
        search_args.tag = 'python'
        tag_search_response = await self.command.execute(search_args, self.context)
        assert tag_search_response.success
        assert tag_search_response.data['count'] == 2

        # Test remove command
        remove_args = MagicMock()
        remove_args.action = 'remove'
        remove_args.topic = 'Python Basics'

        remove_response = await self.command.execute(remove_args, self.context)
        assert remove_response.success

        # Verify removal
        final_list_response = await self.command.execute(list_args, self.context)
        assert final_list_response.success
        assert len(final_list_response.data['bookmarks']) == 1
        assert final_list_response.data['bookmarks'][0]['topic'] == 'Advanced Python'

    async def test_error_handling(self, setup_environment):
        """Test error handling in bookmark operations."""
        # Test removing non-existent bookmark
        remove_args = MagicMock()
        remove_args.action = 'remove'
        remove_args.topic = 'Nonexistent Bookmark'

        remove_response = await self.command.execute(remove_args, self.context)
        assert not remove_response.success
        assert remove_response.error.code == 'BOOKMARK_NOT_FOUND'

        # Test adding duplicate bookmark
        bookmark_data = {
            'topic': 'Duplicate Test',
            'description': 'Test duplicate handling',
            'tags': ['test']
        }

        bookmark_id = await self.session_manager.add_bookmark(
            self.context.user_id, bookmark_data
        )

        # Try to add same bookmark again
        add_args = MagicMock()
        add_args.action = 'add'
        add_args.topic = 'Duplicate Test'
        add_args.description = 'Test duplicate handling'
        add_args.tags = ['test']

        add_response = await self.command.execute(add_args, self.context)
        assert not add_response.success
        assert add_response.error.code == 'BOOKMARK_EXISTS'

    async def test_batch_operations(self, setup_environment):
        """Test batch bookmark operations."""
        # Add multiple bookmarks
        bookmark_topics = ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5']

        for topic in bookmark_topics:
            bookmark_data = {
                'topic': topic,
                'description': f'Description for {topic}',
                'tags': ['test']
            }
            await self.session_manager.add_bookmark(self.context.user_id, bookmark_data)

        # Test listing with tag filter
        list_args = MagicMock()
        list_args.action = 'list'
        list_args.tag = 'test'
        list_args.recent = False

        list_response = await self.command.execute(list_args, self.context)
        assert list_response.success
        assert len(list_response.data['bookmarks']) == 5

        # Test search with partial match
        search_args = MagicMock()
        search_args.action = 'search'
        search_args.query = 'Topic'
        search_args.in = 'topic'

        search_response = await self.command.execute(search_args, self.context)
        assert search_response.success
        assert search_response.data['count'] == 5

        # Test search with no matches
        search_args.query = 'Nonexistent'
        search_response = await self.command.execute(search_args, self.context)
        assert search_response.success
        assert search_response.data['count'] == 0
```

## Command CLI Integration

### Command Registration and Discovery

```python
class CommandPalette:
    """Command palette for CLI command discovery and execution."""

    def __init__(self, command_registry: CommandRegistry):
        self.registry = command_registry
        self.command_history = []
        self.command_stats = {}

    def get_command_help(self, command_name: str = None) -> str:
        """Get help for specific command or all commands."""
        if command_name:
            command = self.registry.get_command(command_name)
            if command:
                return command.get_help_text()
            else:
                available = self.get_suggestions(command_name)
                return f"Unknown command: {command_name}\nDid you mean: {', '.join(available[:3])}?"
        else:
            return self._format_help_all()

    def get_suggestions(self, partial_name: str) -> List[str]:
        """Get command suggestions based on partial input."""
        suggestions = []
        partial = partial_name.lower()

        for command_name, command in self.registry.commands.items():
            if command_name.startswith(partial):
                suggestions.append(command_name)
            elif command.description and partial in command.description.lower():
                suggestions.append(command_name)
            elif any(alias.startswith(partial) for alias in command.aliases):
                suggestions.append(command_name)

        return sorted(list(set(suggestions)))[:10]

    def _format_help_all(self) -> str:
        """Format help for all commands."""
        help_text = "Learning Catalyst Commands:\n\n"

        categories = self.registry.get_categories()
        for category in sorted(categories):
            help_text += f"📂 {category.title()}\n"
            commands = self.registry.list_commands(category)
            for command in sorted(commands, key=lambda c: c.name):
                aliases_str = f" ({', '.join(command.aliases)})" if command.aliases else ""
                help_text += f"  /{command.name}{aliases_str}\n"
                help_text += f"    {command.description}\n"
            help_text += "\n"

        help_text += "Type /help <command> for detailed help on a specific command."
        return help_text

    async def execute_command(self, command_input: str, context: CommandContext) -> Response:
        """Execute command from input string."""
        # Parse command
        command_parts = command_input.strip().split()
        if not command_parts:
            return Response.error("EMPTY_COMMAND", "No command provided")

        command_name = command_parts[0].lstrip('/')
        command_args = command_parts[1:]

        # Find command
        command = self.registry.get_command(command_name)
        if not command:
            suggestions = self.get_suggestions(command_name)
            return Response.error(
                "UNKNOWN_COMMAND",
                f"Unknown command: {command_name}",
                suggestions=suggestions
            )

        # Parse arguments
        try:
            parser = argparse.ArgumentParser(prog=f"/{command_name}")
            command.add_arguments(parser)
            parsed_args = parser.parse_args(command_args)

            # Validate arguments
            validation_error = command.validate_args(parsed_args)
            if validation_error:
                return Response.error("INVALID_ARGUMENTS", validation_error)

            # Execute command
            start_time = time.time()
            response = await command.execute(parsed_args, context)
            execution_time = time.time() - start_time

            # Track command statistics
            self._track_command_usage(command_name, execution_time, response.success)

            return response

        except SystemExit:
            # argparse calls sys.exit on help/error
            return Response.error("ARGUMENT_ERROR", "Invalid arguments. Use /help for guidance.")
        except Exception as e:
            return Response.error("COMMAND_ERROR", f"Error executing command: {str(e)}")

    def _track_command_usage(self, command_name: str, execution_time: float, success: bool):
        """Track command usage statistics."""
        if command_name not in self.command_stats:
            self.command_stats[command_name] = {
                'count': 0,
                'total_time': 0,
                'success_count': 0,
                'avg_time': 0
            }

        stats = self.command_stats[command_name]
        stats['count'] += 1
        stats['total_time'] += execution_time
        if success:
            stats['success_count'] += 1
        stats['avg_time'] = stats['total_time'] / stats['count']

    def get_command_stats(self) -> Dict[str, Any]:
        """Get command usage statistics."""
        return {
            'total_commands': sum(stats['count'] for stats in self.command_stats.values()),
            'most_used': sorted(self.command_stats.items(),
                               key=lambda x: x[1]['count'], reverse=True)[:10],
            'slowest_commands': sorted(self.command_stats.items(),
                                     key=lambda x: x[1]['avg_time'], reverse=True)[:5]
        }
```

## Best Practices

### Command Design Guidelines

1. **Single Responsibility**: Each command should have a clear, single purpose
2. **Consistent Interface**: Follow established patterns for argument parsing and response formatting
3. **Error Handling**: Provide clear error messages and actionable suggestions
4. **Input Validation**: Validate all inputs before processing
5. **Async Support**: Use async/await for I/O operations
6. **Logging**: Log important operations for debugging and analytics
7. **Testing**: Include comprehensive unit and integration tests
8. **Documentation**: Provide clear help text and examples

### Response Format Standards

```python
# Success response
Response.success({
    'message': 'Operation completed successfully',
    'data': {...},  # Result data
    'metadata': {
        'execution_time': 0.123,
        'items_processed': 10
    }
})

# Error response
Response.error(
    "ERROR_CODE",
    "Human-readable error message",
    suggestions=['suggestion1', 'suggestion2'],
    metadata={'additional_info': '...'}
)
```

### Argument Validation Patterns

```python
def validate_args(self, args: argparse.Namespace) -> Optional[str]:
    """Validate command arguments."""
    # Required arguments
    if not hasattr(args, 'required_arg'):
        return "Required argument missing: --required-arg"

    # Type validation
    if hasattr(args, 'count') and args.count < 0:
        return "Count must be non-negative"

    # Range validation
    if hasattr(args, 'priority') and (args.priority < 1 or args.priority > 10):
        return "Priority must be between 1 and 10"

    # Length validation
    if hasattr(args, 'name') and len(args.name) > 100:
        return "Name too long (max 100 characters)"

    return None
```

## Related Documentation

- **[CLI Commands API](../api-reference/cli-commands.md)**: Complete CLI command reference
- **[Setup Development](setup-development.md)**: Development environment setup
- **[Testing Strategies](testing-strategies.md)**: Testing approaches and frameworks
- **[Provider Integration](provider-integration.md)**: AI provider integration

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Implementation Guides*