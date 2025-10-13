"""
Context management for Learning Catalyst AI agents.

Simple context storage and management following "less is more" principle.
"""

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class LearningContext:
    """Context for learning sessions."""
    session_id: str
    user_id: Optional[str] = None
    current_topic: Optional[str] = None
    recent_topics: List[str] = None
    learning_goals: List[str] = None
    learning_style: Optional[str] = None
    difficulty_preference: str = "medium"
    interaction_count: int = 0
    session_start_time: float = None
    last_interaction_time: float = None

    def __post_init__(self):
        if self.recent_topics is None:
            self.recent_topics = []
        if self.learning_goals is None:
            self.learning_goals = []
        if self.session_start_time is None:
            self.session_start_time = time.time()
        if self.last_interaction_time is None:
            self.last_interaction_time = time.time()


class ContextManager:
    """Simple context manager for AI agents."""

    def __init__(self, storage_path: Optional[str] = None):
        """Initialize context manager.

        Args:
            storage_path: Path to store context files (optional)
        """
        self.storage_path = Path(storage_path) if storage_path else None
        self._active_sessions: Dict[str, LearningContext] = {}
        self._context_cache: Dict[str, Any] = {}

    def create_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> LearningContext:
        """Create a new learning session.

        Args:
            session_id: Unique session identifier
            user_id: User identifier (optional)
            initial_context: Initial context data (optional)

        Returns:
            LearningContext object
        """
        context = LearningContext(
            session_id=session_id,
            user_id=user_id
        )

        # Apply initial context if provided
        if initial_context:
            self._apply_initial_context(context, initial_context)

        self._active_sessions[session_id] = context
        return context

    def get_session(self, session_id: str) -> Optional[LearningContext]:
        """Get an active session context.

        Args:
            session_id: Session identifier

        Returns:
            LearningContext or None if not found
        """
        return self._active_sessions.get(session_id)

    def update_session(self, session_id: str, **updates) -> bool:
        """Update session context.

        Args:
            session_id: Session identifier
            **updates: Context fields to update

        Returns:
            True if updated, False if session not found
        """
        context = self._active_sessions.get(session_id)
        if not context:
            return False

        # Update fields
        for key, value in updates.items():
            if hasattr(context, key):
                setattr(context, key, value)

        # Always update last interaction time
        context.last_interaction_time = time.time()
        context.interaction_count += 1

        return True

    def add_topic(self, session_id: str, topic: str) -> bool:
        """Add a topic to the session.

        Args:
            session_id: Session identifier
            topic: Topic to add

        Returns:
            True if added, False if session not found
        """
        context = self._active_sessions.get(session_id)
        if not context:
            return False

        # Update current topic
        context.current_topic = topic

        # Add to recent topics if not already there
        if topic not in context.recent_topics:
            context.recent_topics.append(topic)
            # Keep only last 10 topics
            if len(context.recent_topics) > 10:
                context.recent_topics = context.recent_topics[-10:]

        # Update interaction metadata
        context.last_interaction_time = time.time()
        context.interaction_count += 1

        return True

    def add_learning_goal(self, session_id: str, goal: str) -> bool:
        """Add a learning goal to the session.

        Args:
            session_id: Session identifier
            goal: Learning goal to add

        Returns:
            True if added, False if session not found
        """
        context = self._active_sessions.get(session_id)
        if not context:
            return False

        if goal not in context.learning_goals:
            context.learning_goals.append(goal)

        return True

    def get_context_for_agents(self, session_id: str) -> Dict[str, Any]:
        """Get context formatted for agent consumption.

        Args:
            session_id: Session identifier

        Returns:
            Dictionary with context information
        """
        context = self._active_sessions.get(session_id)
        if not context:
            return {}

        # Convert to dictionary and add derived information
        context_dict = asdict(context)

        # Add session duration
        session_duration = time.time() - context.session_start_time
        context_dict["session_duration_minutes"] = int(session_duration / 60)

        # Add time since last interaction
        time_since_last = time.time() - context.last_interaction_time
        context_dict["minutes_since_last_interaction"] = int(time_since_last / 60)

        # Add conversation summary if available
        if session_id in self._context_cache:
            context_dict["conversation_summary"] = self._context_cache[session_id]

        return context_dict

    def save_session(self, session_id: str) -> bool:
        """Save session context to storage.

        Args:
            session_id: Session identifier

        Returns:
            True if saved, False if failed
        """
        if not self.storage_path:
            return False

        context = self._active_sessions.get(session_id)
        if not context:
            return False

        try:
            # Ensure storage directory exists
            self.storage_path.mkdir(parents=True, exist_ok=True)

            # Save to file
            filename = f"session_{session_id}.json"
            filepath = self.storage_path / filename

            with open(filepath, 'w') as f:
                json.dump(asdict(context), f, indent=2)

            return True
        except Exception:
            return False

    def load_session(self, session_id: str) -> Optional[LearningContext]:
        """Load session context from storage.

        Args:
            session_id: Session identifier

        Returns:
            LearningContext or None if not found
        """
        if not self.storage_path:
            return None

        try:
            filename = f"session_{session_id}.json"
            filepath = self.storage_path / filename

            if not filepath.exists():
                return None

            with open(filepath, 'r') as f:
                data = json.load(f)

            context = LearningContext(**data)
            self._active_sessions[session_id] = context
            return context

        except Exception:
            return None

    def set_cache(self, key: str, value: Any):
        """Set a value in the context cache.

        Args:
            key: Cache key
            value: Value to cache
        """
        self._context_cache[key] = value

    def get_cache(self, key: str, default: Any = None) -> Any:
        """Get a value from the context cache.

        Args:
            key: Cache key
            default: Default value if not found

        Returns:
            Cached value or default
        """
        return self._context_cache.get(key, default)

    def clear_cache(self, key: Optional[str] = None):
        """Clear context cache.

        Args:
            key: Specific key to clear, or None to clear all
        """
        if key:
            self._context_cache.pop(key, None)
        else:
            self._context_cache.clear()

    def end_session(self, session_id: str) -> bool:
        """End a session and optionally save it.

        Args:
            session_id: Session identifier

        Returns:
            True if session ended, False if not found
        """
        if session_id in self._active_sessions:
            # Try to save before ending
            self.save_session(session_id)
            # Remove from active sessions
            del self._active_sessions[session_id]
            # Clear related cache
            self.clear_cache(session_id)
            return True
        return False

    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs.

        Returns:
            List of active session IDs
        """
        return list(self._active_sessions.keys())

    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """Clean up old inactive sessions.

        Args:
            max_age_hours: Maximum age in hours before cleanup

        Returns:
            Number of sessions cleaned up
        """
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        sessions_to_remove = []

        for session_id, context in self._active_sessions.items():
            age = current_time - context.last_interaction_time
            if age > max_age_seconds:
                sessions_to_remove.append(session_id)

        for session_id in sessions_to_remove:
            self.end_session(session_id)

        return len(sessions_to_remove)

    def _apply_initial_context(self, context: LearningContext, initial_context: Dict[str, Any]):
        """Apply initial context to a new session."""
        for key, value in initial_context.items():
            if hasattr(context, key):
                setattr(context, key, value)