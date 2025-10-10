# Testing Strategies

---
title: Learning Catalyst Testing Strategies and Best Practices
description: Comprehensive testing approach for quality assurance and reliability
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide provides comprehensive testing strategies for Learning Catalyst, covering unit testing, integration testing, end-to-end testing, performance testing, and quality assurance practices. The testing framework ensures reliability, performance, and maintainability of the application.

## Testing Architecture Overview

### Testing Pyramid

```text
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                          │
│                                                             │
│  E2E Tests (Few, Slow, Comprehensive)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Integration Tests (More, Medium Speed)              │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Unit Tests (Many, Fast, Isolated)              │ │   │
│  │  │                                             │ │   │
│  │  │  - AI Provider Tests                         │ │   │
│  │  │  - CLI Command Tests                       │ │   │
│  │  │  - Database Tests                           │ │   │
│  │  │  - Configuration Tests                     │   │   │
│  │  │  - Utility Tests                           │   │   │
│  │  │                                             │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Testing Categories

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test performance characteristics
5. **Security Tests**: Test security measures and vulnerabilities
6. **Compatibility Tests**: Test across different environments

## Unit Testing Framework

### Unit Testing Best Practices

```python
import unittest
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any
import tempfile
import json

class TestConfigurationManager(unittest.TestCase):
    """Unit tests for configuration management."""

    def setUp(self):
        """Set up test environment."""
        self.config_dir = tempfile.TemporaryDirectory()
        self.config_manager = ConfigurationManager(self.config_dir.name)

    def test_load_configuration_default(self):
        """Test loading default configuration when no file exists."""
        # Should load default values
        self.assertEqual(self.config_manager.ai_config.default_provider, "openai")
        self.assertEqual(self.config_manager.ai_config.temperature, 0.7)
        self.assertEqual(self.config_manager.ui_config.theme, "dark")

    def test_load_configuration_from_file(self):
        """Test loading configuration from file."""
        # Create test configuration file
        config_data = {
            'ai': {
                'default_provider': 'deepseek',
                'temperature': 0.8,
                'max_tokens': 3000
            },
            'ui': {
                'theme': 'light',
                'show_token_usage': False
            }
        }

        config_file = self.config_dir.name / "config.toml"
        with open(config_file, 'w') as f:
            toml.dump(config_data, f)

        # Reload configuration
        self.config_manager.load_configuration()

        # Verify loaded values
        self.assertEqual(self.config_manager.ai_config.default_provider, "deepseek")
        self.assertEqual(self.config_manager.ai_config.temperature, 0.8)
        self.assertEqual(self.config_manager.ai_config.max_tokens, 3000)
        self.assertEqual(self.config_manager.ui_config.theme, "light")
        self.assertEqual(self.config_manager.ui_config.show_token_usage, False)

    def test_update_configuration(self):
        """Test updating configuration sections."""
        # Update AI configuration
        updates = {
            'temperature': 0.9,
            'max_tokens': 4000
        }

        self.config_manager.update_configuration('ai', updates)

        # Verify updates
        self.assertEqual(self.config_manager.ai_config.temperature, 0.9)
        self.assertEqual(self.config_manager.ai_config.max_tokens, 4000)
        # Other sections unchanged
        self.assertEqual(self.config_manager.ai_config.default_provider, "openai")

    def test_validate_configuration(self):
        """Test configuration validation."""
        # Valid configuration
        result = self.config_manager.validate_configuration()
        self.assertTrue(result['valid'])
        self.assertEqual(len(result['errors']), 0)

        # Invalid temperature
        self.config_manager.ai_config.temperature = 3.0
        result = self.config_manager.validate_configuration()
        self.assertFalse(result['valid'])
        self.assertIn("AI temperature must be between 0 and 2", result['errors'])

        # Fix and re-validate
        self.config_manager.ai_config.temperature = 0.7
        result = self.config_manager.validate_configuration()
        self.assertTrue(result['valid'])

    def test_environment_variables_override(self):
        """Test environment variable overrides."""
        # Set environment variable
        with patch.dict(os.environ, {'LEARNING_CATALYST_TEMPERATURE': '0.5'}):
            self.config_manager._load_environment_variables()

        # Verify override
        self.assertEqual(self.config_manager.ai_config.temperature, 0.5)

    @patch('src.api.config.keyring.get_password')
    def test_secure_api_key_storage(self, mock_get_password):
        """Test secure API key storage."""
        from src.api.config import ProviderManager, ProviderConfig

        mock_get_password.return_value = "test-api-key"

        provider_manager = ProviderManager(self.config_manager)
        provider = provider_manager.get_provider('openai')

        # Should retrieve from secure storage
        self.assertEqual(provider.api_key, "test-api-key")
        mock_get_password.assert_called_with("learning-catalyst", "openai")

class TestAIProvider(unittest.IsolatedAsyncioTestCase):
    """Unit tests for AI provider implementations."""

    async def asyncSetUp(self):
        """Set up test environment."""
        self.provider = OpenAIProvider({
            'api_key': 'test-key',
            'base_url': 'https://api.openai.com/v1',
            'timeout': 30,
            'max_retries': 3
        })

    @patch('openai.AsyncOpenAI')
    async def test_generate_response_success(self, mock_openai):
        """Test successful response generation."""
        # Mock API response
        mock_response = AsyncMock()
        mock_response.choices = [
            AsyncMock(
                message=AsyncMock(content="Test response"),
                finish_reason="stop"
            )
        ]
        mock_response.usage = AsyncMock(
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30
        )
        mock_response.model = "gpt-3.5-turbo"

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client

        # Test request
        request = AIRequest(
            prompt="Test prompt",
            model="gpt-3.5-turbo",
            max_tokens=100
        )

        response = await self.provider.generate_response(request)

        # Verify response
        self.assertEqual(response.content, "Test response")
        self.assertEqual(response.model, "gpt-3.5-turbo")
        self.assertEqual(response.tokens_used, {'input': 10, 'output': 20, 'total': 30})
        self.assertTrue(response.success)

    async def test_generate_response_with_retry(self):
        """Test retry mechanism on failure."""
        with patch('openai.AsyncOpenAI') as mock_openai:
            # Mock first failure, then success
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(
                side_effect=[
                    Exception("Connection error"),
                    Exception("Timeout"),
                    AsyncMock(
                        choices=[AsyncMock(message="Success", finish_reason="stop")],
                        usage=AsyncMock(prompt_tokens=10, completion_tokens=20, total_tokens=30),
                        model="gpt-3.5-turbo"
                    )
                ]
            )
            mock_openai.return_value = mock_client

            request = AIRequest(
                prompt="Test prompt",
                model="gpt-3.5-turbo"
            )

            response = await self.provider.generate_response(request)

            # Should succeed after retries
            self.assertEqual(response.content, "Success")

    async def test_validate_api_key_invalid(self):
        """Test API key validation with invalid key."""
        self.provider.api_key = "invalid-key"
        self.assertFalse(self.provider.validate_api_key())

    async def test_validate_api_key_valid(self):
        """Test API key validation with valid key."""
        with patch('openai.OpenAI') as mock_openai:
            mock_openai.return_value.models.list.return_value = []
            self.provider.api_key = "sk-1234567890"
            self.assertTrue(self.provider.validate_api_key())

class TestCommandBase(unittest.IsolatedAsyncioTestCase):
    """Base class for command testing."""

    async def asyncSetUp(self):
        """Set up command test environment."""
        self.mock_session_manager = AsyncMock()
        self.mock_ai_manager = AsyncMock()
        self.mock_config = {}

        self.context = CommandContext(
            user_id="test_user",
            session_id="test_session",
            session_manager=self.mock_session_manager,
            ai_manager=self.mock_ai_manager,
            config=self.mock_config
        )

class TestBookmarksCommand(TestCommandBase):
    """Unit tests for bookmarks command."""

    async def asyncSetUp(self):
        """Set up bookmarks command test environment."""
        await super().asyncSetUp()
        self.command = BookmarksCommand()

    async def test_add_bookmark_success(self):
        """Test successful bookmark addition."""
        # Mock dependencies
        self.mock_session_manager.get_bookmark.return_value = None
        self.mock_session_manager.add_bookmark.return_value = "bookmark_123"

        # Create mock arguments
        args = MagicMock()
        args.action = 'add'
        args.topic = 'Python Programming'
        args.description = 'Learn Python basics'
        args.tags = ['python', 'programming']

        # Execute command
        response = await self.command.execute(args, self.context)

        # Verify response
        self.assertTrue(response.success)
        self.assertEqual(response.data['topic'], 'Python Programming')
        self.assertEqual(response.data['tags'], ['python', 'programming'])

        # Verify mock calls
        self.mock_session_manager.get_bookmark.assert_called_once_with(
            "test_user", "Python Programming"
        )
        self.mock_session_manager.add_bookmark.assert_called_once()
        self.mock_session_manager.log_interaction.assert_called_once()

    async def test_add_bookmark_already_exists(self):
        """Test adding bookmark that already exists."""
        # Mock existing bookmark
        existing_bookmark = {
            'topic': 'Existing Topic',
            'description': 'Old description'
        }
        self.mock_session_manager.get_bookmark.return_value = existing_bookmark

        args = MagicMock()
        args.action = 'add'
        args.topic = 'Existing Topic'

        response = await self.command.execute(args, self.context)

        # Verify error response
        self.assertFalse(response.success)
        self.assertEqual(response.error.code, 'BOOKMARK_EXISTS')

    async def test_invalid_action(self):
        """Test command with invalid action."""
        args = MagicMock()
        args.action = 'invalid'

        response = await self.command.execute(args, self.context)

        self.assertFalse(response.success)
        self.assertEqual(response.error.code, 'INVALID_ACTION')

    def test_validate_args_invalid(self):
        """Test argument validation with invalid inputs."""
        # Test missing action
        args = MagicMock()
        args.action = None
        error = self.command.validate_args(args)
        self.assertIsNotNone(error)
        self.assertIn("Action is required", error)

        # Test too many tags
        args.action = 'add'
        args.tags = [f"tag{i}" for i in range(15)]
        error = self.command.validate_args(args)
        self.assertIsNotNone(error)
        self.assertIn("Maximum 10 tags", error)
