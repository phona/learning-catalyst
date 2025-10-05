"""
System Commands Handler for Learning Catalyst
Implements the SystemCommandsHandler interface as defined in the development document
"""
import sqlite3
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Union


@dataclass
class KnowledgeMap:
    concepts: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]


class SystemCommandsHandler(ABC):
    def __init__(self, db_manager, model_service, preferences_manager):
        self.db_manager = db_manager
        self.model_service = model_service
        self.preferences_manager = preferences_manager

    @abstractmethod
    async def list_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all configured and available models"""
        pass

    @abstractmethod
    async def get_token_usage(self, period_days: int = 30) -> Dict[str, Any]:
        """Get token usage summary for specified period"""
        pass

    @abstractmethod
    async def get_detailed_token_usage(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get detailed token usage records, optionally filtered by model"""
        pass

    @abstractmethod
    async def show_model_capabilities(self, model_name: str) -> Dict[str, Any]:
        """Show detailed capabilities of a specific model"""
        pass

    @abstractmethod
    async def get_knowledge_map(self) -> KnowledgeMap:
        """Get the current knowledge map structure for display"""
        pass

    @abstractmethod
    async def list_preferences(self) -> Dict[str, Any]:
        """List all current user preferences from preferences.json"""
        pass

    @abstractmethod
    async def set_preference(self, key: str, value: Union[str, int, float, bool, Dict[str, Any]]) -> bool:
        """Set a specific configuration preference using key-value format in preferences.json
        (e.g., ui.theme, learning.difficulty_level, features.ai_enhancements)
        similar to npm config set"""
        pass


