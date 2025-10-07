"""
Database manager implementation with SQLite
"""

import json
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .models.concept import Concept
from .models.user_profile import UserProfile


class DatabaseManager:
    """Manages SQLite database operations for the Learning Catalyst application."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()
        self._check_and_migrate()

    def _init_db(self):
        """Initialize the database with the required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create tables as defined in architecture document
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS user_profiles (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            preferences TEXT,
            competency_profile TEXT,
            ai_config TEXT,
            current_checkpoint_id TEXT
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS qa_history (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            concept_id TEXT,
            challenge_type TEXT,
            challenge_text TEXT,
            user_answer TEXT,
            ai_evaluation TEXT,
            timestamp TEXT,
            score REAL
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS checkpoints (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            state_data TEXT,
            created_at TEXT,
            description TEXT
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS concepts (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            prerequisites TEXT,
            difficulty_level INTEGER,
            tags TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS user_progress (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            concept_id TEXT,
            completed BOOLEAN,
            score REAL,
            last_accessed TEXT,
            time_spent_seconds INTEGER,
            attempts INTEGER
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS token_usage (
            id TEXT PRIMARY KEY,
            model_name TEXT,
            provider TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            total_tokens INTEGER,
            timestamp TEXT,  -- ISO 8601 format
            user_id TEXT REFERENCES user_profiles(id),
            context TEXT,  -- What the tokens were used for (e.g. "explanation", "challenge", "embedding")
            cost REAL
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS concept_relationships (
            id TEXT PRIMARY KEY,
            source_concept_id TEXT REFERENCES concepts(id),
            target_concept_id TEXT REFERENCES concepts(id),
            relationship_type TEXT,
            strength REAL,
            created_at TEXT
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS learning_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            start_time TEXT,
            end_time TEXT,
            concepts_covered TEXT,
            challenges_completed INTEGER,
            average_score REAL
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            concept_id TEXT REFERENCES concepts(id),
            content TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            concept_id TEXT REFERENCES concepts(id),
            title TEXT,
            url TEXT,
            type TEXT,
            description TEXT,
            created_at TEXT
        )
        """
        )

        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT,
            description TEXT
        )
        """
        )

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_history_user_id ON qa_history(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_history_concept_id ON qa_history(concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_history_timestamp ON qa_history(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON checkpoints(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_model_name ON token_usage(model_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_progress_concept_id ON user_progress(concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON concept_relationships(source_concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON concept_relationships(target_concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_concept_id ON notes(concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_concept_id ON resources(concept_id)")

        conn.commit()
        conn.close()

    def _check_and_migrate(self):
        """Check current schema version and apply migrations if needed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Check if schema_version table exists
        cursor.execute(
            """
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='schema_version'
        """
        )

        if not cursor.fetchone():
            # Schema version table doesn't exist, create it and set initial version
            cursor.execute(
                """
            CREATE TABLE schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT,
                description TEXT
            )
            """
            )

            cursor.execute(
                """
            INSERT INTO schema_version (version, applied_at, description)
            VALUES (1, ?, 'Initial schema')
            """,
                (datetime.now().isoformat(),),
            )

            conn.commit()

        # Get current schema version
        cursor.execute("SELECT MAX(version) FROM schema_version")
        current_version = cursor.fetchone()[0] or 0

        # Apply migrations if needed
        migrations = [
            (2, "Add tags, created_at, updated_at to concepts", self._migrate_v2),
            (3, "Enhance user_progress table", self._migrate_v3),
            (4, "Add cost to token_usage", self._migrate_v4),
            (5, "Add concept_relationships table", self._migrate_v5),
            (6, "Add learning_sessions table", self._migrate_v6),
            (7, "Add notes table", self._migrate_v7),
            (8, "Add resources table", self._migrate_v8),
        ]

        for version, description, migration_func in migrations:
            if version > current_version:
                try:
                    migration_func(cursor)
                    cursor.execute(
                        """
                    INSERT INTO schema_version (version, applied_at, description)
                    VALUES (?, ?, ?)
                    """,
                        (version, datetime.now().isoformat(), description),
                    )

                    print(f"Applied database migration to version {version}: {description}")
                except sqlite3.Error as e:
                    print(f"Failed to apply migration to version {version}: {str(e)}")
                    conn.rollback()
                    conn.close()
                    raise

        conn.commit()
        conn.close()

    def _migrate_v2(self, cursor):
        """Migration to add tags, created_at, updated_at to concepts"""
        # Check if columns already exist before adding them
        cursor.execute("PRAGMA table_info(concepts)")
        columns = [row[1] for row in cursor.fetchall()]

        if "tags" not in columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN tags TEXT")
        if "created_at" not in columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN created_at TEXT")
        if "updated_at" not in columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN updated_at TEXT")

    def _migrate_v3(self, cursor):
        """Migration to enhance user_progress table"""
        # Create new table with enhanced structure
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS user_progress_new (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            concept_id TEXT,
            completed BOOLEAN,
            score REAL,
            last_accessed TEXT,
            time_spent_seconds INTEGER,
            attempts INTEGER
        )
        """
        )

        # Copy data from old table
        cursor.execute(
            """
        INSERT INTO user_progress_new (id, user_id, concept_id, completed, score)
        SELECT concept_id, 'default', concept_id, completed, score FROM user_progress
        """
        )

        # Drop old table and rename new one
        cursor.execute("DROP TABLE user_progress")
        cursor.execute("ALTER TABLE user_progress_new RENAME TO user_progress")

    def _migrate_v4(self, cursor):
        """Migration to add cost to token_usage"""
        # Check if column already exists before adding it
        cursor.execute("PRAGMA table_info(token_usage)")
        columns = [row[1] for row in cursor.fetchall()]

        if "cost" not in columns:
            cursor.execute("ALTER TABLE token_usage ADD COLUMN cost REAL")

    def _migrate_v5(self, cursor):
        """Migration to add concept_relationships table"""
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS concept_relationships (
            id TEXT PRIMARY KEY,
            source_concept_id TEXT REFERENCES concepts(id),
            target_concept_id TEXT REFERENCES concepts(id),
            relationship_type TEXT,
            strength REAL,
            created_at TEXT
        )
        """
        )

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON concept_relationships(source_concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON concept_relationships(target_concept_id)")

    def _migrate_v6(self, cursor):
        """Migration to add learning_sessions table"""
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS learning_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            start_time TEXT,
            end_time TEXT,
            concepts_covered TEXT,
            challenges_completed INTEGER,
            average_score REAL
        )
        """
        )

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id)")

    def _migrate_v7(self, cursor):
        """Migration to add notes table"""
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            concept_id TEXT REFERENCES concepts(id),
            content TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
        )

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_concept_id ON notes(concept_id)")

    def _migrate_v8(self, cursor):
        """Migration to add resources table"""
        cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            concept_id TEXT REFERENCES concepts(id),
            title TEXT,
            url TEXT,
            type TEXT,
            description TEXT,
            created_at TEXT
        )
        """
        )

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_concept_id ON resources(concept_id)")

    # Token Usage Methods
    def insert_token_usage(
        self,
        model_name: str,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        user_id: str,
        context: str,
        cost: float = 0.0,
    ):
        """Insert token usage record into the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        record_id = f"token_{datetime.now().isoformat()}"
        total_tokens = input_tokens + output_tokens
        timestamp = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT INTO token_usage (id, model_name, provider, input_tokens, output_tokens,
            total_tokens, timestamp, user_id, context, cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                record_id,
                model_name,
                provider,
                input_tokens,
                output_tokens,
                total_tokens,
                timestamp,
                user_id,
                context,
                cost,
            ),
        )

        conn.commit()
        conn.close()

    def get_token_usage_summary(self, user_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get token usage summary for a user within a date range"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT
            SUM(input_tokens) as total_input,
            SUM(output_tokens) as total_output,
            SUM(total_tokens) as total,
            SUM(cost) as total_cost,
            COUNT(*) as total_requests
        FROM token_usage
        WHERE user_id = ? AND timestamp BETWEEN ? AND ?
        """,
            (user_id, start_date, end_date),
        )

        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                "input_tokens": result[0] or 0,
                "output_tokens": result[1] or 0,
                "total_tokens": result[2] or 0,
                "total_cost": result[3] or 0.0,
                "total_requests": result[4] or 0,
            }
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "total_cost": 0.0, "total_requests": 0}

    def get_token_usage_by_model(self, user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Get token usage breakdown by model for a user within a date range"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT
            model_name,
            provider,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(total_tokens) as total_tokens,
            SUM(cost) as total_cost,
            COUNT(*) as requests
        FROM token_usage
        WHERE user_id = ? AND timestamp BETWEEN ? AND ?
        GROUP BY model_name, provider
        ORDER BY total_tokens DESC
        """,
            (user_id, start_date, end_date),
        )

        results = cursor.fetchall()
        conn.close()

        return [
            {
                "model_name": row[0],
                "provider": row[1],
                "input_tokens": row[2] or 0,
                "output_tokens": row[3] or 0,
                "total_tokens": row[4] or 0,
                "total_cost": row[5] or 0.0,
                "requests": row[6] or 0,
            }
            for row in results
        ]

    # User Profile Methods
    def save_user_profile(self, user_profile: UserProfile):
        """Save or update a user profile in the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        INSERT OR REPLACE INTO user_profiles
        (id, created_at, preferences, competency_profile, ai_config, current_checkpoint_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                user_profile.id,
                user_profile.created_at,
                json.dumps(user_profile.preferences),
                json.dumps(user_profile.competency_profile),
                json.dumps(user_profile.ai_config),
                user_profile.current_checkpoint_id,
            ),
        )

        conn.commit()
        conn.close()

    def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Retrieve a user profile from the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM user_profiles WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return UserProfile(
                id=row[0],
                created_at=row[1],
                preferences=json.loads(row[2]),
                competency_profile=json.loads(row[3]),
                ai_config=json.loads(row[4]),
                current_checkpoint_id=row[5],
            )
        return None

    # Concept Methods
    def save_concept(self, concept: Concept):
        """Save or update a concept in the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = datetime.now().isoformat()

        # Check if concept exists
        cursor.execute("SELECT id FROM concepts WHERE id = ?", (concept.id,))
        exists = cursor.fetchone() is not None

        if exists:
            # Update existing concept
            cursor.execute(
                """
            UPDATE concepts
            SET title = ?, content = ?, prerequisites = ?, difficulty_level = ?,
                tags = ?, updated_at = ?
            WHERE id = ?
            """,
                (
                    concept.title,
                    concept.content,
                    json.dumps(concept.prerequisites),
                    concept.difficulty_level,
                    json.dumps(getattr(concept, "tags", [])),
                    now,
                    concept.id,
                ),
            )
        else:
            # Insert new concept
            cursor.execute(
                """
            INSERT INTO concepts
            (id, title, content, prerequisites, difficulty_level, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    concept.id,
                    concept.title,
                    concept.content,
                    json.dumps(concept.prerequisites),
                    concept.difficulty_level,
                    json.dumps(getattr(concept, "tags", [])),
                    now,
                    now,
                ),
            )

        conn.commit()
        conn.close()

    def get_concept(self, concept_id: str) -> Optional[Concept]:
        """Retrieve a concept from the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts WHERE id = ?", (concept_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return Concept(id=row[0], title=row[1], content=row[2], prerequisites=json.loads(row[3]), difficulty_level=row[4])
        return None

    def get_all_concepts(self) -> List[Concept]:
        """Retrieve all concepts from the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts ORDER BY title")
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(
                Concept(id=row[0], title=row[1], content=row[2], prerequisites=json.loads(row[3]), difficulty_level=row[4])
            )
        return concepts

    def get_concepts_by_tag(self, tag: str) -> List[Concept]:
        """Retrieve concepts with a specific tag"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts WHERE tags LIKE ?", (f"%{tag}%",))
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(
                Concept(id=row[0], title=row[1], content=row[2], prerequisites=json.loads(row[3]), difficulty_level=row[4])
            )
        return concepts

    def search_concepts(self, query: str) -> List[Concept]:
        """Search concepts by title or content"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        search_term = f"%{query}%"
        cursor.execute(
            """
        SELECT * FROM concepts
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY
            CASE
                WHEN title LIKE ? THEN 1
                ELSE 2
            END
        """,
            (search_term, search_term, search_term),
        )

        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(
                Concept(id=row[0], title=row[1], content=row[2], prerequisites=json.loads(row[3]), difficulty_level=row[4])
            )
        return concepts

    # User Progress Methods
    def save_user_progress(
        self,
        user_id: str,
        concept_id: str,
        completed: bool,
        score: float,
        time_spent_seconds: int = 0,
        attempts: int = 1,
    ):
        """Save or update user progress for a concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        progress_id = f"{user_id}_{concept_id}"
        now = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT OR REPLACE INTO user_progress
        (id, user_id, concept_id, completed, score, last_accessed, time_spent_seconds, attempts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (progress_id, user_id, concept_id, completed, score, now, time_spent_seconds, attempts),
        )

        conn.commit()
        conn.close()

    def get_user_progress(self, user_id: str, concept_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user progress for a specific concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM user_progress
        WHERE user_id = ? AND concept_id = ?
        """,
            (user_id, concept_id),
        )

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "completed": bool(row[3]),
                "score": row[4],
                "last_accessed": row[5],
                "time_spent_seconds": row[6],
                "attempts": row[7],
            }
        return None

    def get_all_user_progress(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve all user progress for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM user_progress
        WHERE user_id = ?
        ORDER BY last_accessed DESC
        """,
            (user_id,),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "completed": bool(row[3]),
                "score": row[4],
                "last_accessed": row[5],
                "time_spent_seconds": row[6],
                "attempts": row[7],
            }
            for row in rows
        ]

    # Concept Relationship Methods
    def save_concept_relationship(
        self, source_concept_id: str, target_concept_id: str, relationship_type: str, strength: float = 1.0
    ):
        """Save a relationship between two concepts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        relationship_id = f"{source_concept_id}_{target_concept_id}_{relationship_type}"
        now = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT OR REPLACE INTO concept_relationships
        (id, source_concept_id, target_concept_id, relationship_type, strength, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
            (relationship_id, source_concept_id, target_concept_id, relationship_type, strength, now),
        )

        conn.commit()
        conn.close()

    def get_concept_relationships(self, concept_id: str, relationship_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve relationships for a concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if relationship_type:
            cursor.execute(
                """
            SELECT * FROM concept_relationships
            WHERE (source_concept_id = ? OR target_concept_id = ?) AND relationship_type = ?
            """,
                (concept_id, concept_id, relationship_type),
            )
        else:
            cursor.execute(
                """
            SELECT * FROM concept_relationships
            WHERE source_concept_id = ? OR target_concept_id = ?
            """,
                (concept_id, concept_id),
            )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "source_concept_id": row[1],
                "target_concept_id": row[2],
                "relationship_type": row[3],
                "strength": row[4],
                "created_at": row[5],
            }
            for row in rows
        ]

    # Learning Session Methods
    def start_learning_session(self, user_id: str) -> str:
        """Start a new learning session and return the session ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        session_id = f"session_{user_id}_{datetime.now().isoformat()}"
        now = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT INTO learning_sessions
        (id, user_id, start_time, concepts_covered, challenges_completed, average_score)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
            (session_id, user_id, now, "[]", 0, 0.0),
        )

        conn.commit()
        conn.close()

        return session_id

    def update_learning_session(
        self, session_id: str, concepts_covered: List[str], challenges_completed: int, average_score: float
    ):
        """Update a learning session with new data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        UPDATE learning_sessions
        SET concepts_covered = ?, challenges_completed = ?, average_score = ?
        WHERE id = ?
        """,
            (json.dumps(concepts_covered), challenges_completed, average_score, session_id),
        )

        conn.commit()
        conn.close()

    def end_learning_session(self, session_id: str):
        """End a learning session by setting the end time"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = datetime.now().isoformat()
        cursor.execute(
            """
        UPDATE learning_sessions
        SET end_time = ?
        WHERE id = ?
        """,
            (now, session_id),
        )

        conn.commit()
        conn.close()

    def get_learning_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a learning session by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM learning_sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "id": row[0],
                "user_id": row[1],
                "start_time": row[2],
                "end_time": row[3],
                "concepts_covered": json.loads(row[4]),
                "challenges_completed": row[5],
                "average_score": row[6],
            }
        return None

    def get_user_learning_sessions(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve recent learning sessions for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM learning_sessions
        WHERE user_id = ?
        ORDER BY start_time DESC
        LIMIT ?
        """,
            (user_id, limit),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "start_time": row[2],
                "end_time": row[3],
                "concepts_covered": json.loads(row[4]),
                "challenges_completed": row[5],
                "average_score": row[6],
            }
            for row in rows
        ]

    # Notes Methods
    def save_note(self, user_id: str, concept_id: str, content: str, note_id: Optional[str] = None) -> str:
        """Save or update a note for a concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = datetime.now().isoformat()

        if note_id:
            # Update existing note
            cursor.execute(
                """
            UPDATE notes
            SET content = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
                (content, now, note_id, user_id),
            )
        else:
            # Create new note
            note_id = f"note_{user_id}_{concept_id}_{datetime.now().timestamp()}"
            cursor.execute(
                """
            INSERT INTO notes
            (id, user_id, concept_id, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
                (note_id, user_id, concept_id, content, now, now),
            )

        conn.commit()
        conn.close()

        return note_id

    def get_note(self, note_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a note by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM notes
        WHERE id = ? AND user_id = ?
        """,
            (note_id, user_id),
        )

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "content": row[3],
                "created_at": row[4],
                "updated_at": row[5],
            }
        return None

    def get_notes_for_concept(self, user_id: str, concept_id: str) -> List[Dict[str, Any]]:
        """Retrieve all notes for a concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM notes
        WHERE user_id = ? AND concept_id = ?
        ORDER BY updated_at DESC
        """,
            (user_id, concept_id),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "content": row[3],
                "created_at": row[4],
                "updated_at": row[5],
            }
            for row in rows
        ]

    def get_all_user_notes(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve all notes for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM notes
        WHERE user_id = ?
        ORDER BY updated_at DESC
        """,
            (user_id,),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "content": row[3],
                "created_at": row[4],
                "updated_at": row[5],
            }
            for row in rows
        ]

    def delete_note(self, note_id: str, user_id: str) -> bool:
        """Delete a note"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        DELETE FROM notes
        WHERE id = ? AND user_id = ?
        """,
            (note_id, user_id),
        )

        affected_rows = cursor.rowcount
        conn.commit()
        conn.close()

        return affected_rows > 0

    # Resources Methods
    def save_resource(
        self,
        concept_id: str,
        title: str,
        url: str,
        resource_type: str,
        description: str = "",
        resource_id: Optional[str] = None,
    ) -> str:
        """Save or update a resource for a concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = datetime.now().isoformat()

        if resource_id:
            # Update existing resource
            cursor.execute(
                """
            UPDATE resources
            SET title = ?, url = ?, type = ?, description = ?
            WHERE id = ? AND concept_id = ?
            """,
                (title, url, resource_type, description, resource_id, concept_id),
            )
        else:
            # Create new resource
            resource_id = f"resource_{concept_id}_{datetime.now().timestamp()}"
            cursor.execute(
                """
            INSERT INTO resources
            (id, concept_id, title, url, type, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (resource_id, concept_id, title, url, resource_type, description, now),
            )

        conn.commit()
        conn.close()

        return resource_id

    def get_resource(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a resource by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM resources WHERE id = ?", (resource_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "id": row[0],
                "concept_id": row[1],
                "title": row[2],
                "url": row[3],
                "type": row[4],
                "description": row[5],
                "created_at": row[6],
            }
        return None

    def get_resources_for_concept(self, concept_id: str) -> List[Dict[str, Any]]:
        """Retrieve all resources for a concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM resources
        WHERE concept_id = ?
        ORDER BY title
        """,
            (concept_id,),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "concept_id": row[1],
                "title": row[2],
                "url": row[3],
                "type": row[4],
                "description": row[5],
                "created_at": row[6],
            }
            for row in rows
        ]

    def delete_resource(self, resource_id: str) -> bool:
        """Delete a resource"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
        affected_rows = cursor.rowcount
        conn.commit()
        conn.close()

        return affected_rows > 0

    # QA History Methods
    def save_qa_record(
        self,
        user_id: str,
        concept_id: str,
        challenge_type: str,
        challenge_text: str,
        user_answer: str,
        ai_evaluation: str,
        score: float,
    ):
        """Save a Q&A record to the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        record_id = f"qa_{user_id}_{datetime.now().isoformat()}"
        timestamp = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT INTO qa_history
        (id, user_id, concept_id, challenge_type, challenge_text, user_answer,
         ai_evaluation, timestamp, score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                record_id,
                user_id,
                concept_id,
                challenge_type,
                challenge_text,
                user_answer,
                ai_evaluation,
                timestamp,
                score,
            ),
        )

        conn.commit()
        conn.close()

    def get_qa_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve Q&A history for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM qa_history
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
        """,
            (user_id, limit),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "challenge_type": row[3],
                "challenge_text": row[4],
                "user_answer": row[5],
                "ai_evaluation": row[6],
                "timestamp": row[7],
                "score": row[8],
            }
            for row in rows
        ]

    def get_qa_history_for_concept(self, user_id: str, concept_id: str) -> List[Dict[str, Any]]:
        """Retrieve Q&A history for a specific concept"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM qa_history
        WHERE user_id = ? AND concept_id = ?
        ORDER BY timestamp DESC
        """,
            (user_id, concept_id),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "user_id": row[1],
                "concept_id": row[2],
                "challenge_type": row[3],
                "challenge_text": row[4],
                "user_answer": row[5],
                "ai_evaluation": row[6],
                "timestamp": row[7],
                "score": row[8],
            }
            for row in rows
        ]

    # Checkpoint Methods
    def save_checkpoint(self, checkpoint_id: str, user_id: str, state_data: str, description: str):
        """Save a checkpoint to the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT OR REPLACE INTO checkpoints
        (id, user_id, state_data, created_at, description)
        VALUES (?, ?, ?, ?, ?)
        """,
            (checkpoint_id, user_id, state_data, now, description),
        )

        conn.commit()
        conn.close()

    def get_checkpoint(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a checkpoint by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM checkpoints WHERE id = ?", (checkpoint_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return {"id": row[0], "user_id": row[1], "state_data": row[2], "created_at": row[3], "description": row[4]}
        return None

    def get_user_checkpoints(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve checkpoints for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
        SELECT * FROM checkpoints
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
            (user_id, limit),
        )

        rows = cursor.fetchall()
        conn.close()

        return [
            {"id": row[0], "user_id": row[1], "state_data": row[2], "created_at": row[3], "description": row[4]} for row in rows
        ]

    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM checkpoints WHERE id = ?", (checkpoint_id,))
        affected_rows = cursor.rowcount
        conn.commit()
        conn.close()

        return affected_rows > 0

    # Database Maintenance Methods
    def backup_database(self, backup_path: str) -> bool:
        """Create a backup of the database"""
        try:
            shutil.copy2(self.db_path, backup_path)
            print(f"Database backed up to {backup_path}")
            return True
        except Exception as e:
            print(f"Failed to backup database: {str(e)}")
            return False

    def get_database_stats(self) -> Dict[str, Any]:
        """Get statistics about the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        stats = {}

        # Get table sizes
        tables = [
            "user_profiles",
            "qa_history",
            "checkpoints",
            "concepts",
            "user_progress",
            "token_usage",
            "concept_relationships",
            "learning_sessions",
            "notes",
            "resources",
        ]

        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            stats[f"{table}_count"] = count

        # Get database file size
        db_file = Path(self.db_path)
        if db_file.exists():
            stats["database_size_bytes"] = db_file.stat().st_size
            stats["database_size_mb"] = round(stats["database_size_bytes"] / (1024 * 1024), 2)

        # Get schema version
        cursor.execute("SELECT MAX(version) FROM schema_version")
        stats["schema_version"] = cursor.fetchone()[0] or 0

        conn.close()

        return stats

    def vacuum_database(self) -> bool:
        """Vacuum the database to reclaim space"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("VACUUM")
            conn.commit()
            conn.close()

            print("Database vacuumed successfully")
            return True
        except Exception as e:
            print(f"Failed to vacuum database: {str(e)}")
            return False