```

## Integration Testing Framework

### Integration Test Patterns

```python
import pytest
import asyncio
import tempfile
import sqlite3
from typing import Dict, Any

class TestAIIntegration:
    """Integration tests for AI provider integration."""

    @pytest.fixture
    def ai_config(self):
        """AI provider configuration."""
        return {
            'openai': {
                'api_key': os.getenv('OPENAI_API_KEY', 'test-key'),
                'base_url': 'https://api.openai.com/v1',
                'timeout': 30,
                'max_retries': 3
            }
        }

    @pytest.fixture
    def database(self):
        """Test database fixture."""
        db_file = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        db_path = db_file.name

        # Initialize database
        conn = sqlite3.connect(db_path)
        conn.executescript("""
            CREATE TABLE user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                selected_provider TEXT,
                selected_model TEXT,
                preferences TEXT,
                settings TEXT
            );

            CREATE TABLE qa_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                interaction_type TEXT NOT NULL,
                input_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                context_data TEXT,
                model_used TEXT,
                provider_used TEXT,
                tokens_used INTEGER,
                metadata TEXT
            );
        """)
        conn.close()

        yield db_path

        db_file.close()

    @pytest.fixture
    def session_manager(self, database):
        """Session manager fixture."""
        from src.session.session_manager import SessionManager
        return SessionManager(database)

    @pytest.fixture
    def ai_manager(self, ai_config):
        """AI manager fixture."""
        from src.ai.ai_manager import AIManager
        return AIManager(ai_config)

    async def test_ai_provider_integration(self, ai_manager, session_manager):
        """Test AI provider integration with session management."""
        # Create session
        user_id = "integration_test_user"
        session_id = session_manager.create_session(user_id)

        # Test AI interaction
        prompt = "What is machine learning?"
        context = {
            'user_id': user_id,
            'session_id': session_id,
            'provider': 'openai',
            'model': 'gpt-3.5-turbo'
        }

        if ai_manager.is_configured():
            response = await ai_manager.generate_response(prompt, context)

            # Verify response
            self.assertIsInstance(response, str)
            self.assertGreater(len(response), 10)

            # Log interaction
            await session_manager.log_ai_usage(
                user_id, "gpt-3.5-turbo",
                {'input': len(prompt.split()), 'output': len(response.split())},
                1.5
            )

            # Verify logging
            history = await session_manager.get_conversation_history(user_id, limit=1)
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]['input_text'], prompt)
            self.assertEqual(history[0]['response_text'], response)
        else:
            pytest.skip("AI provider not configured for integration testing")

    async def test_session_persistence(self, session_manager, database):
        """Test session persistence across manager instances."""
        # Create session with first manager
        user_id = "persistence_test_user"
        session_id1 = session_manager.create_session(user_id)

        # Add interaction
        await session_manager.log_interaction(
            user_id, 'test_interaction', {'data': 'test'}
        )

        # Create new manager instance
        session_manager2 = SessionManager(database)

        # Load session with second manager
        session_id2 = session_manager2.get_active_session(user_id)

        # Verify session persistence
        self.assertEqual(session_id1, session_id2)

        # Verify interaction persistence
        interactions = await session_manager2.get_session_interactions(user_id)
        self.assertEqual(len(interactions), 1)
        self.assertEqual(interactions[0]['interaction_type'], 'test_interaction')

    async def test_error_handling_in_ai_calls(self, ai_manager):
        """Test error handling in AI calls."""
        context = {
            'user_id': 'error_test_user',
            'session_id': 'test_session'
        }

        # Test with invalid prompt
        with pytest.raises(Exception):
            await ai_manager.generate_response("", context)

        # Test with invalid model
        if ai_manager.is_configured():
            with pytest.raises(Exception):
                await ai_manager.generate_response(
                    "Test prompt",
                    "invalid-model-name",
                    context
                )

