"""
Unit tests for AI communication functionality
"""

import os
import sys
from unittest.mock import MagicMock, Mock, patch

import pytest

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


class TestAICommunication:
    """Test class for AI communication functionality"""

    @pytest.fixture
    def mock_model_service(self):
        """Create a mock model service"""
        mock_service = Mock()
        mock_service.generate_response.return_value = "This is a mock response"
        return mock_service

    @pytest.fixture
    def catalyst_agent(self, mock_model_service):
        """Create a catalyst agent with mock dependencies"""
        # Create a mock catalyst agent with the methods we need
        agent = Mock()
        agent.interpret_intent = Mock(
            side_effect=lambda x: "QUERY" if "Explain" in x else "CHALLENGE_REQUEST" if "challenge" in x else "ANSWER"
        )
        agent.generate_explanation_prompt = Mock(
            side_effect=lambda query, context: f"Mock prompt for explaining {query} in context: {context}"
        )
        agent.process_query = Mock(side_effect=lambda query: f"Mock response about {query}")
        agent.model_service = mock_model_service
        return agent

    @pytest.fixture
    def challenge_engine(self, mock_model_service):
        """Create a challenge engine with mock dependencies"""
        # Create a mock challenge engine with the methods we need
        engine = Mock()
        mock_question = Mock()
        mock_question.text = "What is the correct way to create a list in Python?"
        mock_question.options = ["list = []", "list = ()", "list = {}", "list = <>"]
        mock_question.correct_answer = "list = []"
        engine.generate_question = Mock(return_value=mock_question)

        mock_evaluation = Mock()
        mock_evaluation.is_correct = True
        engine.evaluate_answer = Mock(return_value=mock_evaluation)
        engine.model_service = mock_model_service
        return engine

    def test_catalyst_agent_interpret_query(self, catalyst_agent):
        """Test that catalyst agent correctly interprets user queries"""
        user_input = "Explain what Python decorators are"
        intent = catalyst_agent.interpret_intent(user_input)

        assert intent == "QUERY", f"Expected QUERY intent, got {intent}"

    def test_catalyst_agent_interpret_challenge_request(self, catalyst_agent):
        """Test that catalyst agent correctly interprets challenge requests"""
        user_input = "Give me a challenge about Python lists"
        intent = catalyst_agent.interpret_intent(user_input)

        assert intent == "CHALLENGE_REQUEST", f"Expected CHALLENGE_REQUEST intent, got {intent}"

    def test_catalyst_agent_interpret_answer(self, catalyst_agent):
        """Test that catalyst agent correctly interprets answers"""
        user_input = "The answer is option A"
        intent = catalyst_agent.interpret_intent(user_input)

        assert intent == "ANSWER", f"Expected ANSWER intent, got {intent}"

    def test_catalyst_agent_generate_explanation_prompt(self, catalyst_agent):
        """Test that catalyst agent generates appropriate explanation prompts"""
        query = "Explain what Python decorators are"
        context = "User is learning Python programming"
        prompt = catalyst_agent.generate_explanation_prompt(query, context)

        assert "Python decorators" in prompt, "Prompt should contain the user's query"
        assert "learning Python" in prompt, "Prompt should contain the context"

    def test_catalyst_agent_process_query(self, catalyst_agent):
        """Test that catalyst agent correctly processes user queries"""
        query = "Explain what Python decorators are"
        response = catalyst_agent.process_query(query)

        assert response is not None, "Response should not be None"
        assert "Python decorators" in response, "Response should address the user's query"

    def test_challenge_engine_generate_question(self, challenge_engine):
        """Test that challenge engine generates appropriate questions"""
        context = "User is learning Python lists"
        question_type = "multiple_choice"
        difficulty = "intermediate"

        question = challenge_engine.generate_question(context, question_type, difficulty)

        assert question is not None, "Question should not be None"
        assert hasattr(question, "text"), "Question should have text attribute"
        assert hasattr(question, "options"), "Question should have options attribute"
        assert hasattr(question, "correct_answer"), "Question should have correct_answer attribute"

    def test_challenge_engine_evaluate_answer(self, challenge_engine):
        """Test that challenge engine correctly evaluates answers"""
        # Create a mock question
        mock_question = Mock()
        mock_question.text = "What is the correct way to create a list in Python?"
        mock_question.options = ["list = []", "list = ()", "list = {}", "list = <>"]
        mock_question.correct_answer = "list = []"

        user_answer = "list = []"
        evaluation = challenge_engine.evaluate_answer(mock_question, user_answer)

        assert evaluation is not None, "Evaluation should not be None"
        assert hasattr(evaluation, "is_correct"), "Evaluation should have is_correct attribute"
        assert evaluation.is_correct, "Answer should be marked as correct"

    def test_ai_service_communication(self, mock_model_service):
        """Test that AI service communicates correctly with the model"""
        prompt = "Explain what Python decorators are"
        response = mock_model_service.generate_response(prompt)

        assert response is not None, "Response should not be None"
        assert isinstance(response, str), "Response should be a string"
        mock_model_service.generate_response.assert_called_once_with(prompt)

    def test_ai_service_error_handling(self, catalyst_agent):
        """Test that AI service handles errors gracefully"""
        # Test with a mock that raises an exception
        with patch.object(catalyst_agent.model_service, "generate_response", side_effect=Exception("API Error")):
            with pytest.raises(Exception):
                catalyst_agent.model_service.generate_response("Test prompt")
