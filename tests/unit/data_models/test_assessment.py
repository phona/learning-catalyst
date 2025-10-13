"""
TDD tests for Assessment data model.

Following Test-Driven Development methodology, these tests define the expected behavior
of the Assessment entity before implementation. Tests cover assessment creation,
evaluation, and adaptive difficulty based on the API documentation.
"""

import pytest
from datetime import datetime
from typing import Dict, Any, List, Optional
from tests.test_helpers import (
    assert_valid_uuid,
    generate_mock_concept,
    assert_raises_specific_error
)


class TestAssessmentModel:
    """Test cases for Assessment data model following TDD principles."""

    @pytest.mark.unit
    def test_assessment_creation_with_valid_data(self):
        """Test that assessment can be created with valid data (TDD: Red phase)."""
        # This test will initially fail until Assessment model is implemented
        from src.data.models.assessment import Assessment, ChallengeType

        assessment_data = {
            "id": "assess_001",
            "concept_id": "con_python_functions",
            "challenge_type": ChallengeType.MULTIPLE_CHOICE,
            "question": "What is the correct syntax for defining a function in Python?",
            "correct_answer": {"option": "def function_name():", "explanation": "Uses def keyword"},
            "options": [
                {"id": "a", "text": "function function_name():"},
                {"id": "b", "text": "def function_name():"},
                {"id": "c", "text": "define function_name():"},
                {"id": "d", "text": "func function_name():"}
            ],
            "difficulty_level": 2,
            "evaluation_criteria": {
                "time_limit_seconds": 30,
                "points_possible": 10,
                "partial_credit": True
            },
            "created_at": datetime.now().isoformat()
        }

        assessment = Assessment(**assessment_data)

        assert assessment.id == "assess_001"
        assert assessment.concept_id == "con_python_functions"
        assert assessment.challenge_type == ChallengeType.MULTIPLE_CHOICE
        assert assessment.difficulty_level == 2

    @pytest.mark.unit
    def test_assessment_validation_required_fields(self):
        """Test that assessment validation enforces required fields."""
        from src.data.models.assessment import Assessment, ChallengeType

        # Test missing required fields
        with pytest.raises(ValueError, match="Missing required field: id"):
            Assessment(
                concept_id="test_concept",
                challenge_type=ChallengeType.MULTIPLE_CHOICE,
                question="Test question"
            )

        with pytest.raises(ValueError, match="Missing required field: concept_id"):
            Assessment(
                id="test",
                challenge_type=ChallengeType.MULTIPLE_CHOICE,
                question="Test question"
            )

        with pytest.raises(ValueError, match="Missing required field: question"):
            Assessment(
                id="test",
                concept_id="test_concept",
                challenge_type=ChallengeType.MULTIPLE_CHOICE
            )

    @pytest.mark.unit
    def test_assessment_challenge_type_validation(self):
        """Test that assessment challenge types are properly validated."""
        from src.data.models.assessment import Assessment, ChallengeType

        valid_types = [
            ChallengeType.MULTIPLE_CHOICE,
            ChallengeType.TRUE_FALSE,
            ChallengeType.SHORT_ANSWER,
            ChallengeType.CODING_CHALLENGE,
            ChallengeType.PRACTICAL_EXERCISE,
            ChallengeType.CONCEPTUAL_QUESTION
        ]

        for challenge_type in valid_types:
            assessment = Assessment(
                id="test",
                concept_id="test_concept",
                challenge_type=challenge_type,
                question="Test question",
                correct_answer="test answer"
            )
            assert assessment.challenge_type == challenge_type

        # Test invalid challenge type
        with pytest.raises(ValueError, match="Invalid challenge type"):
            Assessment(
                id="test",
                concept_id="test_concept",
                challenge_type="invalid_type",
                question="Test question",
                correct_answer="test answer"
            )

    @pytest.mark.unit
    def test_assessment_difficulty_validation(self):
        """Test that assessment difficulty is properly validated."""
        from src.data.models.assessment import Assessment, ChallengeType

        # Test valid difficulty levels
        valid_difficulties = [1, 5, 10]
        for difficulty in valid_difficulties:
            assessment = Assessment(
                id="test",
                concept_id="test_concept",
                challenge_type=ChallengeType.MULTIPLE_CHOICE,
                question="Test question",
                correct_answer="test answer",
                difficulty_level=difficulty
            )
            assert assessment.difficulty_level == difficulty

        # Test invalid difficulty levels
        invalid_difficulties = [0, -1, 11, 3.5, "invalid"]
        for difficulty in invalid_difficulties:
            with pytest.raises(ValueError, match="Difficulty must be an integer between 1 and 10"):
                Assessment(
                    id="test",
                    concept_id="test_concept",
                    challenge_type=ChallengeType.MULTIPLE_CHOICE,
                    question="Test question",
                    correct_answer="test answer",
                    difficulty_level=difficulty
                )

    @pytest.mark.unit
    def test_multiple_choice_assessment_structure(self):
        """Test multiple choice assessment structure validation."""
        from src.data.models.assessment import Assessment, ChallengeType

        # Valid multiple choice assessment
        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="What is 2 + 2?",
            correct_answer={"option": "b", "explanation": "2 + 2 = 4"},
            options=[
                {"id": "a", "text": "3"},
                {"id": "b", "text": "4"},
                {"id": "c", "text": "5"},
                {"id": "d", "text": "6"}
            ]
        )

        assert len(assessment.options) == 4
        assert assessment.correct_answer["option"] in [opt["id"] for opt in assessment.options]

        # Test invalid multiple choice (correct answer not in options)
        with pytest.raises(ValueError, match="Correct answer option must exist in options"):
            Assessment(
                id="test",
                concept_id="test_concept",
                challenge_type=ChallengeType.MULTIPLE_CHOICE,
                question="Test question",
                correct_answer={"option": "e", "explanation": "Not in options"},
                options=[
                    {"id": "a", "text": "Option A"},
                    {"id": "b", "text": "Option B"}
                ]
            )

    @pytest.mark.unit
    def test_coding_challenge_assessment_structure(self):
        """Test coding challenge assessment structure validation."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.CODING_CHALLENGE,
            question="Write a function that returns the sum of two numbers.",
            correct_answer={
                "code": "def add(a, b):\n    return a + b",
                "language": "python",
                "test_cases": [
                    {"input": [1, 2], "expected": 3},
                    {"input": [5, 3], "expected": 8}
                ]
            },
            evaluation_criteria={
                "time_complexity": "O(1)",
                "space_complexity": "O(1)",
                "code_style": True
            }
        )

        assert assessment.correct_answer["language"] == "python"
        assert len(assessment.correct_answer["test_cases"]) == 2

    @pytest.mark.unit
    def test_assessment_evaluation(self):
        """Test that assessment answers can be evaluated."""
        from src.data.models.assessment import Assessment, ChallengeType

        # Multiple choice evaluation
        mc_assessment = Assessment(
            id="mc_test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="What is 2 + 2?",
            correct_answer={"option": "b", "explanation": "2 + 2 = 4"},
            options=[
                {"id": "a", "text": "3"},
                {"id": "b", "text": "4"},
                {"id": "c", "text": "5"}
            ]
        )

        # Test correct answer
        result = mc_assessment.evaluate_answer({"option": "b"})
        assert result["is_correct"] is True
        assert result["score"] == 1.0
        assert result["explanation"] == "2 + 2 = 4"

        # Test incorrect answer
        result = mc_assessment.evaluate_answer({"option": "a"})
        assert result["is_correct"] is False
        assert result["score"] == 0.0
        assert "correct_answer" in result["feedback"]

    @pytest.mark.unit
    def test_assessment_adaptive_difficulty(self):
        """Test that assessment difficulty can be adapted based on performance."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="Test question",
            correct_answer={"option": "a", "explanation": "Test"},
            options=[{"id": "a", "text": "Option A"}],
            difficulty_level=5
        )

        # Adapt difficulty up after correct answer
        adapted = assessment.adapt_difficulty(correct=True, current_performance=0.8)
        assert adapted.difficulty_level > 5

        # Adapt difficulty down after incorrect answer
        adapted = assessment.adapt_difficulty(correct=False, current_performance=0.3)
        assert adapted.difficulty_level < 5

    @pytest.mark.unit
    def test_assessment_time_tracking(self):
        """Test that assessment can track time spent."""
        from src.data.models.assessment import Assessment, ChallengeType
        import time

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="Test question",
            correct_answer="test",
            evaluation_criteria={"time_limit_seconds": 30}
        )

        # Start timing
        assessment.start_timing()
        assert assessment.start_time is not None

        # Simulate some time passing
        time.sleep(0.01)

        # Stop timing
        elapsed = assessment.stop_timing()
        assert elapsed > 0
        assert assessment.time_spent_seconds == elapsed

    @pytest.mark.unit
    def test_assessment_attempt_tracking(self):
        """Test that assessment can track multiple attempts."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="Test question",
            correct_answer={"option": "a", "explanation": "Test"},
            options=[{"id": "a", "text": "Option A"}]
        )

        # First attempt
        attempt1 = assessment.add_attempt({"option": "b"})
        assert attempt1["attempt_number"] == 1
        assert attempt1["is_correct"] is False

        # Second attempt
        attempt2 = assessment.add_attempt({"option": "a"})
        assert attempt2["attempt_number"] == 2
        assert attempt2["is_correct"] is True

        # Check attempt history
        assert len(assessment.attempts) == 2
        assert assessment.total_attempts == 2

    @pytest.mark.unit
    def test_assessment_hint_system(self):
        """Test that assessment can provide hints."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="What is the capital of France?",
            correct_answer={"option": "b", "explanation": "Paris is the capital"},
            options=[
                {"id": "a", "text": "London"},
                {"id": "b", "text": "Paris"},
                {"id": "c", "text": "Berlin"}
            ],
            hints=[
                {"level": 1, "text": "Think about European countries"},
                {"level": 2, "text": "It's known for the Eiffel Tower"}
            ]
        )

        # Get first hint
        hint1 = assessment.get_hint(1)
        assert hint1["level"] == 1
        assert "European countries" in hint1["text"]

        # Get second hint
        hint2 = assessment.get_hint(2)
        assert hint2["level"] == 2
        assert "Eiffel Tower" in hint2["text"]

        # Test hint penalty
        assert assessment.hint_penalty == 2  # 2 hints used

    @pytest.mark.unit
    def test_assessment_feedback_generation(self):
        """Test that assessment can generate detailed feedback."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.SHORT_ANSWER,
            question="Explain what a function is in programming",
            correct_answer={
                "text": "A function is a reusable block of code that performs a specific task",
                "keywords": ["reusable", "block of code", "specific task"]
            }
        )

        # Generate feedback for partially correct answer
        user_answer = "A function is code that does something"
        feedback = assessment.generate_feedback(user_answer)

        assert feedback["overall_score"] > 0
        assert feedback["overall_score"] < 1.0
        assert "strengths" in feedback
        assert "improvements" in feedback

    @pytest.mark.unit
    def test_assessment_personalization(self):
        """Test that assessment can be personalized based on user profile."""
        from src.data.models.assessment import Assessment, ChallengeType

        user_profile = {
            "learning_style": "visual",
            "difficulty_preference": "gradual",
            "interests": ["python", "web development"],
            "known_concepts": ["variables", "data types"]
        }

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="Test question",
            correct_answer="test"
        )

        # Personalize assessment
        personalized = assessment.personalize_for_user(user_profile)

        assert personalized.difficulty_level == 1  # Start easy for gradual learner
        assert "visual_elements" in personalized.metadata
        assert personalized.metadata["adapted_for_learning_style"] == "visual"

    @pytest.mark.unit
    def test_assessment_quality_metrics(self):
        """Test that assessment quality can be measured."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="What is 2 + 2?",
            correct_answer={"option": "b", "explanation": "Basic arithmetic"},
            options=[
                {"id": "a", "text": "3"},
                {"id": "b", "text": "4"},
                {"id": "c", "text": "5"},
                {"id": "d", "text": "6"}
            ]
        )

        # Add some historical attempts
        assessment.add_attempt({"option": "b"})  # Correct
        assessment.add_attempt({"option": "a"})  # Incorrect
        assessment.add_attempt({"option": "b"})  # Correct

        # Calculate quality metrics
        metrics = assessment.calculate_quality_metrics()

        assert "difficulty_index" in metrics
        assert "discrimination_index" in metrics
        assert "success_rate" in metrics
        assert metrics["success_rate"] == 2/3  # 2 correct out of 3 attempts

    @pytest.mark.unit
    def test_assessment_export_import(self):
        """Test that assessment can be exported and imported."""
        from src.data.models.assessment import Assessment, ChallengeType
        import json

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="Test question",
            correct_answer={"option": "a", "explanation": "Test"},
            options=[{"id": "a", "text": "Option A"}]
        )

        # Export to JSON
        json_data = assessment.to_json()
        parsed_data = json.loads(json_data)
        assert parsed_data["id"] == "test"

        # Import from JSON
        imported = Assessment.from_json(json_data)
        assert imported.id == assessment.id
        assert imported.question == assessment.question

    @pytest.mark.unit
    def test_assessment_batch_operations(self):
        """Test batch operations on assessments."""
        from src.data.models.assessment import Assessment, ChallengeType

        # Create batch of assessments
        assessments = [
            Assessment(
                id=f"assess_{i}",
                concept_id=f"concept_{i}",
                challenge_type=ChallengeType.MULTIPLE_CHOICE,
                question=f"Question {i}",
                correct_answer={"option": "a", "explanation": f"Answer {i}"},
                options=[{"id": "a", "text": f"Option {i}"}],
                difficulty_level=i % 5 + 1
            )
            for i in range(5)
        ]

        # Filter by difficulty
        easy_assessments = Assessment.filter_by_difficulty(assessments, max_difficulty=2)
        assert len(easy_assessments) == 2  # difficulty 1 and 2

        # Get statistics
        stats = Assessment.get_batch_statistics(assessments)
        assert stats["total_count"] == 5
        assert stats["average_difficulty"] == 3.0  # (1+2+3+4+5)/5

    @pytest.mark.unit
    def test_assessment_accessibility_features(self):
        """Test that assessment supports accessibility features."""
        from src.data.models.assessment import Assessment, ChallengeType

        assessment = Assessment(
            id="test",
            concept_id="test_concept",
            challenge_type=ChallengeType.MULTIPLE_CHOICE,
            question="What is the capital of France?",
            correct_answer={"option": "b", "explanation": "Paris is the capital"},
            options=[
                {"id": "a", "text": "London"},
                {"id": "b", "text": "Paris"},
                {"id": "c", "text": "Berlin"}
            ],
            accessibility_features={
                "screen_reader_support": True,
                "high_contrast_mode": True,
                "extended_time": True
            }
        )

        # Generate accessible version
        accessible = assessment.generate_accessible_version()

        assert accessible["screen_reader_text"] is not None
        assert accessible["alt_text"] is not None
        assert accessible["keyboard_navigation"] is True