class TestCommandIntegration:
    """Integration tests for command execution."""

    @pytest.fixture
    def command_palette(self):
        """Command palette fixture."""
        from src.cli.command_palette import CommandPalette
        return CommandPalette()

    @pytest.fixture
    def full_environment(self, database):
        """Full environment with all dependencies."""
        from src.api.config import ConfigurationManager
        from src.session.session_manager import SessionManager
        from src.ai.ai_manager import AIManager

        config_manager = ConfigurationManager()
        session_manager = SessionManager(database)
        ai_manager = AIManager(config_manager.get_all_configuration()['ai'])

        return {
            'config_manager': config_manager,
            'session_manager': session_manager,
            'ai_manager': ai_manager
            }

    async def test_end_to_end_command_execution(self, command_palette, full_environment):
        """Test complete command execution flow."""
        user_id = "e2e_test_user"
        session_id = full_environment['session_manager'].create_session(user_id)

        # Execute help command
        response = await command_palette.execute_command("/help", full_environment)

        self.assertTrue(response.success)
        self.assertIn('Available Commands', response.data['content'])

        # Execute config command
        response = await command_palette.execute_command("/config show", full_environment)

        self.assertTrue(response.success)
        self.assertIn('Current Configuration', response.data['content'])

        # Execute learning command if AI is available
        if full_environment['ai_manager'].is_configured():
            response = await command_palette.execute_command(
                "What is Python?",
                full_environment
            )

            # Should either succeed or provide helpful error
            if response.success:
                self.assertGreater(len(response.data['content']), 10)
            else:
                self.assertIn('not configured', response.error.message.lower())

    async def test_command_error_handling(self, command_palette, full_environment):
        """Test command error handling."""
        # Execute invalid command
        response = await command_palette.execute_command("/invalid-command", full_environment)

        self.assertFalse(response.success)
        self.assertEqual(response.error.code, "UNKNOWN_COMMAND")
        self.assertIn('suggestions', response.error.metadata)

        # Execute command with missing arguments
        response = await command_palette.execute_command("/config", full_environment)

        self.assertFalse(response.success)
        self.assertIn('subcommand', response.error.message.lower())

    async def test_command_performance(self, command_palette, full_environment):
        """Test command execution performance."""
        import time

        # Measure execution time for multiple commands
        commands = [
            "/status",
            "/config show",
            "/help",
            "/status"
        ]

        execution_times = []

        for command in commands:
            start_time = time.time()
            response = await command_palette.execute_command(command, full_environment)
            end_time = time.time()

            self.assertTrue(response.success, f"Command failed: {command}")
            execution_times.append(end_time - start_time)

        # Verify performance (all commands should complete within 1 second)
        avg_time = sum(execution_times) / len(execution_times)
        self.assertLess(avg_time, 1.0, f"Average command time: {avg_time:.3f}s")

        # Verify no individual command takes too long
        for i, time_taken in enumerate(execution_times):
            self.assertLess(time_taken, 2.0, f"Command {i+1} took too long: {time_taken:.3f}s")
```

## End-to-End Testing Framework

### E2E Test Scenarios

```python
import pytest
import asyncio
import tempfile
import os
from pathlib import Path
import json

