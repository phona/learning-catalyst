/**
 * Database Schema
 *
 * Defines the database structure for Learning Catalyst.
 * This is the single source of truth for all database schemas and types.
 */

export const DATABASE_SCHEMA = `
-- Categories for organizing concepts
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Learning concepts
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  concept_type TEXT NOT NULL CHECK (concept_type IN ('topic', 'skill', 'fact', 'procedure', 'principle')),
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  mastery_level REAL DEFAULT 0.0 CHECK (mastery_level BETWEEN 0.0 AND 1.0),
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON object
  last_reviewed DATETIME,
  review_count INTEGER DEFAULT 0,
  parent_concept_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relationships between concepts
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  source_concept_id TEXT NOT NULL,
  target_concept_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('prerequisite', 'related', 'contains', 'example', 'application', 'contrasts')),
  strength REAL DEFAULT 0.5 CHECK (strength BETWEEN 0.0 AND 1.0),
  description TEXT,
  metadata TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by_session TEXT,
  CHECK (source_concept_id != target_concept_id)
);

-- Learning sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration_seconds INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  concepts_studied INTEGER DEFAULT 0,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  session_type TEXT DEFAULT 'general' CHECK (session_type IN ('general', 'practice', 'review', 'assessment')),
  metadata TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages in sessions
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  thinking_content TEXT,
  provider TEXT,
  model TEXT,
  tokens_used TEXT, -- JSON object
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES learning_sessions (id) ON DELETE CASCADE
);

-- Session concept associations
CREATE TABLE IF NOT EXISTS session_concepts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  mastery_before REAL DEFAULT 0.0,
  mastery_after REAL DEFAULT 0.0,
  interaction_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES learning_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE CASCADE,
  UNIQUE(session_id, concept_id)
);

-- Analytics data
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('session_start', 'session_end', 'message_sent', 'concept_studied', 'mastery_improved', 'achievement_unlocked')),
  session_id TEXT,
  concept_id TEXT,
  event_data TEXT, -- JSON object
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES learning_sessions (id) ON DELETE SET NULL,
  FOREIGN KEY (concept_id) REFERENCES concepts (id) ON DELETE SET NULL
);

-- User achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'trophy',
  category TEXT DEFAULT 'general',
  requirements TEXT, -- JSON object
  unlocked_at DATETIME,
  metadata TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User statistics
CREATE TABLE IF NOT EXISTS user_stats (
  id TEXT PRIMARY KEY CHECK (id = 'user'),
  total_sessions INTEGER DEFAULT 0,
  total_study_time_seconds INTEGER DEFAULT 0,
  total_concepts INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  average_mastery_level REAL DEFAULT 0.0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_study_date DATE,
  metadata TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge graph cache for visualization
CREATE TABLE IF NOT EXISTS knowledge_graph_cache (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  graph_data TEXT NOT NULL, -- JSON object
  node_count INTEGER DEFAULT 0,
  edge_count INTEGER DEFAULT 0,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const DEFAULT_DATA = `
-- Insert default categories
INSERT OR IGNORE INTO categories (name, description, color, icon) VALUES
  ('Programming', 'Programming languages and concepts', '#3B82F6', 'code'),
  ('Mathematics', 'Mathematical concepts and theories', '#10B981', 'calculator'),
  ('Science', 'Scientific concepts and principles', '#8B5CF6', 'flask'),
  ('Languages', 'Natural languages and linguistics', '#F59E0B', 'language'),
  ('Arts', 'Artistic concepts and techniques', '#EF4444', 'palette'),
  ('Business', 'Business and management concepts', '#6B7280', 'briefcase');

-- Initialize user stats
INSERT OR IGNORE INTO user_stats (id) VALUES ('user');

