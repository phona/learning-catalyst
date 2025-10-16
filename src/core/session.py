"""
Core session management for Learning Catalyst.

Provides comprehensive session lifecycle management, including creation,
activation, persistence, and restoration of learning sessions.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import threading
from collections import defaultdict

from .logging import get_logger
from ..core.models import SessionData, LearningPreferences
from ..core.exceptions import (
    SessionError, ValidationError, SessionNotFoundError,
    SessionExpiredError, SessionCorruptionError
)


@dataclass
class SessionInteraction:
    """Represents a single interaction within a session."""
    id: str
    timestamp: str
    type: str  # question, explanation, assessment, etc.
    content: str
    response: Optional[str] = None
    tokens_used: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SessionCheckpoint:
    """Represents a session checkpoint."""
    name: str
    session_id: str
    timestamp: str
    session_data: Dict[str, Any]
    description: Optional[str] = None


class Session:
    """
    Core session class managing learning session state and lifecycle.

    Handles session creation, state management, interaction tracking,
    and checkpoint creation/restoration.
    """

    def __init__(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        topic: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None,
        timeout_minutes: int = 120
    ):
        """
        Initialize a new session.

        Args:
            session_id: Unique session identifier (generated if not provided)
            user_id: User identifier
            topic: Learning topic
            preferences: Learning preferences
            timeout_minutes: Session timeout in minutes
        """
        self.logger = get_logger("session")

        # Core session properties
        self.id = session_id or str(uuid.uuid4())
        self.user_id = user_id
        self.topic = topic
        self.timeout_minutes = timeout_minutes

        # Session state
        self.is_active = False
        self.status = "created"  # created, active, paused, terminated
        self.started_at = datetime.now()
        self.last_activity = self.started_at
        self.ended_at: Optional[datetime] = None

        # Learning data
        self.session_data: Dict[str, Any] = {}
        self.interactions: List[SessionInteraction] = []
        self.concept_progress: Dict[str, float] = {}
        self.checkpoints: Dict[str, SessionCheckpoint] = {}

        # Context management
        self.context_items: List[Dict[str, Any]] = []
        self.context_tokens: int = 0
        self.context_limit: int = 4000  # Default token limit

        # Preferences and personalization
        self.preferences = LearningPreferences.from_dict(preferences or {})

        # Analytics and tracking
        self.total_interactions = 0
        self.tokens_used = 0
        self.learning_time_seconds = 0
        self.error_count = 0
        self.errors: List[Dict[str, Any]] = []

        # Threading lock for concurrent access
        self._lock = threading.RLock()

        self.logger.info(f"Session created: {self.id} for user {user_id}")

    def activate(self) -> None:
        """Activate the session."""
        with self._lock:
            if self.status == "terminated":
                raise SessionError("Cannot activate terminated session")

            self.is_active = True
            self.status = "active"
            self.last_activity = datetime.now()
            self.logger.info(f"Session activated: {self.id}")

    def pause(self) -> None:
        """Pause the session."""
        with self._lock:
            if self.status not in ["active", "created"]:
                raise SessionError(f"Cannot pause session in status: {self.status}")

            self.is_active = False
            self.status = "paused"
            self.logger.info(f"Session paused: {self.id}")

    def resume(self) -> None:
        """Resume a paused session."""
        with self._lock:
            if self.status != "paused":
                raise SessionError(f"Cannot resume session in status: {self.status}")

            self.is_active = True
            self.status = "active"
            self.last_activity = datetime.now()
            self.logger.info(f"Session resumed: {self.id}")

    def end_session(self) -> None:
        """End the session."""
        with self._lock:
            self.is_active = False
            self.status = "terminated"
            self.ended_at = datetime.now()
            self.logger.info(f"Session ended: {self.id}")

    def add_interaction(
        self,
        interaction_type: str,
        content: str,
        response: Optional[str] = None,
        tokens_used: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add an interaction to the session.

        Args:
            interaction_type: Type of interaction
            content: User input/content
            response: AI response
            tokens_used: Tokens used in this interaction
            metadata: Additional metadata

        Returns:
            Interaction ID
        """
        with self._lock:
            if not self.is_active:
                raise SessionError("Cannot add interaction to inactive session")

            if self.is_timed_out():
                raise SessionExpiredError(f"Session {self.id} has timed out")

            interaction_id = str(uuid.uuid4())
            interaction = SessionInteraction(
                id=interaction_id,
                timestamp=datetime.now().isoformat(),
                type=interaction_type,
                content=content,
                response=response,
                tokens_used=tokens_used,
                metadata=metadata
            )

            self.interactions.append(interaction)
            self.total_interactions += 1
            self.last_activity = datetime.now()

            if tokens_used:
                self.tokens_used += tokens_used

            # Update context if applicable
            if interaction_type in ["question", "explanation"]:
                self._add_to_context({
                    "type": interaction_type,
                    "content": content,
                    "response": response,
                    "timestamp": interaction.timestamp
                })

            self.logger.debug(f"Added interaction {interaction_id} to session {self.id}")
            return interaction_id

    def update_concept_progress(self, concept_id: str, progress: float) -> None:
        """
        Update progress for a specific concept.

        Args:
            concept_id: Concept identifier
            progress: Progress value (0.0 to 1.0)
        """
        with self._lock:
            if not 0.0 <= progress <= 1.0:
                raise ValidationError("progress", progress, "must be between 0.0 and 1.0")

            old_progress = self.concept_progress.get(concept_id, 0.0)
            self.concept_progress[concept_id] = progress

            # Update session data
            self.session_data.setdefault("concepts_covered", [])
            if concept_id not in self.session_data["concepts_covered"] and progress > 0:
                self.session_data["concepts_covered"].append(concept_id)

            self.last_activity = datetime.now()

            self.logger.debug(
                f"Updated concept {concept_id} progress: {old_progress:.2f} -> {progress:.2f}"
            )

    def create_checkpoint(self, name: str, description: Optional[str] = None) -> SessionCheckpoint:
        """
        Create a checkpoint of the current session state.

        Args:
            name: Checkpoint name
            description: Checkpoint description

        Returns:
            Created checkpoint
        """
        with self._lock:
            checkpoint = SessionCheckpoint(
                name=name,
                session_id=self.id,
                timestamp=datetime.now().isoformat(),
                session_data={
                    "session_data": self.session_data.copy(),
                    "concept_progress": self.concept_progress.copy(),
                    "interactions_count": len(self.interactions),
                    "total_tokens_used": self.tokens_used,
                    "learning_time_seconds": self.learning_time_seconds,
                    "context_items": self.context_items.copy()
                },
                description=description
            )

            self.checkpoints[name] = checkpoint
            self.logger.info(f"Created checkpoint '{name}' for session {self.id}")
            return checkpoint

    def restore_from_checkpoint(self, checkpoint_name: str) -> None:
        """
        Restore session state from a checkpoint.

        Args:
            checkpoint_name: Name of checkpoint to restore from
        """
        with self._lock:
            if checkpoint_name not in self.checkpoints:
                raise SessionNotFoundError(f"Checkpoint '{checkpoint_name}' not found")

            checkpoint = self.checkpoints[checkpoint_name]
            checkpoint_data = checkpoint.session_data

            # Restore session state
            self.session_data = checkpoint_data["session_data"].copy()
            self.concept_progress = checkpoint_data["concept_progress"].copy()
            self.context_items = checkpoint_data["context_items"].copy()

            # Update counters (don't reduce them)
            self.tokens_used = max(self.tokens_used, checkpoint_data["total_tokens_used"])
            self.learning_time_seconds = max(
                self.learning_time_seconds,
                checkpoint_data["learning_time_seconds"]
            )

            # Remove interactions after checkpoint (keep earlier ones)
            checkpoint_interaction_count = checkpoint_data["interactions_count"]
            if len(self.interactions) > checkpoint_interaction_count:
                self.interactions = self.interactions[:checkpoint_interaction_count]
                self.total_interactions = len(self.interactions)

            self.last_activity = datetime.now()
            self.logger.info(f"Restored session {self.id} from checkpoint '{checkpoint_name}'")

    def set_context(self, context: Dict[str, Any]) -> None:
        """Set the learning context."""
        with self._lock:
            self.session_data["context"] = context
            self.last_activity = datetime.now()

    def get_context(self) -> Dict[str, Any]:
        """Get the current learning context."""
        return self.session_data.get("context", {})

    def update_context(self, updates: Dict[str, Any]) -> None:
        """Update the learning context."""
        with self._lock:
            current_context = self.get_context()
            current_context.update(updates)
            self.set_context(current_context)

    def add_context_item(self, item: Dict[str, Any]) -> None:
        """
        Add an item to the session context.

        Args:
            item: Context item to add
        """
        with self._lock:
            # Add timestamp if not present
            if "timestamp" not in item:
                item["timestamp"] = datetime.now().isoformat()

            self.context_items.append(item)

            # Estimate tokens (rough approximation: ~4 tokens per word)
            item_text = str(item.get("content", "")) + str(item.get("response", ""))
            estimated_tokens = len(item_text.split()) * 4
            self.context_tokens += estimated_tokens

            # Check if context compression is needed
            if self.context_tokens > self.context_limit:
                self._compress_context()

            self.last_activity = datetime.now()

    def is_timed_out(self) -> bool:
        """Check if the session has timed out."""
        if not self.is_active:
            return False

        time_since_activity = datetime.now() - self.last_activity
        timeout_threshold = timedelta(minutes=self.timeout_minutes)
        return time_since_activity > timeout_threshold

    def get_duration(self) -> timedelta:
        """Get the session duration."""
        end_time = self.ended_at or datetime.now()
        return end_time - self.started_at

    def get_interaction_statistics(self) -> Dict[str, Any]:
        """Get interaction statistics for the session."""
        stats = {
            "total_interactions": len(self.interactions),
            "total_tokens_used": self.tokens_used,
            "learning_time_seconds": self.learning_time_seconds
        }

        # Count by interaction type
        type_counts = defaultdict(int)
        for interaction in self.interactions:
            type_counts[interaction.type] += 1

        stats.update({
            f"{interaction_type}_count": count
            for interaction_type, count in type_counts.items()
        })

        return stats

    def get_concept_progress(self, concept_id: str) -> float:
        """Get progress for a specific concept."""
        return self.concept_progress.get(concept_id, 0.0)

    def add_error(self, error_info: Dict[str, Any]) -> None:
        """
        Add an error to the session error log.

        Args:
            error_info: Error information
        """
        with self._lock:
            if "timestamp" not in error_info:
                error_info["timestamp"] = datetime.now().isoformat()

            self.errors.append(error_info)
            self.error_count += 1
            self.logger.warning(f"Added error to session {self.id}: {error_info.get('error_type')}")

    def optimize_memory(self) -> None:
        """Optimize memory usage by compressing old interactions."""
        with self._lock:
            if len(self.interactions) <= 50:
                return

            # Keep recent 30 interactions and summarize older ones
            recent_interactions = self.interactions[-30:]
            older_interactions = self.interactions[:-30]

            # Create summary of older interactions
            if older_interactions:
                summary = {
                    "type": "summary",
                    "content": f"Summarized {len(older_interactions)} earlier interactions",
                    "interaction_count": len(older_interactions),
                    "tokens_used": sum(i.tokens_used or 0 for i in older_interactions),
                    "timestamp": older_interactions[0].timestamp
                }
                self.interactions = [summary] + recent_interactions
                self.logger.info(f"Optimized session {self.id} memory: {len(older_interactions)} interactions summarized")

    def _add_to_context(self, item: Dict[str, Any]) -> None:
        """Add item to context with size management."""
        self.context_items.append(item)

        # Estimate tokens for this item
        item_text = str(item.get("content", "")) + str(item.get("response", ""))
        estimated_tokens = len(item_text.split()) * 4
        self.context_tokens += estimated_tokens

        # Check if we need to compress context
        if self.context_tokens > self.context_limit:
            self._compress_context()

    def _compress_context(self) -> None:
        """Compress context to stay within token limits."""
        if len(self.context_items) <= 2:
            return

        # Keep recent items and summarize older ones
        recent_items = self.context_items[-2:]
        older_items = self.context_items[:-2]

        # Create summary of older items
        summary_item = {
            "type": "context_summary",
            "content": f"Summarized {len(older_items)} earlier context items",
            "item_count": len(older_items),
            "timestamp": datetime.now().isoformat()
        }

        self.context_items = [summary_item] + recent_items

        # Recalculate tokens (rough estimate)
        self.context_tokens = sum(
            len(str(item.get("content", "")).split()) * 4
            for item in self.context_items
        )

        self.logger.info(f"Compressed context for session {self.id}: {len(older_items)} items summarized")

    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary representation."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "topic": self.topic,
            "status": self.status,
            "is_active": self.is_active,
            "started_at": self.started_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "timeout_minutes": self.timeout_minutes,
            "session_data": self.session_data,
            "interactions": [asdict(interaction) for interaction in self.interactions],
            "concept_progress": self.concept_progress,
            "checkpoints": {
                name: asdict(checkpoint)
                for name, checkpoint in self.checkpoints.items()
            },
            "context_items": self.context_items,
            "context_tokens": self.context_tokens,
            "context_limit": self.context_limit,
            "preferences": asdict(self.preferences),
            "total_interactions": self.total_interactions,
            "tokens_used": self.tokens_used,
            "learning_time_seconds": self.learning_time_seconds,
            "error_count": self.error_count,
            "errors": self.errors
        }

    def to_json(self) -> str:
        """Convert session to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Session':
        """Create session from dictionary."""
        session = cls(
            session_id=data["id"],
            user_id=data.get("user_id"),
            topic=data.get("topic"),
            preferences=data.get("preferences"),
            timeout_minutes=data.get("timeout_minutes", 120)
        )

        # Restore state
        session.status = data["status"]
        session.is_active = data["is_active"]
        session.started_at = datetime.fromisoformat(data["started_at"])
        session.last_activity = datetime.fromisoformat(data["last_activity"])
        if data.get("ended_at"):
            session.ended_at = datetime.fromisoformat(data["ended_at"])

        # Restore data
        session.session_data = data.get("session_data", {})
        session.concept_progress = data.get("concept_progress", {})
        session.context_items = data.get("context_items", [])
        session.context_tokens = data.get("context_tokens", 0)
        session.context_limit = data.get("context_limit", 4000)
        session.total_interactions = data.get("total_interactions", 0)
        session.tokens_used = data.get("tokens_used", 0)
        session.learning_time_seconds = data.get("learning_time_seconds", 0)
        session.error_count = data.get("error_count", 0)
        session.errors = data.get("errors", [])

        # Restore interactions
        interactions_data = data.get("interactions", [])
        session.interactions = [
            SessionInteraction(**interaction_data)
            for interaction_data in interactions_data
        ]

        # Restore checkpoints
        checkpoints_data = data.get("checkpoints", {})
        session.checkpoints = {
            name: SessionCheckpoint(**checkpoint_data)
            for name, checkpoint_data in checkpoints_data.items()
        }

        return session

    @classmethod
    def from_json(cls, json_str: str) -> 'Session':
        """Create session from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)


