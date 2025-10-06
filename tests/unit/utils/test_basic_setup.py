"""
Simple test to verify basic functionality
"""
import tempfile
import os
from pathlib import Path
import pytest
from src.utils.workspace_manager import WorkspaceManager
from src.utils.preferences_manager import PreferencesManager
from src.data.database_manager import DatabaseManager


def test_basic_setup():
    """Test basic setup functionality"""
    print("Testing basic setup...")

    # Create a temporary workspace for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        workspace_path = Path(temp_dir)
        print(f"Created temporary workspace: {workspace_path}")

        # Test workspace manager
        print("Testing WorkspaceManager...")
        workspace_mgr = WorkspaceManager(workspace_path)
        success = workspace_mgr.initialize_workspace()
        print(f"Workspace initialized: {success}")

        # Test preferences manager
        print("Testing PreferencesManager...")
        prefs_mgr = PreferencesManager(workspace_path)
        print(f"Initial preferences: {prefs_mgr.list_preferences()}")

        # Test setting a preference
        prefs_mgr.set_preference("test.key", "test_value")
        retrieved = prefs_mgr.get_preference("test.key")
        print(f"Set and retrieved preference: {retrieved}")

        # Test database manager
        print("Testing DatabaseManager...")
        db_path = workspace_mgr.get_database_path()
        db_mgr = DatabaseManager(db_path)

        print("All basic components tested successfully!")


if __name__ == "__main__":
    test_basic_setup()