-- Insert default settings
INSERT OR IGNORE INTO settings (id, key, value, data_type, description) VALUES
  ('1', 'theme', 'dark', 'string', 'Application theme'),
  ('2', 'language', 'en', 'string', 'Interface language'),
  ('3', 'auto_save', 'true', 'boolean', 'Auto-save sessions'),
  ('4', 'show_tips', 'true', 'boolean', 'Show learning tips');
`;

// Database interface type definitions
export interface DatabaseSchema {
  tables: {
    categories: CategoryTable;
    concepts: ConceptTable;
    relationships: RelationshipTable;
    learning_sessions: SessionTable;
    messages: MessageTable;
    session_concepts: SessionConceptTable;
    analytics: AnalyticsTable;
    achievements: AchievementTable;
    user_stats: UserStatsTable;
    settings: SettingsTable;
    knowledge_graph_cache: KnowledgeGraphCacheTable;
  };
}

export interface CategoryTable {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptTable {
  id: string;
  name: string;
  description?: string;
  concept_type: 'topic' | 'skill' | 'fact' | 'procedure' | 'principle';
  difficulty_level: number;
  mastery_level: number;
  tags: string; // JSON array
  metadata: string; // JSON object
  last_reviewed?: string;
  review_count: number;
  parent_concept_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RelationshipTable {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: 'prerequisite' | 'related' | 'contains' | 'example' | 'application' | 'contrasts';
  strength: number;
  description?: string;
  metadata: string; // JSON object
  created_at: string;
  updated_at: string;
  created_by_session?: string;
}

export interface SessionTable {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  total_messages: number;
  concepts_studied: number;
  difficulty_level: number;
  session_type: 'general' | 'practice' | 'review' | 'assessment';
  metadata: string; // JSON object
  created_at: string;
  updated_at: string;
}

export interface MessageTable {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking_content?: string;
  provider?: string;
  model?: string;
  tokens_used: string; // JSON object
  timestamp: string;
  message_order: number;
  created_at: string;
}

export interface SessionConceptTable {
  id: string;
  session_id: string;
  concept_id: string;
  mastery_before: number;
  mastery_after: number;
  interaction_count: number;
  created_at: string;
}

export interface AnalyticsTable {
  id: string;
  event_type: 'session_start' | 'session_end' | 'message_sent' | 'concept_studied' | 'mastery_improved' | 'achievement_unlocked';
  session_id?: string;
  concept_id?: string;
  event_data: string; // JSON object
  timestamp: string;
  created_at: string;
}

export interface AchievementTable {
  id: string;
  title: string;
  description?: string;
  icon: string;
  category: string;
  requirements?: string; // JSON object
  unlocked_at?: string;
  metadata: string; // JSON object
  created_at: string;
  updated_at: string;
}

export interface UserStatsTable {
  id: string;
  total_sessions: number;
  total_study_time_seconds: number;
  total_concepts: number;
  total_messages: number;
  average_mastery_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_study_date?: string;
  metadata: string; // JSON object
  created_at: string;
  updated_at: string;
}

export interface SettingsTable {
  id: string;
  key: string;
  value?: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeGraphCacheTable {
  id: string;
  cache_key: string;
  graph_data: string; // JSON object
  node_count: number;
  edge_count: number;
  generated_at: string;
  expires_at?: string;
  created_at: string;
}

// Utility functions for working with JSON fields
export const JSONUtils = {
  parseArray: (jsonString: string): string[] => {
    try {
      return jsonString ? JSON.parse(jsonString) : [];
    } catch {
      return [];
    }
  },

  parseObject: (jsonString: string): any => {
    try {
      return jsonString ? JSON.parse(jsonString) : {};
    } catch {
      return {};
    }
  },

  stringifyArray: (array: string[]): string => {
    return JSON.stringify(array);
  },

  stringifyObject: (obj: any): string => {
    return JSON.stringify(obj);
  },

  safeParse: (jsonString: string, fallback: any = null): any => {
    try {
      return JSON.parse(jsonString || 'null');
    } catch {
      return fallback;
    }
  },

  safeStringify: (value: any, fallback = '{}'): string => {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
};