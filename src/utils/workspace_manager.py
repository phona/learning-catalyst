"""
Workspace manager implementation
"""

import json
from pathlib import Path


class WorkspaceManager:
    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.catalyst_path = self.workspace_path / ".catalyst"
        self.learningspace_path = self.workspace_path / ".learningspace"

    def initialize_workspace(self) -> bool:
        """Initialize the .catalyst directory and its subdirectories"""
        try:
            # Create .catalyst directory
            self.catalyst_path.mkdir(exist_ok=True)

            # Create subdirectories
            (self.catalyst_path / "checkpoints").mkdir(exist_ok=True)
            (self.catalyst_path / "content_chunks").mkdir(exist_ok=True)
            (self.catalyst_path / "reports").mkdir(exist_ok=True)
            (self.catalyst_path / "logs").mkdir(exist_ok=True)

            # Create .learningspace directory for backward compatibility
            self.learningspace_path.mkdir(exist_ok=True)
            (self.learningspace_path / "checkpoints").mkdir(exist_ok=True)
            (self.learningspace_path / "content_chunks").mkdir(exist_ok=True)
            (self.learningspace_path / "reports").mkdir(exist_ok=True)
            (self.learningspace_path / "logs").mkdir(exist_ok=True)

            # Create default config.json if it doesn't exist
            config_path = self.catalyst_path / "config.json"
            if not config_path.exists():
                default_config = {
                    "version": "1.0.0",
                    "created_at": self._get_current_timestamp(),
                    "ai_providers": {
                        "openai": {"enabled": False, "api_key": "", "default_model": "gpt-4"},
                        "anthropic": {"enabled": False, "api_key": "", "default_model": "claude-3-5-sonnet-20240620"},
                    },
                }
                with open(config_path, "w", encoding="utf-8") as f:
                    json.dump(default_config, f, indent=2)

            # Create database file
            db_path = self.get_database_path()
            if not db_path.exists():
                # Just create an empty file that will be initialized by DatabaseManager later
                db_path.touch()

            return True
        except (OSError, IOError, json.JSONDecodeError) as e:
            print(f"Error initializing workspace: {e}")
            return False

    def workspace_exists(self) -> bool:
        """Check if the .catalyst directory exists in the workspace"""
        return self.catalyst_path.exists()

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime

        return datetime.now().isoformat()

    def get_database_path(self) -> Path:
        """Get the path to the database file"""
        return self.learningspace_path / "data.db"

    def get_checkpoints_path(self) -> Path:
        """Get the path to the checkpoints directory"""
        return self.learningspace_path / "checkpoints"

    def get_content_chunks_path(self) -> Path:
        """Get the path to the content chunks directory"""
        return self.learningspace_path / "content_chunks"

    def get_reports_path(self) -> Path:
        """Get the path to the reports directory"""
        return self.learningspace_path / "reports"

    def get_logs_path(self) -> Path:
        """Get the path to the logs directory"""
        return self.learningspace_path / "logs"
