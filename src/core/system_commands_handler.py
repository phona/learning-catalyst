"""
System Commands Handler implementation
"""

from typing import Any, Dict, List

from src.data.database_manager import DatabaseManager
from src.data.models.extended_models import KnowledgeMap
from src.utils.preferences_manager import PreferencesManager

from . import SystemCommandsHandler


class SystemCommandsHandlerImpl(SystemCommandsHandler):
    def __init__(self, preferences_manager: PreferencesManager, db_manager: DatabaseManager, model_service):
        self.preferences_manager = preferences_manager
        self.db_manager = db_manager
        self.model_service = model_service

    async def list_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all configured and available models"""
        # This would call the model service to list available models from all providers
        available_models = []

        # Example implementation - in reality, you'd check which providers are configured
        # and call their respective list_available_models methods
        providers_to_check = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek"]

        for provider in providers_to_check:
            try:
                models = await self.model_service.list_available_models(provider)
                for model in models:
                    available_models.append({"name": model, "provider": provider})
            except (ConnectionError, TimeoutError, ValueError):
                # Skip providers that are not properly configured
                continue

        return available_models

    async def get_token_usage(self, period_days: int = 30) -> Dict[str, Any]:
        """Get token usage summary for specified period"""
        # Calculate date range
        from datetime import datetime, timedelta

        end_date = datetime.now().date().isoformat()
        start_date = (datetime.now() - timedelta(days=period_days)).date().isoformat()

        # Get token usage from database
        token_usage = self.db_manager.get_token_usage_summary(
            user_id="default_user",  # In a real implementation, this would be the actual user ID
            start_date=start_date,
            end_date=end_date,
        )

        return {"period": {"start": start_date, "end": end_date}, "usage": token_usage}

    async def get_detailed_token_usage(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get detailed token usage records, optionally filtered by model"""
        # In a real implementation, this would query the database for detailed records
        # For now, return an empty list
        return []

    async def show_model_capabilities(self, model_name: str) -> Dict[str, Any]:
        """Show detailed capabilities of a specific model"""
        # In a real implementation, this would get capabilities from the model service
        # For now, return an empty dict
        return {}

    async def get_knowledge_map(self) -> KnowledgeMap:
        """Get the current knowledge map structure for display"""
        # This would typically fetch concepts from the knowledge navigator
        # For now, return an empty knowledge map
        return KnowledgeMap(concepts=[], relationships=[])

    async def list_preferences(self) -> Dict[str, Any]:
        """List all current user preferences from preferences.json"""
        return self.preferences_manager.list_preferences()

    async def set_preference(self, key: str, value: Any) -> bool:
        """Set a specific configuration preference using key-value format in preferences.json
        (e.g., ui.theme, learning.difficulty_level, features.ai_enhancements)
        similar to npm config set"""
        return self.preferences_manager.set_preference(key, value)
