"""
Command context for managing shared resources and operations
"""

import os
from typing import TYPE_CHECKING

from src.data.database_manager import DatabaseManager
from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
from src.utils.preferences_manager import PreferencesManager

if TYPE_CHECKING:
    pass


class CommandContext:
    """Helper class to manage context and common operations across handlers"""

    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self._db_manager = None
        self._knowledge_navigator = None
        self._preferences_manager = None

    @property
    def db_manager(self) -> DatabaseManager:
        """Get or create database manager"""
        if not self._db_manager:
            learningspace_path = os.path.join(self.workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            self._db_manager = DatabaseManager(db_path)
        return self._db_manager

    @property
    def knowledge_navigator(self) -> SQLiteKnowledgeNavigator:
        """Get or create knowledge navigator"""
        if not self._knowledge_navigator:
            learningspace_path = os.path.join(self.workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            self._knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
        return self._knowledge_navigator

    @property
    def preferences_manager(self) -> PreferencesManager:
        """Get or create preferences manager"""
        if not self._preferences_manager:
            self._preferences_manager = PreferencesManager(self.workspace_path)
        return self._preferences_manager

    def get_workspace_path(self) -> str:
        """Get the workspace path"""
        return self.workspace_path

    def get_learningspace_path(self) -> str:
        """Get the learningspace path"""
        return os.path.join(self.workspace_path, ".catalyst")

    def get_db_path(self) -> str:
        """Get the database path"""
        return os.path.join(self.get_learningspace_path(), "data.db")