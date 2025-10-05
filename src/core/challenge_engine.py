"""
Challenge Engine implementation
"""

from typing import Any, Dict

from . import ChallengeEngine


class ChallengeEngineImpl(ChallengeEngine):
    def __init__(self, catalyst_agent):
        self.catalyst_agent = catalyst_agent

    def present_challenge(self, challenge: Dict[str, Any]) -> None:
        """Present a challenge to the user"""
        print(f"\nChallenge: {challenge.get('challenge_text', 'No challenge text')}")
        if 'options' in challenge and challenge['options']:
            print("Options:")
            for key, value in challenge['options'].items():
                print(f"  {key}: {value}")

    async def collect_answer(self) -> str:
        """Collect answer from user"""
        # In a real implementation, this might have a timeout or be part of a GUI
        try:
            answer = input("\nYour answer: ")
            return answer
        except EOFError:
            # Handle case where input is not available (e.g., testing)
            return ""

    async def validate_answer(self, user_answer: str, challenge: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user's answer to a challenge"""
        # Use the Catalyst Agent to evaluate the answer
        evaluation = await self.catalyst_agent.evaluate_answer(
            answer=user_answer,
            expected=challenge.get("expected_answer", ""),
            context={"provider": "openai", "model": "gpt-4"}
        )

        return evaluation

    async def adapt_challenge(self, challenge: Dict[str, Any], user_performance: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt challenge based on user performance"""
        # This would adjust the challenge based on how the user performed
        # For example, if the user struggled, make the next challenge easier
        # or provide more hints
        return challenge