class SystemCommandsHandlerImpl(SystemCommandsHandler):
    def __init__(self, db_manager, model_service, preferences_manager):
        super().__init__(db_manager, model_service, preferences_manager)

    async def list_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all configured and available models"""
        try:
            # Get the default provider and model from preferences
            default_provider = self.preferences_manager.get_preference('ai.default_provider')
            default_model = self.preferences_manager.get_preference('ai.default_model')

            # Create a list of available models
            models = []

            if default_provider and default_model:
                # Add the configured default model
                models.append({
                    'provider': default_provider,
                    'model': default_model,
                    'description': f'Configured default model for {default_provider}',
                    'is_default': True
                })

            # Add other potential models based on the provider
            all_providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]
            for provider in all_providers:
                if provider != default_provider:
                    # Get models for this provider (in real implementation, this would call the provider API)
                    provider_api_key = self.preferences_manager.get_preference(f'ai.{provider}_api_key')
                    if provider_api_key or provider == 'local':
                        # If API key exists or it's a local provider, add some example models
                        example_models = {
                            "openai": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
                            "anthropic": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                            "chatglm": ["chatglm3", "chatglm2"],
                            "siliconflow": ["Qwen/Qwen2-72B-Instruct", "THUDM/chatglm3-6b"],
                            "deepseek": ["deepseek-chat", "deepseek-coder"],
                            "local": ["llama3", "mistral", "phi3"]
                        }

                        for model in example_models.get(provider, [f"{provider}-default"]):
                            models.append({
                                'provider': provider,
                                'model': model,
                                'description': f'Example model for {provider}',
                                'is_default': False
                            })

            return models
        except Exception as e:
            print(f"Error listing available models: {e}")
            return []

    async def get_token_usage(self, period_days: int = 30) -> Dict[str, Any]:
        """Get token usage summary for specified period"""
        try:
            # Calculate the date threshold
            start_date = (datetime.now() - timedelta(days=period_days)).isoformat()
            end_date = datetime.now().isoformat()

            # Use the database manager's method to get summary
            # Note: We need to provide a user_id - for now, let's use a default value
            # In a real system, we would get the actual user's ID
            token_summary = self.db_manager.get_token_usage_summary("default_user", start_date, end_date)

            return {
                'period_days': period_days,
                'input_tokens': token_summary.get('input_tokens', 0),
                'output_tokens': token_summary.get('output_tokens', 0),
                'total_tokens': token_summary.get('total_tokens', 0)
            }
        except Exception as e:
            print(f"Error getting token usage: {e}")
            return {
                'period_days': period_days,
                'input_tokens': 0,
                'output_tokens': 0,
                'total_tokens': 0
            }

    async def get_detailed_token_usage(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get detailed token usage records, optionally filtered by model"""
        try:
            # Query the database for detailed token usage
            conn = sqlite3.connect(self.db_manager.db_path)
            cursor = conn.cursor()

            if model_name:
                # Filter by specific model
                cursor.execute("""
                    SELECT model_name, provider, input_tokens, output_tokens, total_tokens, timestamp, context
                    FROM token_usage
                    WHERE model_name = ?
                    ORDER BY timestamp DESC
                    LIMIT 50
                """, (model_name,))
            else:
                # Get all records
                cursor.execute("""
                    SELECT model_name, provider, input_tokens, output_tokens, total_tokens, timestamp, context
                    FROM token_usage
                    ORDER BY timestamp DESC
                    LIMIT 50
                """)

            rows = cursor.fetchall()
            conn.close()

            detailed_usage = []
            for row in rows:
                detailed_usage.append({
                    'model_name': row[0],
                    'provider': row[1],
                    'input_tokens': row[2],
                    'output_tokens': row[3],
                    'total_tokens': row[4],
                    'timestamp': row[5],
                    'context': row[6] if len(row) > 6 else 'unknown'
                })

            return detailed_usage
        except Exception as e:
            print(f"Error getting detailed token usage: {e}")
            return []

    async def show_model_capabilities(self, model_name: str) -> Dict[str, Any]:
        """Show detailed capabilities of a specific model"""
        try:
            # This would typically query an API to get model capabilities
            # For now, return placeholder information based on model name
            return {
                'model': model_name,
                'max_tokens': 4096 if 'gpt-3.5' in model_name else 128000,
                'supports_vision': 'vision' in model_name.lower() or 'gpt-4' in model_name,
                'supports_tools': 'gpt' in model_name or 'claude' in model_name,
                'context_window': 128000 if 'gpt-4-turbo' in model_name else 4096,
                'training_cut_off': '2023-10' if 'gpt' in model_name else '2024-04',
                'description': f'Capabilities for model: {model_name}'
            }
        except Exception as e:
            print(f"Error showing model capabilities: {e}")
            return {}

    async def get_knowledge_map(self) -> KnowledgeMap:
        """Get the current knowledge map structure for display"""
        try:
            # Get concepts from the database using the database manager
            concepts_from_db = self.db_manager.get_all_concepts()

            # Convert to the required format
            concepts = []
            for concept in concepts_from_db:
                concept_dict = {
                    'id': concept.id,
                    'title': concept.title,
                    'content': (concept.content[:100] + "..." if len(concept.content) > 100
                               else concept.content if concept.content else ""),
                    'prerequisites': concept.prerequisites
                }
                concepts.append(concept_dict)

            # For relationships, we'll create them based on prerequisites
            relationships = []
            for concept in concepts:
                for prereq_id in concept['prerequisites']:
                    relationships.append({
                        'from': prereq_id,
                        'to': concept['id']
                    })

            return KnowledgeMap(concepts=concepts, relationships=relationships)
        except Exception as e:
            print(f"Error getting knowledge map: {e}")
            return KnowledgeMap(concepts=[], relationships=[])

    async def list_preferences(self) -> Dict[str, Any]:
        """List all current user preferences from preferences.json"""
        try:
            return self.preferences_manager.list_preferences()
        except Exception as e:
            print(f"Error listing preferences: {e}")
            return {}

    async def set_preference(self, key: str, value: Union[str, int, float, bool, Dict[str, Any]]) -> bool:
        """Set a specific configuration preference using key-value format in preferences.json"""
        try:
            return self.preferences_manager.set_preference(key, value)
        except Exception as e:
            print(f"Error setting preference: {e}")
            return False
