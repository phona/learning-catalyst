"""
Database manager for Learning Catalyst.

Simple database abstraction for entity persistence.
"""

import sqlite3
import json
from pathlib import Path
from typing import List, Optional, Dict, Any, Type
from datetime import datetime

from .models import (
    SESSION, INTERACTION, CONCEPT, CONCEPT_RELATIONSHIP,
    WORKSPACE_PROFICIENCY, ASSESSMENT, ASSESSMENT_ATTEMPT,
    TOKEN_USAGE, WORKSPACE_CONFIG, CONFIG_FILE, CONFIG_SECTION,
    CONFIG_VALIDATION, FILE_WATCHER
)


class DatabaseManager:
    """Simple SQLite database manager for Learning Catalyst entities."""

    def __init__(self, db_path: Optional[Path] = None):
        """
        Initialize database manager.

        Args:
            db_path: Path to database file
        """
        self.db_path = db_path or Path.home() / ".catalyst" / "learning_catalyst.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        # Initialize database
        self._initialize_database()

    def _initialize_database(self) -> None:
        """Initialize database tables."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Create tables for each entity type
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT,
                    title TEXT,
                    status TEXT,
                    started_at TEXT,
                    ended_at TEXT,
                    total_duration_minutes INTEGER,
                    interaction_count INTEGER,
                    concepts_discussed TEXT,
                    learning_objectives TEXT,
                    metadata TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS interactions (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    sequence_number INTEGER,
                    interaction_type TEXT,
                    content TEXT,
                    metadata TEXT,
                    timestamp TEXT,
                    processing_time_ms INTEGER,
                    token_usage TEXT,
                    ai_provider TEXT,
                    ai_model TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS concepts (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    description TEXT,
                    domain TEXT,
                    difficulty_level INTEGER,
                    prerequisites TEXT,
                    estimated_time_minutes INTEGER,
                    tags TEXT,
                    content_references TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS concept_relationships (
                    id TEXT PRIMARY KEY,
                    source_concept_id TEXT,
                    target_concept_id TEXT,
                    relationship_type TEXT,
                    strength REAL,
                    created_at TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workspace_proficiency (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT,
                    concept_id TEXT,
                    proficiency_level TEXT,
                    practice_count INTEGER,
                    success_count INTEGER,
                    last_practiced TEXT,
                    improvement_rate REAL,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assessments (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT,
                    concept_id TEXT,
                    title TEXT,
                    description TEXT,
                    assessment_type TEXT,
                    difficulty_level INTEGER,
                    question_count INTEGER,
                    time_limit_minutes INTEGER,
                    passing_score REAL,
                    created_at TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assessment_attempts (
                    id TEXT PRIMARY KEY,
                    assessment_id TEXT,
                    workspace_id TEXT,
                    score REAL,
                    max_score REAL,
                    passed BOOLEAN,
                    time_taken_minutes INTEGER,
                    answers TEXT,
                    feedback TEXT,
                    attempted_at TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS token_usage (
                    id TEXT PRIMARY KEY,
                    interaction_id TEXT,
                    workspace_id TEXT,
                    provider TEXT,
                    model TEXT,
                    prompt_tokens INTEGER,
                    completion_tokens INTEGER,
                    total_tokens INTEGER,
                    cost_usd REAL,
                    timestamp TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workspace_config (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT,
                    ai_settings TEXT,
                    learning_preferences TEXT,
                    personalization_settings TEXT,
                    privacy_settings TEXT,
                    performance_settings TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

            conn.commit()

    def _serialize_entity(self, entity) -> Dict[str, Any]:
        """Serialize entity to dictionary for storage."""
        return entity.to_dict()

    def _deserialize_entity(self, data: Dict[str, Any], entity_class: Type):
        """Deserialize dictionary to entity."""
        # This is a simplified version - in practice you'd handle type conversions
        # For now, assume the dataclass can be created from dict
        try:
            # Convert JSON strings back to objects
            for key, value in data.items():
                if key in ['concepts_discussed', 'learning_objectives', 'prerequisites',
                           'tags', 'content_references', 'metadata', 'answers',
                           'token_usage'] and isinstance(value, str):
                    data[key] = json.loads(value) if value else []
                elif key in ['started_at', 'ended_at', 'created_at', 'updated_at',
                           'timestamp', 'attempted_at', 'last_practiced'] and value:
                    data[key] = datetime.fromisoformat(value)

            return entity_class(**data)
        except Exception as e:
            print(f"Error deserializing {entity_class.__name__}: {e}")
            return None

    def save_session(self, session: SESSION) -> bool:
        """Save a session to the database."""
        try:
            data = self._serialize_entity(session)

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO sessions VALUES (
                        :id, :workspace_id, :title, :status, :started_at, :ended_at,
                        :total_duration_minutes, :interaction_count, :concepts_discussed,
                        :learning_objectives, :metadata
                    )
                """, {
                    'id': data['id'],
                    'workspace_id': data['workspace_id'],
                    'title': data['title'],
                    'status': data['status'],
                    'started_at': data['started_at'],
                    'ended_at': data['ended_at'],
                    'total_duration_minutes': data['total_duration_minutes'],
                    'interaction_count': data['interaction_count'],
                    'concepts_discussed': json.dumps(data['concepts_discussed']),
                    'learning_objectives': json.dumps(data['learning_objectives']),
                    'metadata': json.dumps(data['metadata'])
                })
                conn.commit()
            return True
        except Exception as e:
            print(f"Error saving session: {e}")
            return False

    def get_session(self, session_id: str) -> Optional[SESSION]:
        """Get a session by ID."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
                row = cursor.fetchone()

                if row:
                    data = {
                        'id': row[0], 'workspace_id': row[1], 'title': row[2],
                        'status': row[3], 'started_at': row[4], 'ended_at': row[5],
                        'total_duration_minutes': row[6], 'interaction_count': row[7],
                        'concepts_discussed': json.loads(row[8]) if row[8] else [],
                        'learning_objectives': json.loads(row[9]) if row[9] else [],
                        'metadata': json.loads(row[10]) if row[10] else {}
                    }
                    return self._deserialize_entity(data, SESSION)
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None

    def save_interaction(self, interaction: INTERACTION) -> bool:
        """Save an interaction to the database."""
        try:
            data = self._serialize_entity(interaction)

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO interactions VALUES (
                        :id, :session_id, :sequence_number, :interaction_type, :content,
                        :metadata, :timestamp, :processing_time_ms, :token_usage,
                        :ai_provider, :ai_model
                    )
                """, {
                    'id': data['id'],
                    'session_id': data['session_id'],
                    'sequence_number': data['sequence_number'],
                    'interaction_type': data['interaction_type'],
                    'content': data['content'],
                    'metadata': json.dumps(data['metadata']),
                    'timestamp': data['timestamp'],
                    'processing_time_ms': data['processing_time_ms'],
                    'token_usage': json.dumps(data['token_usage']) if data['token_usage'] else None,
                    'ai_provider': data['ai_provider'],
                    'ai_model': data['ai_model']
                })
                conn.commit()
            return True
        except Exception as e:
            print(f"Error saving interaction: {e}")
            return False

    def get_workspace_sessions(self, workspace_id: str, limit: int = 50) -> List[SESSION]:
        """Get all sessions for a workspace."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM sessions
                    WHERE workspace_id = ?
                    ORDER BY started_at DESC
                    LIMIT ?
                """, (workspace_id, limit))

                sessions = []
                for row in cursor.fetchall():
                    data = {
                        'id': row[0], 'workspace_id': row[1], 'title': row[2],
                        'status': row[3], 'started_at': row[4], 'ended_at': row[5],
                        'total_duration_minutes': row[6], 'interaction_count': row[7],
                        'concepts_discussed': json.loads(row[8]) if row[8] else [],
                        'learning_objectives': json.loads(row[9]) if row[9] else [],
                        'metadata': json.loads(row[10]) if row[10] else {}
                    }
                    session = self._deserialize_entity(data, SESSION)
                    if session:
                        sessions.append(session)

                return sessions
        except Exception as e:
            print(f"Error getting workspace sessions: {e}")
            return []

    def save_token_usage(self, token_usage: TOKEN_USAGE) -> bool:
        """Save token usage information."""
        try:
            data = self._serialize_entity(token_usage)

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO token_usage VALUES (
                        :id, :interaction_id, :workspace_id, :provider, :model,
                        :prompt_tokens, :completion_tokens, :total_tokens,
                        :cost_usd, :timestamp
                    )
                """, data)
                conn.commit()
            return True
        except Exception as e:
            print(f"Error saving token usage: {e}")
            return False

    def get_token_usage_stats(
        self,
        workspace_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get token usage statistics."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                query = """
                    SELECT
                        SUM(total_tokens) as total_tokens,
                        SUM(prompt_tokens) as prompt_tokens,
                        SUM(completion_tokens) as completion_tokens,
                        SUM(cost_usd) as total_cost,
                        COUNT(*) as request_count
                    FROM token_usage
                    WHERE workspace_id = ?
                """
                params = [workspace_id]

                if start_date:
                    query += " AND timestamp >= ?"
                    params.append(start_date.isoformat())
                if end_date:
                    query += " AND timestamp <= ?"
                    params.append(end_date.isoformat())

                cursor.execute(query, params)
                row = cursor.fetchone()

                if row and row[0]:
                    return {
                        'total_tokens': row[0],
                        'prompt_tokens': row[1],
                        'completion_tokens': row[2],
                        'total_cost': row[3],
                        'request_count': row[4]
                    }

                return {
                    'total_tokens': 0,
                    'prompt_tokens': 0,
                    'completion_tokens': 0,
                    'total_cost': 0.0,
                    'request_count': 0
                }
        except Exception as e:
            print(f"Error getting token usage stats: {e}")
            return {}

    def close(self) -> None:
        """Close database connection."""
        pass  # SQLite connections are closed automatically