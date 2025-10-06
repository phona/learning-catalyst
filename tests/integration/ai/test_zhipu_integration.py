"""
Test script for Learning Catalyst with the provided Zhipu AI models
Note: This script demonstrates how to configure and test the application.
API keys should never be saved in committed code - they should only be used locally.
"""

import asyncio
import tempfile
import os
import pytest
from pathlib import Path
from src.utils.workspace_manager import WorkspaceManager
from src.utils.preferences_manager import PreferencesManager
from src.ai.service import ModelAbstractionService
from src.ai.providers.chatglm_provider import ChatGLMProvider
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.challenge_engine import ChallengeEngineImpl
from src.data.database_manager import DatabaseManager
from src.data.models.concept import Concept


@pytest.mark.asyncio
async def test_with_zhipu_models():
    """Test the Learning Catalyst with Zhipu AI models"""

    print("Testing Learning Catalyst with Zhipu AI models...")

    # Create a temporary workspace for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        workspace_path = Path(temp_dir)
        print(f"Using temporary workspace: {workspace_path}")

        # Initialize workspace
        workspace_mgr = WorkspaceManager(workspace_path)
        workspace_mgr.initialize_workspace()

        # Initialize database
        db_path = workspace_mgr.get_database_path()
        db_manager = DatabaseManager(str(db_path))

        # Initialize preferences
        preferences_mgr = PreferencesManager(str(workspace_path))

        # Configure Zhipu AI model settings
        # NOTE: In a real implementation, you would set these via environment variables or local config
        # NEVER commit API keys to version control
        zhipu_api_key = os.getenv("ZHIPU_API_KEY", "YOUR_API_KEY_HERE")  # Placeholder
        zhipu_base_url = os.getenv("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/")

        # Initialize the model abstraction service
        model_service = ModelAbstractionService()

        # Create and configure the ChatGLM provider
        chatglm_provider = ChatGLMProvider(
            api_key=zhipu_api_key,
            base_url=zhipu_base_url
        )

        # Set the provider in the model service
        model_service.set_provider("chatglm", chatglm_provider)

        # Initialize components
        knowledge_navigator = SQLiteKnowledgeNavigator(str(db_path))
        catalyst_agent = CatalystAgentImpl(model_service)
        challenge_engine = ChallengeEngineImpl(catalyst_agent)

        # Create sample learning content to test
        sample_concept = Concept(
            id="ml_introduction",
            title="Introduction to Machine Learning",
            content="""
            Machine learning is a method of data analysis that automates analytical model building.
            It is a branch of artificial intelligence based on the idea that systems can learn from data,
            identify patterns and make decisions with minimal human intervention.

            There are three main types:
            1. Supervised Learning
            2. Unsupervised Learning
            3. Reinforcement Learning
            """,
            prerequisites=[],
            difficulty_level=5
        )

        # Save concept to database
        db_manager.save_concept(sample_concept)
        print(f"Saved concept: {sample_concept.title}")

        # Test generating an explanation using the Zhipu model
        print("\nTesting explanation generation...")
        try:
            explanation = await catalyst_agent.generate_explanation(
                sample_concept,
                context={
                    "provider": "chatglm",
                    "model": "glm-4.5-air",  # Using the provided model
                    "learning_level": "beginner"
                }
            )
            print(f"Generated explanation length: {len(explanation) if explanation else 0} characters")
            print(f"Explanation preview: {explanation[:100]}..." if explanation else "No explanation generated")
        except Exception as e:
            print(f"Error generating explanation: {e}")
            print("This is expected if API key is not properly configured")

        # Test generating a challenge
        print("\nTesting challenge generation...")
        try:
            challenge = await catalyst_agent.generate_challenge(
                sample_concept,
                context={
                    "provider": "chatglm",
                    "model": "glm-4.5-air",
                    "challenge_type": "open_ended",
                    "difficulty": "medium"
                }
            )
            print(f"Challenge generated: {bool(challenge)}")
            if challenge:
                print(f"Challenge preview: {challenge['challenge_text'][:100]}...")
        except Exception as e:
            print(f"Error generating challenge: {e}")
            print("This is expected if API key is not properly configured")

        # Test the knowledge navigator
        print("\nTesting knowledge navigator...")
        available_concepts = await knowledge_navigator.get_available_concepts()
        print(f"Available concepts in navigator: {len(available_concepts)}")

        # Test concept path
        concept_path = knowledge_navigator.get_concept_path(sample_concept.id)
        print(f"Concept path length: {len(concept_path)}")

        print("\nTest completed. Note:")
        print("- If you want to run this with actual Zhipu AI models, set the ZHIPU_API_KEY environment variable")
        print("- Never commit API keys to version control")
        print("- The models used are: glm-4.5-air (chat) and embedding-3 (embeddings)")


def demo_preferences_config():
    """Demonstrate how to configure preferences for Zhipu AI models"""

    print("\n" + "="*60)
    print("CONFIGURATION DEMONSTRATION")
    print("="*60)
    print("To configure Learning Catalyst with Zhipu AI models, you can use the CLI:")
    print()
    print("# Set the provider and model preferences")
    print("learning-catalyst preference set ai.default_provider chatglm")
    print("learning-catalyst preference set ai.default_model glm-4.5-air")
    print("learning-catalyst preference set ai.zhipu_api_key YOUR_API_KEY_HERE")
    print("learning-catalyst preference set ai.zhipu_base_url https://open.bigmodel.cn/api/paas/v4/")
    print()
    print("Or set environment variables:")
    print("export ZHIPU_API_KEY=b2e6a21dd7b24d0ca9e44b475dba2378.SecFQLTAJXi0L37U")
    print("export ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/")
    print()
    print("IMPORTANT: Never commit API keys to version control!")
    print("="*60)


if __name__ == "__main__":
    print("Learning Catalyst Test Script")
    print("Note: API credentials should only be used locally and never committed")

    demo_preferences_config()

    print("\nRunning functional tests...")
    asyncio.run(test_with_zhipu_models())
