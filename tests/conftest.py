"""
Pytest configuration and fixtures for Learning Catalyst tests
"""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from src.ai.service import ModelAbstractionService
from src.core.basic_analytics_dashboard import BasicAnalyticsDashboard
from src.core.basic_assessment_engine import BasicAssessmentEngine
from src.core.catalyst_agent import CatalystAgentImpl
from src.core.challenge_engine import ChallengeEngineImpl
from src.core.checkpoint_manager import CheckpointManagerImpl
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.core.system_commands_handler import SystemCommandsHandlerImpl
from src.data.database_manager import DatabaseManager
from src.data.vector_storage import VectorStorage
from src.utils.preferences_manager import PreferencesManager
from src.utils.workspace_manager import WorkspaceManager

# Configure pytest-asyncio
pytest_plugins = ("pytest_asyncio",)


@pytest.fixture
def temp_workspace():
    """Create a temporary workspace for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        workspace_path = Path(temp_dir)
        workspace_mgr = WorkspaceManager(str(workspace_path))
        workspace_mgr.initialize_workspace()
        yield workspace_path


@pytest.fixture
def db_manager(temp_workspace):
    """Create a test database manager"""
    db_path = temp_workspace / ".learningspace" / "data.db"
    db_manager = DatabaseManager(str(db_path))
    return db_manager


@pytest.fixture
def vector_storage(temp_workspace):
    """Create a test vector storage manager"""
    db_path = temp_workspace / ".learningspace" / "data.db"
    vector_storage = VectorStorage(str(db_path))
    return vector_storage


@pytest.fixture
def preferences_manager(temp_workspace):
    """Create a test preferences manager"""
    preferences_manager = PreferencesManager(str(temp_workspace))
    return preferences_manager


@pytest.fixture
def model_service():
    """Create a test model service"""
    model_service = ModelAbstractionService()
    # Mock providers with AsyncMock
    model_service.providers["openai"] = AsyncMock()
    model_service.providers["anthropic"] = AsyncMock()
    model_service.providers["chatglm"] = AsyncMock()
    model_service.providers["siliconflow"] = AsyncMock()
    model_service.providers["deepseek"] = AsyncMock()
    model_service.providers["openai-compatible"] = AsyncMock()
    model_service.providers["embedding"] = AsyncMock()
    model_service.providers["rerank"] = AsyncMock()
    return model_service


@pytest.fixture
def knowledge_navigator(db_manager):
    """Create a test knowledge navigator"""
    nav = SQLiteKnowledgeNavigator(db_manager.db_path)
    return nav


@pytest.fixture
def catalyst_agent(model_service):
    """Create a test catalyst agent"""
    agent = CatalystAgentImpl(model_service)
    return agent


@pytest.fixture
def challenge_engine(catalyst_agent, model_service, temp_workspace):
    """Create a test challenge engine"""
    engine = ChallengeEngineImpl(catalyst_agent, model_service, str(temp_workspace))
    return engine


@pytest.fixture
def checkpoint_manager(temp_workspace):
    """Create a test checkpoint manager"""
    manager = CheckpointManagerImpl(str(temp_workspace))
    return manager


@pytest.fixture
def system_commands_handler(preferences_manager, db_manager, model_service):
    """Create a test system commands handler"""
    handler = SystemCommandsHandlerImpl(preferences_manager, db_manager, model_service)
    return handler


@pytest.fixture
def analytics_dashboard(db_manager):
    """Create a test analytics dashboard"""
    dashboard = BasicAnalyticsDashboard(db_manager)
    return dashboard


@pytest.fixture
def assessment_engine(db_manager):
    """Create a test assessment engine"""
    engine = BasicAssessmentEngine(db_manager)
    return engine


@pytest.fixture
def sample_concept():
    """Sample concept for testing"""
    from src.data.models.concept import Concept

    return Concept(
        id="test_concept_001",
        title="Test Concept",
        content="This is a test concept for learning.",
        prerequisites=[],
        difficulty_level=5,
    )


@pytest.fixture
def sample_user_profile():
    """Sample user profile for testing"""
    from src.data.models.user_profile import UserProfile

    return UserProfile(
        id="test_user_001",
        created_at="2023-01-01T00:00:00",
        preferences={"ui": {"theme": "dark"}},
        competency_profile={"math": 0.8, "science": 0.6},
        ai_config={"default_provider": "openai", "default_model": "gpt-4"},
    )
