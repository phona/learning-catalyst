"""
Integration tests for Learning Catalyst project
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.ai.service import ModelAbstractionService
from src.core.basic_analytics_dashboard import BasicAnalyticsDashboard
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.challenge_engine import ChallengeEngineImpl
from src.core.checkpoint_manager import CheckpointManagerImpl
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.core.system_commands_handler import SystemCommandsHandlerImpl
from src.data.database_manager import DatabaseManager
from src.data.models.concept import Concept
from src.utils.preferences_manager import PreferencesManager
from src.utils.workspace_manager import WorkspaceManager


class TestIntegration:
    def test_workspace_and_preferences_integration(self, temp_workspace):
        """Test integration between workspace manager and preferences manager"""
        # Initialize workspace
        workspace_mgr = WorkspaceManager(temp_workspace)
        assert workspace_mgr.workspace_exists()

        # Initialize preferences manager which should use the workspace
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Verify preferences file exists in the correct location
        expected_prefs_path = temp_workspace / ".catalys" / "preferences.json"
        assert expected_prefs_path.exists()

        # Test setting and getting preferences
        prefs_mgr.set_preference("integration.test", "value")
        value = prefs_mgr.get_preference("integration.test")
        assert value == "value"

    def test_database_and_knowledge_navigator_integration(self, temp_workspace):
        """Test integration between database manager and knowledge navigator"""
        db_path = temp_workspace / ".catalys" / "data.db"
        db_manager = DatabaseManager(str(db_path))
        knowledge_navigator = SQLiteKnowledgeNavigator(str(db_path))

        # Create and save a concept
        test_concept = Concept(
            id="integration_test_concept",
            title="Integration Test Concept",
            content="This is a test concept for integration testing.",
            prerequisites=[],
            difficulty_level=5,
        )
        db_manager.save_concept(test_concept)

        # Retrieve the concept using the knowledge navigator
        available_concepts = knowledge_navigator.get_available_concepts()

        # Verify the concept is available
        found = False
        for concept in available_concepts:
            if concept.id == "integration_test_concept":
                assert concept.title == "Integration Test Concept"
                assert concept.content == "This is a test concept for integration testing."
                assert concept.difficulty_level == 5
                found = True
                break

        assert found, "Concept was not found in available concepts"

    @pytest.mark.asyncio
    async def test_preferences_and_system_commands_integration(self, temp_workspace):
        """Test integration between preferences manager and system commands handler"""
        db_path = temp_workspace / ".catalys" / "data.db"
        db_manager = DatabaseManager(str(db_path))
        model_service = ModelAbstractionService()

        # Mock the model service to avoid actual API calls
        model_service.providers["openai"] = AsyncMock()
        model_service.providers["anthropic"] = AsyncMock()

        prefs_mgr = PreferencesManager(str(temp_workspace))
        system_handler = SystemCommandsHandlerImpl(prefs_mgr, db_manager, model_service)

        # Test setting a preference through the system handler
        success = await system_handler.set_preference("integration.key", "integration_value")
        assert success is True

        # Verify the preference was set
        prefs = await system_handler.list_preferences()
        assert prefs["integration"]["key"] == "integration_value"

    @pytest.mark.asyncio
    async def test_catalyst_agent_and_ai_service_integration(self, model_service):
        """Test integration between catalyst agent and AI service"""
        catalyst_agent = CatalystAgentImpl(model_service)

        # Mock the model service response
        mock_response = MagicMock()
        mock_response.content = "This is a generated explanation."
        model_service.send_message.return_value = mock_response

        # Create a test concept
        test_concept = Concept(
            id="test_concept",
            title="Test Concept",
            content="This is a test concept.",
            prerequisites=[],
            difficulty_level=5,
        )

        # Generate an explanation
        context = {"provider": "openai", "model": "gpt-4"}
        explanation = await catalyst_agent.generate_explanation(test_concept, context)

        # Verify the explanation was generated
        assert explanation == "This is a generated explanation."

        # Verify the model service was called
        model_service.send_message.assert_called_once()

    def test_checkpoint_and_data_persistence_integration(self, temp_workspace):
        """Test integration of checkpoint manager with data persistence"""
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))

        # Create test state data
        test_state = {
            "current_concept": "test_concept_123",
            "user_progress": [
                {"concept_id": "concept1", "completed": True, "score": 0.8},
                {"concept_id": "concept2", "completed": False, "score": 0.0},
            ],
            "learning_history": [{"concept_id": "concept1", "timestamp": "2023-01-01T00:00:00", "score": 0.8}],
        }

        # Create a checkpoint
        checkpoint_id = checkpoint_manager.create_checkpoint(test_state)
        assert checkpoint_id is not None

        # Load the checkpoint
        loaded_state = checkpoint_manager.load_checkpoint(checkpoint_id)

        # Verify the state was preserved
        assert loaded_state == test_state

    @pytest.mark.asyncio
    async def test_complete_learning_flow_integration(self, temp_workspace):
        """Test a complete learning flow integration"""
        # Set up all components
        db_path = temp_workspace / ".catalys" / "data.db"
        db_manager = DatabaseManager(str(db_path))
        model_service = ModelAbstractionService()

        # Mock the model service to avoid actual API calls
        model_service.providers["openai"] = AsyncMock()
        model_service.providers["anthropic"] = AsyncMock()

        prefs_mgr = PreferencesManager(str(temp_workspace))
        knowledge_navigator = SQLiteKnowledgeNavigator(str(db_path))
        catalyst_agent = CatalystAgentImpl(model_service)
        ChallengeEngineImpl(catalyst_agent)
        checkpoint_manager = CheckpointManagerImpl(str(temp_workspace))
        system_commands_handler = SystemCommandsHandlerImpl(prefs_mgr, db_manager, model_service)
        analytics_dashboard = BasicAnalyticsDashboard(db_manager)

        # Step 1: Save a concept to the database
        test_concept = Concept(
            id="integration_flow_concept",
            title="Integration Flow Concept",
            content="This concept is used for integration flow testing.",
            prerequisites=[],
            difficulty_level=5,
        )
        db_manager.save_concept(test_concept)

        # Step 2: Retrieve concepts through knowledge navigator
        concepts = await knowledge_navigator.get_available_concepts()
        assert len(concepts) >= 1

        # Step 3: Generate an explanation using the catalyst agent
        mock_response = MagicMock()
        mock_response.content = "This is an explanation for the integration flow concept."
        model_service.send_message.return_value = mock_response

        context = {"provider": "openai", "model": "gpt-4"}
        explanation = await catalyst_agent.generate_explanation(test_concept, context)
        assert "explanation" in explanation.lower()

        # Step 4: Generate a challenge
        challenge = await catalyst_agent.generate_challenge(test_concept, context)
        assert "challenge" in str(challenge).lower()

        # Step 5: Update user progress
        knowledge_navigator.update_progress(
            test_concept.id,
            type("UserProgress", (), {"concept_id": test_concept.id, "completed": False, "score": 0.0})(),
        )

        # Step 6: Create a checkpoint
        state_data = {
            "current_concept": test_concept.id,
            "explanation": explanation,
            "challenge": challenge,
            "user_progress": [{"concept_id": test_concept.id, "completed": False, "score": 0.0}],
        }
        checkpoint_id = await checkpoint_manager.create_checkpoint(state_data)
        assert checkpoint_id is not None

        # Step 7: Load the checkpoint and verify data integrity
        loaded_state = await checkpoint_manager.load_checkpoint(checkpoint_id)
        assert loaded_state["current_concept"] == test_concept.id
        assert loaded_state["explanation"] == explanation

        # Step 8: Generate a progress report using analytics
        time_period = {"start": "2023-01-01T00:00:00", "end": "2023-12-31T23:59:59"}
        progress_report = analytics_dashboard.generate_progress_report("test_user", time_period)
        assert progress_report.user_id == "test_user"

        # Step 9: Use system commands to verify functionality
        models = await system_commands_handler.list_available_models()
        assert isinstance(models, list)

        token_usage = await system_commands_handler.get_token_usage()
        assert "usage" in token_usage

        # Step 10: Set a preference and verify it's accessible
        await system_commands_handler.set_preference("integration.flow.test", "completed")
        all_prefs = await system_commands_handler.list_preferences()
        assert all_prefs["integration"]["flow"]["test"] == "completed"

    @pytest.mark.asyncio
    async def test_analytics_and_database_integration(self, temp_workspace):
        """Test integration between analytics components and database"""
        db_path = temp_workspace / ".catalys" / "data.db"
        db_manager = DatabaseManager(str(db_path))

        # Insert some test token usage data
        db_manager.insert_token_usage(
            model_name="gpt-4",
            provider="openai",
            input_tokens=100,
            output_tokens=200,
            user_id="integration_user",
            context="explanation",
        )

        # Initialize analytics components
        analytics_dashboard = BasicAnalyticsDashboard(db_manager)
        token_analytics = type("TokenUsageAnalytics", (), {"__init__": lambda self, db: setattr(self, "db_manager", db)})()
        token_analytics.db_manager = db_manager  # Manual initialization for test

        # Test that analytics can access the database data
        time_period = {"start": "2023-01-01T00:00:00", "end": "2023-12-31T23:59:59"}
        report = analytics_dashboard.generate_progress_report("integration_user", time_period)

        # Even though we don't have actual progress data, the report should be generated
        assert report.user_id == "integration_user"

        # Test token usage summary
        summary = db_manager.get_token_usage_summary(
            user_id="integration_user", start_date=time_period["start"], end_date=time_period["end"]
        )
        assert summary["input_tokens"] == 100
        assert summary["output_tokens"] == 200
        assert summary["total_tokens"] == 300

    @pytest.mark.asyncio
    async def test_challenge_engine_and_catalyst_agent_integration(self, temp_workspace):
        """Test integration between challenge engine and catalyst agent"""
        # Set up the components
        model_service = ModelAbstractionService()
        model_service.providers["openai"] = AsyncMock()
        catalyst_agent = CatalystAgentImpl(model_service)
        challenge_engine = ChallengeEngineImpl(catalyst_agent)

        # Mock the model service responses
        explanation_response = MagicMock()
        explanation_response.content = "This is an explanation for the test concept."
        model_service.send_message.return_value = explanation_response

        # Create a test concept
        test_concept = Concept(
            id="challenge_integration_concept",
            title="Challenge Integration Concept",
            content="Content for challenge integration test.",
            prerequisites=[],
            difficulty_level=5,
        )

        # Generate a challenge
        challenge_response = MagicMock()
        challenge_response.content = "What is the main principle?"
        # Temporarily set a different return value for challenge generation
        original_send_message = model_service.send_message
        model_service.send_message = AsyncMock(return_value=challenge_response)

        context = {"provider": "openai", "model": "gpt-4"}
        challenge = await catalyst_agent.generate_challenge(test_concept, context)

        # Restore original mock for other calls
        model_service.send_message = original_send_message

        # Present the challenge
        challenge_engine.present_challenge(challenge)

        # Mock user input for the answer
        with patch("builtins.input", return_value="The main principle is..."):
            answer = await challenge_engine.collect_answer()
            assert answer == "The main principle is..."

        # Validate the answer (this will call the evaluation function)
        evaluation = await challenge_engine.validate_answer(answer, challenge)
        assert "correctness" in evaluation
        assert "feedback" in evaluation
        assert "score" in evaluation


if __name__ == "__main__":
    pytest.main([__file__])
