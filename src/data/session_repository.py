"""
Session repository for Learning Catalyst.

Handles persistence and retrieval of session data from the database.
Provides a clean interface for session storage operations.
"""

import json
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path

from ..core.logging import get_logger
from ..core.session import Session, SessionManager
from ..core.exceptions import (
    DatabaseError, SessionNotFoundError, SessionCorruptionError,
    ValidationError
)


class SessionRepository:
    """
    Repository for session persistence operations.

    Handles database operations for sessions, including creation,
    retrieval, updating, and deletion.
    """

    def __init__(self, db_path: Union[str, Path] = "learning_catalyst.db"):
        """
        Initialize session repository.

        Args:
            db_path: Path to SQLite database file
        """
        self.logger = get_logger("session_repository")
        self.db_path = Path(db_path)
        self._lock = threading.RLock()

        # Initialize database
        self._initialize_database()

    def _initialize_database(self) -> None:
        """Initialize the database with required tables."""
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    # Sessions table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS sessions (
                            id TEXT PRIMARY KEY,
                            user_id TEXT NOT NULL,
                            topic TEXT,
                            status TEXT NOT NULL,
                            is_active BOOLEAN NOT NULL,
                            started_at TEXT NOT NULL,
                            last_activity TEXT NOT NULL,
                            ended_at TEXT,
                            timeout_minutes INTEGER NOT NULL,
                            session_data TEXT,
                            concept_progress TEXT,
                            context_items TEXT,
                            context_tokens INTEGER DEFAULT 0,
                            context_limit INTEGER DEFAULT 4000,
                            preferences TEXT,
                            total_interactions INTEGER DEFAULT 0,
                            tokens_used INTEGER DEFAULT 0,
                            learning_time_seconds INTEGER DEFAULT 0,
                            error_count INTEGER DEFAULT 0,
                            errors TEXT,
                            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                        )
                    """)

                    # Session interactions table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS session_interactions (
                            id TEXT PRIMARY KEY,
                            session_id TEXT NOT NULL,
                            timestamp TEXT NOT NULL,
                            type TEXT NOT NULL,
                            content TEXT NOT NULL,
                            response TEXT,
                            tokens_used INTEGER,
                            metadata TEXT,
                            FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
                        )
                    """)

                    # Session checkpoints table
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS session_checkpoints (
                            name TEXT,
                            session_id TEXT NOT NULL,
                            timestamp TEXT NOT NULL,
                            session_data TEXT NOT NULL,
                            description TEXT,
                            PRIMARY KEY (name, session_id),
                            FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
                        )
                    """)

                    # Create indexes for performance
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions (last_activity)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interactions_session_id ON session_interactions (session_id)")
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON session_interactions (timestamp)")

                    conn.commit()
                    self.logger.info("Database initialized successfully")

            except sqlite3.Error as e:
                self.logger.error(f"Failed to initialize database: {e}")
                raise DatabaseError(f"Database initialization failed: {e}")

    async def save_session(self, session: Session) -> Dict[str, Any]:
        """
        Save a session to the database.

        Args:
            session: Session to save

        Returns:
            Save result
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    # Prepare session data
                    session_dict = session.to_dict()

                    # Convert complex objects to JSON
                    session_data_json = json.dumps(session_dict["session_data"])
                    concept_progress_json = json.dumps(session_dict["concept_progress"])
                    context_items_json = json.dumps(session_dict["context_items"])
                    preferences_json = json.dumps(session_dict["preferences"])
                    errors_json = json.dumps(session_dict["errors"])

                    # Upsert session
                    cursor.execute("""
                        INSERT OR REPLACE INTO sessions (
                            id, user_id, topic, status, is_active,
                            started_at, last_activity, ended_at, timeout_minutes,
                            session_data, concept_progress, context_items,
                            context_tokens, context_limit, preferences,
                            total_interactions, tokens_used, learning_time_seconds,
                            error_count, errors, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        session.id,
                        session.user_id,
                        session.topic,
                        session.status,
                        session.is_active,
                        session.started_at.isoformat(),
                        session.last_activity.isoformat(),
                        session.ended_at.isoformat() if session.ended_at else None,
                        session.timeout_minutes,
                        session_data_json,
                        concept_progress_json,
                        context_items_json,
                        session.context_tokens,
                        session.context_limit,
                        preferences_json,
                        session.total_interactions,
                        session.tokens_used,
                        session.learning_time_seconds,
                        session.error_count,
                        errors_json,
                        datetime.now().isoformat()
                    ))

                    # Save interactions
                    # First, delete existing interactions for this session
                    cursor.execute("DELETE FROM session_interactions WHERE session_id = ?", (session.id,))

                    # Insert current interactions
                    for interaction in session.interactions:
                        interaction_dict = interaction.__dict__ if hasattr(interaction, '__dict__') else interaction
                        metadata_json = json.dumps(interaction_dict.get("metadata", {}))

                        cursor.execute("""
                            INSERT INTO session_interactions (
                                id, session_id, timestamp, type, content,
                                response, tokens_used, metadata
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            interaction_dict["id"],
                            session.id,
                            interaction_dict["timestamp"],
                            interaction_dict["type"],
                            interaction_dict["content"],
                            interaction_dict.get("response"),
                            interaction_dict.get("tokens_used"),
                            metadata_json
                        ))

                    # Save checkpoints
                    # First, delete existing checkpoints for this session
                    cursor.execute("DELETE FROM session_checkpoints WHERE session_id = ?", (session.id,))

                    # Insert current checkpoints
                    for checkpoint_name, checkpoint in session.checkpoints.items():
                        checkpoint_dict = checkpoint.__dict__ if hasattr(checkpoint, '__dict__') else checkpoint
                        checkpoint_data_json = json.dumps(checkpoint_dict["session_data"])

                        cursor.execute("""
                            INSERT INTO session_checkpoints (
                                name, session_id, timestamp, session_data, description
                            ) VALUES (?, ?, ?, ?, ?)
                        """, (
                            checkpoint_name,
                            session.id,
                            checkpoint_dict["timestamp"],
                            checkpoint_data_json,
                            checkpoint_dict.get("description")
                        ))

                    conn.commit()
                    self.logger.info(f"Saved session {session.id} to database")

                    return {
                        "success": True,
                        "session_id": session.id
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to save session {session.id}: {e}")
                raise DatabaseError(f"Failed to save session: {e}")

    async def load_session(self, session_id: str) -> Dict[str, Any]:
        """
        Load a session from the database.

        Args:
            session_id: Session identifier

        Returns:
            Load result with session data
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    # Load session basic data
                    cursor.execute("""
                        SELECT * FROM sessions WHERE id = ?
                    """, (session_id,))

                    row = cursor.fetchone()
                    if not row:
                        return {
                            "success": False,
                            "error": {
                                "code": "session_not_found",
                                "message": f"Session {session_id} not found in database"
                            }
                        }

                    # Convert row to dictionary
                    columns = [desc[0] for desc in cursor.description]
                    session_data = dict(zip(columns, row))

                    # Load interactions
                    cursor.execute("""
                        SELECT * FROM session_interactions WHERE session_id = ?
                        ORDER BY timestamp
                    """, (session_id,))

                    interactions = []
                    for interaction_row in cursor.fetchall():
                        interaction_columns = [desc[0] for desc in cursor.description]
                        interaction_dict = dict(zip(interaction_columns, interaction_row))

                        # Parse metadata JSON
                        if interaction_dict["metadata"]:
                            interaction_dict["metadata"] = json.loads(interaction_dict["metadata"])

                        interactions.append(interaction_dict)

                    # Load checkpoints
                    cursor.execute("""
                        SELECT * FROM session_checkpoints WHERE session_id = ?
                        ORDER BY timestamp
                    """, (session_id,))

                    checkpoints = {}
                    for checkpoint_row in cursor.fetchall():
                        checkpoint_columns = [desc[0] for desc in cursor.description]
                        checkpoint_dict = dict(zip(checkpoint_columns, checkpoint_row))

                        # Parse session_data JSON
                        checkpoint_dict["session_data"] = json.loads(checkpoint_dict["session_data"])

                        checkpoints[checkpoint_dict["name"]] = checkpoint_dict

                    # Build complete session data
                    complete_session_data = {
                        "id": session_data["id"],
                        "user_id": session_data["user_id"],
                        "topic": session_data["topic"],
                        "status": session_data["status"],
                        "is_active": bool(session_data["is_active"]),
                        "started_at": session_data["started_at"],
                        "last_activity": session_data["last_activity"],
                        "ended_at": session_data["ended_at"],
                        "timeout_minutes": session_data["timeout_minutes"],
                        "session_data": json.loads(session_data["session_data"]),
                        "concept_progress": json.loads(session_data["concept_progress"]),
                        "context_items": json.loads(session_data["context_items"]),
                        "context_tokens": session_data["context_tokens"],
                        "context_limit": session_data["context_limit"],
                        "preferences": json.loads(session_data["preferences"]),
                        "total_interactions": session_data["total_interactions"],
                        "tokens_used": session_data["tokens_used"],
                        "learning_time_seconds": session_data["learning_time_seconds"],
                        "error_count": session_data["error_count"],
                        "errors": json.loads(session_data["errors"]),
                        "interactions": interactions,
                        "checkpoints": checkpoints
                    }

                    self.logger.info(f"Loaded session {session_id} from database")

                    return {
                        "success": True,
                        "session": complete_session_data
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to load session {session_id}: {e}")
                raise DatabaseError(f"Failed to load session: {e}")

    async def delete_session(self, session_id: str) -> Dict[str, Any]:
        """
        Delete a session from the database.

        Args:
            session_id: Session identifier

        Returns:
            Delete result
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    # Delete session (cascades to interactions and checkpoints)
                    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))

                    rows_affected = cursor.rowcount
                    conn.commit()

                    if rows_affected == 0:
                        return {
                            "success": False,
                            "error": {
                                "code": "session_not_found",
                                "message": f"Session {session_id} not found in database"
                            }
                        }

                    self.logger.info(f"Deleted session {session_id} from database")

                    return {
                        "success": True,
                        "session_id": session_id
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to delete session {session_id}: {e}")
                raise DatabaseError(f"Failed to delete session: {e}")

    async def list_user_sessions(self, user_id: str, limit: int = 50) -> Dict[str, Any]:
        """
        List all sessions for a user.

        Args:
            user_id: User identifier
            limit: Maximum number of sessions to return

        Returns:
            List of user sessions
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    cursor.execute("""
                        SELECT id, topic, status, is_active, started_at, last_activity,
                               total_interactions, tokens_used, learning_time_seconds
                        FROM sessions
                        WHERE user_id = ?
                        ORDER BY last_activity DESC
                        LIMIT ?
                    """, (user_id, limit))

                    sessions = []
                    for row in cursor.fetchall():
                        columns = [desc[0] for desc in cursor.description]
                        session_dict = dict(zip(columns, row))
                        session_dict["is_active"] = bool(session_dict["is_active"])
                        sessions.append(session_dict)

                    return {
                        "success": True,
                        "sessions": sessions,
                        "count": len(sessions)
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to list sessions for user {user_id}: {e}")
                raise DatabaseError(f"Failed to list sessions: {e}")

    async def get_active_sessions(self, user_id: str = None) -> Dict[str, Any]:
        """
        Get active sessions.

        Args:
            user_id: Optional user ID to filter by

        Returns:
            List of active sessions
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    if user_id:
                        cursor.execute("""
                            SELECT id, user_id, topic, started_at, last_activity
                            FROM sessions
                            WHERE user_id = ? AND is_active = 1 AND status = 'active'
                            ORDER BY last_activity DESC
                        """, (user_id,))
                    else:
                        cursor.execute("""
                            SELECT id, user_id, topic, started_at, last_activity
                            FROM sessions
                            WHERE is_active = 1 AND status = 'active'
                            ORDER BY last_activity DESC
                        """)

                    sessions = []
                    for row in cursor.fetchall():
                        columns = [desc[0] for desc in cursor.description]
                        session_dict = dict(zip(columns, row))
                        sessions.append(session_dict)

                    return {
                        "success": True,
                        "sessions": sessions,
                        "count": len(sessions)
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to get active sessions: {e}")
                raise DatabaseError(f"Failed to get active sessions: {e}")

    async def cleanup_old_sessions(self, days_old: int = 30) -> Dict[str, Any]:
        """
        Clean up old inactive sessions.

        Args:
            days_old: Age threshold in days

        Returns:
            Cleanup result
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    cutoff_date = datetime.now() - timedelta(days=days_old)
                    cutoff_str = cutoff_date.isoformat()

                    # Delete old inactive sessions
                    cursor.execute("""
                        DELETE FROM sessions
                        WHERE last_activity < ? AND (is_active = 0 OR status != 'active')
                    """, (cutoff_str,))

                    sessions_deleted = cursor.rowcount
                    conn.commit()

                    self.logger.info(f"Cleaned up {sessions_deleted} old sessions (older than {days_old} days)")

                    return {
                        "success": True,
                        "sessions_deleted": sessions_deleted
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to cleanup old sessions: {e}")
                raise DatabaseError(f"Failed to cleanup old sessions: {e}")

    async def get_session_statistics(self, user_id: str = None) -> Dict[str, Any]:
        """
        Get session statistics.

        Args:
            user_id: Optional user ID to filter by

        Returns:
            Session statistics
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    if user_id:
                        # User-specific statistics
                        cursor.execute("""
                            SELECT
                                COUNT(*) as total_sessions,
                                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_sessions,
                                COUNT(CASE WHEN status = 'terminated' THEN 1 END) as terminated_sessions,
                                SUM(total_interactions) as total_interactions,
                                SUM(tokens_used) as total_tokens_used,
                                AVG(learning_time_seconds) as avg_session_time,
                                MAX(last_activity) as last_activity
                            FROM sessions
                            WHERE user_id = ?
                        """, (user_id,))
                    else:
                        # Global statistics
                        cursor.execute("""
                            SELECT
                                COUNT(*) as total_sessions,
                                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_sessions,
                                COUNT(CASE WHEN status = 'terminated' THEN 1 END) as terminated_sessions,
                                SUM(total_interactions) as total_interactions,
                                SUM(tokens_used) as total_tokens_used,
                                AVG(learning_time_seconds) as avg_session_time,
                                MAX(last_activity) as last_activity
                            FROM sessions
                        """)

                    row = cursor.fetchone()
                    columns = [desc[0] for desc in cursor.description]
                    stats = dict(zip(columns, row))

                    # Convert None values to 0
                    for key, value in stats.items():
                        if value is None:
                            stats[key] = 0

                    return {
                        "success": True,
                        "statistics": stats
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to get session statistics: {e}")
                raise DatabaseError(f"Failed to get session statistics: {e}")

    async def validate_session_integrity(self, session_id: str) -> Dict[str, Any]:
        """
        Validate the integrity of a session in the database.

        Args:
            session_id: Session identifier

        Returns:
            Validation result
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()

                    # Check if session exists
                    cursor.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
                    if not cursor.fetchone():
                        return {
                            "success": False,
                            "error": {
                                "code": "session_not_found",
                                "message": f"Session {session_id} not found"
                            }
                        }

                    # Validate session data structure
                    cursor.execute("""
                        SELECT session_data, concept_progress, context_items, preferences
                        FROM sessions WHERE id = ?
                    """, (session_id,))

                    row = cursor.fetchone()
                    if not row:
                        return {
                            "success": False,
                            "error": {
                                "code": "session_corrupted",
                                "message": f"Session {session_id} data corrupted"
                            }
                        }

                    try:
                        # Try to parse JSON fields
                        json.loads(row[0])  # session_data
                        json.loads(row[1])  # concept_progress
                        json.loads(row[2])  # context_items
                        json.loads(row[3])  # preferences
                    except json.JSONDecodeError as e:
                        return {
                            "success": False,
                            "error": {
                                "code": "session_corrupted",
                                "message": f"Session {session_id} has corrupted JSON data: {e}"
                            }
                        }

                    # Check interactions consistency
                    cursor.execute("""
                        SELECT COUNT(*) FROM session_interactions WHERE session_id = ?
                    """, (session_id,))

                    interaction_count = cursor.fetchone()[0]

                    cursor.execute("""
                        SELECT total_interactions FROM sessions WHERE id = ?
                    """, (session_id,))

                    session_interaction_count = cursor.fetchone()[0]

                    if interaction_count != session_interaction_count:
                        return {
                            "success": False,
                            "error": {
                                "code": "session_inconsistent",
                                "message": f"Session {session_id} has inconsistent interaction counts"
                            }
                        }

                    return {
                        "success": True,
                        "message": f"Session {session_id} integrity validated"
                    }

            except sqlite3.Error as e:
                self.logger.error(f"Failed to validate session {session_id}: {e}")
                raise DatabaseError(f"Failed to validate session: {e}")