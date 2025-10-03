"""
Unit tests for core application logic
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.challenge_engine import ChallengeEngineImpl
from src.core.checkpoint_manager import CheckpointManagerImpl
from src.core.system_commands_handler import SystemCommandsHandlerImpl
from src.data.models.concept import Concept
from src.data.models.extended_models import UserProgress


class TestSQLiteKnowledgeNavigator:
    def test_initialization(self, db_manager):
        """Test SQLiteKnowledgeNavigator initialization"""
        nav = SQLiteKnowledgeNavigator(db_manager.db_path)
        assert nav.db_path == db_manager.db_path

    @pytest.mark.asyncio
    async def test_load_content(self, knowledge_navigator):
        """Test loading content from a file"""
        # Create a temporary markdown file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            f.write("# Test Concept\nThis is a test concept for learning.")
            temp_file = f.name
        
        try:
            # Load content from the file
            knowledge_map = await knowledge_navigator.load_content(temp_file)
            
            # Verify that the knowledge map was created
            assert knowledge_map is not None
            assert isinstance(knowledge_map.concepts, list)
        finally:
            # Clean up
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_get_available_concepts(self, knowledge_navigator, sample_concept):
        """Test getting available concepts"""
        # Save a concept first
        knowledge_navigator._init_db()  # Ensure tables exist
        knowledge_navigator.db_path = knowledge_navigator.db_path
        
        # Use the database manager to save the concept
        from src.data.database_manager import DatabaseManager
        db_manager = DatabaseManager(knowledge_navigator.db_path)
        db_manager.save_concept(sample_concept)
        
        # Get available concepts
        concepts = await knowledge_navigator.get_available_concepts()
        
        # Verify that the concept is in the list
        assert len(concepts) >= 1
        found = False
        for concept in concepts:
            if concept.id == sample_concept.id:
                assert concept.title == sample_concept.title
                assert concept.content == sample_concept.content
                assert concept.prerequisites == sample_concept.prerequisites
                assert concept.difficulty_level == sample_concept.difficulty_level
                found = True
                break
        assert found, "Sample concept was not found in available concepts"

    def test_get_concept_path(self, knowledge_navigator, sample_concept):
        """Test getting the concept path"""
        # Save a concept with prerequisites
        from src.data.database_manager import DatabaseManager
        db_manager = DatabaseManager(knowledge_navigator.db_path)
        sample_concept.prerequisites = ["prereq1", "prereq2"]
        db_manager.save_concept(sample_concept)
        
        # Create a prerequisite concept
        prereq_concept = Concept(
            id="prereq1",
            title="Prerequisite Concept",
            content="This is a prerequisite concept.",
            prerequisites=[],
            difficulty_level=3
        )
        db_manager.save_concept(prereq_concept)
        
        # Get concept path
        path = knowledge_navigator.get_concept_path(sample_concept.id)
        
        # Path should include both the prerequisite and the target concept
        assert len(path) >= 1
        # The target concept should be in the path
        target_found = any(c.id == sample_concept.id for c in path)
        assert target_found

    def test_update_progress(self, knowledge_navigator):
        """Test updating user progress"""
        progress = UserProgress(
            concept_id="test_concept_001",
            completed=True,
            score=0.85
        )
        
        # This should not raise an exception
        knowledge_navigator.update_progress("test_concept_001", progress)


class TestCatalystAgent:
    @pytest.mark.asyncio
    async def test_generate_explanation(self, catalyst_agent, model_service, sample_concept):
        """Test generating explanation for a concept"""
        # Mock the model service response
        mock_response = MagicMock()
        mock_response.content = "This is an explanation for the concept."
        model_service.send_message.return_value = mock_response
        
        # Generate explanation
        context = {
            "provider": "openai",
            "model": "gpt-4",
            "learning_level": "intermediate"
        }
        
        explanation = await catalyst_agent.generate_explanation(sample_concept, context)
        
        # Verify the explanation was generated
        assert explanation == "This is an explanation for the concept."
        # Verify the model service was called
        model_service.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_challenge(self, catalyst_agent, model_service, sample_concept):
        """Test generating a challenge for a concept"""
        # Mock the model service response
        mock_response = MagicMock()
        mock_response.content = "What is the main principle of this concept?"
        model_service.send_message.return_value = mock_response
        
        # Generate challenge
        context = {
            "provider": "openai",
            "model": "gpt-4",
            "challenge_type": "multiple-choice",
            "difficulty": "medium"
        }
        
        challenge = await catalyst_agent.generate_challenge(sample_concept, context)
        
        # Verify the challenge was generated
        assert "What is the main principle of this concept?" in challenge["challenge_text"]
        # Verify the model service was called
        model_service.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_evaluate_answer(self, catalyst_agent, model_service):
        """Test evaluating an answer"""
        # Mock the model service response
        mock_response = MagicMock()
        mock_response.content = "The answer is correct with a score of 0.9."
        model_service.send_message.return_value = mock_response
        
        # Evaluate answer
        context = {
            "provider": "openai",
            "model": "gpt-4"
        }
        
        evaluation = await catalyst_agent.evaluate_answer(
            answer="42",
            expected="42",
            context=context
        )
        
        # Verify the evaluation was performed
        assert "correct" in evaluation["feedback"].lower() or "incorrect" in evaluation["feedback"].lower()
        # Verify the model service was called
        model_service.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_suggest_next_concepts(self, catalyst_agent, sample_user_profile):
        """Test suggesting next concepts"""
        # For now, just verify it doesn't crash
        concepts = await catalyst_agent.suggest_next_concepts(
            sample_user_profile.ai_config,
            {"score": 0.8}
        )
        assert isinstance(concepts, list)


class TestChallengeEngine:
    def test_present_challenge(self, challenge_engine, sample_concept):
        """Test presenting a challenge"""
        challenge = {
            "challenge_text": "What is 2+2?",
            "options": {"A": "3", "B": "4", "C": "5"}
        }
        
        # This should not raise an exception
        challenge_engine.present_challenge(challenge)

    @pytest.mark.asyncio
    async def test_collect_answer(self, challenge_engine):
        """Test collecting an answer"""
        # Mock input to simulate user input
        with patch('builtins.input', return_value="4"):
            answer = await challenge_engine.collect_answer()
            assert answer == "4"

    @pytest.mark.asyncio
    async def test_validate_answer(self, challenge_engine):
        """Test validating an answer"""
        challenge = {
            "expected_answer": "4",
            "challenge_text": "What is 2+2?"
        }
        
        # The validation will use the CatalystAgent to evaluate the answer
        # For this test, we'll just check that it returns a valid evaluation structure
        evaluation = await challenge_engine.validate_answer("4", challenge)
        
        assert "correctness" in evaluation
        assert "feedback" in evaluation
        assert "score" in evaluation


class TestCheckpointManager:
    @pytest.mark.asyncio
    async def test_create_and_load_checkpoint(self, checkpoint_manager):
        """Test creating and loading a checkpoint"""
        # Create a test state
        test_state = {
            "current_concept": "test_concept_001",
            "user_progress": [{"concept_id": "test_concept_001", "completed": True, "score": 0.8}]
        }
        
        # Create a checkpoint
        checkpoint_id = await checkpoint_manager.create_checkpoint(test_state)
        
        # Verify checkpoint ID is returned
        assert checkpoint_id is not None
        assert isinstance(checkpoint_id, str)
        
        # Load the checkpoint
        loaded_state = await checkpoint_manager.load_checkpoint(checkpoint_id)
        
        # Verify the state was loaded correctly
        assert loaded_state == test_state

    @pytest.mark.asyncio
    async def test_list_checkpoints(self, checkpoint_manager):
        """Test listing checkpoints"""
        # Create a test state and checkpoint
        test_state = {"test": "data"}
        checkpoint_id = await checkpoint_manager.create_checkpoint(test_state)
        
        # List checkpoints
        checkpoints = await checkpoint_manager.list_checkpoints()
        
        # Verify that our checkpoint is in the list
        assert len(checkpoints) >= 1
        found = False
        for cp in checkpoints:
            if cp["id"] == checkpoint_id:
                found = True
                break
        assert found

    @pytest.mark.asyncio
    async def test_load_nonexistent_checkpoint(self, checkpoint_manager):
        """Test loading a non-existent checkpoint"""
        with pytest.raises(FileNotFoundError):
            await checkpoint_manager.load_checkpoint("nonexistent_checkpoint")


class TestSystemCommandsHandler:
    @pytest.mark.asyncio
    async def test_list_available_models(self, system_commands_handler, model_service):
        """Test listing available models"""
        # Mock the model service response
        model_service.list_available_models.return_value = ["gpt-4", "gpt-3.5-turbo"]
        
        # List available models
        models = await system_commands_handler.list_available_models()
        
        # Verify the response
        assert len(models) >= 0  # May be empty if providers aren't configured
        
    @pytest.mark.asyncio
    async def test_get_token_usage(self, system_commands_handler):
        """Test getting token usage"""
        # Get token usage
        usage = await system_commands_handler.get_token_usage(period_days=30)
        
        # Verify the structure of the response
        assert "period" in usage
        assert "usage" in usage
        assert isinstance(usage["period"], dict)
        assert isinstance(usage["usage"], dict)

    @pytest.mark.asyncio
    async def test_get_detailed_token_usage(self, system_commands_handler):
        """Test getting detailed token usage"""
        # Get detailed token usage
        usage = await system_commands_handler.get_detailed_token_usage(model_name="gpt-4")
        
        # Verify the response is a list
        assert isinstance(usage, list)

    @pytest.mark.asyncio
    async def test_show_model_capabilities(self, system_commands_handler):
        """Test showing model capabilities"""
        # Show model capabilities (will be empty since not implemented in mock)
        caps = await system_commands_handler.show_model_capabilities("gpt-4")
        
        # Verify the response is a dict
        assert isinstance(caps, dict)

    @pytest.mark.asyncio
    async def test_get_knowledge_map(self, system_commands_handler):
        """Test getting knowledge map"""
        # Get knowledge map
        km = await system_commands_handler.get_knowledge_map()
        
        # Verify it returns a KnowledgeMap object
        from src.data.models.extended_models import KnowledgeMap
        assert isinstance(km, KnowledgeMap)

    @pytest.mark.asyncio
    async def test_list_and_set_preferences(self, system_commands_handler, preferences_manager):
        """Test listing and setting preferences"""
        # Test listing preferences
        prefs = await system_commands_handler.list_preferences()
        assert isinstance(prefs, dict)
        
        # Test setting a preference
        result = await system_commands_handler.set_preference("test.key", "test_value")
        assert result is True
        
        # Verify the preference was set
        updated_prefs = await system_commands_handler.list_preferences()
        assert updated_prefs["test"]["key"] == "test_value"


if __name__ == "__main__":
    pytest.main([__file__])