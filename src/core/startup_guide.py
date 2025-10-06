"""
Startup Guide implementation for Learning Catalyst
Provides context-aware suggestions and guidance during application startup
"""
import os
from typing import Any, Dict, List

from src.data.models.concept import Concept
from src.core.knowledge_navigator import KnowledgeNavigator
from src.core.state_manager import StateManager


class StartupGuide:
    """Provides guided startup experience with context-aware suggestions"""
    
    def __init__(self, workspace_path: str, knowledge_navigator: KnowledgeNavigator, state_manager: StateManager):
        self.workspace_path = workspace_path
        self.knowledge_navigator = knowledge_navigator
        self.state_manager = state_manager
        self.learningspace_path = os.path.join(workspace_path, ".catalyst")
        
    async def generate_startup_message(self, is_first_time: bool, has_previous_state: bool) -> str:
        """Generate context-aware startup message based on user state"""
        
        if is_first_time:
            return self._get_first_time_welcome()
        elif has_previous_state:
            return await self._get_returning_user_message()
        else:
            return self._get_standard_welcome()
    
    def _get_first_time_welcome(self) -> str:
        """Get welcome message for first-time users"""
        return """
🎓 Welcome to Learning Catalyst! 🚀

This appears to be your first time using Learning Catalyst. Let's get you set up for a great learning experience!

📋 Quick Start Guide:
1. Set up your AI provider configuration
2. Explore available learning concepts
3. Start your learning journey

💡 Tip: Use /help anytime to see all available commands
"""
    
    async def _get_returning_user_message(self) -> str:
        """Get welcome message for returning users with previous state"""
        try:
            # Load previous state
            previous_state = await self.state_manager.load_last_state()
            if previous_state:
                # Get user's last activity
                last_activity = previous_state.current_state_metadata.get("last_access", "unknown")
                last_concept = previous_state.conversation_context.get("current_concept", "none")
                
                # Get available concepts
                concepts = await self.knowledge_navigator.get_available_concepts()
                
                # Get user progress
                progress_summary = self._get_progress_summary(concepts)
                
                return f"""
🎓 Welcome back to Learning Catalyst! 🚀

Great to see you again! Here's where you left off:

📚 Your Learning Progress:
{progress_summary}

🔍 Last Activity:
• Last accessed: {last_activity}
• Last concept: {last_concept}

💡 Suggestions:
• Continue where you left off with /explain {last_concept}
• Test your knowledge with /quiz {last_concept}
• Explore new concepts with /concepts

Ready to continue your learning journey?
"""
            else:
                return self._get_standard_welcome()
        except Exception as e:
            print(f"Error loading previous state: {e}")
            return self._get_standard_welcome()
    
    def _get_standard_welcome(self) -> str:
        """Get standard welcome message"""
        return """
🎓 Welcome to Learning Catalyst! 🚀

Ready to continue your learning journey?

💡 Quick Actions:
• View available concepts: /concepts
• Get help with commands: /help
• Check your configuration: /config

What would you like to do today?
"""
    
    def _get_progress_summary(self, concepts: List[Concept]) -> str:
        """Generate a summary of user's learning progress"""
        if not concepts:
            return "No concepts available yet."
        
        # In a real implementation, this would query the database for actual progress
        # For now, we'll provide a placeholder
        total_concepts = len(concepts)
        
        return f"• {total_concepts} concepts available for learning"
    
    async def get_contextual_suggestions(self, user_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get contextual suggestions based on user profile and state"""
        suggestions = []
        
        try:
            # Get available concepts
            concepts = await self.knowledge_navigator.get_available_concepts()
            
            if not concepts:
                # No concepts available, suggest setting up workspace
                suggestions.append({
                    "type": "setup",
                    "title": "Set up your learning workspace",
                    "description": "Add markdown files to your workspace to get started",
                    "command": "/help"
                })
                return suggestions
            
            # Get user's learning style from profile
            learning_style = user_profile.get("learning_style", "visual")
            
            # Get recent concepts (in a real implementation, this would come from user history)
            recent_concepts = concepts[:3] if len(concepts) >= 3 else concepts
            
            # Suggest continuing with recent concepts
            for concept in recent_concepts:
                suggestions.append({
                    "type": "continue",
                    "title": f"Continue learning: {concept.title}",
                    "description": f"Pick up where you left off with {concept.title}",
                    "command": f"/explain {concept.title}"
                })
            
            # Suggest exploring new concepts
            if len(concepts) > 3:
                new_concepts = concepts[3:6] if len(concepts) >= 6 else concepts[3:]
                for concept in new_concepts:
                    suggestions.append({
                        "type": "explore",
                        "title": f"Explore: {concept.title}",
                        "description": f"Discover something new with {concept.title}",
                        "command": f"/explain {concept.title}"
                    })
            
            # Suggest challenges based on learning style
            if learning_style == "visual":
                suggestions.append({
                    "type": "challenge",
                    "title": "Test your knowledge",
                    "description": "Take a quiz to reinforce your learning",
                    "command": "/quiz"
                })
            else:
                suggestions.append({
                    "type": "practice",
                    "title": "Practice with challenges",
                    "description": "Apply what you've learned with interactive challenges",
                    "command": "/quiz"
                })
            
            # Add configuration suggestion if not set up
            ai_config = user_profile.get("ai_config", {})
            if not ai_config.get("default_provider") or not ai_config.get("default_model"):
                suggestions.append({
                    "type": "config",
                    "title": "Configure AI provider",
                    "description": "Set up your AI provider to enable explanations and challenges",
                    "command": "/set-config"
                })
            
        except Exception as e:
            print(f"Error generating contextual suggestions: {e}")
            # Fallback suggestions
            suggestions.append({
                "type": "help",
                "title": "Get started",
                "description": "Use the help command to see available options",
                "command": "/help"
            })
        
        return suggestions
    
    async def generate_proactive_suggestions(self, conversation_context: Dict[str, Any]) -> List[str]:
        """Generate proactive suggestions based on current conversation context"""
        suggestions = []
        
        try:
            # Get current concept from context
            current_concept = conversation_context.get("current_concept")
            
            if current_concept:
                # Suggest related actions for the current concept
                suggestions.append(f"Test your knowledge of {current_concept} with a quiz")
                suggestions.append(f"Ask for a deeper explanation of {current_concept}")
                suggestions.append("Explore related concepts")
            else:
                # General learning suggestions
                suggestions.append("Browse available learning concepts")
                suggestions.append("Set up your AI provider configuration")
                suggestions.append("View your learning progress")
            
        except Exception as e:
            print(f"Error generating proactive suggestions: {e}")
            suggestions.append("Use /help to see available commands")
        
        return suggestions
    
    def format_suggestions(self, suggestions: List[Dict[str, Any]]) -> str:
        """Format suggestions for display"""
        if not suggestions:
            return ""
        
        formatted = "\n💡 Suggestions for you:\n"
        
        for i, suggestion in enumerate(suggestions, 1):
            formatted += f"\n{i}. {suggestion['title']}"
            formatted += f"\n   {suggestion['description']}"
            formatted += f"\n   Command: {suggestion['command']}\n"
        
        return formatted
    
    async def should_offer_challenge(self, concept: Concept, user_profile: Dict[str, Any]) -> bool:
        """Determine if a challenge should be offered after explaining a concept"""
        # Simple heuristic: offer challenge after every explanation
        # In a real implementation, this would be more sophisticated
        return True
    
    async def get_challenge_suggestion(self, concept: Concept) -> str:
        """Get a suggestion for a challenge related to the concept"""
        return f"""
Would you like to test your understanding of {concept.title}?

💡 You can:
• Take a quiz: /quiz {concept.title}
• Ask follow-up questions
• Explore related concepts

What would you like to do next?
"""