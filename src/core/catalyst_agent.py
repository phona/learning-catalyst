"""
Catalyst Agent implementation
Implements the conversational interface and intent interpretation as per the architecture document
"""
from typing import List, Dict, Optional, Any
from src.data.models.concept import Concept
from src.data.models.extended_models import Message, UserProgress
from . import CatalystAgent
import re


class IntentClassification:
    """Simple intent classification for user input"""
    def __init__(self, intent_type: str, concept_reference: Optional[str] = None, confidence: float = 1.0):
        self.intent_type = intent_type  # "query", "challenge_request", "answer", "general_conversation"
        self.concept_reference = concept_reference
        self.confidence = confidence


class ConversationContext:
    """Context for managing conversation state"""
    def __init__(self, user_profile: Dict[str, Any], current_concept: Optional[Concept] = None, 
                 conversation_history: Optional[List[Dict[str, Any]]] = None, 
                 interaction_history: Optional[List[Dict[str, Any]]] = None):
        self.user_profile = user_profile
        self.current_concept = current_concept
        self.conversation_history = conversation_history or []
        self.interaction_history = interaction_history or []


class CatalystAgentImpl(CatalystAgent):
    def __init__(self, model_service, knowledge_navigator=None):
        self.model_service = model_service
        self.knowledge_navigator = knowledge_navigator

    async def interpret_intent(self, user_input: str, context: ConversationContext) -> IntentClassification:
        """Interpret user's intent from conversational input"""
        user_input_lower = user_input.lower().strip()
        
        # Check for challenge requests
        challenge_keywords = ["quiz", "question", "test", "challenge", "practice"]
        if any(keyword in user_input_lower for keyword in challenge_keywords):
            return IntentClassification(
                intent_type="challenge_request",
                concept_reference=context.current_concept.id if context.current_concept else None
            )
        
        # Check for answer to a challenge (simple heuristic)
        if context.conversation_history and len(context.conversation_history) > 0:
            last_message = context.conversation_history[-1]
            if last_message.get("role") == "assistant" and "challenge" in last_message.get("content", "").lower():
                # This looks like an answer to a challenge
                return IntentClassification(intent_type="answer")
                
        # Check for concept query
        # Look for keywords that suggest the user is asking about a specific topic
        if any(keyword in user_input_lower for keyword in ["explain", "what is", "what's", "how does", "describe", "define"]):
            # Try to extract concept from user input
            # This is a simplified implementation - in a real system, you'd have more sophisticated NLP
            return IntentClassification(
                intent_type="query",
                concept_reference=context.current_concept.id if context.current_concept else None
            )
        
        # Default to general conversation
        return IntentClassification(intent_type="general_conversation")

    async def generate_response(self, user_input: str, intent: IntentClassification, context: ConversationContext) -> str:
        """Generate appropriate response based on user input and intent"""
        if intent.intent_type == "query":
            # If we have a specific concept in mind
            if intent.concept_reference and self.knowledge_navigator:
                # Find the concept by ID
                concepts = await self.knowledge_navigator.get_available_concepts()
                target_concept = next((c for c in concepts if c.id == intent.concept_reference), None)
                if target_concept:
                    return await self.generate_explanation(target_concept, context.user_profile)
            
            # Otherwise, generate a general response using the AI
            messages = [
                Message(
                    role="system", 
                    content="You are an AI tutor helping the student learn. Respond to their query using your knowledge and any available context."
                ),
                Message(
                    role="user", 
                    content=f"Student query: {user_input}"
                )
            ]
            
            response = await self.model_service.send_message(
                provider=context.user_profile.get("ai_config", {}).get("default_provider", "openai"),
                model=context.user_profile.get("ai_config", {}).get("default_model", "gpt-4"),
                messages=messages
            )
            
            return response.content
            
        elif intent.intent_type == "challenge_request":
            # Generate a challenge for the current concept
            if context.current_concept:
                challenge_data = await self.generate_challenge(
                    context.current_concept, 
                    context.user_profile
                )
                return challenge_data.get("challenge_text", "I couldn't create a challenge for this topic right now.")
            else:
                return "I can create a challenge once we're looking at a specific concept."
                
        elif intent.intent_type == "answer":
            # This would be handled by the Challenge Engine in the main flow
            # Here we return a placeholder that indicates this is an answer
            return f"Received answer: {user_input}. Processing..."
            
        else:  # general_conversation
            # Generate a response for general conversation
            messages = [
                Message(
                    role="system", 
                    content="You are a helpful AI tutor guiding the student through their learning journey. Maintain a supportive, educational tone."
                ),
                Message(
                    role="user", 
                    content=f"Student message: {user_input}"
                )
            ]
            
            response = await self.model_service.send_message(
                provider=context.user_profile.get("ai_config", {}).get("default_provider", "openai"),
                model=context.user_profile.get("ai_config", {}).get("default_model", "gpt-4"),
                messages=messages
            )
            
            return response.content

    async def generate_explanation(self, concept: Concept, user_profile: Dict[str, Any]) -> str:
        """Generate AI-based explanation for a concept"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator helping students understand concepts. Provide a clear, comprehensive explanation."
            ),
            Message(
                role="user", 
                content=f"Explain the concept: {concept.title}\n\nContent: {concept.content}\n\nTarget audience: {user_profile.get('learning_style', 'intermediate')}"
            )
        ]
        
        response = await self.model_service.send_message(
            provider=user_profile.get("ai_config", {}).get("default_provider", "openai"),
            model=user_profile.get("ai_config", {}).get("default_model", "gpt-4"),
            messages=messages
        )
        
        return response.content

    async def generate_challenge(self, concept: Concept, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AI-based challenge for a concept"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator creating challenges to test understanding of concepts. Create a challenge with clear instructions."
            ),
            Message(
                role="user", 
                content=f"Create a challenge for the concept: {concept.title}\n\nContent: {concept.content}\n\nChallenge type: {'multiple-choice'}\n\nDifficulty: {'medium'}"
            )
        ]
        
        response = await self.model_service.send_message(
            provider=user_profile.get("ai_config", {}).get("default_provider", "openai"),
            model=user_profile.get("ai_config", {}).get("default_model", "gpt-4"),
            messages=messages
        )
        
        # Parse the response to extract challenge details
        # This is a simplified implementation - in reality, you might want to use structured outputs
        return {
            "id": f"challenge_{hash(concept.id)}",
            "concept_id": concept.id,
            "challenge_type": "multiple-choice",
            "challenge_text": response.content,
            "expected_answer": "",  # This would be extracted from the AI response in a real implementation
            "options": {}  # This would be extracted from the AI response in a real implementation
        }

    async def evaluate_answer(self, answer: str, challenge: Dict[str, Any], context: ConversationContext) -> Dict[str, Any]:
        """Evaluate user's answer to a challenge"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator evaluating student answers. Provide detailed feedback and a score."
            ),
            Message(
                role="user", 
                content=f"Evaluate this answer: '{answer}' for the challenge: '{challenge.get('challenge_text', '')}'. Provide feedback and a score (0-1)."
            )
        ]
        
        response = await self.model_service.send_message(
            provider=context.user_profile.get("ai_config", {}).get("default_provider", "openai"),
            model=context.user_profile.get("ai_config", {}).get("default_model", "gpt-4"),
            messages=messages
        )
        
        # Extract score from response (simplified approach)
        score = 0.8  # Default score, would be extracted from AI response in real implementation
        
        return {
            "is_correct": True,  # Would be determined from AI response in real implementation
            "feedback": response.content,
            "score": score
        }

    async def generate_startup_prompt(self, has_previous_state: bool, context: ConversationContext) -> str:
        """Generate context-aware welcome message and suggestions upon application launch"""
        if has_previous_state:
            # Welcome back message with context about where they left off
            messages = [
                Message(
                    role="system", 
                    content="You are a helpful AI tutor welcoming back a returning student. Provide a warm welcome and suggest what they might want to do next in their learning journey."
                ),
                Message(
                    role="user", 
                    content=f"The student has returned to continue their learning. Their last activity was related to concept: {context.current_concept.title if context.current_concept else 'unknown'}. Suggest a specific action they can take next."
                )
            ]
        else:
            # New user welcome with suggestions
            messages = [
                Message(
                    role="system", 
                    content="You are a helpful AI tutor welcoming a new student. Provide a warm welcome and suggest a specific first topic or action based on what you know about their learning goals."
                ),
                Message(
                    role="user", 
                    content=f"The student is new and just started learning. Based on their profile: {context.user_profile}. Suggest a specific first topic or action."
                )
            ]
        
        response = await self.model_service.send_message(
            provider=context.user_profile.get("ai_config", {}).get("default_provider", "openai"),
            model=context.user_profile.get("ai_config", {}).get("default_model", "gpt-4"),
            messages=messages
        )
        
        return response.content

    async def suggest_next_concepts(self, profile: Dict[str, Any], context: ConversationContext) -> List[Concept]:
        """Suggest next concepts based on user profile and conversation context"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator suggesting the next concepts for a student based on their profile and progress."
            ),
            Message(
                role="user", 
                content=f"Student profile: {profile}\n\nCurrent concept: {context.current_concept.title if context.current_concept else 'None'}\n\nRecent interactions: {len(context.interaction_history)}\n\nSuggest 3-5 concepts for the student to learn next, considering their learning style, strengths, and weaknesses."
            )
        ]
        
        response = await self.model_service.send_message(
            provider=profile.get("ai_config", {}).get("default_provider", "openai"),
            model=profile.get("ai_config", {}).get("default_model", "gpt-4"),
            messages=messages
        )
        
        # In a real implementation, we would need to parse the response to get concept IDs
        # and then look them up in the database
        # For now, return an empty list
        return []

    async def proactive_challenge_offer(self, concept: Concept, context: ConversationContext) -> bool:
        """Determine if the AI should proactively offer a challenge after an explanation"""
        # Simple heuristic: offer a challenge after every explanation
        # In a real implementation, this would be more sophisticated based on user engagement
        return True

    async def generate_explanation(self, concept: Concept, context: Dict[str, Any]) -> str:
        """Generate AI-based explanation for a concept"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator helping students understand concepts. Provide a clear, comprehensive explanation."
            ),
            Message(
                role="user", 
                content=f"Explain the concept: {concept.title}\n\nContent: {concept.content}\n\nTarget audience: {context.get('learning_level', 'intermediate')}"
            )
        ]
        
        response = await self.model_service.send_message(
            provider=context.get("provider", "openai"),
            model=context.get("model", "gpt-4"),
            messages=messages
        )
        
        return response.content

    async def generate_challenge(self, concept: Concept, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate an AI-based challenge for a concept"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator creating challenges to test understanding of concepts. Create a challenge with clear instructions."
            ),
            Message(
                role="user", 
                content=f"Create a challenge for the concept: {concept.title}\n\nContent: {concept.content}\n\nChallenge type: {context.get('challenge_type', 'multiple-choice')}\n\nDifficulty: {context.get('difficulty', 'medium')}"
            )
        ]
        
        response = await self.model_service.send_message(
            provider=context.get("provider", "openai"),
            model=context.get("model", "gpt-4"),
            messages=messages
        )
        
        # Parse the response to extract challenge details
        # This is a simplified implementation - in reality, you might want to use structured outputs
        return {
            "id": f"challenge_{hash(concept.id)}",
            "concept_id": concept.id,
            "challenge_type": context.get("challenge_type", "multiple-choice"),
            "challenge_text": response.content,
            "expected_answer": "",  # This would be extracted from the AI response in a real implementation
            "options": {}  # This would be extracted from the AI response in a real implementation
        }

    async def evaluate_answer(self, answer: str, expected: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate user's answer to a challenge"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator evaluating student answers. Provide detailed feedback."
            ),
            Message(
                role="user", 
                content=f"Evaluate this answer: '{answer}' for the expected response: '{expected}'. Provide feedback and a score (0-1)."
            )
        ]
        
        response = await self.model_service.send_message(
            provider=context.get("provider", "openai"),
            model=context.get("model", "gpt-4"),
            messages=messages
        )
        
        return {
            "correctness": True,  # Would be determined from AI response in real implementation
            "feedback": response.content,
            "score": 0.8  # Would be determined from AI response in real implementation
        }

    async def suggest_next_concepts(self, profile: Dict[str, Any], progress: UserProgress) -> List[Concept]:
        """Suggest next concepts based on user profile and progress"""
        messages = [
            Message(
                role="system", 
                content="You are an expert educator suggesting the next concepts for a student based on their profile and progress."
            ),
            Message(
                role="user", 
                content=f"Student profile: {profile}\n\nStudent progress: {progress}\n\nSuggest 3-5 concepts for the student to learn next, considering their learning style, strengths, and weaknesses."
            )
        ]
        
        response = await self.model_service.send_message(
            provider=profile.get("ai_config", {}).get("default_provider", "openai"),
            model=profile.get("ai_config", {}).get("default_model", "gpt-4"),
            messages=messages
        )
        
        # In a real implementation, we would need to parse the response to get concept IDs
        # and then look them up in the database
        # For now, return an empty list
        return []

    async def track_token_usage(self, model_name: str, provider: str, input_tokens: int, output_tokens: int, user_id: str, context: str):
        """Track token usage for analytics"""
        # This would typically call a method on the database manager
        # to store the token usage information
        pass