"""
Unit tests for database layer
"""

import sqlite3

import pytest

from src.data.database_manager import DatabaseManager
from src.data.models.concept import Concept
from src.data.vector_storage import VectorStorage


class TestDatabaseManager:
    def test_database_manager_initialization(self, temp_workspace):
        """Test database manager initialization"""
        db_path = temp_workspace / ".learningspace" / "data.db"
        db_manager = DatabaseManager(str(db_path))

        assert db_manager.db_path == str(db_path)
        # Verify database was initialized by checking if tables exist
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check if required tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        table_names = [row[0] for row in cursor.fetchall()]

        expected_tables = ["user_profiles", "qa_history", "checkpoints", "concepts", "token_usage"]
        for table in expected_tables:
            assert table in table_names

        conn.close()

    def test_insert_token_usage(self, db_manager):
        """Test inserting token usage record"""
        # Use the actual database manager fixture
        db_manager.insert_token_usage(
            model_name="gpt-4",
            provider="openai",
            input_tokens=50,
            output_tokens=100,
            user_id="user123",
            context="explanation",
        )

        # Verify the record was inserted by querying the database
        conn = sqlite3.connect(db_manager.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM token_usage WHERE user_id = ?", ("user123",))
        result = cursor.fetchone()

        assert result is not None
        assert result[1] == "gpt-4"  # model_name
        assert result[2] == "openai"  # provider
        assert result[3] == 50  # input_tokens
        assert result[4] == 100  # output_tokens
        assert result[5] == 150  # total_tokens (50+100)
        assert result[7] == "user123"  # user_id
        assert result[8] == "explanation"  # context

        conn.close()

    def test_get_token_usage_summary(self, db_manager):
        """Test getting token usage summary"""
        # Insert a test record first
        db_manager.insert_token_usage(
            model_name="gpt-4",
            provider="openai",
            input_tokens=50,
            output_tokens=100,
            user_id="user123",
            context="explanation",
        )

        # Get the summary
        summary = db_manager.get_token_usage_summary(user_id="user123", start_date="2020-01-01", end_date="2030-01-01")

        assert summary["input_tokens"] == 50
        assert summary["output_tokens"] == 100
        assert summary["total_tokens"] == 150

    def test_save_and_get_user_profile(self, db_manager, sample_user_profile):
        """Test saving and retrieving user profile"""
        # Save the profile
        db_manager.save_user_profile(sample_user_profile)

        # Retrieve the profile
        retrieved_profile = db_manager.get_user_profile("test_user_001")

        assert retrieved_profile.id == sample_user_profile.id
        assert retrieved_profile.created_at == sample_user_profile.created_at
        assert retrieved_profile.preferences == sample_user_profile.preferences
        assert retrieved_profile.competency_profile == sample_user_profile.competency_profile
        assert retrieved_profile.ai_config == sample_user_profile.ai_config
        assert retrieved_profile.current_checkpoint_id == sample_user_profile.current_checkpoint_id

    def test_save_and_get_concept(self, db_manager, sample_concept):
        """Test saving and retrieving concept"""
        # Save the concept
        db_manager.save_concept(sample_concept)

        # Retrieve the concept
        retrieved_concept = db_manager.get_concept("test_concept_001")

        assert retrieved_concept.id == sample_concept.id
        assert retrieved_concept.title == sample_concept.title
        assert retrieved_concept.content == sample_concept.content
        assert retrieved_concept.prerequisites == sample_concept.prerequisites
        assert retrieved_concept.difficulty_level == sample_concept.difficulty_level

    def test_get_all_concepts(self, db_manager, sample_concept):
        """Test retrieving all concepts"""
        # Save the concept
        db_manager.save_concept(sample_concept)

        # Retrieve all concepts
        concepts = db_manager.get_all_concepts()

        assert len(concepts) == 1
        assert concepts[0].id == sample_concept.id
        assert concepts[0].title == sample_concept.title


class TestVectorStorage:
    def test_vector_storage_initialization(self, temp_workspace):
        """Test vector storage initialization"""
        db_path = temp_workspace / ".learningspace" / "data.db"

        # Create database manager first to ensure tables exist
        DatabaseManager(str(db_path))

        # Initialize vector storage
        VectorStorage(str(db_path))

        # Check that vector-related tables exist
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check if required tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        table_names = [row[0] for row in cursor.fetchall()]

        expected_tables = ["content_chunks", "conversation_history"]
        for table in expected_tables:
            assert table in table_names

        conn.close()

    def test_store_and_get_embedding(self, temp_workspace):
        """Test storing and retrieving embeddings"""
        db_path = temp_workspace / ".learningspace" / "data.db"

        # Initialize database and vector storage
        db_manager = DatabaseManager(str(db_path))
        vector_storage = VectorStorage(str(db_path))

        # Create a test concept first (required for storing embedding)
        test_concept = Concept(
            id="test_embedding_001",
            title="Test Concept",
            content="This is a test concept for embedding.",
            prerequisites=[],
            difficulty_level=5,
        )
        db_manager.save_concept(test_concept)

        # Test embedding
        test_embedding = [0.1, 0.2, 0.3, 0.4]
        test_id = "test_embedding_001"
        test_model = "test_model"

        # Store embedding
        vector_storage.store_embedding(table="concepts", record_id=test_id, vector=test_embedding, model=test_model)

        # Retrieve embedding
        retrieved_embedding = vector_storage.get_embedding(table="concepts", record_id=test_id)

        assert retrieved_embedding is not None
        assert len(retrieved_embedding) == len(test_embedding)
        for i, val in enumerate(test_embedding):
            # Allow for small floating point differences
            assert abs(retrieved_embedding[i] - val) < 0.0001

    def test_store_embedding_invalid_table(self, temp_workspace):
        """Test storing embedding with invalid table name"""
        db_path = temp_workspace / ".learningspace" / "data.db"
        vector_storage = VectorStorage(str(db_path))

        with pytest.raises(ValueError):
            vector_storage.store_embedding(table="invalid_table", record_id="test_id", vector=[0.1, 0.2], model="test_model")

    def test_find_similar_by_embedding(self, temp_workspace):
        """Test finding similar items by embedding"""
        db_path = temp_workspace / ".learningspace" / "data.db"
        vector_storage = VectorStorage(str(db_path))

        # This test is limited since we don't have SQLite-VSS in the test environment
        # The implementation returns empty results for now
        results = vector_storage.find_similar_by_embedding(table="concepts", query_embedding=[0.1, 0.2, 0.3], top_k=5)

        # For now, just verify it returns a list (empty in test environment)
        assert isinstance(results, list)


if __name__ == "__main__":
    pytest.main([__file__])
