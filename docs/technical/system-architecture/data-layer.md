# Data Layer Architecture

---
title: Learning Catalyst Data Layer Architecture
description: Data storage, persistence, and management patterns
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This document covers Learning Catalyst's data layer architecture, including database design, data persistence patterns, caching strategies, and integration with various storage systems. The data layer ensures reliable storage of user progress, learning content, and system configuration while maintaining privacy and performance.

## Data Architecture Overview

### High-Level Data Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    CLI Interface Layer                      │
│                    User interactions                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Logic Layer                             │
│                 Business logic processing                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ SQLite DB       │  │ Vector DB      │  │ Local Files  │  │
│  │ (Q&A History,   │  │ (Content       │  │ (Markdown)   │  │
│  │ Concepts,       │  │ Retrieval)     │  │              │  │
│  │ Proficiency)    │  │ (Phase 3+)     │  │              │  │
│  └─────────────────┘  └────────────────┘  └──────────────┘  │
│                              │                                │
│  ┌─────────────────┐         │                                │
│  │ Configuration   │         ▼                                │
│  │ Files           │  ┌────────────────┐                    │
│  │ (.toml/.json)   │  │ Cache Layer    │                    │
│  └─────────────────┘  │ (Response,     │                    │
│                       │ Session Data)  │                    │
│                       └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Database Design

### SQLite Database Schema

The primary data storage uses SQLite for local-first data persistence with the following schema:

```sql
-- User profiles and preferences
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_provider TEXT,
    selected_model TEXT,
    preferences TEXT, -- JSON formatted preferences
    settings TEXT     -- JSON formatted settings
);

-- Q&A history and learning interactions
CREATE TABLE qa_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interaction_type TEXT NOT NULL, -- 'question', 'answer', 'explanation', 'quiz'
    input_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    context_data TEXT, -- JSON formatted context
    model_used TEXT,
    provider_used TEXT,
    tokens_used INTEGER,
    metadata TEXT, -- JSON formatted metadata
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- Learning concepts and knowledge graph
CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source_files TEXT, -- JSON array of source file paths
    difficulty_level INTEGER DEFAULT 1,
    estimated_time_minutes INTEGER,
    prerequisites TEXT, -- JSON array of prerequisite concept IDs
    related_concepts TEXT, -- JSON array of related concept IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT -- JSON formatted additional data
);

-- User proficiency tracking
CREATE TABLE user_proficiency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    proficiency_score REAL DEFAULT 0.0, -- 0.0 to 1.0
    confidence_level REAL DEFAULT 0.0, -- 0.0 to 1.0
    last_practiced TIMESTAMP,
    practice_count INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    strength_history TEXT, -- JSON array of historical scores
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
    FOREIGN KEY (concept_id) REFERENCES concepts(id),
    UNIQUE(user_id, concept_id)
);

-- Token usage tracking for cost management
CREATE TABLE token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost_estimate REAL, -- Estimated cost in USD
    context_type TEXT, -- 'explanation', 'quiz', 'chat', etc.
    session_id TEXT,
    metadata TEXT, -- JSON formatted additional data
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- Session management
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_data TEXT, -- JSON formatted session state
    checkpoint_data TEXT, -- JSON formatted checkpoints
    is_active BOOLEAN DEFAULT TRUE,
    metadata TEXT, -- JSON formatted additional data
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

-- Knowledge graph relationships
CREATE TABLE concept_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_concept_id TEXT NOT NULL,
    target_concept_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- 'prerequisite', 'related', 'builds_on', 'similar'
    strength REAL DEFAULT 1.0, -- 0.0 to 1.0 relationship strength
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_concept_id) REFERENCES concepts(id),
    FOREIGN KEY (target_concept_id) REFERENCES concepts(id),
    UNIQUE(source_concept_id, target_concept_id, relationship_type)
);
```

### Data Model Implementation

