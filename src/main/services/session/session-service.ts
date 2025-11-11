/**
 * Main Process Session Service
 *
 * Session management service for the main process that works directly with
 * the database and integrates with the agent manager for agent-aware sessions.
 */

import { Kysely } from 'kysely';
import { Database } from '../database/kysely-schema';
import { AsyncLocalStorage } from 'async_hooks';
import { LoggerFactory } from '../logger';
import { ServiceError } from '../types';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';
import { ILogger } from '../registry/ServiceTokens';

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
export class SessionService {
  private database: Kysely<Database>;
  private logger: ILogger;
  private als: AsyncLocalStorage<any>;

  constructor(dependencies: {
    database: Kysely<Database>;
    logger: ILogger;
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

        // Insert session into database using Kysely
        await this.database.insertInto('learning_sessions')
          .values({
            id,
            title: request.title,
            description: request.description || '',
            start_time: now,
            duration_seconds: 0,
            total_messages: 0,
            concepts_studied: 0,
            difficulty_level: 1,
            session_type: 'general',
            metadata: JSON.stringify(metadata),
            created_at: now,
            updated_at: now
          })
          .execute();

        this.logger.info('Session created successfully', { sessionId: id });
        return id;

      } catch (error) {
        this.logger.error('Failed to create session', error as Error);
        throw new ServiceError(
          `Failed to create session: ${(error as Error).message}`,
          'SESSION_CREATE_FAILED',
          'SessionService',
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
        const row = await this.database
          .selectFrom('learning_sessions')
          .selectAll()
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!row) {
          return null;
        }

        // Get messages for the session
        const messages = await this.database
          .selectFrom('messages')
          .selectAll()
          .where('session_id', '=', sessionId)
          .orderBy('message_order', 'asc')
          .execute();

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
          'SessionService',
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
        const currentSession = await this.database
          .selectFrom('learning_sessions')
          .select(['metadata'])
          .where('id', '=', request.sessionId)
          .executeTakeFirst();

        if (!currentSession) {
          throw new ServiceError(
            'Session not found',
            'SESSION_NOT_FOUND',
            'SessionService'
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

        // Update session using Kysely
        await this.database
          .updateTable('learning_sessions')
          .set({
            ...(request.title && { title: request.title }),
            ...(request.description && { description: request.description }),
            metadata: JSON.stringify(updatedMetadata),
            updated_at: new Date().toISOString()
          })
          .where('id', '=', request.sessionId)
          .execute();

        this.logger.info('Session updated successfully', { sessionId: request.sessionId });

      } catch (error) {
        this.logger.error('Failed to update session', error as Error, { sessionId: request.sessionId });
        throw new ServiceError(
          `Failed to update session: ${(error as Error).message}`,
          'SESSION_UPDATE_FAILED',
          'SessionService',
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
        const currentSession = await this.database
          .selectFrom('learning_sessions')
          .select(['metadata'])
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!currentSession) {
          throw new ServiceError(
            'Session not found',
            'SESSION_NOT_FOUND',
            'SessionService'
          );
        }

        // Update metadata with new title
        const metadata = JSON.parse(currentSession.metadata || '{}');
        metadata.title = title;
        metadata.updated_at = new Date().toISOString();

        // Update session
        await this.database
          .updateTable('learning_sessions')
          .set({
            title: title,
            metadata: JSON.stringify(metadata),
            updated_at: new Date().toISOString()
          })
          .where('id', '=', sessionId)
          .execute();

        this.logger.info('Session title updated successfully', { sessionId, title });

      } catch (error) {
        this.logger.error('Failed to update session title', error as Error, { sessionId, title });
        throw new ServiceError(
          `Failed to update session title: ${(error as Error).message}`,
          'SESSION_TITLE_UPDATE_FAILED',
          'SessionService',
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

        const rows = await this.database
          .selectFrom('learning_sessions')
          .selectAll()
          .orderBy('updated_at', 'desc')
          .limit(limit)
          .execute();

        const sessions = [];
        for (const row of rows) {
          const metadata = JSON.parse(row.metadata || '{}');

          // Get message count for the session using Kysely
          const messageCountResult = await this.database
            .selectFrom('messages')
            .select(eb => eb.fn.countAll<number>().as('count'))
            .where('session_id', '=', row.id)
            .executeTakeFirst();

          const messageCount = messageCountResult?.count || 0;

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
              total_messages: messageCount,
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
          'SessionService',
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

        // Build the main query
        let queryBuilder = this.database
          .selectFrom('learning_sessions')
          .selectAll();

        // Add search conditions
        if (query.query) {
          const searchTerm = `%${query.query}%`;
          queryBuilder = queryBuilder.where((eb) => 
            eb.or([
              eb('title', 'like', searchTerm),
              eb('description', 'like', searchTerm)
            ])
          );
        }

        if (query.date_range) {
          queryBuilder = queryBuilder
            .where('start_time', '>=', query.date_range.start.toISOString())
            .where('start_time', '<=', query.date_range.end.toISOString());
        }

        // Add ordering and pagination
        queryBuilder = queryBuilder.orderBy('updated_at', 'desc');

        if (query.limit) {
          queryBuilder = queryBuilder.limit(query.limit);
        }

        if (query.offset) {
          queryBuilder = queryBuilder.offset(query.offset);
        }

        const rows = await queryBuilder.execute();

        // Get total count
        let countBuilder = this.database
          .selectFrom('learning_sessions')
          .select(eb => eb.fn.countAll<number>().as('total'));

        if (query.query) {
          const searchTerm = `%${query.query}%`;
          countBuilder = countBuilder.where((eb) => 
            eb.or([
              eb('title', 'like', searchTerm),
              eb('description', 'like', searchTerm)
            ])
          );
        }

        if (query.date_range) {
          countBuilder = countBuilder
            .where('start_time', '>=', query.date_range.start.toISOString())
            .where('start_time', '<=', query.date_range.end.toISOString());
        }

        const countResult = await countBuilder.executeTakeFirst();
        const total = countResult?.total ? Number(countResult.total) : 0;

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
          'SessionService',
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
        await this.database
          .deleteFrom('messages')
          .where('session_id', '=', sessionId)
          .execute();

        // Delete the session
        await this.database
          .deleteFrom('learning_sessions')
          .where('id', '=', sessionId)
          .execute();

        this.logger.info('Session deleted successfully', { sessionId });
        return true;

      } catch (error) {
        this.logger.error('Failed to delete session', error as Error, { sessionId });
        throw new ServiceError(
          `Failed to delete session: ${(error as Error).message}`,
          'SESSION_DELETE_FAILED',
          'SessionService',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Save session and associated messages atomically
   */
  async saveSessionWithMessages(
    memorySession: MemorySession,
    messages: ConversationMessage[]
  ): Promise<string> {
    return this.runWithContext('session:save-with-messages', async () => {
      try {
        const sessionId =
          memorySession.id ||
          `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const now = new Date().toISOString();

        const metadata = {
          ...(memorySession.metadata || {}),
          system_prompt: memorySession.context?.system_prompt,
          notes: memorySession.context?.notes,
          learning_objectives: memorySession.context?.learning_objectives || [],
          checkpoints: memorySession.checkpoints || [],
          updated_at: now
        };

        const existingSession = await this.database
          .selectFrom('learning_sessions')
          .select('id')
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (existingSession) {
          await this.database
            .updateTable('learning_sessions')
            .set({
              title: memorySession.title,
              description: memorySession.metadata?.description || '',
              total_messages: messages.length,
              metadata: JSON.stringify(metadata),
              updated_at: now
            })
            .where('id', '=', sessionId)
            .execute();

          await this.database
            .deleteFrom('messages')
            .where('session_id', '=', sessionId)
            .execute();
        } else {
          await this.database
            .insertInto('learning_sessions')
            .values({
              id: sessionId,
              title: memorySession.title,
              description: memorySession.metadata?.description || '',
              start_time: now,
              duration_seconds: 0,
              total_messages: messages.length,
              concepts_studied: memorySession.metadata?.concepts_studied || 0,
              difficulty_level: memorySession.metadata?.difficulty_level || 1,
              session_type: memorySession.metadata?.session_type || 'general',
              metadata: JSON.stringify(metadata),
              created_at: now,
              updated_at: now
            })
            .execute();
        }

        for (let index = 0; index < messages.length; index++) {
          const message = messages[index];
          await this.database
            .insertInto('messages')
            .values({
              id: message.id,
              session_id: sessionId,
              role: message.role,
              content: message.content,
              thinking_content: message.thinking_content,
              provider: message.provider,
              model: message.model,
              tokens_used: message.tokens_used
                ? JSON.stringify({
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: message.tokens_used
                  })
                : '{}',
              timestamp: (message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toISOString(),
              message_order: index + 1,
              created_at: now
            })
            .execute();
        }

        return sessionId;
      } catch (error) {
        this.logger.error(
          'Failed to save session with messages',
          error as Error,
          { sessionId: memorySession.id }
        );
        throw new ServiceError(
          `Failed to save session with messages: ${(error as Error).message}`,
          'SESSION_SAVE_FAILED',
          'SessionService',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Save a message to a session
   */
  async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    return this.runWithContext('session:save-message', async () => {
      try {
        this.logger.debug('Saving message', { sessionId, messageId: message.id });

        // Check if session exists
        const sessionExists = await this.database
          .selectFrom('learning_sessions')
          .select('id')
          .where('id', '=', sessionId)
          .executeTakeFirst();

        if (!sessionExists) {
          throw new ServiceError(
            'Session not found',
            'SESSION_NOT_FOUND',
            'SessionService'
          );
        }

        // Get next message order
        const lastMessage = await this.database
          .selectFrom('messages')
          .select(eb => eb.fn.max<number>('message_order').as('max_order'))
          .where('session_id', '=', sessionId)
          .executeTakeFirst();

        const messageOrder = (lastMessage?.max_order || 0) + 1;

        // Insert message
        await this.database
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
            timestamp: (message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toISOString(),
            message_order: messageOrder,
            created_at: new Date().toISOString()
          })
          .execute();

        // Update session message count
        await this.database
          .updateTable('learning_sessions')
          .set({
            total_messages: eb => eb('total_messages', '+', 1),
            updated_at: new Date().toISOString()
          })
          .where('id', '=', sessionId)
          .execute();

        this.logger.debug('Message saved successfully', { sessionId, messageId: message.id });

      } catch (error) {
        this.logger.error('Failed to save message', error as Error, { sessionId });
        throw new ServiceError(
          `Failed to save message: ${(error as Error).message}`,
          'MESSAGE_SAVE_FAILED',
          'SessionService',
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
   * Get aggregated session statistics
   */
  async getGlobalStatistics(): Promise<{
    totalSessions: number;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalTokensUsed: number;
    averageMessagesPerSession: number;
  }> {
    return this.runWithContext('session:get-stats', async () => {
      try {
        const totalSessionsRow = await this.database
          .selectFrom('learning_sessions')
          .select(eb => eb.fn.countAll<number>().as('total'))
          .executeTakeFirst();
          
        const messageStats = await this.database
          .selectFrom('messages')
          .select([
            eb => eb.fn.countAll<number>().as('total_messages'),
            eb => eb.fn.sum<number>(eb.case().when('role', '=', 'user').then(1).else(0).end()).as('user_messages'),
            eb => eb.fn.sum<number>(eb.case().when('role', '=', 'assistant').then(1).else(0).end()).as('assistant_messages')
          ])
          .executeTakeFirst();
          
        const tokenRows = await this.database
          .selectFrom('messages')
          .select(['tokens_used'])
          .where('tokens_used', 'is not', null)
          .where('tokens_used', '!=', '')
          .execute();

        let totalTokensUsed = 0;
        for (const row of tokenRows) {
          try {
            const parsed = JSON.parse(row.tokens_used || '{}');
            totalTokensUsed += parsed.total_tokens || 0;
          } catch {
            // Ignore invalid JSON entries
          }
        }

        const totalSessions = Number(totalSessionsRow?.total) || 0;
        const totalMessages = Number(messageStats?.total_messages) || 0;
        const totalUserMessages = Number(messageStats?.user_messages) || 0;
        const totalAssistantMessages = Number(messageStats?.assistant_messages) || 0;

        return {
          totalSessions,
          totalMessages,
          totalUserMessages,
          totalAssistantMessages,
          totalTokensUsed,
          averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0
        };
      } catch (error) {
        this.logger.error('Failed to get session statistics', error as Error);
        throw new ServiceError(
          `Failed to get session statistics: ${(error as Error).message}`,
          'SESSION_STATS_FAILED',
          'SessionService',
          undefined,
          error as Error
        );
      }
    });
  }

  /**
   * Transform session to display format
   */
  transformToDisplaySession(session: any): any {
    // Transform complex session object to display-optimized format
    return {
      id: session.id,
      title: session.title,
      preview: this.generatePreview(session),
      messageCount: session.messageCount || session.statistics?.totalMessages || 0,
      lastActivity: this.formatRelativeTime(session.updated_at),
      duration: this.formatDuration(session.statistics?.sessionDuration || 0),
      difficulty: session.metadata?.difficulty || 'medium',
      tags: session.metadata?.tags || [],
      isActive: session.isActive || false,
      hasUnreadMessages: (session.unreadCount || 0) > 0,
      agentType: session.metadata?.agent_mode || 'single',
      color: this.getAgentColor(session.metadata?.agent_mode || 'single'),
      learningProgress: this.calculateLearningProgress(session),
      masteryLevel: this.calculateMasteryLevel(session),
      isBookmarked: session.metadata?.pinned || false,
      isArchived: session.metadata?.archived || false,
      ...session
    };
  }

  /**
   * Generate preview text for session
   */
  private generatePreview(session: any): string {
    // Generate a preview of the session content
    return session.description || 'Start a conversation to see a preview...';
  }

  /**
   * Format relative time
   */
  private formatRelativeTime(date: Date | string): string {
    const sessionDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - sessionDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  }

  /**
   * Format duration
   */
  private formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get agent color based on agent type
   */
  private getAgentColor(agentType: string): string {
    const colors = {
      single: '#3B82F6',
      orchestration: '#10B981',
      collaborative: '#F59E0B',
      learning: '#8B5CF6',
      tutoring: '#10B981',
      assessment: '#F59E0B',
      practice: '#EF4444',
      research: '#8B5CF6'
    };
    return colors[agentType] || '#6B7280';
  }

  /**
   * Calculate learning progress for a session
   */
  private calculateLearningProgress(session: any): number {
    // Calculate learning progress based on various metrics
    const statistics = session.statistics || {};
    const metadata = session.metadata || {};

    // Factors: messages, concepts learned, duration, engagement
    const messageScore = Math.min((statistics.totalMessages || 0) / 10, 1) * 0.3;
    const conceptScore = Math.min((statistics.conceptsLearned || 0) / 5, 1) * 0.4;
    const durationScore = Math.min((statistics.sessionDuration || 0) / (30 * 60 * 1000), 1) * 0.2; // 30 min max
    const engagementScore = Math.min((statistics.engagementScore || 0) / 100, 1) * 0.1;

    return Math.round((messageScore + conceptScore + durationScore + engagementScore) * 100);
  }

  /**
   * Calculate mastery level for a session
   */
  private calculateMasteryLevel(session: any): number {
    // Calculate mastery level based on performance metrics
    const statistics = session.statistics || {};

    // Factors: response time, success rate, concepts learned
    const speedScore = Math.min(1, 30000 / Math.max(statistics.averageResponseTime || 1000, 1000)) * 0.3;
    const conceptScore = Math.min((statistics.conceptsLearned || 0) / 10, 1) * 0.5;
    const qualityScore = Math.min((statistics.productivityScore || 0) / 100, 1) * 0.2;

    return Math.min(5, Math.round((speedScore + conceptScore + qualityScore) * 5));
  }

  /**
   * Dispose of the session service
   */
  dispose(): void {
    this.logger.info('Session service disposed');
  }
}
