"""
State Manager implementation for Learning Catalyst
Handles the mechanics of automatically saving the application state on exit
and seamlessly loading it on launch for the Catalyst Agent to interpret.
Manages manual checkpoints with additional features.
"""

import json
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.utils.formatting import CLIFormatter


@dataclass
class ApplicationState:
    user_profile: Dict[str, Any]
    conversation_context: Dict[str, Any]  # From Catalyst Agent
    conversation_messages: List[Dict[str, str]]  # Full chat history
    current_state_metadata: Dict[str, Any]  # Current application state info


@dataclass
class Checkpoint:
    id: str
    user_id: str
    state_data: str  # JSON string of the state
    created_at: str
    description: str
    size: int = 0  # Size in bytes


class StateManager:
    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.catalyst_path = self.workspace_path / ".catalyst"
        self.checkpoints_dir = self.catalyst_path / "checkpoints"
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.catalyst_path / "current_state.json"
        self.backup_dir = self.catalyst_path / "state_backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.formatter = CLIFormatter()
        self.max_backups = 5  # Maximum number of backup files to keep

    async def save_current_state(self, state: ApplicationState) -> None:
        """Automatically save current application state"""
        # Create a backup of the current state file if it exists
        if self.state_file.exists():
            await self._create_backup()

        state_dict = {
            "user_profile": state.user_profile,
            "conversation_context": state.conversation_context,
            "conversation_messages": state.conversation_messages,
            "current_state_metadata": state.current_state_metadata,
            "saved_at": datetime.now().isoformat(),
        }

        try:
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(state_dict, f, indent=2, ensure_ascii=False)

            self.formatter.format_success("State saved successfully")
        except (IOError, PermissionError) as e:
            self.formatter.format_error(f"Failed to save state: {str(e)}")

    async def _create_backup(self) -> None:
        """Create a backup of the current state file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"state_backup_{timestamp}.json"

        try:
            shutil.copy2(self.state_file, backup_file)

            # Clean up old backups if we have too many
            await self._cleanup_old_backups()
        except (IOError, PermissionError) as e:
            self.formatter.format_warning(f"Failed to create backup: {str(e)}")

    async def _cleanup_old_backups(self) -> None:
        """Remove old backup files, keeping only the most recent ones"""
        backup_files = list(self.backup_dir.glob("state_backup_*.json"))

        # Sort by modification time (oldest first)
        backup_files.sort(key=lambda f: f.stat().st_mtime)

        # Remove excess backups
        while len(backup_files) > self.max_backups:
            oldest_file = backup_files.pop(0)
            try:
                oldest_file.unlink()
            except (IOError, PermissionError) as e:
                self.formatter.format_warning(f"Failed to remove old backup {oldest_file}: {str(e)}")

    async def load_last_state(self) -> Optional[ApplicationState]:
        """Load the last saved application state on startup"""
        if not self.state_file.exists():
            self.formatter.format_info("No saved state found. Starting with a fresh session.")
            return None

        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                state_dict = json.load(f)

            state = ApplicationState(
                user_profile=state_dict.get("user_profile", {}),
                conversation_context=state_dict.get("conversation_context", {}),
                conversation_messages=state_dict.get("conversation_messages", []),
                current_state_metadata=state_dict.get("current_state_metadata", {}),
            )

            saved_at = state_dict.get("saved_at", "Unknown time")
            self.formatter.format_success(f"State loaded successfully (saved at {saved_at})")

            return state
        except (FileNotFoundError, json.JSONDecodeError, PermissionError) as e:
            self.formatter.format_error(f"Error loading state: {str(e)}")

            # Try to restore from backup
            self.formatter.format_info("Attempting to restore from backup...")
            restored_state = await self._restore_from_backup()

            if restored_state:
                self.formatter.format_success("State restored from backup")
                return restored_state

            return None

    async def _restore_from_backup(self) -> Optional[ApplicationState]:
        """Try to restore state from the most recent backup"""
        backup_files = list(self.backup_dir.glob("state_backup_*.json"))

        if not backup_files:
            self.formatter.format_info("No backup files found")
            return None

        # Sort by modification time (newest first)
        backup_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

        # Try the most recent backup first
        for backup_file in backup_files:
            try:
                with open(backup_file, "r", encoding="utf-8") as f:
                    state_dict = json.load(f)

                state = ApplicationState(
                    user_profile=state_dict.get("user_profile", {}),
                    conversation_context=state_dict.get("conversation_context", {}),
                    conversation_messages=state_dict.get("conversation_messages", []),
                    current_state_metadata=state_dict.get("current_state_metadata", {}),
                )

                # Restore the backup as the current state
                with open(self.state_file, "w", encoding="utf-8") as f:
                    json.dump(state_dict, f, indent=2, ensure_ascii=False)

                return state
            except (FileNotFoundError, json.JSONDecodeError, PermissionError) as e:
                self.formatter.format_warning(f"Failed to restore from backup {backup_file}: {str(e)}")
                continue

        return None

    async def create_checkpoint(self, state: ApplicationState, description: str) -> Checkpoint:
        """Create a named checkpoint from current application state"""
        checkpoint_id = f"checkpoint_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(state)) % 10000:04d}"
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"

        state_dict = {
            "user_profile": state.user_profile,
            "conversation_context": state.conversation_context,
            "conversation_messages": state.conversation_messages,
            "current_state_metadata": state.current_state_metadata,
            "saved_at": datetime.now().isoformat(),
        }

        checkpoint_data = {
            "id": checkpoint_id,
            "user_id": state.current_state_metadata.get("user_id", "default"),
            "state_data": json.dumps(state_dict),
            "created_at": datetime.now().isoformat(),
            "description": description,
        }

        try:
            with open(checkpoint_path, "w", encoding="utf-8") as f:
                json.dump(checkpoint_data, f, indent=2)

            self.formatter.format_success(f"Checkpoint '{checkpoint_id}' created successfully")
        except (IOError, PermissionError) as e:
            self.formatter.format_error(f"Failed to create checkpoint: {str(e)}")

        return Checkpoint(
            id=checkpoint_id,
            user_id=checkpoint_data["user_id"],
            state_data=checkpoint_data["state_data"],
            created_at=checkpoint_data["created_at"],
            description=checkpoint_data["description"],
        )

    async def load_checkpoint(self, checkpoint_id: str) -> Optional[ApplicationState]:
        """Load application state from a named checkpoint"""
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"

        if not checkpoint_path.exists():
            self.formatter.format_error(f"Checkpoint {checkpoint_id} not found")
            return None

        try:
            with open(checkpoint_path, "r", encoding="utf-8") as f:
                checkpoint_data = json.load(f)

            state_dict = json.loads(checkpoint_data["state_data"])

            return ApplicationState(
                user_profile=state_dict.get("user_profile", {}),
                conversation_context=state_dict.get("conversation_context", {}),
                conversation_messages=state_dict.get("conversation_messages", []),
                current_state_metadata=state_dict.get("current_state_metadata", {}),
            )
        except (FileNotFoundError, json.JSONDecodeError, PermissionError) as e:
            self.formatter.format_error(f"Error loading checkpoint {checkpoint_id}: {str(e)}")
            return None

    async def list_checkpoints(self) -> List[Checkpoint]:
        """List available checkpoints for user"""
        checkpoints: List[Checkpoint] = []

        for checkpoint_file in self.checkpoints_dir.glob("*.json"):
            try:
                with open(checkpoint_file, "r", encoding="utf-8") as f:
                    checkpoint_data = json.load(f)

                checkpoint = Checkpoint(
                    id=checkpoint_data["id"],
                    user_id=checkpoint_data["user_id"],
                    state_data=checkpoint_data["state_data"],
                    created_at=checkpoint_data["created_at"],
                    description=checkpoint_data["description"],
                )
                checkpoints.append(checkpoint)
            except (FileNotFoundError, json.JSONDecodeError, PermissionError) as e:
                self.formatter.format_warning(f"Error reading checkpoint file {checkpoint_file}: {str(e)}")

        # Sort by creation time (newest first)
        checkpoints.sort(key=lambda cp: cp.created_at, reverse=True)
        return checkpoints

    async def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint by ID"""
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"

        if not checkpoint_path.exists():
            self.formatter.format_error(f"Checkpoint {checkpoint_id} not found")
            return False

        try:
            checkpoint_path.unlink()
            self.formatter.format_success(f"Checkpoint {checkpoint_id} deleted successfully")
            return True
        except (IOError, PermissionError) as e:
            self.formatter.format_error(f"Failed to delete checkpoint {checkpoint_id}: {str(e)}")
            return False

    async def restore_checkpoint(self, checkpoint_id: str) -> Optional[ApplicationState]:
        """Restore a checkpoint and make it the current state"""
        state = await self.load_checkpoint(checkpoint_id)

        if state:
            # Save the restored state as the current state
            await self.save_current_state(state)
            self.formatter.format_success(f"Checkpoint {checkpoint_id} restored successfully")
            return state
        else:
            self.formatter.format_error(f"Failed to restore checkpoint {checkpoint_id}")
            return None

    async def get_state_info(self) -> Dict[str, Any]:
        """Get information about the current state and checkpoints"""
        info: Dict[str, Any] = {
            "state_file_exists": self.state_file.exists(),
            "state_file_size": 0,
            "state_file_modified": None,
            "backup_count": 0,
            "checkpoint_count": 0,
            "newest_checkpoint": None,
            "oldest_checkpoint": None,
        }

        # Get state file info
        if self.state_file.exists():
            stat = self.state_file.stat()
            info["state_file_size"] = stat.st_size
            info["state_file_modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()

        # Get backup count
        backup_files = list(self.backup_dir.glob("state_backup_*.json"))
        info["backup_count"] = len(backup_files)

        # Get checkpoint info
        checkpoints = await self.list_checkpoints()
        info["checkpoint_count"] = len(checkpoints)

        if checkpoints:
            info["newest_checkpoint"] = checkpoints[0].created_at
            info["oldest_checkpoint"] = checkpoints[-1].created_at

        return info

    async def cleanup_old_checkpoints(self, max_checkpoints: int = 10) -> int:
        """Remove old checkpoints, keeping only the most recent ones"""
        checkpoints = await self.list_checkpoints()

        if len(checkpoints) <= max_checkpoints:
            return 0

        # Sort by creation time (oldest first)
        checkpoints.sort(key=lambda cp: cp.created_at)

        # Remove excess checkpoints
        removed_count = 0
        while len(checkpoints) > max_checkpoints:
            oldest_checkpoint = checkpoints.pop(0)
            if await self.delete_checkpoint(oldest_checkpoint.id):
                removed_count += 1

        return removed_count
