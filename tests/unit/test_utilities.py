"""
Unit tests for utilities
"""
import pytest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, mock_open
from src.utils.workspace_manager import WorkspaceManager
from src.utils.preferences_manager import PreferencesManager


class TestWorkspaceManager:
    def test_initialization(self, temp_workspace):
        """Test workspace manager initialization"""
        workspace_mgr = WorkspaceManager(temp_workspace)

        assert workspace_mgr.workspace_path == temp_workspace
        assert workspace_mgr.learningspace_path == temp_workspace / ".learningspace"

    def test_workspace_exists(self, temp_workspace):
        """Test checking if workspace exists"""
        workspace_mgr = WorkspaceManager(temp_workspace)

        # Initially should exist because conftest.py creates it
        assert workspace_mgr.workspace_exists() is True

        # Test with non-existent workspace
        non_existent_workspace = Path("/non/existent/path")
        non_existent_mgr = WorkspaceManager(non_existent_workspace)
        assert non_existent_mgr.workspace_exists() is False

    def test_initialize_workspace(self, temp_workspace):
        """Test initializing a workspace"""
        # Remove the learningspace directory that conftest created
        learningspace_dir = temp_workspace / ".learningspace"
        if learningspace_dir.exists():
            import shutil
            shutil.rmtree(learningspace_dir)

        workspace_mgr = WorkspaceManager(temp_workspace)
        success = workspace_mgr.initialize_workspace()

        assert success is True
        assert workspace_mgr.workspace_exists() is True
        assert (workspace_mgr.learningspace_path / "checkpoints").exists()
        assert (workspace_mgr.learningspace_path / "content_chunks").exists()
        assert (workspace_mgr.learningspace_path / "reports").exists()
        assert (workspace_mgr.learningspace_path / "logs").exists()
        assert (workspace_mgr.learningspace_path / "config.json").exists()
        assert (workspace_mgr.learningspace_path / "data.db").exists()

    def test_get_paths(self, temp_workspace):
        """Test getting various paths"""
        workspace_mgr = WorkspaceManager(temp_workspace)

        assert workspace_mgr.get_database_path() == temp_workspace / ".learningspace" / "data.db"
        assert workspace_mgr.get_checkpoints_path() == temp_workspace / ".learningspace" / "checkpoints"
        assert workspace_mgr.get_content_chunks_path() == temp_workspace / ".learningspace" / "content_chunks"
        assert workspace_mgr.get_reports_path() == temp_workspace / ".learningspace" / "reports"
        assert workspace_mgr.get_logs_path() == temp_workspace / ".learningspace" / "logs"


class TestPreferencesManager:
    def test_initialization_with_defaults(self, temp_workspace):
        """Test preferences manager initialization with defaults"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Verify default preferences exist
        prefs = prefs_mgr.list_preferences()

        assert "ui" in prefs
        assert "learning" in prefs
        assert "ai" in prefs
        assert "features" in prefs

        # Verify specific default values
        assert prefs["ui"]["theme"] == "dark"
        assert prefs["ai"]["default_provider"] == "openai"

    def test_list_preferences(self, temp_workspace):
        """Test listing preferences"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        prefs = prefs_mgr.list_preferences()
        assert isinstance(prefs, dict)
        assert len(prefs) > 0

    def test_set_and_get_preference(self, temp_workspace):
        """Test setting and getting a preference"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Set a preference
        success = prefs_mgr.set_preference("test.key", "test_value")
        assert success is True

        # Get the preference
        value = prefs_mgr.get_preference("test.key")
        assert value == "test_value"

    def test_set_nested_preference(self, temp_workspace):
        """Test setting a nested preference using dot notation"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Set a nested preference
        success = prefs_mgr.set_preference("ui.new_setting", "new_value")
        assert success is True

        # Get the nested preference
        value = prefs_mgr.get_preference("ui.new_setting")
        assert value == "new_value"

    def test_set_preference_with_different_types(self, temp_workspace):
        """Test setting preferences with different data types"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Test setting a string
        prefs_mgr.set_preference("test.string", "string_value")
        assert prefs_mgr.get_preference("test.string") == "string_value"

        # Test setting an integer
        prefs_mgr.set_preference("test.integer", 42)
        assert prefs_mgr.get_preference("test.integer") == 42

        # Test setting a float
        prefs_mgr.set_preference("test.float", 3.14)
        assert prefs_mgr.get_preference("test.float") == 3.14

        # Test setting a boolean
        prefs_mgr.set_preference("test.boolean", True)
        assert prefs_mgr.get_preference("test.boolean") is True

        # Test setting a dictionary
        prefs_mgr.set_preference("test.dict", {"nested": "value"})
        assert prefs_mgr.get_preference("test.dict") == {"nested": "value"}

    def test_get_nonexistent_preference(self, temp_workspace):
        """Test getting a nonexistent preference"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Should return None for nonexistent key
        value = prefs_mgr.get_preference("nonexistent.key")
        assert value is None

        # Should return None for nonexistent nested key
        value = prefs_mgr.get_preference("nonexistent.nested.key")
        assert value is None

    def test_set_preference_error_handling(self, temp_workspace):
        """Test error handling when setting preferences"""
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Force an error by trying to write to an invalid path
        original_path = prefs_mgr.preferences_path
        prefs_mgr.preferences_path = Path("/invalid/path/file.json")

        success = prefs_mgr.set_preference("test.key", "test_value")
        assert success is False

        # Restore original path for other tests
        prefs_mgr.preferences_path = original_path

    def test_invalid_json_file_handling(self, temp_workspace):
        """Test handling of invalid JSON in preferences file"""
        # Create a temporary preferences file with invalid JSON
        learningspace_path = temp_workspace / ".learningspace"
        learningspace_path.mkdir(exist_ok=True)
        prefs_file = learningspace_path / "preferences.json"

        with open(prefs_file, 'w') as f:
            f.write("invalid json content")

        # This should create default preferences since the file is invalid
        prefs_mgr = PreferencesManager(str(temp_workspace))

        # Verify that default preferences were created
        prefs = prefs_mgr.list_preferences()
        assert "ui" in prefs
        assert "learning" in prefs
        assert "ai" in prefs
        assert "features" in prefs


# Test for the utilities __init__.py file
def test_utilities_import():
    """Test that utilities can be imported without issues"""
    from src.utils import PreferencesManager, WorkspaceManager

    # Verify classes are importable
    assert PreferencesManager is not None
    assert WorkspaceManager is not None


if __name__ == "__main__":
    pytest.main([__file__])
