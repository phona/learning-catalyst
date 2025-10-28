/**
 * Session Service
 *
 * Provides session and message persistence operations.
 * Acts as the bridge between the chat interface and the database layer.
 */

import type {
  Session,
  ConversationMessage,
  SessionSearchQuery,
  SessionSearchResult,
  SessionExportOptions,
  SessionImportResult,
  SessionCreateOptions,
  SessionUpdateOptions
} from '@/types/session';
import type { Message } from '@/types/ai';
import { JSONUtils } from '@/modules/database/database-schema';

export interface MessageCreateOptions {
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  provider?: string;
  model?: string;
  tokens_used?: number;
  thinking_content?: string;
  tool_calls?: any[];
}

/**
 * Session service for managing conversation persistence
 */
export class SessionService {
  private static instance: SessionService;
  private initialized = false;

  private constructor() {}

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Initialize the session service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('SessionService already initialized');
      return;
    }

    try {
      console.log('Initializing SessionService...');
      // Test database connection
      await this.testDatabaseConnection();
      this.initialized = true;
      console.log('✓ SessionService initialized successfully');
    } catch (error) {
      console.error('✗ Failed to initialize SessionService:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  private async testDatabaseConnection(): Promise<void> {
    try {
      console.log('Testing database connection...');

      // Simple connection test - don't try to initialize, just test if it's ready
      const result = await window.electronAPI.dbExecuteQuery('SELECT 1');

      if (result?.success) {
        console.log('✅ Database connection test passed');
      } else {
        throw new Error(result?.error || 'Database connection test failed');
      }
    } catch (error: any) {
      console.error('✗ Database connection test failed:', error);

      // Check if the error indicates database is not initialized
      if (error.message?.includes('Database not initialized') ||
          error.message?.includes('Database connection failed')) {
        throw new Error('Database is not ready yet. Please wait for initialization to complete.');
      }

      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }

  /**
   * Create a new session
   */
  async createSession(options: SessionCreateOptions): Promise<Session> {
    try {
      const sessionId = this.generateId();
      const now = new Date();

      // Insert session into database
      await window.electronAPI.dbExecuteQuery(
        `INSERT INTO learning_sessions (
          id, title, description, start_time, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          options.title,
          options.description || null,
          now.toISOString(),
          JSON.stringify({
            tags: options.tags || [],
            category: options.category || 'general',
            provider: options.provider || 'openai',
            model: options.model || 'gpt-3.5-turbo',
            archived: false,
            pinned: false,
          }),
          now.toISOString(),
          now.toISOString()
        ]
      );

      // Return complete session object
      return await this.getSessionById(sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  /**
   * Get session by ID with all messages
   */
  async getSessionById(sessionId: string): Promise<Session> {
    try {
      // Get session data
      const sessionRows = await window.electronAPI.dbFetchMany(
        'SELECT * FROM learning_sessions WHERE id = ?',
        1, // size parameter
        [sessionId]
      );

      if (!sessionRows || sessionRows.length === 0) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const sessionRow = sessionRows[0];
      const metadata = JSONUtils.safeParse(sessionRow.metadata) || {};

      // Get session messages
      const messageRows = await window.electronAPI.dbFetchMany(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY message_order ASC, timestamp ASC',
        1000, // size parameter - reasonable limit for messages
        [sessionId]
      );

      const messages = messageRows.map(this.mapRowToMessage);

      return {
        id: sessionRow.id,
        title: sessionRow.title,
        created_at: new Date(sessionRow.created_at),
        updated_at: new Date(sessionRow.updated_at),
        messages,
        metadata: {
          title: sessionRow.title,
          description: sessionRow.description,
          tags: metadata.tags || [],
          category: metadata.category || 'general',
          difficulty: metadata.difficulty || 'intermediate',
          learning_objectives: metadata.learning_objectives || [],
          topics_covered: metadata.topics_covered || [],
          user_id: metadata.user_id,
          archived: metadata.archived || false,
          pinned: metadata.pinned || false,
          color: metadata.color,
        },
        context: {
          current_provider: metadata.provider || 'openai',
          current_model: metadata.model || 'gpt-3.5-turbo',
          system_prompt: metadata.system_prompt,
          temperature: metadata.temperature || 0.7,
          max_tokens: metadata.max_tokens || 4096,
          enable_thinking: metadata.enable_thinking ?? true,
          conversation_style: metadata.conversation_style || 'educational',
          language: metadata.language || 'en',
          user_preferences: metadata.user_preferences || {
            learning_style: 'reading',
            detail_level: 'detailed',
            example_preference: 'all',
            response_length: 'medium',
            technical_level: 'intermediate',
          },
        },
        checkpoints: metadata.checkpoints || [],
        statistics: this.calculateSessionStatistics(messages, sessionRow),
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      throw new Error(`Failed to get session: ${error}`);
    }
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionId: string, updates: SessionUpdateOptions): Promise<Session> {
    try {
      // Get current metadata
      const currentSession = await this.getSessionById(sessionId);
      const metadata = { ...currentSession.metadata };

      // Update metadata fields
      if (updates.title !== undefined) {
        metadata.title = updates.title;
      }
      if (updates.description !== undefined) {
        metadata.description = updates.description;
      }
      if (updates.tags !== undefined) {
        metadata.tags = updates.tags;
      }
      if (updates.category !== undefined) {
        metadata.category = updates.category;
      }
      if (updates.archived !== undefined) {
        metadata.archived = updates.archived;
      }
      if (updates.pinned !== undefined) {
        metadata.pinned = updates.pinned;
      }

      // Update database
      await window.electronAPI.dbExecuteQuery(
        `UPDATE learning_sessions
         SET title = ?, description = ?, metadata = ?, updated_at = ?
         WHERE id = ?`,
        [
          metadata.title,
          metadata.description || null,
          JSON.stringify(metadata),
          new Date().toISOString(),
          sessionId
        ]
      );

      return await this.getSessionById(sessionId);
    } catch (error) {
      console.error('Failed to update session:', error);
      throw new Error(`Failed to update session: ${error}`);
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete session (messages will be deleted via CASCADE)
      await window.electronAPI.dbExecuteQuery(
        'DELETE FROM learning_sessions WHERE id = ?',
        [sessionId]
      );
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error(`Failed to delete session: ${error}`);
    }
  }

  /**
   * Add a message to a session
   */
  async addMessage(options: MessageCreateOptions): Promise<ConversationMessage> {
    try {
      const messageId = this.generateId();
      const now = new Date();

      // Get next message order
      const orderResult = await window.electronAPI.dbFetchOne(
        'SELECT COALESCE(MAX(message_order), -1) + 1 as next_order FROM messages WHERE session_id = ?',
        [options.sessionId]
      );
      const messageOrder = orderResult?.next_order || 0;

      // Insert message
      await window.electronAPI.dbExecuteQuery(
        `INSERT INTO messages (
          id, session_id, role, content, thinking_content, provider, model,
          tokens_used, timestamp, message_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageId,
          options.sessionId,
          options.role,
          options.content,
          options.thinking_content || null,
          options.provider || null,
          options.model || null,
          options.tokens_used ? JSON.stringify({
            prompt_tokens: 0,
            completion_tokens: options.tokens_used,
            total_tokens: options.tokens_used
          }) : null,
          now.toISOString(),
          messageOrder,
          now.toISOString()
        ]
      );

      // Update session timestamp and message count
      await window.electronAPI.dbExecuteQuery(
        `UPDATE learning_sessions
         SET updated_at = ?, total_messages = total_messages + 1
         WHERE id = ?`,
        [now.toISOString(), options.sessionId]
      );

      // Return the created message
      const messageRows = await window.electronAPI.dbFetchMany(
        'SELECT * FROM messages WHERE id = ?',
        1, // size parameter
        [messageId]
      );

      return this.mapRowToMessage(messageRows[0]);
    } catch (error) {
      console.error('Failed to add message:', error);
      throw new Error(`Failed to add message: ${error}`);
    }
  }

  /**
   * Search sessions with filters
   */
  async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
    try {
      console.log('SessionService: Searching sessions with query:', query);
      let sql = `
        SELECT s.*, COUNT(m.id) as message_count
        FROM learning_sessions s
        LEFT JOIN messages m ON s.id = m.session_id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Add filters
      if (query.query) {
        sql += ` AND (s.title LIKE ? OR s.description LIKE ?)`;
        const searchTerm = `%${query.query}%`;
        params.push(searchTerm, searchTerm);
      }

      if (query.tags && query.tags.length > 0) {
        const tagConditions = query.tags.map(() => `s.metadata LIKE ?`).join(' OR ');
        sql += ` AND (${tagConditions})`;
        query.tags.forEach(tag => params.push(`%"${tag}"%`));
      }

      if (query.providers && query.providers.length > 0) {
        const providerConditions = query.providers.map(() => `s.metadata LIKE ?`).join(' OR ');
        sql += ` AND (${providerConditions})`;
        query.providers.forEach(provider => params.push(`%"provider":"${provider}"%`));
      }

      if (query.archived !== undefined) {
        sql += ` AND s.metadata LIKE ?`;
        params.push(`%"archived":${query.archived}%`);
      }

      if (query.date_range) {
        sql += ` AND s.start_time >= ? AND s.start_time <= ?`;
        params.push(
          query.date_range.start.toISOString(),
          query.date_range.end.toISOString()
        );
      }

      sql += ` GROUP BY s.id ORDER BY s.updated_at DESC`;

      // Add limit and offset
      if (query.limit) {
        sql += ` LIMIT ?`;
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ` OFFSET ?`;
        params.push(query.offset);
      }

      console.log('SessionService: Executing SQL:', sql);
      console.log('SessionService: SQL params:', params);

      const rows = await window.electronAPI.dbFetchMany(sql, query.limit || 50, params);
      console.log('SessionService: Database rows returned:', rows);

      // Get total count
      let countSql = sql.split('GROUP BY')[0].split('ORDER BY')[0];
      countSql = countSql.replace('SELECT s.*, COUNT(m.id) as message_count', 'SELECT COUNT(DISTINCT s.id) as total');

      const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET
      const countResult = await window.electronAPI.dbFetchOne(countSql, countParams);
      const total = countResult?.total || 0;
      console.log('SessionService: Total session count:', total);

      // Convert to session objects (without messages for performance)
      const sessions: Session[] = [];
      for (const row of rows) {
        const metadata = JSONUtils.safeParse(row.metadata) || {};
        sessions.push({
          id: row.id,
          title: row.title,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          messages: [], // Empty for search results
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
          },
          context: {
            current_provider: metadata.provider || 'openai',
            current_model: metadata.model || 'gpt-3.5-turbo',
            system_prompt: metadata.system_prompt,
            temperature: metadata.temperature || 0.7,
            max_tokens: metadata.max_tokens || 4096,
            enable_thinking: metadata.enable_thinking ?? true,
            conversation_style: metadata.conversation_style || 'educational',
            language: metadata.language || 'en',
            user_preferences: metadata.user_preferences || {
              learning_style: 'reading',
              detail_level: 'detailed',
              example_preference: 'all',
              response_length: 'medium',
              technical_level: 'intermediate',
            },
          },
          checkpoints: metadata.checkpoints || [],
          statistics: {
            total_messages: row.message_count || 0,
            user_messages: 0, // Would need separate query
            assistant_messages: 0, // Would need separate query
            total_tokens_used: 0,
            total_thinking_tokens: 0,
            session_duration: 0,
            average_response_time: 0,
            concepts_learned: 0,
            checkpoints_created: 0,
            productivity_score: 0,
            engagement_score: 0,
          },
        });
      }

      return {
        sessions,
        total,
        has_more: (query.offset || 0) + sessions.length < total,
      };
    } catch (error) {
      console.error('Failed to search sessions:', error);
      throw new Error(`Failed to search sessions: ${error}`);
    }
  }

  /**
   * Get recent sessions (limited list)
   */
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    console.log('SessionService: Getting recent sessions with limit:', limit);
    const result = await this.searchSessions({
      limit,
      archived: false,
    });
    console.log('SessionService: Search result:', result);
    console.log('SessionService: Returning sessions:', result.sessions);
    return result.sessions;
  }

  /**
   * Export session to various formats
   */
  async exportSession(sessionId: string, options: SessionExportOptions): Promise<string> {
    try {
      const session = await this.getSessionById(sessionId);

      switch (options.format) {
        case 'json':
          return JSON.stringify(session, null, 2);

        case 'markdown':
          return this.sessionToMarkdown(session, options);

        case 'txt':
          return this.sessionToText(session, options);

        case 'html':
          return this.sessionToHTML(session, options);

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Failed to export session:', error);
      throw new Error(`Failed to export session: ${error}`);
    }
  }

  /**
   * Helper methods
   */

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private mapRowToMessage(row: any): ConversationMessage {
    const tokensUsed = row.tokens_used ? JSONUtils.safeParse(row.tokens_used) : undefined;

    return {
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
      provider: row.provider,
      model: row.model,
      tokens_used: tokensUsed?.total_tokens || 0,
      thinking_content: row.thinking_content,
      tool_calls: row.tool_calls ? JSONUtils.safeParse(row.tool_calls) : undefined,
      metadata: {
        user_rating: undefined,
        user_feedback: undefined,
        editing_history: [],
        concepts_learned: [],
        related_topics: [],
        confidence_score: undefined,
      },
    };
  }

  private calculateSessionStatistics(messages: ConversationMessage[], sessionRow: any): any {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0);
    const thinkingTokens = messages.reduce((sum, msg) =>
      sum + (msg.thinking_content ? msg.thinking_content.length / 4 : 0), 0
    );

    const startTime = new Date(sessionRow.start_time);
    const endTime = sessionRow.end_time ? new Date(sessionRow.end_time) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    return {
      total_messages: messages.length,
      user_messages: userMessages.length,
      assistant_messages: assistantMessages.length,
      total_tokens_used: totalTokens,
      total_thinking_tokens: Math.floor(thinkingTokens),
      session_duration: duration,
      average_response_time: 0, // Would need more complex calculation
      concepts_learned: 0, // Would need concept extraction
      checkpoints_created: 0, // Would need checkpoint tracking
      productivity_score: 0, // Would need calculation based on various factors
      engagement_score: 0, // Would need calculation based on user interactions
    };
  }

  private sessionToMarkdown(session: Session, options: SessionExportOptions): string {
    let markdown = `# ${session.title}\n\n`;

    if (options.include_metadata && session.metadata.description) {
      markdown += `**Description:** ${session.metadata.description}\n\n`;
    }

    markdown += `**Created:** ${session.created_at.toLocaleString()}\n`;
    markdown += `**Updated:** ${session.updated_at.toLocaleString()}\n`;
    markdown += `**Provider:** ${session.context.current_provider}\n`;
    markdown += `**Model:** ${session.context.current_model}\n\n`;

    if (options.include_metadata && session.metadata.tags.length > 0) {
      markdown += `**Tags:** ${session.metadata.tags.join(', ')}\n\n`;
    }

    markdown += `---\n\n`;

    const filteredMessages = this.filterMessages(session.messages, options);

    for (const message of filteredMessages) {
      const role = message.role === 'user' ? 'You' : 'Assistant';
      markdown += `## ${role}\n\n`;
      markdown += `${message.content}\n\n`;

      if (options.include_thinking && message.thinking_content) {
        markdown += `### Thinking Process\n\n`;
        markdown += `*${message.thinking_content}*\n\n`;
      }

      markdown += `*${message.timestamp.toLocaleString()}*\n\n`;
      markdown += `---\n\n`;
    }

    return markdown;
  }

  private sessionToText(session: Session, options: SessionExportOptions): string {
    let text = `${session.title}\n`;
    text += `${'='.repeat(session.title.length)}\n\n`;

    if (options.include_metadata && session.metadata.description) {
      text += `Description: ${session.metadata.description}\n`;
    }

    text += `Created: ${session.created_at.toLocaleString()}\n`;
    text += `Provider: ${session.context.current_provider}\n`;
    text += `Model: ${session.context.current_model}\n\n`;

    const filteredMessages = this.filterMessages(session.messages, options);

    for (const message of filteredMessages) {
      const role = message.role === 'user' ? 'USER' : 'ASSISTANT';
      text += `[${role}] ${message.timestamp.toLocaleString()}\n`;
      text += `${message.content}\n\n`;

      if (options.include_thinking && message.thinking_content) {
        text += `[THINKING]\n${message.thinking_content}\n\n`;
      }

      text += `${'-'.repeat(50)}\n\n`;
    }

    return text;
  }

  private sessionToHTML(session: Session, options: SessionExportOptions): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>${session.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .message { margin-bottom: 25px; padding: 15px; border-radius: 8px; }
        .user-message { background: #e3f2fd; margin-left: 20px; }
        .assistant-message { background: #f3e5f5; margin-right: 20px; }
        .thinking { background: #fff3e0; font-style: italic; margin-top: 10px; padding: 10px; border-radius: 5px; }
        .timestamp { color: #6c757d; font-size: 0.9em; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${session.title}</h1>
    </div>
`;

    if (options.include_metadata) {
      html += `
    <div class="metadata">
        <h3>Session Information</h3>
        <p><strong>Created:</strong> ${session.created_at.toLocaleString()}</p>
        <p><strong>Updated:</strong> ${session.updated_at.toLocaleString()}</p>
        <p><strong>Provider:</strong> ${session.context.current_provider}</p>
        <p><strong>Model:</strong> ${session.context.current_model}</p>
        ${session.metadata.description ? `<p><strong>Description:</strong> ${session.metadata.description}</p>` : ''}
        ${session.metadata.tags.length > 0 ? `<p><strong>Tags:</strong> ${session.metadata.tags.join(', ')}</p>` : ''}
    </div>
`;
    }

    const filteredMessages = this.filterMessages(session.messages, options);

    for (const message of filteredMessages) {
      const messageClass = message.role === 'user' ? 'user-message' : 'assistant-message';
      html += `
    <div class="message ${messageClass}">
        <strong>${message.role === 'user' ? 'You' : 'Assistant'}</strong>
        <div>${message.content.replace(/\n/g, '<br>')}</div>
        ${options.include_thinking && message.thinking_content ?
          `<div class="thinking"><strong>Thinking:</strong> ${message.thinking_content.replace(/\n/g, '<br>')}</div>` : ''}
        <div class="timestamp">${message.timestamp.toLocaleString()}</div>
    </div>
`;
    }

    html += `
</body>
</html>
`;

    return html;
  }

  private filterMessages(messages: ConversationMessage[], options: SessionExportOptions): ConversationMessage[] {
    let filtered = [...messages];

    if (options.message_filter) {
      if (options.message_filter.roles) {
        filtered = filtered.filter(msg => options.message_filter!.roles!.includes(msg.role as 'user' | 'assistant' | 'system'));
      }

      if (options.message_filter.date_range) {
        filtered = filtered.filter(msg =>
          msg.timestamp >= options.message_filter!.date_range!.start &&
          msg.timestamp <= options.message_filter!.date_range!.end
        );
      }
    }

    return filtered;
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance();