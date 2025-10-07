"""
Base core interfaces for Learning Catalyst application
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from src.data.models.concept import Concept
from src.data.models.extended_models import KnowledgeMap, UserProgress


class KnowledgeNavigator(ABC):
    @abstractmethod
    async def load_content(self, file_path: str) -> KnowledgeMap:
        pass

    @abstractmethod
    async def get_available_concepts(self) -> List[Concept]:
        pass

    @abstractmethod
    def get_concept_path(self, concept_id: str) -> List[Concept]:
        pass

    @abstractmethod
    def update_progress(self, concept_id: str, progress: UserProgress) -> None:
        pass


class CatalystAgent(ABC):
    @abstractmethod
    async def generate_explanation(self, concept: Concept, context: Dict[str, Any]) -> str:
        """Generate AI-based explanation for a concept"""

    @abstractmethod
    async def generate_challenge(self, concept: Concept, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AI-based challenge for a concept"""

    @abstractmethod
    async def evaluate_answer(self, answer: str, expected: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate user's answer to a challenge"""

    @abstractmethod
    async def interpret_intent(self, user_input: str, context: Any) -> Any:
        """Interpret user intent from natural language input"""