class TestUserWorkflows:
    """End-to-end tests for user workflows."""

    @pytest.fixture
    def learning_catalyst_instance(self):
        """Learning Catalyst instance for E2E testing."""
        from src.main import LearningCatalyst

        with tempfile.TemporaryDirectory() as temp_dir:
            config_file = Path(temp_dir) / "config.toml"
            config_file.write_text("""
            [ai]
            default_provider = "openai"
            default_model = "gpt-3.5-turbo"
            temperature = 0.7
            max_tokens = 2000

            [learning]
            granularity = "summaries"
            auto_save = true

            [ui]
            theme = "dark"
            show_token_usage = true
            """)

            os.environ['HOME'] = temp_dir

            # Initialize with test configuration
            instance = LearningCatalyst(config_path=config_file)
            yield instance

    async def test_new_user_onboarding_workflow(self, learning_catalyst_instance):
        """Test complete new user onboarding workflow."""
        # Step 1: Initial help
        response = await learning_catalyst_instance.process_command("/help")
        self.assertTrue(response.success)
        self.assertIn("Learning Catalyst", response.content)

        # Step 2: Check status
        response = await learning_catalyst_instance.process_command("/status")
        self.assertTrue(response.success)
        self.assertIn("Installation", response.content)

        # Step 3: Configure AI provider
        if os.getenv('OPENAI_API_KEY'):
            response = await learning_catalyst_instance.process_command(
                "/config provider openai"
            )
            # Would normally prompt for API key, but in test we'll assume it's set

            response = await learning_catalyst_instance.process_command(
                "/config provider test openai"
            )
            # May succeed or fail based on test environment

        # Step 4: First learning query
        response = await learning_catalyst_instance.process_command(
            "I want to learn Python programming. Where should I start?"
        )

        # Should provide guidance or error about configuration
        self.assertIsInstance(response.content, str)
        self.assertGreater(len(response.content), 5)

        # Step 5: Create checkpoint
        response = await learning_catalyst_instance.process_command(
            "/checkpoint save python-journey-start"
        )

        self.assertTrue(response.success)
        self.assertIn("saved", response.content.lower())

    async def test_learning_session_workflow(self, learning_catalyst_instance):
        """Test complete learning session workflow."""
        user_id = "workflow_test_user"

        # Step 1: Start learning session
        session_id = "session_12345"

        # Step 2: Learn about a concept
        response = await learning_catalyst_instance.process_command(
            "Explain what recursion is with a simple example"
        )

        self.assertIsInstance(response.content, str)
        self.assertIn("recursion", response.content.lower())

        # Step 3: Test understanding with quiz
        response = await learning_catalyst_instance.process_command(
            "Quiz me on recursion basics"
        )

        # Should provide quiz or error
        self.assertIsInstance(response.content, str)

        # Step 4: Save progress
        response = await learning_catalyst_instance.process_command(
            "/checkpoint save recursion-learning"
        )

        self.assertTrue(response.success)

        # Step 5: Continue learning
        response = await learning_catalyst_instance.process_command(
            "Show me practical examples of recursion in Python"
        )

        self.assertIsInstance(response.content, str)

        # Step 6: Review progress
        response = await learning_catalyst_instance.process_command(
            "/concepts list --recent"
        )

        self.assertIsInstance(response.content, str)

    async def test_configuration_management_workflow(self, learning_catalyst_instance):
        """Test configuration management workflow."""
        # Step 1: View current configuration
        response = await learning_catalyst_instance.process_command("/config show")
        self.assertTrue(response.success)
        self.assertIn("Current Configuration", response.content)

        # Step 2: Update settings
        response = await learning_catalyst_instance.process_command(
            "/config ui theme light"
        )

        self.assertTrue(response.success)
        self.assertIn("theme updated", response.content.lower())

        # Step 3: Verify change
        response = await learning_catalyst_instance.process_command("/config show")
        self.assertTrue(response.success)
        self.assertIn("theme: light", response.content.lower())

        # Step 4: Reset configuration
        response = await learning_catalyst_instance.process_command("/config reset")
        self.assertTrue(response.success)
        self.assertIn("reset to defaults", response.content.lower())

    async def test_error_recovery_workflow(self, learning_catalyst_instance):
        """Test error handling and recovery workflow."""
        # Step 1: Try invalid command
        response = await learning_catalyst_instance.process_command("/invalid-command")
        self.assertFalse(response.success)
        self.assertIn("Unknown command", response.error.message)

        # Step 2: Get suggestions
        response = await learning_catalyst_instance.process_command("/help invalid")
        # Should provide suggestions

        # Step 3: Try command with missing arguments
        response = await learning_catalyst_instance.process_command("/config")
        self.assertFalse(response.success)
        self.assertIn("subcommand", response.error.message.lower())

        # Step 4: Get help for the command
        response = await learning_catalyst_instance.process_command("/help config")
        self.assertTrue(response.success)
        self.assertIn("Configuration", response.content)

        # Step 5: Fix the command
        response = await learning_catalyst_instance.process_command("/config show")
        self.assertTrue(response.success)

    async def test_performance_under_load(self, learning_catalyst_instance):
        """Test performance under simulated load."""
        import time
        import asyncio

        # Simulate multiple concurrent users
        async def user_session(user_id: str, commands: list):
            session_responses = []
            for command in commands:
                start_time = time.time()
                response = await learning_catalyst_instance.process_command(command)
                end_time = time.time()

                session_responses.append({
                    'user_id': user_id,
                    'command': command,
                    'success': response.success,
                    'response_time': end_time - start_time,
                    'response_length': len(response.content) if hasattr(response, 'content') else 0
                })

            return session_responses

        # Simulate 5 concurrent users with different command patterns
        users = ['user1', 'user2', 'user3', 'user4', 'user5']
        command_patterns = [
            ["/status", "/config show", "/help"],
            ["/concepts list", "/help", "/status"],
            ["/help", "/config show", "/status"]
        ]

        # Execute concurrent sessions
        tasks = [
            user_session(user_id, command_patterns[i % len(command_patterns)])
            for i, user_id in enumerate(users)
        ]

        start_time = time.time()
        all_responses = await asyncio.gather(*tasks)
        end_time = time.time()

        # Analyze results
        total_requests = sum(len(responses) for responses in all_responses)
        successful_requests = sum(
            sum(1 for r in responses if r['success'])
            for responses in all_responses
        )
        total_time = end_time - start_time

        # Verify performance
        self.assertEqual(total_requests, 15)  # 5 users × 3 commands each
        self.assertGreater(successful_requests, 12)  # At least 80% success rate
        self.assertLess(total_time, 30.0)  # Should complete within 30 seconds

        # Calculate average response time
        all_response_times = [
            r['response_time'] for responses in all_responses
        ]
        avg_response_time = sum(all_response_times) / len(all_response_times)
        self.assertLess(avg_response_time, 5.0)  # Average response time under 5 seconds

    async def test_long_running_session(self, learning_catalyst_instance):
        """Test behavior during long-running sessions."""
        session_responses = []

        # Simulate a learning session over time
        learning_progression = [
            "What is Python?",
            "Explain Python variables and data types",
            "Show me how to write a Python function",
            "What are Python classes and objects?",
            "Explain inheritance in Python",
            "How do I handle errors in Python?",
            "What are Python modules?",
            "Show me how to work with files in Python",
            "Explain virtual environments in Python"
        ]

        for i, question in enumerate(learning_progression):
            start_time = time.time()

            response = await learning_catalyst_instance.process_command(question)
            end_time = time.time()

            session_responses.append({
                'step': i + 1,
                'question': question,
                'success': response.success,
                'response_time': end_time - start_time,
                'response_length': len(response.content) if hasattr(response, 'content') else 0
            })

            # Add delay to simulate human interaction
            await asyncio.sleep(0.1)

        # Analyze session
        total_time = sum(r['response_time'] for r in session_responses)
        successful_requests = sum(1 for r in session_responses if r['success'])

        self.assertEqual(len(session_responses), len(learning_progression))
        self.assertGreaterEqual(successful_requests, len(learning_progression) * 0.8)
        self.assertLess(total_time, 60.0)  # Should complete within 60 seconds

        # Verify session maintained state
        final_response = await learning_catalyst_instance.process_command("/status")
        self.assertTrue(final_response.success)