class SessionManager:
    """
    High-level session management interface.

    Manages multiple sessions, handles persistence, and provides
    session lifecycle operations.
    """

    def __init__(self, timeout_minutes: int = 120):
        """
        Initialize session manager.

        Args:
            timeout_minutes: Default session timeout in minutes
        """
        self.logger = get_logger("session_manager")
        self.timeout_minutes = timeout_minutes
        self.sessions: Dict[str, Session] = {}
        self.active_sessions: Dict[str, str] = {}  # user_id -> session_id
        self._lock = threading.RLock()

    async def create_session(
        self,
        user_id: str,
        topic: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new session.

        Args:
            user_id: User identifier
            topic: Learning topic
            preferences: Learning preferences
            session_id: Optional session ID

        Returns:
            Creation result with session ID
        """
        with self._lock:
            # Check if user already has an active session
            if user_id in self.active_sessions:
                existing_session_id = self.active_sessions[user_id]
                if existing_session_id in self.sessions:
                    existing_session = self.sessions[existing_session_id]
                    if existing_session.is_active:
                        return {
                            "success": False,
                            "error": {
                                "code": "active_session_exists",
                                "message": f"User {user_id} already has active session {existing_session_id}"
                            }
                        }

            # Create new session
            session = Session(
                session_id=session_id,
                user_id=user_id,
                topic=topic,
                preferences=preferences,
                timeout_minutes=self.timeout_minutes
            )

            self.sessions[session.id] = session

            # Auto-activate the session
            session.activate()
            self.active_sessions[user_id] = session.id

            self.logger.info(f"Created session {session.id} for user {user_id}")

            return {
                "success": True,
                "session_id": session.id,
                "session": session.to_dict()
            }

    async def get_session(self, session_id: str) -> Dict[str, Any]:
        """
        Get session by ID.

        Args:
            session_id: Session identifier

        Returns:
            Session data
        """
        with self._lock:
            if session_id not in self.sessions:
                return {
                    "success": False,
                    "error": {
                        "code": "session_not_found",
                        "message": f"Session {session_id} not found"
                    }
                }

            session = self.sessions[session_id]

            # Check if session is timed out
            if session.is_timed_out():
                session.pause()
                return {
                    "success": False,
                    "error": {
                        "code": "session_expired",
                        "message": f"Session {session_id} has expired"
                    }
                }

            return {
                "success": True,
                "session": session.to_dict()
            }

    async def activate_session(self, session_id: str) -> Dict[str, Any]:
        """
        Activate a session.

        Args:
            session_id: Session identifier

        Returns:
            Activation result
        """
        with self._lock:
            result = await self.get_session(session_id)
            if not result["success"]:
                return result

            session = self.sessions[session_id]
            user_id = session.user_id

            # Deactivate any other active sessions for this user
            if user_id in self.active_sessions and self.active_sessions[user_id] != session_id:
                old_session_id = self.active_sessions[user_id]
                if old_session_id in self.sessions:
                    old_session = self.sessions[old_session_id]
                    old_session.pause()

            # Activate this session
            session.activate()
            self.active_sessions[user_id] = session_id

            return {
                "success": True,
                "session": session.to_dict()
            }

    async def pause_session(self, session_id: str) -> Dict[str, Any]:
        """
        Pause a session.

        Args:
            session_id: Session identifier

        Returns:
            Pause result
        """
        with self._lock:
            result = await self.get_session(session_id)
            if not result["success"]:
                return result

            session = self.sessions[session_id]
            session.pause()

            # Remove from active sessions if it was active
            if session.user_id in self.active_sessions and self.active_sessions[session.user_id] == session_id:
                del self.active_sessions[session.user_id]

            return {
                "success": True,
                "session": session.to_dict()
            }

    async def resume_session(self, session_id: str) -> Dict[str, Any]:
        """
        Resume a paused session.

        Args:
            session_id: Session identifier

        Returns:
            Resume result
        """
        with self._lock:
            result = await self.get_session(session_id)
            if not result["success"]:
                return result

            session = self.sessions[session_id]

            # Check if session is expired
            if session.is_timed_out():
                return {
                    "success": False,
                    "error": {
                        "code": "session_expired",
                        "message": f"Session {session_id} has expired and cannot be resumed"
                    }
                }

            session.resume()
            self.active_sessions[session.user_id] = session_id

            return {
                "success": True,
                "session": session.to_dict()
            }

    async def terminate_session(self, session_id: str) -> Dict[str, Any]:
        """
        Terminate a session.

        Args:
            session_id: Session identifier

        Returns:
            Termination result
        """
        with self._lock:
            result = await self.get_session(session_id)
            if not result["success"]:
                return result

            session = self.sessions[session_id]
            session.end_session()

            # Remove from active sessions
            if session.user_id in self.active_sessions and self.active_sessions[session.user_id] == session_id:
                del self.active_sessions[session.user_id]

            return {
                "success": True,
                "session": session.to_dict()
            }

    async def list_user_sessions(self, user_id: str) -> Dict[str, Any]:
        """
        List all sessions for a user.

        Args:
            user_id: User identifier

        Returns:
            List of user sessions
        """
        with self._lock:
            user_sessions = []
            for session in self.sessions.values():
                if session.user_id == user_id:
                    user_sessions.append(session.to_dict())

            # Sort by last activity (most recent first)
            user_sessions.sort(
                key=lambda s: datetime.fromisoformat(s["last_activity"]),
                reverse=True
            )

            return {
                "success": True,
                "sessions": user_sessions
            }

    async def get_active_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get active sessions for a user.

        Args:
            user_id: User identifier

        Returns:
            List of active sessions
        """
        with self._lock:
            if user_id not in self.active_sessions:
                return []

            session_id = self.active_sessions[user_id]
            if session_id in self.sessions:
                session = self.sessions[session_id]
                if session.is_active and not session.is_timed_out():
                    return [session.to_dict()]

            return []

    async def update_session_progress(
        self,
        session_id: str,
        current_concept: Optional[str] = None,
        progress: Optional[float] = None,
        interaction_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update session progress.

        Args:
            session_id: Session identifier
            current_concept: Current concept being learned
            progress: Progress value (0.0 to 1.0)
            interaction_count: Number of interactions

        Returns:
            Update result
        """
        with self._lock:
            result = await self.get_session(session_id)
            if not result["success"]:
                return result

            session = self.sessions[session_id]

            if current_concept:
                session.update_context({"current_concept": current_concept})

            if progress is not None and current_concept:
                session.update_concept_progress(current_concept, progress)

            if interaction_count is not None:
                session.total_interactions = max(session.total_interactions, interaction_count)

            return {
                "success": True,
                "session": session.to_dict()
            }

    async def cleanup_expired_sessions(self) -> Dict[str, Any]:
        """
        Clean up expired sessions.

        Returns:
            Cleanup result
        """
        with self._lock:
            expired_sessions = []

            for session_id, session in self.sessions.items():
                if session.is_timed_out():
                    session.pause()
                    expired_sessions.append(session_id)

                    # Remove from active sessions
                    if session.user_id in self.active_sessions and self.active_sessions[session.user_id] == session_id:
                        del self.active_sessions[session.user_id]

            self.logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")

            return {
                "success": True,
                "expired_sessions": expired_sessions,
                "count": len(expired_sessions)
            }

    def get_session_count(self) -> int:
        """Get total number of sessions."""
        return len(self.sessions)

    def get_active_session_count(self) -> int:
        """Get number of active sessions."""
        return len(self.active_sessions)