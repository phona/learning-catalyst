"""
Pytest configuration and shared fixtures for Learning Catalyst test suite.

This module provides common test fixtures, configuration, and utilities
used across all test modules in the test suite.
"""

import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List
from unittest.mock import Mock, AsyncMock
import json
from datetime import datetime

# Test Configuration
TEST_CONFIG = {
    "test_data_dir": "test_data",
    "mock_responses_dir": "mock_responses",
    "temp_workspace_pattern": "lc_test_workspace_",
    "default_user_id": "test_user_001",
    "test_session_id": "test_session_001",
    "test_provider": "openai",
    "test_model": "gpt-4o-mini",
}

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def temp_workspace():
    """Create a temporary workspace directory for testing."""
    temp_dir = tempfile.mkdtemp(prefix=TEST_CONFIG["temp_workspace_pattern"])
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)

@pytest.fixture
def config_dir(temp_workspace):
    """Create a temporary configuration directory."""
    config_path = temp_workspace / ".catalyst"
    config_path.mkdir()
    return config_path

@pytest.fixture
def sample_config_data():
    """Sample configuration data for testing."""
    return {
        "ai": {
            "default_provider": "openai",
            "default_model": "gpt-4o-mini",
            "temperature": 0.7,
            "max_tokens": 4096,
            "providers": {
                "openai": {
                    "api_key": "sk-test-key",
                    "base_url": "https://api.openai.com/v1",
                    "models": {
                        "chat": ["gpt-4o-mini", "gpt-3.5-turbo"],
                        "embedding": ["text-embedding-3-small"]
                    }
                }
            }
        },
        "learning": {
            "difficulty": "adaptive",
            "pace": "moderate",
            "content_type": ["text", "visual"],
            "auto_save": True,
            "session_timeout_minutes": 120
        },
        "ui": {
            "theme": "dark",
            "show_token_usage": True,
            "display_format": "detailed",
            "session_duration": 45
        },
        "privacy": {
            "store_conversations": True,
            "anonymize_data": False,
            "retention_days": 365,
            "local_processing": False
        },
        "performance": {
            "cache_enabled": True,
            "cache_size_mb": 100,
            "parallel_requests": 3,
            "timeout_seconds": 30
        }
    }

@pytest.fixture
def sample_concept_data():
    """Sample concept data for testing."""
    return {
        "id": "con_python_basics",
        "title": "Python Basics",
        "description": "Introduction to Python programming fundamentals",
        "domain": "programming",
        "difficulty": 2,
        "estimated_time_minutes": 60,
        "prerequisites": [],
        "content_references": [
            {
                "type": "markdown",
                "path": "docs/python_basics.md",
                "description": "Python basics tutorial",
                "relevance_score": 0.9,
                "last_updated": "2025-01-20T10:00:00Z"
            }
        ],
        "metadata": {
            "created_at": "2025-01-20T10:00:00Z",
            "updated_at": "2025-01-20T10:00:00Z",
            "tags": ["python", "programming", "basics"]
        }
    }

@pytest.fixture
def sample_session_data():
    """Sample session data for testing."""
    return {
        "id": TEST_CONFIG["test_session_id"],
        "started_at": "2025-01-20T15:30:00Z",
        "last_activity": "2025-01-20T16:15:00Z",
        "is_active": True,
        "session_data": {
            "current_concept": "con_python_basics",
            "progress": 0.65,
            "interaction_count": 12,
            "user_id": TEST_CONFIG["default_user_id"]
        },
        "checkpoint_data": {
            "last_checkpoint": "2025-01-20T16:00:00Z",
            "checkpoint_data": {
                "completed_concepts": ["con_python_variables"],
                "current_position": 3
            }
        },
        "metadata": {
            "workspace_path": "/test/workspace",
            "provider": TEST_CONFIG["test_provider"],
            "model": TEST_CONFIG["test_model"]
        }
    }