```

## Performance Testing Framework

### Performance Test Scenarios

```python
import pytest
import asyncio
import time
import statistics
from typing import List, Dict, Any
import psutil
import threading

class TestPerformance:
    """Performance tests for various system components."""

    def test_memory_usage_under_load(self):
        """Test memory usage patterns under load."""
        process = psutil.Process()
        initial_memory = process.memory_info().rss

        # Simulate memory-intensive operations
        large_data = []
        for i in range(100):
            # Create large data structures
            data = {
                'id': i,
                'content': 'x' * 1000,  # 1KB per item
                'metadata': {
                    'created': time.time(),
                    'tags': [f'tag{j}' for j in range(10)]
                }
            }
            large_data.append(data)

        peak_memory = process.memory_info().rss
        memory_increase = peak_memory - initial_memory

        # Memory increase should be reasonable (less than 100MB)
        self.assertLess(memory_increase, 100 * 1024 * 1024)  # 100MB

        # Clean up
        del large_data

        final_memory = process.memory_info().rss
        self.assertLess(final_memory - initial_memory, 10 * 1024 * 1024)  # 10MB cleanup tolerance

    def test_database_performance(self):
        """Test database performance under load."""
        from src.data.vector_storage import VectorStorage
        import tempfile

        with tempfile.NamedTemporaryFile() as db_file:
            storage = VectorStorage(db_file.name)

            # Test insertion performance
            insertion_times = []
            for i in range(1000):
                vector = [j / 100.0 for j in range(1536)]  # 1536-dimensional vectors

                start_time = time.time()
                storage.add_vector(f"doc_{i}", vector)
                end_time = time.time()

                insertion_times.append(end_time - start_time)

            # Analyze performance
            avg_insertion_time = statistics.mean(insertion_times)
            self.assertLess(avg_insertion_time, 0.01)  # 10ms per insertion
            self.assertLess(max(insertion_times), 0.1)  # 100ms max

            # Test query performance
            query_times = []
            for i in range(100):
                query_vector = [j / 100.0 for j in range(1536)]

                start_time = time.time()
                results = storage.search_vectors(query_vector, limit=10)
                end_time = time.time()

                query_times.append(end_time - start_time)

            avg_query_time = statistics.mean(query_times)
            self.assertLess(avg_query_time, 0.05)  # 50ms per query
            self.assertLess(max(query_times), 0.2)  # 200ms max

    async def test_concurrent_api_calls(self, ai_manager):
        """Test concurrent API call performance."""
        if not ai_manager.is_configured():
            pytest.skip("AI manager not configured for performance testing")

        # Test with different concurrency levels
        concurrency_levels = [1, 2, 5, 10]
        performance_results = {}

        for concurrency in concurrency_levels:
            request_times = []

            async def make_request(request_id: int):
                start_time = time.time()
                try:
                    response = await ai_manager.generate_response(
                        f"Test request {request_id}",
                        "gpt-3.5-turbo",
                        {'test_id': request_id}
                    )
                    end_time = time.time()
                    return {
                        'request_id': request_id,
                        'success': True,
                        'response_time': end_time - start_time,
                        'response_length': len(response) if response else 0
                    }
                except Exception as e:
                    end_time = time.time()
                    return {
                        'request_id': request_id,
                        'success': False,
                        'response_time': end_time - start_time,
                        'error': str(e)
                    }

            # Execute concurrent requests
            tasks = [
                make_request(i) for i in range(concurrency)
            ]

            start_time = time.time()
            results = await asyncio.gather(*tasks)
            end_time = time.time()

            # Analyze results
            successful_results = [r for r in results if r['success']]
            request_times = [r['response_time'] for r in results]

            if successful_results:
                performance_results[concurrency] = {
                    'total_requests': len(results),
                    'successful_requests': len(successful_results),
                    'success_rate': len(successful_results) / len(results),
                    'total_time': end_time - start_time,
                    'avg_response_time': statistics.mean(request_times),
                    'max_response_time': max(request_times) if request_times else 0,
                    'throughput': len(results) / (end_time - start_time)
                }
            else:
                performance_results[concurrency] = {
                    'total_requests': len(results),
                    'successful_requests': 0,
                    'success_rate': 0,
                    'total_time': end_time - start_time,
                    'errors': [r['error'] for r in results]
                }

        # Analyze performance trends
        print(f"Performance Results: {performance_results}")

        # Verify reasonable performance
        for concurrency, results in performance_results.items():
            if results['success_rate'] > 0:
                self.assertLess(results['avg_response_time'], 10.0)  # 10s average
                self.assertGreaterEqual(results['success_rate'], 0.8)  # 80% success rate

                # Higher concurrency should maintain reasonable performance
                if concurrency > 1:
                    self.assertLess(results['avg_response_time'], 15.0)  # 15s average for concurrent

    def test_cache_performance(self):
        """Test cache performance under various loads."""
        from src.cache.cache_manager import CacheManager

        cache = CacheManager(max_size_mb=10)

        # Test cache fill performance
        fill_times = []
        for i in range(1000):
            cache_data = f"Cache data {i}" * 100  # ~2KB per item

            start_time = time.time()
            cache.set(f"key_{i}", cache_data, ttl_seconds=3600)
            end_time = time.time()

            fill_times.append(end_time - start_time)

        avg_fill_time = statistics.mean(fill_times)
        self.assertLess(avg_fill_time, 0.001)  # 1ms per item

        # Test cache hit performance
        hit_times = []
        miss_times = []

        # Test cache hits
        for i in range(100):
            start_time = time.time()
            cached_data = cache.get(f"key_{i}")
            end_time = time.time()

            if cached_data:
                hit_times.append(end_time - start_time)
            else:
                miss_times.append(end_time - start_time)

        # Verify cache performance
        if hit_times:
            avg_hit_time = statistics.mean(hit_times)
            self.assertLess(avg_hit_time, 0.0001)  # 0.1ms for cache hit

        # Test cache eviction performance
        eviction_times = []
        for i in range(1000, 2000):  # Trigger evictions
            cache.set(f"new_key_{i}", f"New data {i}" * 100)
            start_time = time.time()
            cached_data = cache.get(f"new_key_{i}")
            end_time = time.time()
            eviction_times.append(end_time - start_time)

        # Verify eviction doesn't significantly impact performance
        if eviction_times:
            avg_eviction_time = statistics.mean(eviction_times)
            self.assertLess(avg_eviction_time, 0.01)  # 10ms for eviction

    def test_command_palette_performance(self):
        """Test command palette performance under load."""
        from src.cli.command_palette import CommandPalette
        from src.api.config import ConfigurationManager
        from src.session.session_manager import SessionManager

        # Set up test environment
        with tempfile.TemporaryDirectory() as temp_dir:
            config_manager = ConfigurationManager()
            session_manager = SessionManager(f"{temp_dir}/test.db")
            command_palette = CommandPalette()

            # Test command lookup performance
            lookup_times = []
            commands = ["/help", "/status", "/config show", "/concepts list"] * 100

            start_time = time.time()
            for command in commands:
                command_start = time.time()
                response = command_palette.get_command_help(command.split()[0])
                command_end = time.time()
                lookup_times.append(command_end - command_start)

            total_time = time.time() - start_time
            avg_lookup_time = statistics.mean(lookup_times)

            # Verify lookup performance
            self.assertLess(avg_lookup_time, 0.001)  # 1ms average lookup time
            self.assertLess(total_time, 1.0)  # 1s total for 400 lookups

            # Test command execution performance
            exec_times = []
            simple_command = "/status"
            command_context = CommandContext(
                user_id="perf_test",
                session_id="test_session",
                session_manager=session_manager,
                ai_manager=None,
                config=config_manager.get_all_configuration()
            )

            for i in range(50):
                start_time = time.time()
                response = await command_palette.execute_command(
                    simple_command,
                    command_context
                )
                end_time = time.time()
                exec_times.append(end_time - start_time)

            if exec_times:
                avg_exec_time = statistics.mean(exec_times)
                self.assertLess(avg_exec_time, 0.05)  # 50ms average execution
                self.assertLess(max(exec_times), 0.2)  # 200ms maximum
