"""
Test helper utilities and common functions for Learning Catalyst test suite.

This module provides reusable helper functions, utilities, and custom assertions
that are used across multiple test modules.
"""

import asyncio
import json
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Callable
from unittest.mock import Mock, AsyncMock
from datetime import datetime
import pytest

# Custom assertion helpers
def assert_valid_uuid(uuid_string: str):
    """Assert that a string is a valid UUID."""
    import uuid
    try:
        uuid.UUID(uuid_string)
    except ValueError:
        pytest.fail(f"'{uuid_string}' is not a valid UUID")

def assert_datetime_within_range(dt: datetime, expected: datetime, tolerance_seconds: int = 5):
    """Assert that a datetime is within tolerance of expected."""
    diff = abs((dt - expected).total_seconds())
    if diff > tolerance_seconds:
        pytest.fail(f"Datetime difference {diff}s exceeds tolerance {tolerance_seconds}s")

def assert_valid_config_structure(config: Dict[str, Any]):
    """Assert that configuration has valid structure."""
    required_sections = ["ai", "learning", "ui", "privacy", "performance"]
    for section in required_sections:
        assert section in config, f"Missing required configuration section: {section}"

def assert_valid_concept_structure(concept: Dict[str, Any]):
    """Assert that concept has valid structure."""
    required_fields = ["id", "title", "description", "domain", "difficulty"]
    for field in required_fields:
        assert field in concept, f"Missing required concept field: {field}"

    assert isinstance(concept["difficulty"], int)
    assert 1 <= concept["difficulty"] <= 10, "Difficulty must be between 1 and 10"

def assert_valid_session_structure(session: Dict[str, Any]):
    """Assert that session has valid structure."""
    required_fields = ["id", "started_at", "last_activity", "is_active"]
    for field in required_fields:
        assert field in session, f"Missing required session field: {field}"

    assert_valid_uuid(session["id"])

# Async test utilities
async def run_async_test(test_func: Callable, *args, **kwargs):
    """Helper to run async test functions."""
    return await test_func(*args, **kwargs)

def async_test_decorator(test_func: Callable):
    """Decorator for async test functions."""
    def wrapper(*args, **kwargs):
        return asyncio.run(test_func(*args, **kwargs))
    return wrapper