@pytest.fixture
def mock_provider():
    """Create a mock AI provider for testing."""
    provider = Mock()
    provider.name = TEST_CONFIG["test_provider"]
    provider.list_available_models = AsyncMock(return_value={
        "chat": [Mock(model_id="gpt-4o-mini")],
        "embedding": [Mock(model_id="text-embedding-3-small")]
    })
    return provider

@pytest.fixture
def mock_token_usage_data():
    """Sample token usage data for testing."""
    return {
        "id": "token_usage_001",
        "timestamp": datetime.now().isoformat(),
        "provider": TEST_CONFIG["test_provider"],
        "model": TEST_CONFIG["test_model"],
        "input_tokens": 450,
        "output_tokens": 280,
        "total_tokens": 730,
        "cost_estimate": 0.0146,
        "context_type": "explanation",
        "session_id": TEST_CONFIG["test_session_id"],
        "metadata": {
            "interaction_type": "explanation",
            "concept_id": "con_python_basics"
        }
    }

@pytest.fixture
def mock_knowledge_graph_data():
    """Sample knowledge graph data for testing."""
    return {
        "concepts": [
            {
                "id": "con_python_variables",
                "title": "Python Variables",
                "domain": "programming",
                "difficulty": 1,
                "relationships": [
                    {
                        "target_id": "con_python_data_types",
                        "type": "prerequisite",
                        "strength": 0.9
                    }
                ]
            },
            {
                "id": "con_python_data_types",
                "title": "Python Data Types",
                "domain": "programming",
                "difficulty": 2,
                "relationships": [
                    {
                        "target_id": "con_python_functions",
                        "type": "enables",
                        "strength": 0.8
                    }
                ]
            }
        ],
        "relationships": [
            {
                "id": "rel_001",
                "source_id": "con_python_variables",
                "target_id": "con_python_data_types",
                "type": "prerequisite",
                "strength": 0.9
            }
        ]
    }

@pytest.fixture
def mock_ai_tool_response():
    """Sample AI tool response for testing."""
    return {
        "success": True,
        "data": {
            "tool_name": "explain_concept",
            "response": "Python variables are containers for storing data values...",
            "metadata": {
                "tokens_used": 150,
                "processing_time": 1.2,
                "user_context_applied": True
            }
        }
    }

@pytest.fixture
def cli_test_context():
    """Create a test context for CLI commands."""
    return {
        "user_id": TEST_CONFIG["default_user_id"],
        "session_id": TEST_CONFIG["test_session_id"],
        "workspace_path": "/test/workspace",
        "config": {},
        "current_provider": TEST_CONFIG["test_provider"],
        "current_model": TEST_CONFIG["test_model"],
        "interactive_mode": True
    }

# Async test helpers
@pytest.fixture
def async_test():
    """Helper for running async test functions."""
    def run_async(coro):
        return asyncio.run(coro)
    return run_async

# Mock response helpers
@pytest.fixture
def mock_responses():
    """Dictionary of mock responses for different scenarios."""
    return {
        "provider_list": ["openai", "deepseek", "anthropic"],
        "model_list": {
            "openai": {
                "chat": ["gpt-4o-mini", "gpt-3.5-turbo"],
                "embedding": ["text-embedding-3-small"]
            }
        },
        "successful_response": {
            "success": True,
            "data": {"result": "test_result"},
            "message": "Operation completed successfully"
        },
        "error_response": {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid input provided"
            }
        }
    }

# Test markers for categorization
pytest_plugins = []

def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "unit: Mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: Mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: Mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "slow: Mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "async_test: Mark test as async"
    )
    config.addinivalue_line(
        "markers", "cli: Mark test as CLI-related"
    )
    config.addinivalue_line(
        "markers", "provider: Mark test as provider-related"
    )
    config.addinivalue_line(
        "markers", "knowledge: Mark test as knowledge management related"
    )
    config.addinivalue_line(
        "markers", "toolcall: Mark test as AI toolcall related"
    )