"""
Integration tests for CLI Command Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of CLI command integration based on real-world usage patterns from docs/examples/.
Tests cover command workflows, response handling, error scenarios, and user interactions.
"""

import pytest
import asyncio
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from tests.test_helpers import (
    validate_cli_response_format,
    measure_async_performance,
    assert_async_performance_under
)


class TestCLIIntegration:
    """Integration tests for CLI command functionality."""

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_config_provider_workflow(self):
        """Test complete provider configuration workflow from examples."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: List available providers
        result = await cli.execute_command("/config provider list")
        assert result['success'] is True
        assert 'providers' in result['data']
        assert len(result['data']['providers']) > 0

        # Step 2: Add new provider
        result = await cli.execute_command("/config provider add deepseek")
        assert result['success'] is True
        assert 'deepseek' in str(result['data'])

        # Step 3: Configure provider settings
        result = await cli.execute_command("/config provider set deepseek api_key test-key")
        assert result['success'] is True

        # Step 4: Switch to new provider
        result = await cli.execute_command("/config provider switch deepseek")
        assert result['success'] is True
        assert 'deepseek' in str(result['data'])

        # Step 5: Verify configuration
        result = await cli.execute_command("/config provider status")
        assert result['success'] is True
        assert 'deepseek' in str(result['data'])

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_knowledge_map_navigation_workflow(self):
        """Test knowledge map navigation and exploration workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: View knowledge map
        result = await cli.execute_command("/knowledge-map")
        assert result['success'] is True
        assert 'current_concept' in result['data']
        assert 'mastered_concepts' in result['data']

        # Step 2: View progress-focused map
        result = await cli.execute_command("/knowledge-map progress python")
        assert result['success'] is True
        assert 'progress' in str(result['data']).lower()

        # Step 3: View weak areas
        result = await cli.execute_command("/knowledge-map weak-areas")
        assert result['success'] is True
        assert 'weak_areas' in result['data']

        # Step 4: Navigate to specific concept
        result = await cli.execute_command("/knowledge-map navigate python functions")
        assert result['success'] is True
        assert 'functions' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_checkpoint_management_workflow(self):
        """Test complete checkpoint save and restore workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Start learning session
        result = await cli.execute_command("/learn python basics")
        assert result['success'] is True

        # Step 2: Save checkpoint
        checkpoint_name = "python_basics_session"
        result = await cli.execute_command(f"/checkpoint save {checkpoint_name}")
        assert result['success'] is True
        assert checkpoint_name in str(result['data'])

        # Step 3: Continue learning
        result = await cli.execute_command("/learn python variables")
        assert result['success'] is True

        # Step 4: List checkpoints
        result = await cli.execute_command("/checkpoint list")
        assert result['success'] is True
        assert checkpoint_name in str(result['data'])

        # Step 5: Restore checkpoint
        result = await cli.execute_command(f"/checkpoint load {checkpoint_name}")
        assert result['success'] is True
        assert 'restored' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_analytics_workflow(self):
        """Test analytics and token usage tracking workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Generate some learning activity
        await cli.execute_command("/learn python basics")
        await cli.execute_command("/learn python variables")

        # Step 2: Check token usage
        result = await cli.execute_command("/tokens")
        assert result['success'] is True
        assert 'usage' in result['data']

        # Step 3: Check weekly token usage
        result = await cli.execute_command("/tokens week")
        assert result['success'] is True
        assert 'week' in str(result['data']).lower()

        # Step 4: View detailed statistics
        result = await cli.execute_command("/statistics --detailed")
        assert result['success'] is True
        assert 'learning_time' in str(result['data']).lower()
        assert 'concepts_mastered' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_context_management_workflow(self):
        """Test context management and optimization workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Start with verbose context
        result = await cli.execute_command("/context verbose")
        assert result['success'] is True
        assert 'verbose' in str(result['data']).lower()

        # Step 2: Generate some context
        await cli.execute_command("/learn python functions")
        await cli.execute_command("/explain lambda functions")

        # Step 3: Check current context
        result = await cli.execute_command("/context")
        assert result['success'] is True
        assert 'context_size' in result['data']

        # Step 4: Compress context
        result = await cli.execute_command("/context compress")
        assert result['success'] is True
        assert 'compressed' in str(result['data']).lower()

        # Step 5: Verify reduced context size
        result = await cli.execute_command("/context")
        assert result['success'] is True
        assert 'context_size' in result['data']

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_learning_session_workflow(self):
        """Test complete learning session workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Start learning topic
        result = await cli.execute_command("/learn python data structures")
        assert result['success'] is True
        assert 'data structures' in str(result['data']).lower()

        # Step 2: Ask for explanation
        result = await cli.execute_command("Can you explain lists and tuples?")
        assert result['success'] is True
        assert 'lists' in str(result['data']).lower() or 'tuples' in str(result['data']).lower()

        # Step 3: Request examples
        result = await cli.execute_command("Show me some examples of list operations")
        assert result['success'] is True
        assert 'example' in str(result['data']).lower()

        # Step 4: Ask for practice suggestions
        result = await cli.execute_command("What should I practice next?")
        assert result['success'] is True
        assert 'practice' in str(result['data']).lower() or 'next' in str(result['data']).lower()

        # Step 5: Get personalized suggestions
        result = await cli.execute_command("/suggest")
        assert result['success'] is True
        assert 'suggestions' in result['data']

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_help_system_workflow(self):
        """Test help system and command discovery workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: General help
        result = await cli.execute_command("/help")
        assert result['success'] is True
        assert 'commands' in str(result['data']).lower()
        assert '/config' in str(result['data'])
        assert '/learn' in str(result['data'])

        # Step 2: Specific command help
        result = await cli.execute_command("/help config")
        assert result['success'] is True
        assert 'configuration' in str(result['data']).lower()
        assert 'provider' in str(result['data']).lower()

        # Step 3: Command suggestions
        result = await cli.execute_command("/conf")
        assert result['success'] is True
        assert 'config' in str(result['data'])  # Should suggest config

        result = await cli.execute_command("/know")
        assert result['success'] is True
        assert 'knowledge-map' in str(result['data'])  # Should suggest knowledge-map

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_error_recovery_workflow(self):
        """Test error handling and recovery workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Invalid command
        result = await cli.execute_command("/invalid_command")
        assert result['success'] is False
        assert 'error' in result
        assert 'suggestions' in result.get('error', {})

        # Step 2: Malformed command
        result = await cli.execute_command("help")  # Missing slash
        assert result['success'] is False
        assert 'must start with' in str(result['error']).lower()

        # Step 3: Command with invalid arguments
        result = await cli.execute_command("/config provider invalid_action")
        assert result['success'] is False
        assert 'invalid' in str(result['error']).lower()

        # Step 4: Recovery - try valid command
        result = await cli.execute_command("/help")
        assert result['success'] is True

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_command_history_workflow(self):
        """Test command history and recall workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Execute several commands
        commands = [
            "/help",
            "/config provider list",
            "/learn python basics",
            "/knowledge-map",
            "/tokens"
        ]

        for cmd in commands:
            await cli.execute_command(cmd)

        # Step 2: View command history
        result = await cli.execute_command("/history")
        assert result['success'] is True
        assert 'history' in result['data']
        assert len(result['data']['history']) >= len(commands)

        # Step 3: Search history
        result = await cli.execute_command("/history search config")
        assert result['success'] is True
        assert 'config' in str(result['data']).lower()

        # Step 4: Clear history
        result = await cli.execute_command("/history clear")
        assert result['success'] is True
        assert 'cleared' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_multi_command_workflow(self):
        """Test complex multi-command workflows."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Configure provider and model
        await cli.execute_command("/config provider add openai")
        await cli.execute_command("/config model switch gpt-4o-mini")

        # Step 2: Start learning session
        await cli.execute_command("/learn python programming")

        # Step 3: Save checkpoint
        await cli.execute_command("/checkpoint save python_intro")

        # Step 4: Continue learning
        await cli.execute_command("/learn python variables and data types")

        # Step 5: Check progress
        result = await cli.execute_command("/knowledge-map progress")
        assert result['success'] is True
        assert 'progress' in str(result['data']).lower()

        # Step 6: View statistics
        result = await cli.execute_command("/statistics")
        assert result['success'] is True
        assert 'statistics' in str(result['data']).lower()

        # Step 7: Restore checkpoint
        result = await cli.execute_command("/checkpoint load python_intro")
        assert result['success'] is True

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_configuration_persistence_workflow(self):
        """Test that configuration persists across CLI sessions."""
        from src.cli.main import CLIInterface

        # First CLI session
        cli1 = CLIInterface()

        # Configure settings
        await cli1.execute_command("/config provider add deepseek")
        await cli1.execute_command("/config set learning.difficulty intermediate")
        await cli1.execute_command("/config set ui.theme dark")

        # Save configuration
        await cli1.execute_command("/config save")

        # Create new CLI session
        cli2 = CLIInterface()

        # Load configuration
        await cli2.execute_command("/config load")

        # Verify configuration persistence
        result = await cli2.execute_command("/config show")
        assert result['success'] is True
        assert 'deepseek' in str(result['data'])
        assert 'intermediate' in str(result['data']).lower()
        assert 'dark' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_interactive_response_workflow(self):
        """Test interactive response handling and follow-up commands."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Ask question that generates suggestions
        result = await cli.execute_command("How do I create a function in Python?")
        assert result['success'] is True
        assert 'function' in str(result['data']).lower()

        # Step 2: Follow up with suggested command
        if 'suggestions' in result['data']:
            first_suggestion = result['data']['suggestions'][0]
            result = await cli.execute_command(first_suggestion)
            assert result['success'] is True

        # Step 3: Use quick action from response
        result = await cli.execute_command("/learn more")
        assert result['success'] is True

        # Step 4: Request clarification
        result = await cli.execute_command("Can you explain that with a simple example?")
        assert result['success'] is True
        assert 'example' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_concurrent_command_workflow(self):
        """Test handling of concurrent CLI commands."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Start long-running command
        long_task = asyncio.create_task(
            cli.execute_command("/learn advanced python concepts")
        )

        # Step 2: Check status while command runs
        await asyncio.sleep(0.1)  # Let long task start
        result = await cli.execute_command("/status")
        assert result['success'] is True
        assert 'running' in str(result['data']).lower()

        # Step 3: Wait for completion
        result = await long_task
        assert result['success'] is True

        # Step 4: Quick command should still work
        result = await cli.execute_command("/help")
        assert result['success'] is True

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_command_pipeline_workflow(self):
        """Test command pipeline and chaining workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Configure pipeline
        result = await cli.execute_command("/pipeline create learn_review")
        assert result['success'] is True

        # Step 2: Add commands to pipeline
        await cli.execute_command("/pipeline add learn_review /learn python basics")
        await cli.execute_command("/pipeline add learn_review /knowledge-map progress")
        await cli.execute_command("/pipeline add learn_review /checkpoint save basics_complete")

        # Step 3: Execute pipeline
        result = await cli.execute_command("/pipeline run learn_review")
        assert result['success'] is True
        assert 'completed' in str(result['data']).lower()

        # Step 4: Verify pipeline results
        result = await cli.execute_command("/pipeline status learn_review")
        assert result['success'] is True
        assert 'completed' in str(result['data']).lower()

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_customization_workflow(self):
        """Test CLI customization and personalization workflow."""
        from src.cli.main import CLIInterface

        cli = CLIInterface()

        # Step 1: Set user preferences
        await cli.execute_command("/config set ui.show_timestamps true")
        await cli.execute_command("/config set ui.compact_mode false")
        await cli.execute_command("/config set learning.pace fast")

        # Step 2: Create command alias
        result = await cli.execute_command("/alias create km /knowledge-map")
        assert result['success'] is True

        # Step 3: Use alias
        result = await cli.execute_command("/km")
        assert result['success'] is True
        assert 'knowledge' in str(result['data']).lower()

        # Step 4: Customize response format
        await cli.execute_command("/config set ui.response_format detailed")
        result = await cli.execute_command("/help")
        assert result['success'] is True
        assert len(str(result['data'])) > 100  # Should be detailed

    @pytest.mark.integration
    @pytest.mark.cli
    async def test_accessibility_workflow(self):
        """Test accessibility features and screen reader support."""
        from src.cli.main import CLIInterface

        cli = CLIInterface(accessibility_mode=True)

        # Step 1: Enable accessibility mode
        result = await cli.execute_command("/config set ui.accessibility true")
        assert result['success'] is True

        # Step 2: Test accessible output
        result = await cli.execute_command("/config provider list")
        assert result['success'] is True
        # Should include screen reader friendly elements
        assert 'table' in str(result['data']).lower() or 'list' in str(result['data']).lower()

        # Step 3: Test accessible help
        result = await cli.execute_command("/help --accessible")
        assert result['success'] is True
        assert 'accessible' in str(result['data']).lower()

        # Step 4: Test high contrast mode
        await cli.execute_command("/config set ui.high_contrast true")
        result = await cli.execute_command("/tokens")
        assert result['success'] is True