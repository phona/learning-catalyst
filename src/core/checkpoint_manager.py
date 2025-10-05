"""
Checkpoint Manager implementation
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from . import CheckpointManager


class CheckpointManagerImpl(CheckpointManager):
    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.checkpoints_dir = self.workspace_path / ".catalyst" / "checkpoints"
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)

    async def create_checkpoint(self, state: Dict[str, Any]) -> str:
        """Create a checkpoint from current application state"""
        checkpoint_id = f"checkpoint_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(state)) % 10000:04d}"
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"

        checkpoint_data = {
            "id": checkpoint_id,
            "created_at": datetime.now().isoformat(),
            "state": state
        }

        with open(checkpoint_path, 'w', encoding='utf-8') as f:
            json.dump(checkpoint_data, f, indent=2)

        return checkpoint_id

    async def load_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """Load application state from checkpoint"""
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"

        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint {checkpoint_id} not found")

        with open(checkpoint_path, 'r', encoding='utf-8') as f:
            checkpoint_data = json.load(f)

        return checkpoint_data.get("state", {})

    async def list_checkpoints(self) -> List[Dict[str, Any]]:
        """List available checkpoints for user"""
        checkpoints = []

        for checkpoint_file in self.checkpoints_dir.glob("*.json"):
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
                checkpoints.append({
                    "id": checkpoint_data.get("id"),
                    "created_at": checkpoint_data.get("created_at"),
                    "description": checkpoint_data.get("description", "No description")
                })

        # Sort by creation time, newest first
        checkpoints.sort(key=lambda x: x["created_at"], reverse=True)
        return checkpoints