```python
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

@dataclass
class UserProfile:
    user_id: str
    selected_provider: Optional[str] = None
    selected_model: Optional[str] = None
    preferences: Dict[str, Any] = None
    settings: Dict[str, Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.preferences is None:
            self.preferences = {}
        if self.settings is None:
            self.settings = {}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserProfile':
        return cls(
            user_id=data['user_id'],
            selected_provider=data.get('selected_provider'),
            selected_model=data.get('selected_model'),
            preferences=json.loads(data.get('preferences', '{}')),
            settings=json.loads(data.get('settings', '{}')),
            created_at=datetime.fromisoformat(data['created_at']) if data.get('created_at') else None,
            updated_at=datetime.fromisoformat(data['updated_at']) if data.get('updated_at') else None
        )

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['preferences'] = json.dumps(self.preferences)
        data['settings'] = json.dumps(self.settings)
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        return data

@dataclass
class QAInteraction:
    user_id: str
    session_id: str
    interaction_type: str
    input_text: str
    response_text: str
    context_data: Dict[str, Any] = None
    model_used: Optional[str] = None
    provider_used: Optional[str] = None
    tokens_used: Optional[int] = None
    metadata: Dict[str, Any] = None
    timestamp: Optional[datetime] = None
    id: Optional[int] = None

    def __post_init__(self):
        if self.context_data is None:
            self.context_data = {}
        if self.metadata is None:
            self.metadata = {}

@dataclass
class Concept:
    id: str
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    source_files: List[str] = None
    difficulty_level: int = 1
    estimated_time_minutes: int = 30
    prerequisites: List[str] = None
    related_concepts: List[str] = None
    metadata: Dict[str, Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.source_files is None:
            self.source_files = []
        if self.prerequisites is None:
            self.prerequisites = []
        if self.related_concepts is None:
            self.related_concepts = []
        if self.metadata is None:
            self.metadata = {}
```

## Database Operations Layer

### Database Manager Implementation

```python
import sqlite3
from contextlib import contextmanager
from typing import List, Optional, Dict, Any
import os

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_database_exists()

    def _ensure_database_exists(self):
        """Create database and tables if they don't exist"""
        if not os.path.exists(os.path.dirname(self.db_path)):
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        with self.get_connection() as conn:
            conn.executescript("""
                -- User profiles table
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    selected_provider TEXT,
                    selected_model TEXT,
                    preferences TEXT,
                    settings TEXT
                );

                -- Q&A history table
                CREATE TABLE IF NOT EXISTS qa_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    interaction_type TEXT NOT NULL,
                    input_text TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    context_data TEXT,
                    model_used TEXT,
                    provider_used TEXT,
                    tokens_used INTEGER,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
                );

                -- Concepts table
                CREATE TABLE IF NOT EXISTS concepts (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    summary TEXT,
                    content TEXT,
                    source_files TEXT,
                    difficulty_level INTEGER DEFAULT 1,
                    estimated_time_minutes INTEGER,
                    prerequisites TEXT,
                    related_concepts TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                );

                -- User proficiency table
                CREATE TABLE IF NOT EXISTS user_proficiency (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    concept_id TEXT NOT NULL,
                    proficiency_score REAL DEFAULT 0.0,
                    confidence_level REAL DEFAULT 0.0,
                    last_practiced TIMESTAMP,
                    practice_count INTEGER DEFAULT 0,
                    correct_attempts INTEGER DEFAULT 0,
                    total_attempts INTEGER DEFAULT 0,
                    strength_history TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
                    FOREIGN KEY (concept_id) REFERENCES concepts(id),
                    UNIQUE(user_id, concept_id)
                );

                -- Token usage table
                CREATE TABLE IF NOT EXISTS token_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    total_tokens INTEGER,
                    cost_estimate REAL,
                    context_type TEXT,
                    session_id TEXT,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
                );

                -- Sessions table
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    session_data TEXT,
                    checkpoint_data TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
                );

                -- Concept relationships table
                CREATE TABLE IF NOT EXISTS concept_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_concept_id TEXT NOT NULL,
                    target_concept_id TEXT NOT NULL,
                    relationship_type TEXT NOT NULL,
                    strength REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_concept_id) REFERENCES concepts(id),
                    FOREIGN KEY (target_concept_id) REFERENCES concepts(id),
                    UNIQUE(source_concept_id, target_concept_id, relationship_type)
                );

                -- Create indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_qa_history_user_timestamp
                    ON qa_history(user_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_qa_history_session
                    ON qa_history(session_id);
                CREATE INDEX IF NOT EXISTS idx_user_proficiency_user_concept
                    ON user_proficiency(user_id, concept_id);
                CREATE INDEX IF NOT EXISTS idx_token_usage_user_timestamp
                    ON token_usage(user_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_sessions_user_active
                    ON sessions(user_id, is_active);
            """)

    @contextmanager
    def get_connection(self):
        """Get database connection with proper configuration"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
        conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key constraints
        try:
            yield conn
        finally:
            conn.close()

    def create_or_update_user(self, user_profile: UserProfile) -> UserProfile:
        """Create or update user profile"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT OR REPLACE INTO user_profiles
                (user_id, selected_provider, selected_model, preferences, settings, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                user_profile.user_id,
                user_profile.selected_provider,
                user_profile.selected_model,
                json.dumps(user_profile.preferences),
                json.dumps(user_profile.settings)
            ))

            # Return updated user profile
            return self.get_user(user_profile.user_id)

    def get_user(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile by ID"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM user_profiles WHERE user_id = ?
            """, (user_id,))

            row = cursor.fetchone()
            if row:
                return UserProfile.from_dict(dict(row))
            return None

    def save_qa_interaction(self, interaction: QAInteraction) -> int:
        """Save Q&A interaction to database"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO qa_history
                (user_id, session_id, interaction_type, input_text, response_text,
                 context_data, model_used, provider_used, tokens_used, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                interaction.user_id,
                interaction.session_id,
                interaction.interaction_type,
                interaction.input_text,
                interaction.response_text,
                json.dumps(interaction.context_data),
                interaction.model_used,
                interaction.provider_used,
                interaction.tokens_used,
                json.dumps(interaction.metadata)
            ))

            return cursor.lastrowid

    def get_conversation_history(self, user_id: str, limit: int = 50) -> List[QAInteraction]:
        """Get conversation history for a user"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM qa_history
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (user_id, limit))

            return [QAInteraction(**dict(row)) for row in cursor.fetchall()]
```

