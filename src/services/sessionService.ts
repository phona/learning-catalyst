/**
 * Session Service
 *
 * Provides session management with type-safe database operations.
 * Uses dependency injection for database access.
 */

import { Kysely, sql } from 'kysely'
import { JSONFieldHelpers } from '../modules/database/kysely-schema'
import type { Database } from '../modules/database/kysely-schema'
import {
  Session,
  SessionSearchQuery,
  SessionSearchResult,
  SessionMetadata,
  ConversationMessage
} from '../types/session'

/**
 * Session Service with dependency injection
 */
export class SessionService {
  constructor(private db: Kysely<Database>) {
    // Dependency injection: database instance is required
  }

  /**
   * Get database instance
   */
  private getDB(): Kysely<Database> {
    return this.db
  }

  /**
   * Search sessions using Kysely-style query building
   *
   * This is the migrated version of searchSessions that uses Kysely
   * instead of raw SQL strings.
   */
  async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
    try {
      console.log('[SessionService] Searching sessions with query:', query)
      const db = this.getDB()

      // Build the base query with Kysely
      let baseQuery = db
        .selectFrom('learning_sessions as s')
        .leftJoin('messages as m', 's.id', 'm.session_id')
        .select([
          's.id',
          's.title',
          's.description',
          's.start_time',
          's.duration_seconds',
          's.total_messages',
          's.concepts_studied',
          's.difficulty_level',
          's.session_type',
          's.metadata',
          's.created_at',
          's.updated_at',
          'm.id as message_id',
          (eb) => eb.fn.count('m.id').as('message_count')
        ])
        .groupBy('s.id')

      // Add filters using Kysely's where methods
      if (query.query) {
        const searchTerm = `%${query.query}%`
        baseQuery = baseQuery.where((eb) => eb.or([
          eb('s.title', 'like', searchTerm),
          eb('s.description', 'like', searchTerm)
        ]))
      }

      // Note: For JSON field filtering, we'll need to use raw SQL or implement JSON helpers
      // For now, using a simplified approach
      if (query.date_range) {
        baseQuery = baseQuery
          .where('s.start_time', '>=', query.date_range.start.toISOString())
          .where('s.start_time', '<=', query.date_range.end.toISOString())
      }

      // Add ordering
      baseQuery = baseQuery.orderBy('s.updated_at', 'desc')

      // Add pagination
      if (query.limit) {
        baseQuery = baseQuery.limit(query.limit)
      }

      if (query.offset) {
        baseQuery = baseQuery.offset(query.offset)
      }

      console.log('[SessionService] Executing search query')

      // Execute the main query
      const rows = await baseQuery.execute()
      console.log('[SessionService] Found', rows.length, 'sessions')

      // Get total count (simplified for now - will need refinement)
      const countResult = await db
        .selectFrom('learning_sessions as s')
        .select((eb) => eb.fn.count('s.id').as('total'))
        .execute()

      const total = Number(countResult[0]?.total) || 0
      console.log('[SessionService] Total sessions:', total)

      // Convert to session objects (without messages for performance)
      const sessions: Session[] = []
      for (const row of rows) {
        const metadata = JSONFieldHelpers.parseObject<SessionMetadata>(row.metadata) as SessionMetadata || {}
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
            current_provider: (metadata as any).provider || 'openai',
            current_model: (metadata as any).model || 'gpt-3.5-turbo',
            system_prompt: (metadata as any).system_prompt,
            temperature: (metadata as any).temperature || 0.7,
            max_tokens: (metadata as any).max_tokens || 4096,
            enable_thinking: (metadata as any).enable_thinking ?? true,
            conversation_style: (metadata as any).conversation_style || 'educational',
            language: (metadata as any).language || 'en',
            user_preferences: (metadata as any).user_preferences || {
              learning_style: 'reading',
              detail_level: 'detailed',
              example_preference: 'all',
              response_length: 'medium',
              technical_level: 'intermediate',
            },
          },
          checkpoints: (metadata as any).checkpoints || [],
          statistics: {
            total_messages: Number(row.message_count) || row.total_messages || 0,
            user_messages: 0, // Would need separate query
            assistant_messages: 0, // Would need separate query
            total_tokens_used: 0,
            total_thinking_tokens: 0,
            session_duration: row.duration_seconds || 0,
            average_response_time: 0,
            concepts_learned: 0,
            checkpoints_created: 0,
            productivity_score: 0,
            engagement_score: 0,
          },
        })
      }

      return {
        sessions,
        total,
        has_more: (query.offset || 0) + sessions.length < total,
      }
    } catch (error) {
      console.error('[SessionService] Failed to search sessions:', error)
      throw new Error(`Failed to search sessions: ${error}`)
    }
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<Session[]> {
    try {
      console.log('[SessionService] Getting recent sessions with limit:', limit);
      const db = this.getDB();

      // Debug: Check if we can access the table
      console.log('[SessionService] Executing query on learning_sessions table...');

      const rows = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .orderBy('updated_at', 'desc')
        .limit(limit)
        .execute();

      console.log('[SessionService] Database returned rows:', rows.length);
      console.log('[SessionService] Raw database rows:', rows);

      // Convert to session objects with their messages
      const sessions: Session[] = [];
      for (const row of rows) {
        const metadata = JSONFieldHelpers.parseObject<SessionMetadata>(row.metadata) as SessionMetadata || {};

        // Get messages for this session
        const messageRows = await db
          .selectFrom('messages')
          .selectAll()
          .where('session_id', '=', row.id)
          .orderBy('message_order', 'asc')
          .orderBy('timestamp', 'asc')
          .execute();

        console.log(`[SessionService] Found ${messageRows.length} messages for session ${row.id}`);

        // Convert message rows to ConversationMessage objects
        const messages: ConversationMessage[] = messageRows.map(msgRow => ({
          id: msgRow.id,
          role: msgRow.role as 'user' | 'assistant' | 'system' | 'tool',
          content: msgRow.content,
          timestamp: new Date(msgRow.timestamp),
          provider: msgRow.provider,
          model: msgRow.model,
          thinking_content: msgRow.thinking_content,
          tokens_used: msgRow.tokens_used ? Number(msgRow.tokens_used) : undefined,
          metadata: undefined, // Add if needed in future
        }));

        sessions.push({
          id: row.id,
          title: row.title,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          messages: messages, // Now includes actual messages from database
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
            current_provider: (metadata as any).provider || 'openai',
            current_model: (metadata as any).model || 'gpt-3.5-turbo',
            system_prompt: (metadata as any).system_prompt,
            temperature: (metadata as any).temperature || 0.7,
            max_tokens: (metadata as any).max_tokens || 4096,
            enable_thinking: (metadata as any).enable_thinking ?? true,
            conversation_style: (metadata as any).conversation_style || 'educational',
            language: (metadata as any).language || 'en',
            user_preferences: (metadata as any).user_preferences || {
              learning_style: 'reading',
              detail_level: 'detailed',
              example_preference: 'all',
              response_length: 'medium',
              technical_level: 'intermediate',
            },
          },
          checkpoints: (metadata as any).checkpoints || [],
          statistics: {
            total_messages: row.total_messages || 0,
            user_messages: 0, // Would need separate query
            assistant_messages: 0, // Would need separate query
            total_tokens_used: 0,
            total_thinking_tokens: 0,
            session_duration: row.duration_seconds || 0,
            average_response_time: 0,
            concepts_learned: row.concepts_studied || 0,
            checkpoints_created: ((metadata as any).checkpoints || []).length,
            productivity_score: 0,
            engagement_score: 0,
          },
        });
      }

      return sessions;
    } catch (error) {
      console.error('[SessionService] Failed to get recent sessions:', error);
      throw new Error(`Failed to get recent sessions: ${error}`);
    }
  }

  /**
   * Get a session by ID with all its messages
   */
  async getSessionById(id: string): Promise<Session | null> {
    try {
      const db = this.getDB()

      // Get the session
      const sessionRow = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()

      if (!sessionRow) {
        return null
      }

      // Get all messages for the session
      const messageRows = await db
        .selectFrom('messages')
        .selectAll()
        .where('session_id', '=', id)
        .orderBy('message_order', 'asc')
        .execute()

      // Convert to Session object with messages
      return this.convertRowToSessionWithMessages(sessionRow, messageRows)
    } catch (error) {
      console.error('[SessionService] Failed to get session by ID:', error)
      throw new Error(`Failed to get session: ${error}`)
    }
  }

  /**
   * Convert database rows to Session object with messages
   */
  private convertRowToSessionWithMessages(sessionRow: any, messageRows: any[]): Session {
    const metadata = JSONFieldHelpers.parseObject<SessionMetadata>(sessionRow.metadata) || {}

    return {
      id: sessionRow.id,
      title: sessionRow.title,
      created_at: new Date(sessionRow.created_at),
      updated_at: new Date(sessionRow.updated_at),
      messages: messageRows.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        thinking_content: row.thinking_content,
        timestamp: new Date(row.timestamp),
        provider: row.provider,
        model: row.model,
        tokens_used: (JSONFieldHelpers.parseObject(row.tokens_used) as any)?.total || 0,
      })),
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
        current_provider: (metadata as any).provider || 'openai',
        current_model: (metadata as any).model || 'gpt-3.5-turbo',
        system_prompt: (metadata as any).system_prompt,
        temperature: (metadata as any).temperature || 0.7,
        max_tokens: (metadata as any).max_tokens || 4096,
        enable_thinking: (metadata as any).enable_thinking ?? true,
        conversation_style: (metadata as any).conversation_style || 'educational',
        language: (metadata as any).language || 'en',
        user_preferences: (metadata as any).user_preferences || {
          learning_style: 'reading',
          detail_level: 'detailed',
          example_preference: 'all',
          response_length: 'medium',
          technical_level: 'intermediate',
        },
      },
      checkpoints: (metadata as any).checkpoints || [],
      statistics: {
        total_messages: sessionRow.total_messages,
        user_messages: messageRows.filter(m => m.role === 'user').length,
        assistant_messages: messageRows.filter(m => m.role === 'assistant').length,
        total_tokens_used: messageRows.reduce((sum, m) => {
          const tokens = JSONFieldHelpers.parseObject(m.tokens_used)
          return sum + ((tokens as any)?.total || 0)
        }, 0),
        total_thinking_tokens: 0, // Would need to parse from thinking_content
        session_duration: sessionRow.duration_seconds || 0,
        average_response_time: 0,
        concepts_learned: sessionRow.concepts_studied || 0,
        checkpoints_created: ((metadata as any).checkpoints || []).length,
        productivity_score: 0,
        engagement_score: 0,
      },
    }
  }

  /**
   * Create a new session
   */
  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'messages'>): Promise<string> {
    try {
      console.log('[SessionService] Creating new session with title:', sessionData.title);
      const db = this.getDB()
      const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      console.log('[SessionService] Generated session ID:', id);

      // Combine session metadata with context
      const metadata = {
        ...sessionData.metadata,
        provider: sessionData.context.current_provider,
        model: sessionData.context.current_model,
        system_prompt: sessionData.context.system_prompt,
        temperature: sessionData.context.temperature,
        max_tokens: sessionData.context.max_tokens,
        enable_thinking: sessionData.context.enable_thinking,
        conversation_style: sessionData.context.conversation_style,
        language: sessionData.context.language,
        user_preferences: sessionData.context.user_preferences,
        checkpoints: sessionData.checkpoints,
      }

      const now = new Date().toISOString()

      await db
        .insertInto('learning_sessions')
        .values({
          id,
          title: sessionData.title,
          description: sessionData.metadata.description,
          start_time: now,
          duration_seconds: 0,
          total_messages: 0,
          concepts_studied: 0,
          difficulty_level: 1,
          session_type: 'general',
          metadata: JSON.stringify(metadata),
          created_at: now,
          updated_at: now,
        })
        .execute()

      console.log('[SessionService] Session created successfully in database:', id);
      return id
    } catch (error) {
      console.error('[SessionService] Failed to create session:', error)
      throw new Error(`Failed to create session: ${error}`)
    }
  }

  /**
   * Save a message to the database
   */
  async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    try {
      console.log(`[SessionService] Saving message ${message.id} to session ${sessionId}`);
      const db = this.getDB()

      // Check if session exists, if not, create it
      const existingSession = await db
        .selectFrom('learning_sessions')
        .select('id')
        .where('id', '=', sessionId)
        .executeTakeFirst();

      if (!existingSession) {
        console.log(`[SessionService] Session ${sessionId} does not exist, creating it...`);
        await this.createSessionFromMessage(sessionId, message);
      }

      // Get the current message order for this session
      const lastMessage = await db
        .selectFrom('messages')
        .select('message_order')
        .where('session_id', '=', sessionId)
        .orderBy('message_order', 'desc')
        .limit(1)
        .executeTakeFirst()

      const message_order = (lastMessage?.message_order || 0) + 1

      await db
        .insertInto('messages')
        .values({
          id: message.id,
          session_id: sessionId,
          role: message.role,
          content: message.content,
          thinking_content: message.thinking_content,
          provider: message.provider,
          model: message.model,
          tokens_used: message.tokens_used ? JSON.stringify({
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: message.tokens_used
          }) : '{}',
          timestamp: message.timestamp.toISOString(),
          message_order,
          created_at: new Date().toISOString()
        })
        .execute()

      // Update session's message count and updated_at timestamp
      await db
        .updateTable('learning_sessions')
        .set({
          total_messages: sql`total_messages + 1`,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', sessionId)
        .execute()

      console.log(`[SessionService] Saved message ${message.id} to session ${sessionId}`)
    } catch (error) {
      console.error('[SessionService] Failed to save message:', error)
      throw new Error(`Failed to save message: ${error}`)
    }
  }

  /**
   * Create a session from a message (for sessions that don't exist)
   */
  private async createSessionFromMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    try {
      console.log(`[SessionService] Creating session ${sessionId} from message`);
      const db = this.getDB();

      const now = new Date().toISOString();
      const metadata = {
        title: `Chat Session ${new Date().toLocaleDateString()}`,
        description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        tags: [],
        category: 'general',
        difficulty: 'intermediate',
        learning_objectives: [],
        topics_covered: [],
        user_id: undefined,
        archived: false,
        pinned: false,
        color: undefined,
        provider: message.provider,
        auto_created: true // Flag to indicate this was auto-created
      };

      await db
        .insertInto('learning_sessions')
        .values({
          id: sessionId,
          title: metadata.title,
          description: metadata.description,
          start_time: now,
          duration_seconds: 0,
          total_messages: 0,
          concepts_studied: 0,
          difficulty_level: 1,
          session_type: 'general',
          metadata: JSON.stringify(metadata),
          created_at: now,
          updated_at: now,
        })
        .execute();

      console.log(`[SessionService] Auto-created session ${sessionId} successfully`);
    } catch (error) {
      console.error(`[SessionService] Failed to create session from message:`, error);
      throw new Error(`Failed to create session from message: ${error}`);
    }
  }

  /**
   * Save multiple messages to the database (batch operation)
   */
  async saveMessages(sessionId: string, messages: ConversationMessage[]): Promise<void> {
    try {
      const db = this.getDB()

      if (messages.length === 0) {
        return
      }

      // Get the current message order for this session
      const lastMessage = await db
        .selectFrom('messages')
        .select('message_order')
        .where('session_id', '=', sessionId)
        .orderBy('message_order', 'desc')
        .limit(1)
        .executeTakeFirst()

      let message_order = (lastMessage?.message_order || 0)

      // Prepare message records
      const messageRecords = messages.map((message) => ({
        id: message.id,
        session_id: sessionId,
        role: message.role,
        content: message.content,
        thinking_content: message.thinking_content,
        provider: message.provider,
        model: message.model,
        tokens_used: message.tokens_used ? JSON.stringify({
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: message.tokens_used
        }) : '{}',
        timestamp: message.timestamp.toISOString(),
        message_order: ++message_order,
        created_at: new Date().toISOString()
      }))

      // Insert all messages
      await db
        .insertInto('messages')
        .values(messageRecords)
        .execute()

      // Update session's message count and updated_at timestamp
      await db
        .updateTable('learning_sessions')
        .set({
          total_messages: sql`total_messages + ${messages.length}`,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', sessionId)
        .execute()

      console.log(`[SessionService] Saved ${messages.length} messages to session ${sessionId}`)
    } catch (error) {
      console.error('[SessionService] Failed to save messages:', error)
      throw new Error(`Failed to save messages: ${error}`)
    }
  }

  /**
   * Update a message in the database
   */
  async updateMessage(sessionId: string, messageId: string, updates: Partial<ConversationMessage>): Promise<void> {
    try {
      const db = this.getDB()

      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.content !== undefined) {
        updateData.content = updates.content
      }
      if (updates.thinking_content !== undefined) {
        updateData.thinking_content = updates.thinking_content
      }
      if (updates.tokens_used !== undefined) {
        updateData.tokens_used = JSON.stringify({
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: updates.tokens_used
        })
      }

      await db
        .updateTable('messages')
        .set(updateData)
        .where('id', '=', messageId)
        .where('session_id', '=', sessionId)
        .execute()

      // Update session's updated_at timestamp
      await db
        .updateTable('learning_sessions')
        .set({
          updated_at: new Date().toISOString()
        })
        .where('id', '=', sessionId)
        .execute()

      console.log(`[SessionService] Updated message ${messageId} in session ${sessionId}`)
    } catch (error) {
      console.error('[SessionService] Failed to update message:', error)
      throw new Error(`Failed to update message: ${error}`)
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      const db = this.getDB()

      // Delete messages first (foreign key constraint)
      await db
        .deleteFrom('messages')
        .where('session_id', '=', id)
        .execute()

      // Delete the session
      await db
        .deleteFrom('learning_sessions')
        .where('id', '=', id)
        .execute()

      return true
    } catch (error) {
      console.error('[SessionService] Failed to delete session:', error)
      throw new Error(`Failed to delete session: ${error}`)
    }
  }
}

// Export the class for dependency injection
export { SessionService as default }