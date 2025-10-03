"""
State Manager implementation for Learning Catalyst
Handles the mechanics of automatically saving the application state on exit
and seamlessly loading it on launch for the Catalyst Agent to interpret.
Manages manual checkpoints.
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
from dataclasses import dataclass


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


class StateManager:
    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.learningspace_path = self.workspace_path / ".learningspace"
        self.checkpoints_dir = self.learningspace_path / "checkpoints"
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.learningspace_path / "current_state.json"

    async def save_current_state(self, state: ApplicationState) -> None:
        """Automatically save current application state"""
        state_dict = {
            "user_profile": state.user_profile,
            "conversation_context": state.conversation_context,
            "conversation_messages": state.conversation_messages,
            "current_state_metadata": state.current_state_metadata,
            "saved_at": datetime.now().isoformat()
        }
        
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(state_dict, f, indent=2, ensure_ascii=False)
    
    async def load_last_state(self) -> Optional[ApplicationState]:
        """Load the last saved application state on startup"""
        if not self.state_file.exists():
            return None
            
        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                state_dict = json.load(f)
            
            return ApplicationState(
                user_profile=state_dict.get("user_profile", {}),
                conversation_context=state_dict.get("conversation_context", {}),
                conversation_messages=state_dict.get("conversation_messages", []),
                current_state_metadata=state_dict.get("current_state_metadata", {})
            )
        except Exception as e:
            print(f"Error loading state: {e}")
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
            "saved_at": datetime.now().isoformat()
        }
        
        checkpoint_data = {
            "id": checkpoint_id,
            "user_id": state.current_state_metadata.get("user_id", "default"),
            "state_data": json.dumps(state_dict),
            "created_at": datetime.now().isoformat(),
            "description": description
        }
        
        with open(checkpoint_path, 'w', encoding='utf-8') as f:
            json.dump(checkpoint_data, f, indent=2)
        
        return Checkpoint(
            id=checkpoint_id,
            user_id=checkpoint_data["user_id"],
            state_data=checkpoint_data["state_data"],
            created_at=checkpoint_data["created_at"],
            description=checkpoint_data["description"]
        )

    async def load_checkpoint(self, checkpoint_id: str) -> Optional[ApplicationState]:
        """Load application state from a named checkpoint"""
        checkpoint_path = self.checkpoints_dir / f"{checkpoint_id}.json"
        
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint {checkpoint_id} not found")
        
        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
            
            state_dict = json.loads(checkpoint_data["state_data"])
            
            return ApplicationState(
                user_profile=state_dict.get("user_profile", {}),
                conversation_context=state_dict.get("conversation_context", {}),
                conversation_messages=state_dict.get("conversation_messages", []),
                current_state_metadata=state_dict.get("current_state_metadata", {})
            )
        except Exception as e:
            print(f"Error loading checkpoint {checkpoint_id}: {e}")
            return None

    async def list_checkpoints(self) -> List[Checkpoint]:
        """List available checkpoints for user"""
        checkpoints = []
        
        for checkpoint_file in self.checkpoints_dir.glob("*.json"):
            try:
                with open(checkpoint_file, 'r', encoding='utf-8') as f:
                    checkpoint_data = json.load(f)
                
                checkpoint = Checkpoint(
                    id=checkpoint_data["id"],
                    user_id=checkpoint_data["user_id"],
                    state_data=checkpoint_data["state_data"],
                    created_at=checkpoint_data["created_at"],
                    description=checkpoint_data["description"]
                )
                checkpoints.append(checkpoint)
            except Exception as e:
                print(f"Error reading checkpoint file {checkpoint_file}: {e}")
        
        # Sort by creation time (newest first)
        checkpoints.sort(key=lambda cp: cp.created_at, reverse=True)
        return checkpoints