## Configuration Management

### Configuration File Structure

The system uses TOML configuration files for user preferences and settings:

```toml
# ~/.learning-catalyst/config.toml

[ai]
default_provider = "openai"
default_model = "gpt-4"
temperature = 0.7
max_tokens = 2000

[providers.openai]
api_key = "sk-..."
endpoint = "https://api.openai.com/v1"
timeout = 30
max_retries = 3

[providers.deepseek]
api_key = "sk-..."
endpoint = "https://api.deepseek.com/v1"
timeout = 30
max_retries = 3

[learning]
granularity = "summaries"  # "headers", "summaries", "full_content"
auto_save = true
session_timeout_minutes = 120

[ui]
theme = "dark"
show_token_usage = true
auto_scroll = true
command_suggestions = true

[privacy]
store_conversations = true
anonymize_usage_data = false
local_processing_only = false

[performance]
cache_enabled = true
cache_size_mb = 100
parallel_processing = true
```

### Configuration Manager Implementation

```python
import toml
import os
from pathlib import Path
from typing import Dict, Any, Optional

class ConfigurationManager:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = os.path.expanduser("~/.learning-catalyst/config.toml")

        self.config_path = config_path
        self._ensure_config_directory()
        self.config = self._load_config()

    def _ensure_config_directory(self):
        """Ensure config directory exists"""
        config_dir = os.path.dirname(self.config_path)
        if not os.path.exists(config_dir):
            os.makedirs(config_dir, exist_ok=True)

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or create default"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    return toml.load(f)
            except toml.TomlDecodeError as e:
                print(f"Error parsing config file: {e}")
                return self._get_default_config()
        else:
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 2000
            },
            "providers": {},
            "learning": {
                "granularity": "summaries",
                "auto_save": True,
                "session_timeout_minutes": 120
            },
            "ui": {
                "theme": "dark",
                "show_token_usage": True,
                "auto_scroll": True,
                "command_suggestions": True
            },
            "privacy": {
                "store_conversations": True,
                "anonymize_usage_data": False,
                "local_processing_only": False
            },
            "performance": {
                "cache_enabled": True,
                "cache_size_mb": 100,
                "parallel_processing": True
            }
        }

    def save_config(self):
        """Save current configuration to file"""
        with open(self.config_path, 'w') as f:
            toml.dump(self.config, f)

    def get(self, key_path: str, default: Any = None) -> Any:
        """Get configuration value using dot notation (e.g., 'ai.default_provider')"""
        keys = key_path.split('.')
        value = self.config

        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default

        return value

    def set(self, key_path: str, value: Any):
        """Set configuration value using dot notation"""
        keys = key_path.split('.')
        config = self.config

        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]

        config[keys[-1]] = value
        self.save_config()

    def add_provider(self, provider_name: str, config: Dict[str, Any]):
        """Add AI provider configuration"""
        if "providers" not in self.config:
            self.config["providers"] = {}

        self.config["providers"][provider_name] = config
        self.save_config()

    def get_provider_config(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """Get provider configuration"""
        return self.config.get("providers", {}).get(provider_name)
```

