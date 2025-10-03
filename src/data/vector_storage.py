"""
Vector storage implementation with SQLite
"""
import sqlite3
import json
from typing import List, Dict, Optional, Any
from datetime import datetime
import numpy as np


class VectorStorage:
    def __init__(self, db_path: str):
        self.db_path = db_path
        # Initialize with SQLite-VSS extension if available
        self._init_vector_tables()

    def _init_vector_tables(self):
        """Initialize tables for vector storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Add vector column to concepts table
        try:
            cursor.execute("ALTER TABLE concepts ADD COLUMN content_embedding BLOB")
            cursor.execute("ALTER TABLE concepts ADD COLUMN embedding_model TEXT")
        except sqlite3.OperationalError:
            # Column already exists
            pass

        # Create content_chunks table with embeddings
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS content_chunks (
            id TEXT PRIMARY KEY,
            concept_id TEXT REFERENCES concepts(id),
            chunk_text TEXT,
            chunk_embedding BLOB,
            embedding_model TEXT,
            chunk_index INTEGER
        )
        """)

        # Create conversation history table with embeddings
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversation_history (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES user_profiles(id),
            conversation_embedding BLOB,
            conversation_text TEXT,
            embedding_model TEXT,
            timestamp TEXT,
            context_tags TEXT
        )
        """)

        # Create indexes for vector search performance
        # Note: SQLite-VSS provides specific functions for vector similarity

        conn.commit()
        conn.close()

    def store_embedding(self, table: str, id: str, vector: List[float], model: str):
        """Store vector embedding in the specified table"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Convert vector to binary format for storage
        vector_binary = np.array(vector, dtype=np.float32).tobytes()

        if table == "concepts":
            cursor.execute("""
            UPDATE concepts 
            SET content_embedding = ?, embedding_model = ?
            WHERE id = ?
            """, (vector_binary, model, id))
        elif table == "content_chunks":
            # Implementation for content_chunks table
            cursor.execute("""
            INSERT OR REPLACE INTO content_chunks
            (id, concept_id, chunk_text, chunk_embedding, embedding_model, chunk_index)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (id, "", "", vector_binary, model, 0))
        elif table == "conversation_history":
            # Implementation for conversation_history table
            cursor.execute("""
            INSERT OR REPLACE INTO conversation_history
            (id, user_id, conversation_embedding, conversation_text, embedding_model, timestamp, context_tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (id, "", vector_binary, "", model, datetime.now().isoformat(), ""))
        else:
            raise ValueError(f"Unknown table: {table}")

        conn.commit()
        conn.close()

    def get_embedding(self, table: str, id: str) -> Optional[List[float]]:
        """Retrieve vector embedding from the specified table"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if table == "concepts":
            cursor.execute("SELECT content_embedding FROM concepts WHERE id = ?", (id,))
        elif table == "content_chunks":
            cursor.execute("SELECT chunk_embedding FROM content_chunks WHERE id = ?", (id,))
        elif table == "conversation_history":
            cursor.execute("SELECT conversation_embedding FROM conversation_history WHERE id = ?", (id,))
        else:
            raise ValueError(f"Unknown table: {table}")

        result = cursor.fetchone()
        conn.close()

        if result and result[0]:
            # Convert binary data back to list of floats
            vector_array = np.frombuffer(result[0], dtype=np.float32)
            return vector_array.tolist()
        return None

    def find_similar_by_embedding(self, table: str, query_embedding: List[float], top_k: int = 10) -> List[Dict[str, Any]]:
        """Find similar items based on embedding similarity (simplified implementation)"""
        # Note: A proper implementation would use SQLite-VSS functions for vector similarity
        # This is a simplified version that would need to be replaced with the actual SQLite-VSS functions
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # For now, return empty list as this requires SQLite-VSS extension
        # In a real implementation, this would use SQLite's vector similarity functions
        results = []
        
        conn.close()
        return results