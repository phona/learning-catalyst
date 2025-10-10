"""
Long-term memory system for Learning Catalyst
Handles conversation history indexing, semantic retrieval, and memory consolidation
"""

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from src.data.vector_storage import VectorStorage


class LongTermMemory:
    """Manages long-term memory with semantic search and consolidation capabilities."""

    def __init__(self, vector_storage: VectorStorage, user_id: str):
        self.vector_storage = vector_storage
        self.user_id = user_id
        self.memory_retention_days = 365  # Default retention period
        self.decay_factor = 0.9  # Memory decay factor
        self.min_relevance_score = 0.5  # Minimum relevance score for retrieval
        self.consolidation_interval = 7  # Days between memory consolidation
        self._cache = {}
        self._cache_expiry = timedelta(hours=1)

    def store_conversation(self, conversation_id: str, conversation_text: str,
                         embedding_function, context_tags: Optional[List[str]] = None,
                         metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Store a conversation in long-term memory with semantic indexing."""
        try:
            # Generate conversation embedding
            embedding = embedding_function(conversation_text)

            # Prepare metadata
            conversation_metadata = {
                "user_id": self.user_id,
                "conversation_text": conversation_text,
                "context_tags": context_tags or [],
                "word_count": len(conversation_text.split()),
                "character_count": len(conversation_text),
                **(metadata or {})
            }

            # Store in vector storage
            success = self.vector_storage.store_embedding(
                table="conversation_history",
                record_id=conversation_id,
                vector=embedding,
                model="default",  # Would be actual model name
                metadata=conversation_metadata
            )

            if success:
                # Clear cache
                self._cache.clear()
                return True

            return False

        except Exception as e:
            print(f"Error storing conversation: {e}")
            return False

    def semantic_retrieval(self, query: str, embedding_function,
                          days_back: int = 30, top_k: int = 5,
                          context_filter: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Retrieve semantically similar conversations from long-term memory."""
        try:
            # Check cache first
            cache_key = f"semantic_search_{hash(query)}_{days_back}_{top_k}"
            if cache_key in self._cache:
                cached_result, timestamp = self._cache[cache_key]
                if datetime.now() - timestamp < self._cache_expiry:
                    return cached_result

            # Search conversation history
            results = self.vector_storage.search_conversation_history(
                user_id=self.user_id,
                query=query,
                embedding_function=embedding_function,
                days_back=days_back,
                top_k=top_k
            )

            # Apply context filter if provided
            if context_filter:
                filtered_results = []
                for result in results:
                    result_context = result.get("metadata", {}).get("context_tags", [])
                    if any(tag in result_context for tag in context_filter):
                        filtered_results.append(result)
                results = filtered_results

            # Apply time decay to relevance scores
            current_time = datetime.now()
            for result in results:
                timestamp_str = result.get("timestamp", "")
                if timestamp_str:
                    try:
                        conversation_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        days_ago = (current_time - conversation_time).days
                        decay_multiplier = self.decay_factor ** (days_ago / 30)  # Monthly decay
                        result["time_adjusted_similarity"] = result["similarity"] * decay_multiplier
                    except:
                        result["time_adjusted_similarity"] = result["similarity"]
                else:
                    result["time_adjusted_similarity"] = result["similarity"]

            # Sort by time-adjusted similarity
            results.sort(key=lambda x: x["time_adjusted_similarity"], reverse=True)

            # Filter by minimum relevance score
            filtered_results = [
                result for result in results
                if result["time_adjusted_similarity"] >= self.min_relevance_score
            ]

            # Cache the result
            self._cache[cache_key] = (filtered_results, datetime.now())

            return filtered_results

        except Exception as e:
            print(f"Error in semantic retrieval: {e}")
            return []

    def get_conversation_context(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed context for a specific conversation."""
        try:
            embedding_data = self.vector_storage.get_embedding("conversation_history", conversation_id)
            if not embedding_data:
                return None

            # Get conversation metadata
            query = """
                SELECT id, user_id, conversation_text, embedding_model, timestamp, context_tags, metadata
                FROM conversation_history
                WHERE id = ? AND user_id = ?
            """
            result = self.vector_storage.db_manager.execute_query(query, (conversation_id, self.user_id), fetch_one=True)

            if result:
                return {
                    "conversation_id": conversation_id,
                    "text": result["conversation_text"],
                    "timestamp": result["timestamp"],
                    "context_tags": json.loads(result.get("context_tags", "[]")),
                    "metadata": json.loads(result.get("metadata", "{}")),
                    "embedding_available": True
                }

            return None

        except Exception as e:
            print(f"Error getting conversation context: {e}")
            return None

    def consolidate_memories(self, embedding_function) -> Dict[str, Any]:
        """Consolidate and optimize memory storage."""
        try:
            # Get old conversations that might need consolidation
            threshold_date = (datetime.now() - timedelta(days=self.consolidation_interval)).isoformat()

            query = """
                SELECT id, conversation_text, embedding_model, timestamp, metadata
                FROM conversation_history
                WHERE user_id = ? AND timestamp < ?
                ORDER BY timestamp DESC
            """
            old_conversations = self.vector_storage.db_manager.execute_query(
                query, (self.user_id, threshold_date)
            )

            if not old_conversations:
                return {"consolidated": 0, "removed": 0, "status": "no_old_memories"}

            # Group conversations by context tags and topics
            grouped_conversations = self._group_conversations_by_context(old_conversations)

            # Create consolidated memories for each group
            consolidated_count = 0
            removed_count = 0

            for group_id, conversations in grouped_conversations.items():
                if len(conversations) > 3:  # Only consolidate groups with multiple conversations
                    # Create consolidated memory
                    consolidated_text = self._create_consolidated_summary(conversations)
                    consolidated_embedding = embedding_function(consolidated_text)

                    # Store as consolidated memory
                    consolidated_id = f"consolidated_{group_id}_{datetime.now().strftime('%Y%m%d')}"
                    metadata = {
                        "user_id": self.user_id,
                        "type": "consolidated",
                        "original_conversation_count": len(conversations),
                        "date_range": {
                            "start": min(conv["timestamp"] for conv in conversations),
                            "end": max(conv["timestamp"] for conv in conversations)
                        },
                        "context_tags": list(set(
                            tag for conv in conversations
                            for tag in json.loads(conv.get("metadata", "{}")).get("context_tags", [])
                        ))
                    }

                    self.vector_storage.store_embedding(
                        table="conversation_history",
                        record_id=consolidated_id,
                        vector=consolidated_embedding,
                        model="default",
                        metadata=metadata
                    )

                    # Remove original conversations (keep only the most recent few)
                    for conversation in conversations[3:]:  # Keep latest 3, remove the rest
                        self._remove_conversation(conversation["id"])
                        removed_count += 1

                    consolidated_count += 1

            # Clear cache
            self._cache.clear()

            return {
                "consolidated": consolidated_count,
                "removed": removed_count,
                "status": "completed",
                "total_processed": len(old_conversations)
            }

        except Exception as e:
            print(f"Error consolidating memories: {e}")
            return {"consolidated": 0, "removed": 0, "status": "error", "error": str(e)}

    def _group_conversations_by_context(self, conversations: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group conversations by context tags and content similarity."""
        grouped = {}

        for conversation in conversations:
            metadata = json.loads(conversation.get("metadata", "{}"))
            context_tags = metadata.get("context_tags", [])

            # Create a group key based on context tags
            if context_tags:
                group_key = "_".join(sorted(context_tags))
            else:
                # If no context tags, group by topic (simplified - would use semantic clustering)
                group_key = f"topic_{hash(conversation['conversation_text'][:100]) % 1000}"

            if group_key not in grouped:
                grouped[group_key] = []
            grouped[group_key].append(conversation)

        return grouped

    def _create_consolidated_summary(self, conversations: List[Dict[str, Any]]) -> str:
        """Create a consolidated summary from multiple conversations."""
        # This is a simplified implementation
        # In a real system, you would use AI to generate a meaningful summary

        all_texts = [conv["conversation_text"] for conv in conversations]
        total_words = sum(len(text.split()) for text in all_texts)

        # Get main topics from context tags
        all_tags = []
        for conv in conversations:
            metadata = json.loads(conv.get("metadata", "{}"))
            all_tags.extend(metadata.get("context_tags", []))

        unique_tags = list(set(all_tags))

        # Create a simple consolidated summary
        summary = f"""Consolidated memory from {len(conversations)} conversations.

Topics covered: {', '.join(unique_tags) if unique_tags else 'General discussion'}
Total content: {total_words} words
Time span: {conversations[-1]['timestamp'][:10]} to {conversations[0]['timestamp'][:10]}

Key points extracted from recent conversations:
"""

        # Add snippets from most recent conversations
        for i, conv in enumerate(conversations[:3]):
            text_preview = conv["conversation_text"][:200] + "..." if len(conv["conversation_text"]) > 200 else conv["conversation_text"]
            summary += f"\n{i+1}. {conv['timestamp'][:10]}: {text_preview}"

        return summary

    def _remove_conversation(self, conversation_id: str) -> bool:
        """Remove a conversation from storage."""
        try:
            query = "DELETE FROM conversation_history WHERE id = ? AND user_id = ?"
            result = self.vector_storage.db_manager.execute_non_query(query, (conversation_id, self.user_id))
            return result > 0
        except Exception as e:
            print(f"Error removing conversation: {e}")
            return False

    def get_memory_statistics(self) -> Dict[str, Any]:
        """Get statistics about the user's long-term memory."""
        try:
            # Get basic statistics
            stats = self.vector_storage.get_embedding_statistics("conversation_history")

            # Get user-specific statistics
            query = """
                SELECT
                    COUNT(*) as total_conversations,
                    COUNT(CASE WHEN conversation_embedding IS NOT NULL THEN 1 END) as with_embeddings,
                    MIN(timestamp) as earliest_conversation,
                    MAX(timestamp) as latest_conversation,
                    AVG(LENGTH(conversation_text)) as avg_conversation_length
                FROM conversation_history
                WHERE user_id = ?
            """
            user_stats = self.vector_storage.db_manager.execute_query(query, (self.user_id,), fetch_one=True)

            if user_stats:
                # Calculate retention statistics
                current_time = datetime.now()
                if user_stats["earliest_conversation"]:
                    earliest_time = datetime.fromisoformat(user_stats["earliest_conversation"].replace("Z", "+00:00"))
                    retention_days = (current_time - earliest_time).days
                else:
                    retention_days = 0

                # Calculate coverage by time periods
                last_week = (current_time - timedelta(days=7)).isoformat()
                last_month = (current_time - timedelta(days=30)).isoformat()

                week_query = "SELECT COUNT(*) FROM conversation_history WHERE user_id = ? AND timestamp >= ?"
                month_query = "SELECT COUNT(*) FROM conversation_history WHERE user_id = ? AND timestamp >= ?"

                week_count = self.vector_storage.db_manager.execute_query(week_query, (self.user_id, last_week), fetch_one=True)["COUNT(*)"]
                month_count = self.vector_storage.db_manager.execute_query(month_query, (self.user_id, last_month), fetch_one=True)["COUNT(*)"]

                return {
                    "total_conversations": user_stats["total_conversations"],
                    "with_embeddings": user_stats["with_embeddings"],
                    "embedding_coverage": (user_stats["with_embeddings"] / user_stats["total_conversations"] * 100) if user_stats["total_conversations"] > 0 else 0,
                    "retention_days": retention_days,
                    "avg_conversation_length": user_stats["avg_conversation_length"] or 0,
                    "conversations_last_week": week_count,
                    "conversations_last_month": month_count,
                    "earliest_conversation": user_stats["earliest_conversation"],
                    "latest_conversation": user_stats["latest_conversation"],
                    "cache_entries": len(self._cache)
                }

            return stats

        except Exception as e:
            print(f"Error getting memory statistics: {e}")
            return {"error": str(e)}

    def cleanup_expired_memories(self) -> int:
        """Remove memories older than the retention period."""
        try:
            threshold_date = (datetime.now() - timedelta(days=self.memory_retention_days)).isoformat()

            # Get count before deletion
            count_query = "SELECT COUNT(*) FROM conversation_history WHERE user_id = ? AND timestamp < ?"
            result = self.vector_storage.db_manager.execute_query(count_query, (self.user_id, threshold_date), fetch_one=True)
            expired_count = result["COUNT(*)"] if result else 0

            if expired_count > 0:
                # Delete expired memories
                delete_query = "DELETE FROM conversation_history WHERE user_id = ? AND timestamp < ?"
                self.vector_storage.db_manager.execute_non_query(delete_query, (self.user_id, threshold_date))

                # Clear cache
                self._cache.clear()

            return expired_count

        except Exception as e:
            print(f"Error cleaning up expired memories: {e}")
            return 0

    def get_memory_timeline(self, days_back: int = 30) -> List[Dict[str, Any]]:
        """Get a timeline of memories for visualization."""
        try:
            threshold_date = (datetime.now() - timedelta(days=days_back)).isoformat()

            query = """
                SELECT id, conversation_text, timestamp, context_tags, metadata
                FROM conversation_history
                WHERE user_id = ? AND timestamp >= ?
                ORDER BY timestamp DESC
            """
            results = self.vector_storage.db_manager.execute_query(query, (self.user_id, threshold_date))

            timeline = []
            for result in results:
                metadata = json.loads(result.get("metadata", "{}"))
                timeline.append({
                    "id": result["id"],
                    "date": result["timestamp"][:10],
                    "time": result["timestamp"][11:19],
                    "word_count": metadata.get("word_count", 0),
                    "context_tags": metadata.get("context_tags", []),
                    "preview": result["conversation_text"][:100] + "..." if len(result["conversation_text"]) > 100 else result["conversation_text"]
                })

            return timeline

        except Exception as e:
            print(f"Error getting memory timeline: {e}")
            return []

    def export_memory_data(self, format: str = "json") -> str:
        """Export memory data in specified format."""
        try:
            # Get all user conversations
            query = """
                SELECT id, conversation_text, timestamp, context_tags, metadata
                FROM conversation_history
                WHERE user_id = ?
                ORDER BY timestamp DESC
            """
            results = self.vector_storage.db_manager.execute_query(query, (self.user_id,))

            if format.lower() == "json":
                export_data = {
                    "user_id": self.user_id,
                    "export_timestamp": datetime.now().isoformat(),
                    "total_conversations": len(results),
                    "conversations": []
                }

                for result in results:
                    export_data["conversations"].append({
                        "id": result["id"],
                        "text": result["conversation_text"],
                        "timestamp": result["timestamp"],
                        "context_tags": json.loads(result.get("context_tags", "[]")),
                        "metadata": json.loads(result.get("metadata", "{}"))
                    })

                return json.dumps(export_data, indent=2)

            elif format.lower() == "csv":
                csv_lines = ["id,timestamp,word_count,context_tags,preview"]
                for result in results:
                    metadata = json.loads(result.get("metadata", "{}"))
                    word_count = metadata.get("word_count", 0)
                    context_tags = ";".join(metadata.get("context_tags", []))
                    preview = result["conversation_text"][:50].replace("\n", " ").replace(",", ";")
                    csv_lines.append(f"{result['id']},{result['timestamp']},{word_count},{context_tags},{preview}")

                return "\n".join(csv_lines)

            else:
                # Text format
                lines = [f"Memory Export for User: {self.user_id}"]
                lines.append(f"Exported: {datetime.now().isoformat()}")
                lines.append(f"Total Conversations: {len(results)}")
                lines.append("\n" + "="*50 + "\n")

                for result in results:
                    lines.append(f"ID: {result['id']}")
                    lines.append(f"Timestamp: {result['timestamp']}")
                    metadata = json.loads(result.get("metadata", "{}"))
                    if metadata.get("context_tags"):
                        lines.append(f"Tags: {', '.join(metadata['context_tags'])}")
                    lines.append(f"Text: {result['conversation_text'][:200]}...")
                    lines.append("\n" + "-"*30 + "\n")

                return "\n".join(lines)

        except Exception as e:
            print(f"Error exporting memory data: {e}")
            return f"Error exporting memory data: {str(e)}"

    def clear_cache(self):
        """Clear the internal cache."""
        self._cache.clear()

    def update_settings(self, retention_days: Optional[int] = None,
                       decay_factor: Optional[float] = None,
                       min_relevance_score: Optional[float] = None):
        """Update memory settings."""
        if retention_days is not None:
            self.memory_retention_days = retention_days
        if decay_factor is not None:
            self.decay_factor = max(0.1, min(1.0, decay_factor))
        if min_relevance_score is not None:
            self.min_relevance_score = max(0.0, min(1.0, min_relevance_score))

        # Clear cache to apply new settings
        self.clear_cache()