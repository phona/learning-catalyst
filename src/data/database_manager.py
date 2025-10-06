"""
Database manager implementation with SQLite
"""
import json
import os
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

from .models.concept import Concept
from .models.user_profile import UserProfile


class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database with the required tables"""
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create tables as defined in architecture document
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            preferences TEXT,
            competency_profile TEXT,
            ai_config TEXT,
            current_checkpoint_id TEXT
        )
        """)

        cursor.execute("""
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
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS checkpoints (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            state_data TEXT,
            created_at TEXT,
            description TEXT
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS concepts (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            prerequisites TEXT,
            difficulty_level INTEGER
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_progress (
            concept_id TEXT PRIMARY KEY,
            completed BOOLEAN,
            score REAL
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS token_usage (
            id TEXT PRIMARY KEY,
            model_name TEXT,
            provider TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            total_tokens INTEGER,
            timestamp TEXT,  -- ISO 8601 format
            user_id TEXT REFERENCES user_profiles(id),
            context TEXT  -- What the tokens were used for (e.g. "explanation", "challenge", "embedding")
        )
        """)

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_history_user_id ON qa_history(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_history_concept_id ON qa_history(concept_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_qa_history_timestamp ON qa_history(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON checkpoints(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_model_name ON token_usage(model_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp)")

        conn.commit()
        conn.close()

    def insert_token_usage(self, model_name: str, provider: str, input_tokens: int,
                          output_tokens: int, user_id: str, context: str):
        """Insert token usage record into the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        record_id = f"token_{datetime.now().isoformat()}"
        total_tokens = input_tokens + output_tokens
        timestamp = datetime.now().isoformat()

        cursor.execute("""
        INSERT INTO token_usage (id, model_name, provider, input_tokens, output_tokens,
                                total_tokens, timestamp, user_id, context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (record_id, model_name, provider, input_tokens, output_tokens,
              total_tokens, timestamp, user_id, context))

        conn.commit()
        conn.close()

    def get_token_usage_summary(self, user_id: str, start_date: str, end_date: str) -> Dict[str, int]:
        """Get token usage summary for a user within a date range"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
        SELECT
            SUM(input_tokens) as total_input,
            SUM(output_tokens) as total_output,
            SUM(total_tokens) as total
        FROM token_usage
        WHERE user_id = ? AND timestamp BETWEEN ? AND ?
        """, (user_id, start_date, end_date))

        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                "input_tokens": result[0] or 0,
                "output_tokens": result[1] or 0,
                "total_tokens": result[2] or 0
            }
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

    def save_user_profile(self, user_profile: UserProfile):
        """Save or update a user profile in the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
        INSERT OR REPLACE INTO user_profiles
        (id, created_at, preferences, competency_profile, ai_config, current_checkpoint_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_profile.id,
            user_profile.created_at,
            json.dumps(user_profile.preferences),
            json.dumps(user_profile.competency_profile),
            json.dumps(user_profile.ai_config),
            user_profile.current_checkpoint_id
        ))

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
                current_checkpoint_id=row[5]
            )
        return None

    def save_concept(self, concept: Concept):
        """Save or update a concept in the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
        INSERT OR REPLACE INTO concepts
        (id, title, content, prerequisites, difficulty_level)
        VALUES (?, ?, ?, ?, ?)
        """, (
            concept.id,
            concept.title,
            concept.content,
            json.dumps(concept.prerequisites),
            concept.difficulty_level
        ))

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
            return Concept(
                id=row[0],
                title=row[1],
                content=row[2],
                prerequisites=json.loads(row[3]),
                difficulty_level=row[4]
            )
        return None

    def get_all_concepts(self) -> List[Concept]:
        """Retrieve all concepts from the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM concepts")
        rows = cursor.fetchall()
        conn.close()

        concepts = []
        for row in rows:
            concepts.append(Concept(
                id=row[0],
                title=row[1],
                content=row[2],
                prerequisites=json.loads(row[3]),
                difficulty_level=row[4]
            ))
        return concepts