# Mock data generators
def generate_mock_config(overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Generate mock configuration data."""
    config = {
        "ai": {
            "default_provider": "openai",
            "default_model": "gpt-4o-mini",
            "temperature": 0.7,
            "max_tokens": 4096
        },
        "learning": {
            "difficulty": "adaptive",
            "pace": "moderate",
            "auto_save": True,
            "session_timeout_minutes": 120
        },
        "ui": {
            "theme": "dark",
            "show_token_usage": True,
            "display_format": "detailed"
        },
        "privacy": {
            "store_conversations": True,
            "anonymize_data": False,
            "retention_days": 365
        },
        "performance": {
            "cache_enabled": True,
            "cache_size_mb": 100,
            "timeout_seconds": 30
        }
    }

    if overrides:
        config.update(overrides)

    return config

def generate_mock_concept(concept_id: str, **overrides) -> Dict[str, Any]:
    """Generate mock concept data."""
    concept = {
        "id": concept_id,
        "title": f"Concept {concept_id}",
        "description": f"Description for {concept_id}",
        "domain": "test_domain",
        "difficulty": 3,
        "estimated_time_minutes": 45,
        "prerequisites": [],
        "content_references": [],
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "tags": ["test"]
        }
    }

    concept.update(overrides)
    return concept

def generate_mock_session(session_id: str, **overrides) -> Dict[str, Any]:
    """Generate mock session data."""
    session = {
        "id": session_id,
        "started_at": datetime.now().isoformat(),
        "last_activity": datetime.now().isoformat(),
        "is_active": True,
        "session_data": {
            "current_concept": "test_concept",
            "progress": 0.5,
            "interaction_count": 5
        },
        "checkpoint_data": {},
        "metadata": {
            "workspace_path": "/test/workspace",
            "provider": "openai",
            "model": "gpt-4o-mini"
        }
    }

    session.update(overrides)
    return session

def generate_mock_token_usage(**overrides) -> Dict[str, Any]:
    """Generate mock token usage data."""
    usage = {
        "id": "token_usage_001",
        "timestamp": datetime.now().isoformat(),
        "provider": "openai",
        "model": "gpt-4o-mini",
        "input_tokens": 100,
        "output_tokens": 50,
        "total_tokens": 150,
        "cost_estimate": 0.003,
        "context_type": "test",
        "session_id": "test_session",
        "metadata": {}
    }

    usage.update(overrides)
    return usage

# File system utilities
def create_temp_config_file(config_data: Dict[str, Any]) -> Path:
    """Create a temporary configuration file."""
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(config_data, temp_file, indent=2)
    temp_file.close()
    return Path(temp_file.name)

def create_temp_workspace() -> Path:
    """Create a temporary workspace directory."""
    return Path(tempfile.mkdtemp(prefix="lc_test_workspace_"))

def cleanup_temp_file(file_path: Path):
    """Clean up temporary file."""
    if file_path.exists():
        file_path.unlink()

# Mock object factories
def create_mock_provider(name: str = "openai", models: Optional[List[str]] = None) -> Mock:
    """Create a mock AI provider."""
    provider = Mock()
    provider.name = name
    provider.list_available_models = AsyncMock(return_value={
        "chat": [Mock(model_id=model) for model in (models or ["gpt-4o-mini"])],
        "embedding": []
    })
    return provider

def create_mock_tool(name: str, category: str = "test") -> Mock:
    """Create a mock AI tool."""
    tool = Mock()
    tool.name = name
    tool.category = category
    tool.description = f"Mock tool for {name}"
    tool.execute = AsyncMock(return_value={
        "success": True,
        "data": f"Mock result from {name}",
        "execution_time": 0.1
    })
    return tool

def create_mock_knowledge_manager() -> Mock:
    """Create a mock knowledge manager."""
    km = Mock()
    km.get_concept = Mock(return_value=generate_mock_concept("test_concept"))
    km.search_concepts = Mock(return_value=[
        generate_mock_concept("concept1"),
        generate_mock_concept("concept2")
    ])
    km.get_related_concepts = Mock(return_value=[])
    return km

# Response validation utilities
def validate_api_response(response: Dict[str, Any], expected_success: bool = True) -> None:
    """Validate API response structure."""
    assert "success" in response, "Response missing 'success' field"
    assert response["success"] == expected_success, f"Expected success={expected_success}, got {response['success']}"

    if response["success"]:
        assert "data" in response, "Successful response missing 'data' field"
    else:
        assert "error" in response, "Error response missing 'error' field"
        assert "message" in response["error"], "Error response missing 'message' field"

def validate_cli_response_format(response: str) -> None:
    """Validate CLI response format."""
    assert isinstance(response, str), "CLI response must be a string"
    assert len(response) > 0, "CLI response cannot be empty"

# Performance testing utilities
import time
from contextlib import contextmanager

@contextmanager
def measure_performance():
    """Context manager to measure execution time."""
    start_time = time.time()
    yield
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"Execution time: {execution_time:.4f} seconds")
    return execution_time

def assert_performance_under(func: Callable, max_time: float, *args, **kwargs):
    """Assert that function execution is under max_time seconds."""
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    execution_time = end_time - start_time

    if execution_time > max_time:
        pytest.fail(f"Function took {execution_time:.4f}s, expected under {max_time:.4f}s")

    return result

# Async performance testing
from contextlib import asynccontextmanager

@asynccontextmanager
async def measure_async_performance():
    """Async context manager to measure async execution time."""
    start_time = time.time()
    yield
    end_time = time.time()
    execution_time = end_time - start_time
    print(f"Async execution time: {execution_time:.4f} seconds")

async def assert_async_performance_under(func: Callable, max_time: float, *args, **kwargs):
    """Assert that async function execution is under max_time seconds."""
    start_time = time.time()
    result = await func(*args, **kwargs)
    end_time = time.time()
    execution_time = end_time - start_time

    if execution_time > max_time:
        pytest.fail(f"Async function took {execution_time:.4f}s, expected under {max_time:.4f}s")

    return result

# CLI test context utilities
@pytest.fixture
def cli_test_context():
    """Provide a test CLI context for testing."""
    return {
        "session_id": "test_session_123",
        "user_preferences": {
            "theme": "dark",
            "verbosity": "normal",
            "auto_save": True
        },
        "current_config": {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-3.5-turbo"
            }
        },
        "learning_progress": {
            "current_topic": "python",
            "concepts_mastered": ["variables", "functions"],
            "session_duration": 45
        }
    }

# Error testing utilities
def assert_raises_specific_error(func: Callable, expected_error_type: type, expected_message: Optional[str] = None, *args, **kwargs):
    """Assert that function raises specific error with optional message."""
    with pytest.raises(expected_error_type) as exc_info:
        func(*args, **kwargs)

    if expected_message:
        assert expected_message in str(exc_info.value), f"Expected message '{expected_message}' in '{str(exc_info.value)}'"

async def assert_async_raises_specific_error(func: Callable, expected_error_type: type, expected_message: Optional[str] = None, *args, **kwargs):
    """Assert that async function raises specific error with optional message."""
    with pytest.raises(expected_error_type) as exc_info:
        await func(*args, **kwargs)

    if expected_message:
        assert expected_message in str(exc_info.value), f"Expected message '{expected_message}' in '{str(exc_info.value)}'"

# JSON schema validation
def validate_json_schema(data: Dict[str, Any], schema: Dict[str, Any]) -> bool:
    """Validate data against JSON schema."""
    # Simple validation - in real implementation, use jsonschema library
    for key, value_type in schema.items():
        if key not in data:
            return False
        if not isinstance(data[key], value_type):
            return False
    return True

# Test data generators for edge cases
def generate_edge_case_concepts() -> List[Dict[str, Any]]:
    """Generate concepts covering edge cases."""
    return [
        generate_mock_concept("empty", title="", description=""),
        generate_mock_concept("max_difficulty", difficulty=10),
        generate_mock_concept("min_difficulty", difficulty=1),
        generate_mock_concept("no_prerequisites", prerequisites=[]),
        generate_mock_concept("many_prerequisites", prerequisites=[f"concept_{i}" for i in range(10)]),
        generate_mock_concept("special_chars", title="Concept with üñíçødé & $ymb0ls"),
    ]

def generate_edge_case_configs() -> List[Dict[str, Any]]:
    """Generate configurations covering edge cases."""
    return [
        generate_mock_config({"ai": {"temperature": 0.0}}),
        generate_mock_config({"ai": {"temperature": 2.0}}),
        generate_mock_config({"ai": {"max_tokens": 1}}),
        generate_mock_config({"ai": {"max_tokens": 32768}}),
        generate_mock_config({"learning": {"session_timeout_minutes": 5}}),
        generate_mock_config({"learning": {"session_timeout_minutes": 480}}),
    ]