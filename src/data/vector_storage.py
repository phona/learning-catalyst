"""
Enhanced vector storage implementation with semantic search capabilities
"""

import hashlib
import json
import math
import os
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from src.utils.db_utils import execute_non_query, execute_query, get_db_connection


class VectorStorage:
    """Enhanced vector storage with semantic search and content chunking capabilities."""

    def __init__(self, db_path: str, embedding_dimension: int = 1536):
        self.db_path = db_path
        self.embedding_dimension = embedding_dimension
        self.similarity_cache = {}
        self.cache_expiry = timedelta(hours=1)
        self._init_vector_tables()
        self._init_indexes()

    def _init_vector_tables(self):
        """Initialize tables for vector storage"""
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        with get_db_connection(self.db_path) as (_conn, cursor):
            # Add vector and metadata columns to concepts table
            try:
                cursor.execute("ALTER TABLE concepts ADD COLUMN content_embedding BLOB")
                cursor.execute("ALTER TABLE concepts ADD COLUMN embedding_model TEXT")
                cursor.execute("ALTER TABLE concepts ADD COLUMN metadata TEXT")
            except sqlite3.OperationalError:
                # Column already exists
                pass

            # Create content_chunks table with embeddings
            cursor.execute(
                """
            CREATE TABLE IF NOT EXISTS content_chunks (
                id TEXT PRIMARY KEY,
                concept_id TEXT REFERENCES concepts(id),
                chunk_text TEXT,
                chunk_embedding BLOB,
                embedding_model TEXT,
                chunk_index INTEGER,
                metadata TEXT
            )
            """
            )

            # Create conversation history table with embeddings
            cursor.execute(
                """
            CREATE TABLE IF NOT EXISTS conversation_history (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES user_profiles(id),
                conversation_embedding BLOB,
                conversation_text TEXT,
                embedding_model TEXT,
                timestamp TEXT,
                context_tags TEXT,
                metadata TEXT
            )
            """
            )

            # Create indexes for vector search performance
            # Note: SQLite-VSS provides specific functions for vector similarity

    def store_embedding(self, table: str, record_id: str, vector: List[float], model: str, record_uuid: Optional[str] = None):
        """Store vector embedding in the specified table"""
        # Convert vector to binary format for storage
        vector_binary = np.array(vector, dtype=np.float32).tobytes()

        if table == "concepts":
            query = """
                UPDATE concepts
                SET content_embedding = ?, embedding_model = ?
                WHERE id = ?
            """
            execute_non_query(self.db_path, query, (vector_binary, model, record_id))
        elif table == "content_chunks":
            # Implementation for content_chunks table
            query = """
                INSERT OR REPLACE INTO content_chunks
                (id, concept_id, chunk_text, chunk_embedding, embedding_model, chunk_index)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            execute_non_query(self.db_path, query, (record_id, "", "", vector_binary, model, 0))
        elif table == "conversation_history":
            # Implementation for conversation_history table
            query = """
                INSERT OR REPLACE INTO conversation_history
                (id, user_id, conversation_embedding, conversation_text, embedding_model, timestamp, context_tags)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            execute_non_query(self.db_path, query, (record_id, "", vector_binary, "", model, datetime.now().isoformat(), ""))
        else:
            raise ValueError(f"Unknown table: {table}")

    def get_embedding(self, table: str, record_id: str) -> Optional[List[float]]:
        """Retrieve vector embedding from the specified table"""
        if table == "concepts":
            query = "SELECT content_embedding FROM concepts WHERE id = ?"
        elif table == "content_chunks":
            query = "SELECT chunk_embedding FROM content_chunks WHERE id = ?"
        elif table == "conversation_history":
            query = "SELECT conversation_embedding FROM conversation_history WHERE id = ?"
        else:
            raise ValueError(f"Unknown table: {table}")

        result = execute_query(self.db_path, query, (record_id,), fetch_one=True)

        if result and result.get(
            "content_embedding"
            if table == "concepts"
            else result.get("chunk_embedding")
            if table == "content_chunks"
            else result.get("conversation_embedding")
        ):
            # Convert binary data back to list of floats
            embedding_data = (
                result.get("content_embedding")
                if table == "concepts"
                else result.get("chunk_embedding")
                if table == "content_chunks"
                else result.get("conversation_embedding")
            )
            vector_array = np.frombuffer(embedding_data, dtype=np.float32)
            return vector_array.tolist()
        return None

    def _init_indexes(self):
        """Initialize indexes for vector search performance"""
        with get_db_connection(self.db_path) as (_conn, cursor):
            # Create indexes for common queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_concepts_embedding_model ON concepts(embedding_model)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_chunks_concept_id ON content_chunks(concept_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_chunks_embedding_model ON content_chunks(embedding_model)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation_history(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversation_timestamp ON conversation_history(timestamp)")

    def store_embedding(self, table: str, record_id: str, vector: List[float], model: str,
                       metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Store vector embedding in the specified table with metadata"""
        try:
            # Validate vector dimension
            if len(vector) != self.embedding_dimension:
                raise ValueError(f"Vector dimension mismatch: expected {self.embedding_dimension}, got {len(vector)}")

            # Convert vector to binary format for storage
            vector_binary = np.array(vector, dtype=np.float32).tobytes()
            metadata_json = json.dumps(metadata) if metadata else "{}"

            if table == "concepts":
                query = """
                    UPDATE concepts
                    SET content_embedding = ?, embedding_model = ?, metadata = ?
                    WHERE id = ?
                """
                execute_non_query(self.db_path, query, (vector_binary, model, metadata_json, record_id))
            elif table == "content_chunks":
                # Implementation for content_chunks table
                query = """
                    INSERT OR REPLACE INTO content_chunks
                    (id, concept_id, chunk_text, chunk_embedding, embedding_model, chunk_index, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                execute_non_query(self.db_path, query, (
                    record_id,
                    metadata.get("concept_id", "") if metadata else "",
                    metadata.get("chunk_text", "") if metadata else "",
                    vector_binary,
                    model,
                    metadata.get("chunk_index", 0) if metadata else 0,
                    metadata_json
                ))
            elif table == "conversation_history":
                # Implementation for conversation_history table
                query = """
                    INSERT OR REPLACE INTO conversation_history
                    (id, user_id, conversation_embedding, conversation_text, embedding_model,
                     timestamp, context_tags, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """
                execute_non_query(self.db_path, query, (
                    record_id,
                    metadata.get("user_id", "") if metadata else "",
                    vector_binary,
                    metadata.get("conversation_text", "") if metadata else "",
                    model,
                    datetime.now().isoformat(),
                    json.dumps(metadata.get("context_tags", [])) if metadata else "[]",
                    metadata_json
                ))
            else:
                raise ValueError(f"Unknown table: {table}")

            # Clear similarity cache for this table
            cache_key = f"{table}_similar"
            if cache_key in self.similarity_cache:
                del self.similarity_cache[cache_key]

            return True
        except Exception as e:
            print(f"Error storing embedding: {e}")
            return False

    def chunk_content(self, content: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split content into overlapping chunks for better semantic search."""
        if len(content) <= chunk_size:
            return [content]

        chunks = []
        start = 0

        while start < len(content):
            end = start + chunk_size
            if end > len(content):
                end = len(content)

            chunk = content[start:end]
            chunks.append(chunk)

            if end == len(content):
                break

            start = end - overlap

        return chunks

    def store_content_chunks(self, concept_id: str, content: str, model: str,
                           chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Chunk content and store embeddings for each chunk."""
        chunks = self.chunk_content(content, chunk_size, overlap)
        chunk_ids = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{concept_id}_chunk_{i}"
            metadata = {
                "concept_id": concept_id,
                "chunk_text": chunk,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }

            # Note: In a real implementation, you would generate embeddings here
            # For now, we'll store a placeholder
            placeholder_embedding = [0.0] * self.embedding_dimension
            self.store_embedding("content_chunks", chunk_id, placeholder_embedding, model, metadata)
            chunk_ids.append(chunk_id)

        return chunk_ids

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must be of the same length")

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def find_similar_by_embedding(self, table: str, query_embedding: List[float],
                                 top_k: int = 10, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find similar items based on embedding similarity using cosine similarity."""
        # Check cache first
        cache_key = f"{table}_similar_{hash(str(query_embedding))}_{top_k}_{threshold}"
        if cache_key in self.similarity_cache:
            cached_result, timestamp = self.similarity_cache[cache_key]
            if datetime.now() - timestamp < self.cache_expiry:
                return cached_result

        try:
            # Get all embeddings from the specified table
            if table == "concepts":
                query = """
                    SELECT id, title, content, content_embedding, embedding_model, metadata
                    FROM concepts
                    WHERE content_embedding IS NOT NULL
                """
            elif table == "content_chunks":
                query = """
                    SELECT id, concept_id, chunk_text, chunk_embedding, embedding_model, chunk_index, metadata
                    FROM content_chunks
                    WHERE chunk_embedding IS NOT NULL
                """
            elif table == "conversation_history":
                query = """
                    SELECT id, user_id, conversation_text, conversation_embedding, embedding_model, timestamp, metadata
                    FROM conversation_history
                    WHERE conversation_embedding IS NOT NULL
                """
            else:
                raise ValueError(f"Unknown table: {table}")

            results = execute_query(self.db_path, query)
            similarities = []

            # Calculate similarity for each result
            for result in results:
                if table == "concepts":
                    embedding_data = result.get("content_embedding")
                elif table == "content_chunks":
                    embedding_data = result.get("chunk_embedding")
                else:
                    embedding_data = result.get("conversation_embedding")

                if embedding_data:
                    # Convert binary data back to list of floats
                    stored_embedding = np.frombuffer(embedding_data, dtype=np.float32).tolist()

                    # Calculate cosine similarity
                    similarity = self.cosine_similarity(query_embedding, stored_embedding)

                    if similarity >= threshold:
                        similarities.append({
                            "id": result["id"],
                            "similarity": similarity,
                            **{k: v for k, v in result.items() if k != f"{table.split('_')[0]}_embedding"}
                        })

            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            result = similarities[:top_k]

            # Cache the result
            self.similarity_cache[cache_key] = (result, datetime.now())

            return result

        except Exception as e:
            print(f"Error finding similar embeddings: {e}")
            return []

    def semantic_search(self, query: str, table: str, embedding_function,
                       top_k: int = 10, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Perform semantic search using query text."""
        try:
            # Generate embedding for the query
            query_embedding = embedding_function(query)

            # Find similar items
            return self.find_similar_by_embedding(table, query_embedding, top_k, threshold)
        except Exception as e:
            print(f"Error performing semantic search: {e}")
            return []

    def hybrid_search(self, query: str, table: str, embedding_function,
                     keyword_filter: Optional[str] = None, top_k: int = 10) -> List[Dict[str, Any]]:
        """Perform hybrid search combining semantic and keyword search."""
        try:
            # Semantic search
            semantic_results = self.semantic_search(query, table, embedding_function, top_k * 2)

            # Apply keyword filter if provided
            if keyword_filter:
                semantic_results = [
                    result for result in semantic_results
                    if keyword_filter.lower() in str(result.get("content", "")).lower() or
                       keyword_filter.lower() in str(result.get("title", "")).lower() or
                       keyword_filter.lower() in str(result.get("chunk_text", "")).lower()
                ]

            return semantic_results[:top_k]
        except Exception as e:
            print(f"Error performing hybrid search: {e}")
            return []

    def find_related_concepts(self, concept_id: str, embedding_function,
                            top_k: int = 5) -> List[Dict[str, Any]]:
        """Find concepts related to a given concept."""
        try:
            # Get the concept's embedding
            concept_embedding_data = self.get_embedding("concepts", concept_id)
            if not concept_embedding_data:
                return []

            # Find similar concepts, excluding the concept itself
            similar_concepts = self.find_similar_by_embedding("concepts", concept_embedding_data, top_k + 1)
            return [concept for concept in similar_concepts if concept["id"] != concept_id][:top_k]
        except Exception as e:
            print(f"Error finding related concepts: {e}")
            return []

    def search_conversation_history(self, user_id: str, query: str, embedding_function,
                                  days_back: int = 30, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search user's conversation history semantically."""
        try:
            # Calculate the date threshold
            threshold_date = (datetime.now() - timedelta(days=days_back)).isoformat()

            # Get recent conversation embeddings
            query_sql = """
                SELECT id, user_id, conversation_text, conversation_embedding, embedding_model, timestamp, metadata
                FROM conversation_history
                WHERE user_id = ? AND timestamp >= ? AND conversation_embedding IS NOT NULL
                ORDER BY timestamp DESC
            """
            results = execute_query(self.db_path, query_sql, (user_id, threshold_date))

            if not results:
                return []

            # Generate query embedding
            query_embedding = embedding_function(query)

            # Calculate similarities
            similarities = []
            for result in results:
                embedding_data = result.get("conversation_embedding")
                if embedding_data:
                    stored_embedding = np.frombuffer(embedding_data, dtype=np.float32).tolist()
                    similarity = self.cosine_similarity(query_embedding, stored_embedding)

                    if similarity >= 0.5:  # Lower threshold for conversations
                        similarities.append({
                            "id": result["id"],
                            "similarity": similarity,
                            "timestamp": result["timestamp"],
                            "conversation_text": result["conversation_text"],
                            "metadata": json.loads(result.get("metadata", "{}"))
                        })

            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            return similarities[:top_k]

        except Exception as e:
            print(f"Error searching conversation history: {e}")
            return []

    def get_embedding_statistics(self, table: str) -> Dict[str, Any]:
        """Get statistics about embeddings in the specified table."""
        try:
            if table == "concepts":
                query = "SELECT COUNT(*) as total, COUNT(content_embedding) as with_embeddings FROM concepts"
            elif table == "content_chunks":
                query = "SELECT COUNT(*) as total, COUNT(chunk_embedding) as with_embeddings FROM content_chunks"
            elif table == "conversation_history":
                query = "SELECT COUNT(*) as total, COUNT(conversation_embedding) as with_embeddings FROM conversation_history"
            else:
                raise ValueError(f"Unknown table: {table}")

            result = execute_query(self.db_path, query, fetch_one=True)

            if result:
                total = result["total"]
                with_embeddings = result["with_embeddings"]
                return {
                    "total_records": total,
                    "with_embeddings": with_embeddings,
                    "coverage_percentage": (with_embeddings / total * 100) if total > 0 else 0,
                    "table": table
                }

            return {"total_records": 0, "with_embeddings": 0, "coverage_percentage": 0, "table": table}

        except Exception as e:
            print(f"Error getting embedding statistics: {e}")
            return {"total_records": 0, "with_embeddings": 0, "coverage_percentage": 0, "table": table, "error": str(e)}

    def cleanup_old_embeddings(self, table: str, days_old: int = 90) -> int:
        """Remove old embeddings to free up space."""
        try:
            threshold_date = (datetime.now() - timedelta(days=days_old)).isoformat()

            if table == "conversation_history":
                query = "DELETE FROM conversation_history WHERE timestamp < ?"
                result = execute_non_query(self.db_path, query, (threshold_date,))
                return result
            else:
                # For other tables, you might want to add timestamp columns
                return 0

        except Exception as e:
            print(f"Error cleaning up old embeddings: {e}")
            return 0

    def rebuild_similarity_cache(self):
        """Rebuild the similarity cache."""
        self.similarity_cache.clear()
        print("Similarity cache cleared and rebuilt")