```

## Test Automation and CI/CD

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

  schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.9, 3.10, 3.11]

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e .
          pip install pytest pytest-asyncio pytest-cov pytest-mock

      - name: Run unit tests
        run: |
          pytest tests/unit/ -v --cov=src --cov-report=xml --cov-report=html

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          flags: unittest
          name: codecov-umbrella

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    services:
      - postgres:14
      - redis:6

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: 3.11

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e .
          pip install pytest-asyncio

      - name: Set up test database
        run: |
          psql -c 'CREATE DATABASE test_db;' -U postgres
          psql -c 'CREATE USER test_user WITH PASSWORD 'test_password';' -U postgres
          psql -c 'GRANT ALL PRIVILEGES ON DATABASE test_db TO test_user;' -U postgres

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379/0
        run: |
          pytest tests/integration/ -v

      - name: Run E2E tests
        run: |
          pytest tests/e2e/ -v -m "not slow"

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name != 'schedule'

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: 3.11

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e .
          pip install pytest-asyncio

      - name: Run comprehensive E2E tests
        run: |
          pytest tests/e2e/ -v --timeout=300
```

### Test Configuration

```python
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --tb=short
    --strict-markers
    --strict-config
    --cov=src
    --cov-report=html
    --cov-report=xml
    --cov-report=term-missing
    --cov-fail-under=80
    --maxfail=5

markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
    external: Tests requiring external services
    gpu: Tests requiring GPU
    performance: Performance tests
    security: Security tests
    compatibility: Compatibility tests

asyncio_mode = auto

filterwarnings =
    ignore::DeprecationWarning
    ignore::PendingDeprecationWarning
    ignore::ResourceWarning

minversion = 6.0
```

