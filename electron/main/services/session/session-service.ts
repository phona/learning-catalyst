/**
 * Main Process Session Service
 *
 * Session management service for the main process that works directly with
 * the database and integrates with the agent manager for agent-aware sessions.
 */

import { Database } from '../../../src/modules/database';
import { AsyncLocalStorage } from 'async_hooks';
import { LoggerFactory } from '../logger';
import { ServiceError } from '../types';

/**
 * Session creation request with agent configuration
 */
export interface SessionCreateRequest {
  title: string;
  description?: string;
  agentConfig?: {
    primaryAgentId?: string;
    agentMode?: 'single' | 'orchestration' | 'collaborative';
    autoHandoff?: boolean;
    maxConcurrentAgents?: number;
  };
  metadata?: Record<string, any>;
  context?: {
    system_prompt?: string;
    notes?: string;
    learning_objectives?: string[];
  };
}

/**
 * Session update request
 */
export interface SessionUpdateRequest {
  sessionId: string;
  title?: string;
  description?: string;
  agentConfig?: {
    primaryAgentId?: string;
    agentMode?: 'single' | 'orchestration' | 'collaborative';
    addAgents?: string[];
    removeAgents?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Session search query
 */
export interface SessionSearchQuery {
  query?: string;
  tags?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
  providers?: string[];
  models?: string[];
  categories?: string[];
  archived?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Session search result
 */
export interface SessionSearchResult {
  sessions: any[];
  total: number;
  has_more: boolean;
}

/**
 * Main process session service
 */
export class SessionServiceMain {
  private database: Database;
  private logger: any;
  private als: AsyncLocalStorage<any>;

  constructor(dependencies: {
    database: Database;
    logger: any;
    als: AsyncLocalStorage<any>;
  }) {
    this.database = dependencies.database;
    this.logger = dependencies.logger;
    this.als = dependencies.als;
  }

  /**
   * Create a new session
   */
  async createSession(request: SessionCreateRequest): Promise<string> {
    return this.runWithContext('session:create', async () => {
      try {
        this.logger.info('Creating new session', { title: request.title });

        const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const now = new Date().toISOString();

        // Combine session metadata with agent configuration
        const metadata = {
          ...request.metadata,
          // Agent configuration
          primary_agent_id: request.agentConfig?.primaryAgentId,
          agent_mode: request.agentConfig?.agentMode || 'single',
          auto_handoff: request.agentConfig?.autoHandoff || false,
          max_concurrent_agents: request.agentConfig?.maxConcurrentAgents || 1,
          agent_config: request.agentConfig,
          // Session context
          system_prompt: request.context?.system_prompt,
          notes: request.context?.notes,
          learning_objectives: request.context?.learning_objectives || [],
          // Basic metadata
          tags: [],
          category: 'general',
          difficulty: 'intermediate',
          topics_covered: [],
          user_id: undefined,
          archived: false,
          pinned: false,
          created_at: now,
          updated_at: now
        };

        // Insert session into database
        await this.database.fetchOne(
          `INSERT INTO learning_sessions (
            id, title, description, start_time, duration_seconds,
            total_messages, concepts_studied, difficulty_level,
            session_type, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            request.title,
            request.description || '',
            now,
            0,
            0,
            0,
            1,
            'general',
            JSON.stringify(metadata),
            now,
            now
          ]
        );

        this.logger.info('Session created successfully', { sessionId: id });
        return id;

      } catch (error) {
        this.logger.error('Failed to create session', error as Error);
        throw new ServiceError(
          `Failed to create session: ${(error as Error).message}`,
          'SESSION_CREATE_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<any | null> {
    return this.runWithContext('session:get', async () => {
      try {
        const row = await this.database.fetchOne(
          `SELECT * FROM learning_sessions WHERE id = ?`,
          [sessionId]
        );

        if (!row) {
          return null;
        }

        // Get messages for the session
        const messages = await this.database.fetchAll(
          `SELECT * FROM messages WHERE session_id = ? ORDER BY message_order ASC`,
          [sessionId]
        );

        // Parse metadata
        const metadata = JSON.parse(row.metadata || '{}');

        return {
          id: row.id,
          title: row.title,
          description: row.description,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          messages: messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            provider: msg.provider,
            model: msg.model,
            thinking_content: msg.thinking_content,
            tokens_used: msg.tokens_used ? JSON.parse(msg.tokens_used).total_tokens : undefined
          })),
          metadata: {
            title: row.title,
            description: row.description,
            tags: metadata.tags || [],
            category: metadata.category || 'general',
            difficulty: metadata.difficulty || 'intermediate',
            learning_objectives: metadata.learning_objectives || [],
            topics_covered: metadata.topics_covered || [],
            user_id: metadata.user_id,
            archived: metadata.archived || false,
            pinned: metadata.pinned || false,
            color: metadata.color,
            primary_agent_id: metadata.primary_agent_id,
            agent_mode: metadata.agent_mode,
            agent_config: metadata.agent_config
          },
          statistics: {
            total_messages: row.total_messages || 0,
            user_messages: messages.filter((m: any) => m.role === 'user').length,
            assistant_messages: messages.filter((m: any) => m.role === 'assistant').length,
            total_tokens_used: messages.reduce((sum: number, m: any) => {
              const tokens = JSON.parse(m.tokens_used || '{}');
              return sum + (tokens.total_tokens || 0);
            }, 0),
            session_duration: row.duration_seconds || 0,
            concepts_learned: row.concepts_studied || 0
          }
        };

      } catch (error) {
        this.logger.error('Failed to get session', error as Error, { sessionId });
        throw new ServiceError(
          `Failed to get session: ${(error as Error).message}`,
          'SESSION_GET_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Update session
   */
  async updateSession(request: SessionUpdateRequest): Promise<void> {
    return this.runWithContext('session:update', async () => {
      try {
        this.logger.info('Updating session', { sessionId: request.sessionId });

        // Get current session
        const currentSession = await this.database.fetchOne(
          `SELECT metadata FROM learning_sessions WHERE id = ?`,
          [request.sessionId]
        );

        if (!currentSession) {
          throw new ServiceError(
            'Session not found',
            'SESSION_NOT_FOUND',
            'SessionServiceMain'
          );
        }

        // Parse and update metadata
        const metadata = JSON.parse(currentSession.metadata || '{}');
        const updatedMetadata = {
          ...metadata,
          ...request.metadata,
          ...(request.agentConfig && {
            primary_agent_id: request.agentConfig.primaryAgentId,
            agent_mode: request.agentConfig.agentMode,
            agent_config: request.agentConfig
          }),
          updated_at: new Date().toISOString()
        };

        // Update session
        await this.database.fetchOne(
          `UPDATE learning_sessions SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            metadata = ?,
            updated_at = ?
           WHERE id = ?`,
          [
            request.title,
            request.description,
            JSON.stringify(updatedMetadata),
            new Date().toISOString(),
            request.sessionId
          ]
        );

        this.logger.info('Session updated successfully', { sessionId: request.sessionId });

      } catch (error) {
        this.logger.error('Failed to update session', error as Error, { sessionId: request.sessionId });
        throw new ServiceError(
          `Failed to update session: ${(error as Error).message}`,
          'SESSION_UPDATE_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    return this.runWithContext('session:update-title', async () => {
      try {
        this.logger.info('Updating session title', { sessionId, title });

        // Get current metadata
        const currentSession = await this.database.fetchOne(
          `SELECT metadata FROM learning_sessions WHERE id = ?`,
          [sessionId]
        );

        if (!currentSession) {
          throw new ServiceError(
            'Session not found',
            'SESSION_NOT_FOUND',
            'SessionServiceMain'
          );
        }

        // Update metadata with new title
        const metadata = JSON.parse(currentSession.metadata || '{}');
        metadata.title = title;
        metadata.updated_at = new Date().toISOString();

        // Update session
        await this.database.fetchOne(
          `UPDATE learning_sessions SET title = ?, metadata = ?, updated_at = ? WHERE id = ?`,
          [title, JSON.stringify(metadata), new Date().toISOString(), sessionId]
        );

        this.logger.info('Session title updated successfully', { sessionId, title });

      } catch (error) {
        this.logger.error('Failed to update session title', error as Error, { sessionId, title });
        throw new ServiceError(
          `Failed to update session title: ${(error as Error).message}`,
          'SESSION_TITLE_UPDATE_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit = 10): Promise<any[]> {
    return this.runWithContext('session:get-recent', async () => {
      try {
        this.logger.debug('Getting recent sessions', { limit });

        const rows = await this.database.fetchAll(
          `SELECT * FROM learning_sessions ORDER BY updated_at DESC LIMIT ?`,
          [limit]
        );

        const sessions = [];
        for (const row of rows) {
          const metadata = JSON.parse(row.metadata || '{}');

          // Get message count for the session
          const messageCount = await this.database.fetchOne(
            `SELECT COUNT(*) as count FROM messages WHERE session_id = ?`,
            [row.id]
          );

          sessions.push({
            id: row.id,
            title: row.title,
            description: row.description,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            metadata: {
              title: row.title,
              description: row.description,
              tags: metadata.tags || [],
              category: metadata.category || 'general',
              difficulty: metadata.difficulty || 'intermediate',
              primary_agent_id: metadata.primary_agent_id,
              agent_mode: metadata.agent_mode
            },
            statistics: {
              total_messages: messageCount?.count || 0,
              session_duration: row.duration_seconds || 0,
              concepts_learned: row.concepts_studied || 0
            }
          });
        }

        return sessions;

      } catch (error) {
        this.logger.error('Failed to get recent sessions', error as Error);
        throw new ServiceError(
          `Failed to get recent sessions: ${(error as Error).message}`,
          'SESSION_RECENT_GET_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Search sessions
   */
  async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
    return this.runWithContext('session:search', async () => {
      try {
        this.logger.debug('Searching sessions', { query });

        let sql = `SELECT * FROM learning_sessions WHERE 1=1`;
        const params: any[] = [];

        // Add search conditions
        if (query.query) {
          sql += ` AND (title LIKE ? OR description LIKE ?)`;
          const searchTerm = `%${query.query}%`;
          params.push(searchTerm, searchTerm);
        }

        if (query.date_range) {
          sql += ` AND start_time >= ? AND start_time <= ?`;
          params.push(
            query.date_range.start.toISOString(),
            query.date_range.end.toISOString()
          );
        }

        // Add ordering and pagination
        sql += ` ORDER BY updated_at DESC`;

        if (query.limit) {
          sql += ` LIMIT ?`;
          params.push(query.limit);
        }

        if (query.offset) {
          sql += ` OFFSET ?`;
          params.push(query.offset);
        }

        const rows = await this.database.fetchAll(sql, params);

        // Get total count
        let countSql = `SELECT COUNT(*) as total FROM learning_sessions WHERE 1=1`;
        const countParams: any[] = [];

        if (query.query) {
          countSql += ` AND (title LIKE ? OR description LIKE ?)`;
          const searchTerm = `%${query.query}%`;
          countParams.push(searchTerm, searchTerm);
        }

        if (query.date_range) {
          countSql += ` AND start_time >= ? AND start_time <= ?`;
          countParams.push(
            query.date_range.start.toISOString(),
            query.date_range.end.toISOString()
          );
        }

        const countResult = await this.database.fetchOne(countSql, countParams);
        const total = countResult?.total || 0;

        // Convert rows to session objects
        const sessions = rows.map((row: any) => {
          const metadata = JSON.parse(row.metadata || '{}');
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            metadata: {
              title: row.title,
              description: row.description,
              tags: metadata.tags || [],
              category: metadata.category || 'general',
              difficulty: metadata.difficulty || 'intermediate',
              primary_agent_id: metadata.primary_agent_id,
              agent_mode: metadata.agent_mode
            },
            statistics: {
              total_messages: row.total_messages || 0,
              session_duration: row.duration_seconds || 0,
              concepts_learned: row.concepts_studied || 0
            }
          };
        });

        return {
          sessions,
          total,
          has_more: (query.offset || 0) + sessions.length < total
        };

      } catch (error) {
        this.logger.error('Failed to search sessions', error as Error);
        throw new ServiceError(
          `Failed to search sessions: ${(error as Error).message}`,
          'SESSION_SEARCH_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.runWithContext('session:delete', async () => {
      try {
        this.logger.info('Deleting session', { sessionId });

        // Delete messages first (foreign key constraint)
        await this.database.fetchOne(
          `DELETE FROM messages WHERE session_id = ?`,
          [sessionId]
        );

        // Delete the session
        const result = await this.database.fetchOne(
          `DELETE FROM learning_sessions WHERE id = ?`,
          [sessionId]
        );

        this.logger.info('Session deleted successfully', { sessionId });
        return true;

      } catch (error) {
        this.logger.error('Failed to delete session', error as Error, { sessionId });
        throw new ServiceError(
          `Failed to delete session: ${(error as Error).message}`,
          'SESSION_DELETE_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Save a message to a session
   */
  async saveMessage(sessionId: string, message: any): Promise<void> {
    return this.runWithContext('session:save-message', async () => {
      try {
        this.logger.debug('Saving message', { sessionId, messageId: message.id });

        // Check if session exists
        const sessionExists = await this.database.fetchOne(
          `SELECT id FROM learning_sessions WHERE id = ?`,
          [sessionId]
        );

        if (!sessionExists) {
          throw new ServiceError(
            'Session not found',
            'SESSION_NOT_FOUND',
            'SessionServiceMain'
          );
        }

        // Get next message order
        const lastMessage = await this.database.fetchOne(
          `SELECT MAX(message_order) as max_order FROM messages WHERE session_id = ?`,
          [sessionId]
        );

        const messageOrder = (lastMessage?.max_order || 0) + 1;

        // Insert message
        await this.database.fetchOne(
          `INSERT INTO messages (
            id, session_id, role, content, thinking_content,
            provider, model, tokens_used, timestamp, message_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            message.id,
            sessionId,
            message.role,
            message.content,
            message.thinking_content,
            message.provider,
            message.model,
            message.tokens_used ? JSON.stringify({
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: message.tokens_used
            }) : '{}',
            message.timestamp.toISOString(),
            messageOrder,
            new Date().toISOString()
          ]
        );

        // Update session message count
        await this.database.fetchOne(
          `UPDATE learning_sessions SET
            total_messages = total_messages + 1,
            updated_at = ?
           WHERE id = ?`,
          [new Date().toISOString(), sessionId]
        );

        this.logger.debug('Message saved successfully', { sessionId, messageId: message.id });

      } catch (error) {
        this.logger.error('Failed to save message', error as Error, { sessionId });
        throw new ServiceError(
          `Failed to save message: ${(error as Error).message}`,
          'MESSAGE_SAVE_FAILED',
          'SessionServiceMain',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Generate session title using simple logic (fallback)
   */
  async generateSessionTitle(userMessage: string): Promise<string> {
    try {
      this.logger.debug('Generating session title from message', {
        messageLength: userMessage.length
      });

      const words = userMessage
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 4);

      if (words.length === 0) {
        return `Learning Session ${new Date().toLocaleDateString()}`;
      }

      const title = words.map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      return title.length > 50 ? title.substring(0, 47) + '...' : title;

    } catch (error) {
      this.logger.error('Failed to generate session title', error as Error);
      return `Learning Session ${new Date().toLocaleDateString()}`;
    }
  }

  /**
   * Execute operation within AsyncLocalStorage context
   */
  private async runWithContext<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const context = {
      operation,
      timestamp: Date.now(),
      correlationId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    };

    return this.als.run(context, fn);
  }

  /**
   * Dispose of the session service
   */
  dispose(): void {
    this.logger.info('Session service disposed');
  }
}