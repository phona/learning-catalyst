/**
 * Sessions IPC Handlers
 *
 * Manages thread metadata using SQLite via learningService.
 * Message history is handled by LangGraph checkpoints.
 */

import { ipcMain } from 'electron';
import type { LearningService } from '../services/domain/learning/learning-service';
import type { LoggerService } from '../services/core/logger/logger-service';
import type { MemorySession } from '@/shared/types/session';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type { APIResponse } from '@/shared/types/electron-api';
import type { SessionStatistics } from '@/shared/types/electron-api/sessions-api';
import { ChatService } from '../services/domain/chat';

type SessionsSearchPayload = {
  query?: string;
  filters?: Parameters<LearningService['searchSessions']>[1];
};

type SessionsDeps = {
  learningService: LearningService;
  loggerService: LoggerService;
};

/**
 * Convert learning session to SessionDisplay format for UI
 */
const toSessionDisplay = (session: {
  id: string;
  topic: string;
  difficulty: string;
  status: string;
  progress: number;
  duration: number;
  agentType: string;
  updatedAt: string;
}): SessionDisplay => ({
  id: session.id,
  title: session.topic,
  topic: session.topic,
  difficulty: session.difficulty as SessionDisplay['difficulty'],
  status: session.status as SessionDisplay['status'],
  progress: session.progress,
  agent: { type: session.agentType, name: session.agentType },
  lastActivity: session.updatedAt,
  duration: `${Math.round(session.duration / 60)}m`,
});

export const setupSessionsHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: SessionsDeps,
): void => {
  const logger = services.loggerService.child({ handler: 'sessions' });

  /**
   * List all threads from learning_sessions table
   */
  ipcMainInstance.handle(
    'sessions:list',
    async (_event, options?: { query?: string; limit?: number; offset?: number }) => {
      const limit = options?.limit ?? 20;
      const sessions = await services.learningService.getRecentSessions({
        limit: limit + (options?.offset ?? 0),
      });
      const offset = options?.offset ?? 0;
      const sliced = sessions.slice(offset, offset + limit);
      return {
        sessions: sliced.map(toSessionDisplay),
        total: sessions.length,
        hasMore: sessions.length > offset + sliced.length,
      };
    },
  );

  /**
   * Create a new thread in learning_sessions
   * Accepts optional threadId for Assistant UI integration
   */
  ipcMainInstance.handle(
    'sessions:create',
    async (_event, payload: { title?: string; threadId?: string }) => {
      console.log('[sessions:create] Received payload:', payload);
      const session = await services.learningService.startLearningSession({
        topic: payload.title ?? 'New Chat',
        goals: [],
        difficulty: 'intermediate',
        agentType: 'learning',
        learningStyle: 'visual',
        sessionId: payload.threadId, // ✅ Pass threadId from Assistant UI
      });
      const result = { sessionId: session.id, session: toSessionDisplay(session) };
      console.log('[sessions:create] Returning result:', result);
      return result;
    },
  );

  /**
   * Get thread metadata by ID
   */
  ipcMainInstance.handle('sessions:get', async (_event, sessionId: string) => {
    const session = await services.learningService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return toSessionDisplay(session);
  });

  /**
   * Update thread metadata (title, status)
   */
  ipcMainInstance.handle(
    'sessions:update',
    async (_event, sessionId: string, updates: Partial<SessionDisplay>) => {
      const updated = await services.learningService.updateSession(sessionId, {
        title: updates.title,
        status: updates.status as 'active' | 'paused' | 'completed' | undefined,
      });
      if (!updated) {
        throw new Error('Session not found');
      }
      return toSessionDisplay(updated);
    },
  );

  /**
   * Delete a thread
   */
  ipcMainInstance.handle('sessions:delete', async (_event, sessionId: string) => {
    const deleted = await services.learningService.deleteSession(sessionId);
    return { deleted };
  });

  /**
   * Update thread title
   */
  ipcMainInstance.handle(
    'sessions:update-title',
    async (_event, sessionId: string, title: string) => {
      const updated = await services.learningService.updateSessionTitle(sessionId, title);
      if (!updated) {
        throw new Error('Session not found');
      }
      return undefined;
    },
  );

  /**
   * Get recent threads
   */
  ipcMainInstance.handle('sessions:get-recent', async (_event, options?: { limit?: number }) => {
    const limit = options?.limit ?? 10;
    const sessions = await services.learningService.getRecentSessions({ limit });
    return sessions.map(toSessionDisplay);
  });

  /**
   * Search threads
   */
  ipcMainInstance.handle('sessions:search', async (_event, payload: SessionsSearchPayload) => {
    const result = await services.learningService.searchSessions(
      payload.query ?? '',
      payload.filters,
    );
    return {
      sessions: result.sessions.map(toSessionDisplay),
      total: result.totalResults,
      query: result.query,
      hasMore: false,
    };
  });

  /**
   * Get session statistics
   */
  ipcMainInstance.handle('sessions:get-statistics', async () => {
    const stats = await services.learningService.getSessionStatistics();
    return {
      ...stats,
      totalTokensUsed: 0, // Not tracked yet
    } satisfies SessionStatistics;
  });

  logger.info('Sessions handlers registered (SQLite-backed, thread-focused)');
};