## Caching Layer

### Cache Architecture

```python
import json
import time
from typing import Any, Optional, Dict
from pathlib import Path

class CacheManager:
    def __init__(self, cache_dir: str, max_size_mb: int = 100):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.max_size_mb = max_size_mb
        self.index_file = self.cache_dir / "cache_index.json"
        self.cache_index = self._load_cache_index()

    def _load_cache_index(self) -> Dict[str, Dict[str, Any]]:
        """Load cache index from disk"""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                pass
        return {}

    def _save_cache_index(self):
        """Save cache index to disk"""
        with open(self.index_file, 'w') as f:
            json.dump(self.cache_index, f, indent=2)

    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        if key not in self.cache_index:
            return None

        cache_file = self.cache_dir / f"{key}.cache"
        if not cache_file.exists():
            # Clean up index entry
            del self.cache_index[key]
            self._save_cache_index()
            return None

        # Check if cache is expired
        cache_info = self.cache_index[key]
        if time.time() > cache_info['expires_at']:
            cache_file.unlink()
            del self.cache_index[key]
            self._save_cache_index()
            return None

        # Load cached value
        try:
            with open(cache_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            # Clean up corrupted cache
            if cache_file.exists():
                cache_file.unlink()
            del self.cache_index[key]
            self._save_cache_index()
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        """Set cached value with TTL"""
        cache_file = self.cache_dir / f"{key}.cache"

        # Save value to cache file
        with open(cache_file, 'w') as f:
            json.dump(value, f)

        # Update index
        self.cache_index[key] = {
            'created_at': time.time(),
            'expires_at': time.time() + ttl_seconds,
            'size_bytes': cache_file.stat().st_size
        }

        self._save_cache_index()
        self._cleanup_if_needed()

    def _cleanup_if_needed(self):
        """Clean up cache if it exceeds size limit"""
        total_size = sum(info['size_bytes'] for info in self.cache_index.values())
        max_size_bytes = self.max_size_mb * 1024 * 1024

        if total_size > max_size_bytes:
            # Sort by creation time (oldest first)
            sorted_items = sorted(
                self.cache_index.items(),
                key=lambda x: x[1]['created_at']
            )

            # Remove oldest items until under limit
            for key, info in sorted_items:
                cache_file = self.cache_dir / f"{key}.cache"
                if cache_file.exists():
                    cache_file.unlink()

                del self.cache_index[key]
                total_size -= info['size_bytes']

                if total_size <= max_size_bytes * 0.8:  # Leave 20% headroom
                    break

            self._save_cache_index()
```

## Performance Optimization

### Database Performance Patterns

```python
class DatabaseOptimizer:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    def optimize_queries(self):
        """Optimize common database queries"""
        with self.db_manager.get_connection() as conn:
            # Analyze query performance
            conn.execute("ANALYZE")

            # Create additional indexes for performance
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_qa_history_user_type_timestamp
                ON qa_history(user_id, interaction_type, timestamp)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_concepts_difficulty
                ON concepts(difficulty_level)
            """)

    def cleanup_old_data(self, days_to_keep: int = 90):
        """Clean up old data to maintain performance"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)

        with self.db_manager.get_connection() as conn:
            # Clean up old Q&A history
            conn.execute("""
                DELETE FROM qa_history
                WHERE timestamp < ?
            """, (cutoff_date.isoformat(),))

            # Clean up inactive sessions
            conn.execute("""
                DELETE FROM sessions
                WHERE last_activity < ? AND is_active = FALSE
            """, (cutoff_date.isoformat(),))

    def backup_database(self, backup_path: str):
        """Create database backup"""
        with self.db_manager.get_connection() as source:
            backup = sqlite3.connect(backup_path)
            source.backup(backup)
            backup.close()
```

