"""
Challenge Engine implementation
"""

import json
import random
from typing import Any, Dict, List
from enum import Enum

from src.ai.service import ModelAbstractionService
from src.cli.formatting import CLIFormatter
from src.data.models.concept import Concept
from src.data.models.extended_models import Message
from . import ChallengeEngine


class ChallengeType(Enum):
    """Types of challenges that can be generated"""

    MULTIPLE_CHOICE = "multiple-choice"
    SHORT_ANSWER = "short-answer"
    CODE_COMPLETION = "code-completion"
    TRUE_FALSE = "true-false"
    FILL_IN_BLANK = "fill-in-blank"


class DifficultyLevel(Enum):
    """Difficulty levels for challenges"""

    BEGINNER = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4


class ChallengeEngineImpl(ChallengeEngine):
    def __init__(self, catalyst_agent, model_service: ModelAbstractionService, workspace_path: str):
        self.catalyst_agent = catalyst_agent
        self.model_service = model_service
        self.workspace_path = workspace_path
        self.formatter = CLIFormatter()
        self.user_performance_history: List[Dict[str, Any]] = []
        self.current_difficulty = DifficultyLevel.BEGINNER

    async def generate_challenge(self, concept: Concept, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a challenge based on the given concept and context

        Args:
            concept: The concept to generate a challenge for
            context: Additional context for challenge generation

        Returns:
            A dictionary containing the challenge data
        """
        # Determine challenge type based on context or random selection
        challenge_type = self._determine_challenge_type(context)

        # Adjust difficulty based on user performance
        difficulty = self._adjust_difficulty(context)

        # Generate challenge prompt
        challenge_prompt = self._create_challenge_prompt(
            concept=concept, challenge_type=challenge_type, difficulty=difficulty, context=context
        )

        # Use the model service to generate the challenge
        messages = [
            Message(
                role="system",
                content="You are an expert educational content creator specializing in creating challenging and engaging learning exercises.",
            ),
            Message(role="user", content=challenge_prompt),
        ]

        response = await self.model_service.send_message(messages, temperature=0.7)

        # Parse the response to extract challenge data
        challenge_data = self._parse_challenge_response(
            response.content, challenge_type=challenge_type, concept=concept
        )

        # Add metadata to the challenge
        challenge_data.update(
            {
                "concept_id": concept.id,
                "concept_title": concept.title,
                "challenge_type": challenge_type.value,
                "difficulty": difficulty.value,
                "context": context,
            }
        )

        return challenge_data

    def _determine_challenge_type(self, context: Dict[str, Any]) -> ChallengeType:
        """Determine the type of challenge to generate"""
        # Check if a specific challenge type is requested
        requested_type = context.get("challenge_type")
        if requested_type:
            try:
                return ChallengeType(requested_type)
            except ValueError:
                pass

        # Based on concept content, determine appropriate challenge type
        concept_content = context.get("concept_content", "").lower()

        # If concept contains code, prefer code completion
        if any(keyword in concept_content for keyword in ["code", "function", "class", "programming"]):
            return ChallengeType.CODE_COMPLETION

        # If concept has clear true/false statements
        if any(keyword in concept_content for keyword in ["true", "false", "correct", "incorrect"]):
            return ChallengeType.TRUE_FALSE

        # If concept has definitions or terms to fill in
        if any(keyword in concept_content for keyword in ["define", "term", "blank", "missing"]):
            return ChallengeType.FILL_IN_BLANK

        # Default to multiple choice for better engagement
        return ChallengeType.MULTIPLE_CHOICE

    def _adjust_difficulty(self, context: Dict[str, Any]) -> DifficultyLevel:
        """Adjust difficulty based on user performance and context"""
        # Check if a specific difficulty is requested
        requested_difficulty = context.get("difficulty")
        if requested_difficulty:
            try:
                if isinstance(requested_difficulty, int):
                    return DifficultyLevel(requested_difficulty)
                elif isinstance(requested_difficulty, str):
                    # Map string to enum
                    difficulty_map = {
                        "beginner": DifficultyLevel.BEGINNER,
                        "intermediate": DifficultyLevel.INTERMEDIATE,
                        "advanced": DifficultyLevel.ADVANCED,
                        "expert": DifficultyLevel.EXPERT,
                    }
                    return difficulty_map.get(requested_difficulty.lower(), self.current_difficulty)
            except (ValueError, KeyError):
                pass

        # Adjust based on user performance history
        if self.user_performance_history:
            # Calculate average performance score
            recent_performance = self.user_performance_history[-5:]  # Last 5 attempts
            avg_score = sum(p.get("score", 0) for p in recent_performance) / len(recent_performance)

            # Adjust difficulty based on performance
            if avg_score > 0.8 and self.current_difficulty.value < DifficultyLevel.EXPERT.value:
                # User is performing well, increase difficulty
                self.current_difficulty = DifficultyLevel(self.current_difficulty.value + 1)
            elif avg_score < 0.5 and self.current_difficulty.value > DifficultyLevel.BEGINNER.value:
                # User is struggling, decrease difficulty
                self.current_difficulty = DifficultyLevel(self.current_difficulty.value - 1)

        return self.current_difficulty

    def _create_challenge_prompt(
        self, concept: Concept, challenge_type: ChallengeType, difficulty: DifficultyLevel, context: Dict[str, Any]
    ) -> str:
        """Create a prompt for generating a challenge"""
        difficulty_descriptions = {
            DifficultyLevel.BEGINNER: "basic, foundational questions that test simple recall and understanding",
            DifficultyLevel.INTERMEDIATE: "questions that require application of concepts and some analysis",
            DifficultyLevel.ADVANCED: "complex questions that require deep analysis, synthesis, and evaluation",
            DifficultyLevel.EXPERT: "challenging questions that require creative thinking, problem-solving, and mastery of the subject",
        }

        challenge_type_instructions = {
            ChallengeType.MULTIPLE_CHOICE: "Create a multiple-choice question with 4 options (A, B, C, D). Clearly indicate which option is correct.",
            ChallengeType.SHORT_ANSWER: "Create a short-answer question that requires a brief response (1-2 sentences). Provide a sample answer that captures the key points.",
            ChallengeType.CODE_COMPLETION: "Create a code completion challenge where the user needs to fill in missing parts of a code snippet. Provide the complete solution.",
            ChallengeType.TRUE_FALSE: "Create a true/false question. Clearly indicate whether the statement is true or false.",
            ChallengeType.FILL_IN_BLANK: "Create a fill-in-the-blank question with 1-3 blanks. Provide the complete answer with all blanks filled in.",
        }

        prompt = f"""
Create a {difficulty.name.lower()} level {challenge_type.value.replace('-', ' ')} challenge for the following concept:

Concept: {concept.title}
Description: {concept.content}

The challenge should be {difficulty_descriptions[difficulty]}.

{challenge_type_instructions[challenge_type]}

Format your response as a JSON object with the following structure:
{{
    "challenge_text": "The text of the challenge",
    "options": {{"A": "Option A text", "B": "Option B text", "C": "Option C text", "D": "Option D text"}} if applicable,
    "correct_answer": "The correct answer (e.g., 'A', 'B', 'C', 'D', or the full text for short answer)",
    "explanation": "A brief explanation of why this is the correct answer",
    "hints": ["Hint 1", "Hint 2"] if applicable
}}

Ensure the challenge is relevant to the concept and appropriate for the specified difficulty level.
"""

        return prompt

    def _parse_challenge_response(
        self, response: str, challenge_type: ChallengeType, concept: Concept
    ) -> Dict[str, Any]:
        """Parse the model response to extract challenge data"""
        try:
            # Try to extract JSON from the response
            start_idx = response.find("{")
            end_idx = response.rfind("}") + 1

            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                challenge_data = json.loads(json_str)

                # Ensure required fields are present
                if "challenge_text" not in challenge_data:
                    challenge_data["challenge_text"] = f"Challenge about {concept.title}"

                if "correct_answer" not in challenge_data:
                    challenge_data["correct_answer"] = "Answer not provided"

                if "explanation" not in challenge_data:
                    challenge_data["explanation"] = "No explanation provided"

                return challenge_data
            else:
                # If no JSON found, create a basic challenge
                return {
                    "challenge_text": response,
                    "correct_answer": "Answer not provided",
                    "explanation": "No explanation provided",
                }

        except json.JSONDecodeError:
            # If JSON parsing fails, create a basic challenge
            return {
                "challenge_text": response,
                "correct_answer": "Answer not provided",
                "explanation": "No explanation provided",
            }

    def present_challenge(self, challenge: Dict[str, Any]) -> None:
        """Present a challenge to the user"""
        self.formatter.format_header("Challenge", f"Difficulty: {challenge.get('difficulty', 'Unknown')}")

        challenge_text = challenge.get("challenge_text", "No challenge text")
        self.formatter.format_section("Question", challenge_text)

        if "options" in challenge and challenge["options"]:
            self.formatter.format_section("Options", "")
            for key, value in challenge["options"].items():
                self.formatter.print(f"  {key}: {value}")

        # Show hints if available
        if "hints" in challenge and challenge["hints"]:
            self.formatter.format_section("Hints", "")
            for i, hint in enumerate(challenge["hints"], 1):
                self.formatter.print(f"  {i}. {hint}")

    async def collect_answer(self) -> str:
        """Collect answer from user"""
        # In a real implementation, this might have a timeout or be part of a GUI
        try:
            from rich.prompt import Prompt

            answer = Prompt.ask("\nYour answer")
            return answer
        except (EOFError, KeyboardInterrupt):
            # Handle case where input is not available (e.g., testing)
            return ""

    async def validate_answer(self, user_answer: str, challenge: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user's answer to a challenge"""
        # Get the correct answer
        correct_answer = challenge.get("correct_answer", "")

        # For multiple choice, normalize to uppercase
        if challenge.get("challenge_type") == "multiple-choice":
            user_answer = user_answer.strip().upper()
            correct_answer = correct_answer.strip().upper()

        # For true/false, normalize to lowercase
        elif challenge.get("challenge_type") == "true-false":
            user_answer = user_answer.strip().lower()
            correct_answer = correct_answer.strip().lower()

        # Determine if the answer is correct
        is_correct = user_answer == correct_answer

        # Calculate a score (0.0 to 1.0)
        score = 1.0 if is_correct else 0.0

        # Create evaluation result
        evaluation = {
            "is_correct": is_correct,
            "score": score,
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "explanation": challenge.get("explanation", "No explanation provided"),
            "feedback": self._generate_feedback(is_correct, challenge),
        }

        # Record performance
        self._record_performance(score, challenge)

        return evaluation

    def _generate_feedback(self, is_correct: bool, challenge: Dict[str, Any]) -> str:
        """Generate feedback based on whether the answer was correct"""
        if is_correct:
            feedback = random.choice(
                [
                    "Correct! Well done!",
                    "Great job! That's the right answer.",
                    "Excellent! You got it right.",
                    "Correct! You're making good progress.",
                ]
            )
        else:
            feedback = random.choice(
                [
                    "Not quite right. Let's review the explanation.",
                    "Incorrect. The correct answer is provided in the explanation.",
                    "That's not the right answer. Check the explanation for more details.",
                    "Incorrect. Keep practicing and you'll get it next time.",
                ]
            )

        # Add explanation if available
        explanation = challenge.get("explanation", "")
        if explanation:
            feedback += f"\n\nExplanation: {explanation}"

        return feedback

    def _record_performance(self, score: float, challenge: Dict[str, Any]) -> None:
        """Record user performance for adaptive difficulty"""
        performance_record = {
            "score": score,
            "timestamp": None,  # Would be set to current time in a real implementation
            "challenge_type": challenge.get("challenge_type"),
            "difficulty": challenge.get("difficulty"),
            "concept_id": challenge.get("concept_id"),
        }

        self.user_performance_history.append(performance_record)

        # Limit history size
        if len(self.user_performance_history) > 100:
            self.user_performance_history = self.user_performance_history[-100:]

    async def adapt_challenge(self, challenge: Dict[str, Any], user_performance: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt challenge based on user performance"""
        # Get the current difficulty
        current_difficulty = challenge.get("difficulty", 2)

        # Get the user's score
        score = user_performance.get("score", 0.0)

        # Adapt the challenge based on performance
        if score > 0.8 and current_difficulty < 4:
            # User performed well, increase difficulty
            adapted_difficulty = current_difficulty + 1
            adaptation_message = "You did well! The next challenge will be more difficult."
        elif score < 0.5 and current_difficulty > 1:
            # User struggled, decrease difficulty
            adapted_difficulty = current_difficulty - 1
            adaptation_message = "This seems challenging. The next challenge will be easier."
        else:
            # Keep the same difficulty
            adapted_difficulty = current_difficulty
            adaptation_message = "The next challenge will be at a similar difficulty level."

        # Add adaptation information to the challenge
        adapted_challenge = challenge.copy()
        adapted_challenge["difficulty"] = adapted_difficulty
        adapted_challenge["adaptation_message"] = adaptation_message

        return adapted_challenge