### Quality Gates

```python
# tests/conftest.py
from _pytest.config import plugin

def pytest_collection_modifyitems(config, items):
    """Modify test collection to add quality gates."""
    # Mark slow tests
    for item in items:
        if "performance" in item.nodeid or "slow" in item.keywords:
            item.add_marker(pytest.mark.slow)
            item.add_marker(pytest.mark.performance)

    # Mark external tests
    for item in items:
        if "api" in item.nodeid or "external" in item.keywords:
            item.add_marker(pytest.mark.external)

def pytest_collection_modifyitems(config, items):
    """Skip external tests if environment variables not set."""
    if not os.getenv('OPENAI_API_KEY'):
        skip_external = [item for item in items if "external" in item.keywords]
        for item in skip_external:
            item.add_marker(pytest.mark.skip(reason="OPENAI_API_KEY not set"))

    if not os.getenv('DATABASE_URL'):
        skip_db = [item for item in items if "database" in item.nodeid]
        for item in skip_db:
            item.add_marker(pytest.mark.skip(reason="DATABASE_URL not set"))

# Quality gate: minimum test coverage
def pytest_collection_finish(session, session):
    """Enforce minimum test coverage."""
    if session.testsfailed:
        return

    failed_coverage = session.config.get_optimal_cov()
    if failed_coverage:
        pytest.exit("Tests passed but coverage below threshold")

# Quality gate: maximum test failures
def pytest_sessionfinish(session, session):
    """Fail fast if too many tests failed."""
    if session.testsfailed > 5:
        pytest.exit(f"Too many tests failed: {session.testsfailed}")
```

## Testing Best Practices

### Test Organization

```python
# tests/test_structure.py
"""Test organization and structure guidelines."""

"""
Test file organization:

1. Unit tests: tests/unit/
   - test_config.py
   - test_ai_providers.py
   - test_commands.py
   - test_session_manager.py

2. Integration tests: tests/integration/
   - test_ai_integration.py
   - test_database_integration.py
   - test_command_integration.py

3. E2E tests: tests/e2e/
   - test_user_workflows.py
   - test_complete_sessions.py
   - test_error_scenarios.py

4. Performance tests: tests/performance/
   - test_api_performance.py
   - test_database_performance.py
   - test_memory_usage.py

5. Security tests: tests/security/
   - test_input_validation.py
   - test_authentication.py
   - test_data_encryption.py
"""

# tests/conftest.py
"""Pytest configuration and fixtures."""
```

### Test Data Management

```python
# tests/fixtures/test_data.py
"""Test data management utilities."""

import json
import tempfile
from typing import Dict, Any

class TestDataGenerator:
    """Generate test data for various scenarios."""

    @staticmethod
    def create_test_user_config() -> Dict[str, Any]:
        """Create test user configuration."""
        return {
            'user_id': 'test_user_123',
            'preferences': {
                'theme': 'dark',
                'language': 'en',
                'learning_style': 'visual'
            },
            'settings': {
                'auto_save': True,
                'session_timeout': 120
            }
        }

    @staticmethod
    def create_test_ai_response() -> Dict[str, Any]:
        """Create test AI response."""
        return {
            'content': "This is a test AI response with detailed explanation.",
            'model': 'gpt-3.5-turbo',
            'provider': 'openai',
            'tokens_used': {'input': 15, 'output': 25, 'total': 40},
            'response_time': 1.5,
            'success': True
        }

    @staticmethod
    def create_test_concept() -> Dict[str, Any]:
        """Create test learning concept."""
        return {
            'id': 'test_concept_python',
            'title': 'Python Programming',
            'summary': 'Learn Python programming fundamentals',
            'difficulty': 3,
            'estimated_time': 45,
            'prerequisites': ['basic_computer_skills'],
            'tags': ['programming', 'python', 'beginner']
        }

class TestDataLoader:
    """Load and manage test data files."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir

    def load_test_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Load test scenario data."""
        scenario_file = f"{self.data_dir}/{scenario_name}.json"

        try:
            with open(scenario_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def save_test_scenario(self, scenario_name: str, data: Dict[str, Any]):
        """Save test scenario data."""
        scenario_file = f"{self.data_dir}/{scenario_name}.json"

        with open(scenario_file, 'w') as f:
            json.dump(data, f, indent=2)
```

## Related Documentation

- **[API Optimization](../performance-optimization/api-optimization.md)**: API performance optimization
- **[Memory Management](../performance-optimization/memory-management.md)**: Memory optimization
- **[Command Development](adding-new-commands.md)**: Command development patterns
- **[Setup Development](setup-development.md)**: Development environment setup

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Implementation Guides*