## Data Migration and Versioning

### Migration System

```python
class DatabaseMigration:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.migrations = {
            1: self._migration_v1_to_v2,
            2: self._migration_v2_to_v3,
            # Add future migrations here
        }

    def get_current_version(self) -> int:
        """Get current database version"""
        with self.db_manager.get_connection() as conn:
            try:
                cursor = conn.execute("PRAGMA user_version")
                return cursor.fetchone()[0]
            except sqlite3.Error:
                return 0

    def run_migrations(self):
        """Run all pending migrations"""
        current_version = self.get_current_version()
        latest_version = max(self.migrations.keys())

        for version in range(current_version + 1, latest_version + 1):
            if version in self.migrations:
                print(f"Running migration to version {version}")
                self.migrations[version]()
                self._set_version(version)

    def _set_version(self, version: int):
        """Set database version"""
        with self.db_manager.get_connection() as conn:
            conn.execute(f"PRAGMA user_version = {version}")

    def _migration_v1_to_v2(self):
        """Migration from version 1 to 2"""
        with self.db_manager.get_connection() as conn:
            # Add new columns to user_profiles
            conn.execute("""
                ALTER TABLE user_profiles
                ADD COLUMN settings TEXT DEFAULT '{}'
            """)

            # Create new indexes
            conn.execute("""
                CREATE INDEX idx_qa_history_session
                ON qa_history(session_id)
            """)

    def _migration_v2_to_v3(self):
        """Migration from version 2 to 3"""
        with self.db_manager.get_connection() as conn:
            # Add token usage table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS token_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    total_tokens INTEGER,
                    cost_estimate REAL,
                    context_type TEXT,
                    session_id TEXT,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
                )
            """)
```

## Troubleshooting Data Layer Issues

### Common Database Problems

#### Issue: Database Locked
```bash
# Symptom: "database is locked" error
Learning Catalyst > /status
Error: Database is locked

# Solution: Check for other processes and reset
$> lsof ~/.learning-catalyst/database.sqlite
# Check what process is using the database

# If needed, force unlock (last resort)
$> rm ~/.learning-catalyst/database.sqlite-wal
$> rm ~/.learning-catalyst/database.sqlite-shm
```

#### Issue: Corrupted Database
```bash
# Symptom: "database disk image is malformed"
Learning Catalyst > /concepts
Error: Database disk image is malformed

# Solution: Recover from backup or recreate
$> cp ~/.learning-catalyst/database.sqlite.backup ~/.learning-catalyst/database.sqlite

# If no backup exists, recreate database
$> rm ~/.learning-catalyst/database.sqlite
Learning Catalyst > /status
# Database will be recreated automatically
```

#### Issue: Slow Queries
```bash
# Symptom: Commands taking too long to respond
Learning Catalyst > /history
[Long delay before response]

# Solution: Run optimization
Learning Catalyst > /optimize database
✓ Database optimized: 3 indexes created, 2 queries optimized

# Check database size and cleanup if needed
Learning Catalyst > /status
Database: 245MB | Records: 15,678 | Optimized: Yes
```

### Configuration Problems

#### Issue: Invalid Configuration
```bash
# Symptom: "Error parsing config file"
Learning Catalyst > /config show
Error: Error parsing config file: Invalid TOML at line 23

# Solution: Reset to defaults
Learning Catalyst > /config reset
✓ Configuration reset to defaults

# Or manually edit configuration
$> nano ~/.learning-catalyst/config.toml
# Fix TOML syntax errors
```

#### Issue: Missing Configuration
```bash
# Symptom: Configuration file doesn't exist
Learning Catalyst > /config show
Error: Configuration file not found

# Solution: Initialize configuration
Learning Catalyst > /config init
✓ Configuration initialized with defaults
✓ Configuration file created: ~/.learning-catalyst/config.toml
```

## Related Documentation

- **[CLI Architecture](cli-architecture.md)**: Command-line interface design
- **[AI Integration Architecture](ai-integration.md)**: AI provider integration
- **[Security Architecture](security-architecture.md)**: Security and privacy considerations
- **[Performance Optimization](../performance-optimization/)**: Performance tuning strategies

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: System Architecture*