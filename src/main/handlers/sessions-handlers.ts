/**
 * Sessions IPC Handlers
 *
 * Manages thread metadata using SQLite via learningService.
 * Message history is handled by LangGraph checkpoints.
 */

import { ipcMain } from 'electron';
import type { LearningService } from '../services/domain/learning/learning-service';
import type { LoggerService } from '../services/core/logger/logger-service';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import type { SessionDisplay } from '@/shared/types/electron-api/sessions-api';
import type { APIResponse } from '@/shared/types/electron-api';
import type { SessionStatistics } from '@/shared/types/electron-api/sessions-api';

type SessionsSearchPayload = {
  query?: string;
  filters?: Parameters<LearningService['searchSessions']>[1];
};

type SessionsDeps = {
  learningService: LearningService;
  loggerService: LoggerService;
};

const ok = <T>(data?: T): APIResponse<T> => ({ success: true, data });
const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
  success: false,
  error: { code, message, details: details as Record<string, unknown> | undefined },
});

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
    lastActivity: session.updatedAt,
  duration: session.duration,
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
      try {
        const limit = options?.limit ?? 20;
        const sessions = await services.learningService.getRecentSessions({
          limit: limit + (options?.offset ?? 0),
        });
        const offset = options?.offset ?? 0;
        const sliced = sessions.slice(offset, offset + limit);
        return ok({
          sessions: sliced.map(toSessionDisplay),
          total: sessions.length,
          hasMore: sessions.length > offset + sliced.length,
        });
      } catch (error) {
        logger.error('sessions:list failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        return fail(
          IPC_ERROR_CODES.sessions.createFailed,
          error instanceof Error ? error.message : 'Failed to list sessions',
        );
      }
    },
  );

  /**
   * Create a new thread in learning_sessions
   * Accepts optional threadId for Assistant UI integration
   */
  ipcMainInstance.handle(
    'sessions:create',
    async (_event, payload: { title?: string; threadId?: string }) => {
      try {
        const session = await services.learningService.startLearningSession({
          topic: payload.title ?? 'New Chat',
          goals: [],
          difficulty: 'intermediate',
          agentType: 'learning',
          learningStyle: 'visual',
          ...(payload.threadId ? { sessionId: payload.threadId } : {}),
        });

        return ok({ sessionId: session.id, session: toSessionDisplay(session) });
      } catch (error) {
        logger.error('sessions:create failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        return fail(
          IPC_ERROR_CODES.sessions.createFailed,
          error instanceof Error ? error.message : 'Failed to create session',
        );
      }
    },
  );

  /**
   * Get thread metadata by ID
   */
  ipcMainInstance.handle('sessions:get', async (_event, sessionId: string) => {
    try {
      const session = await services.learningService.getSession(sessionId);
      if (!session) {
        return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
      }
      return ok(toSessionDisplay(session));
    } catch (error) {
      logger.error('sessions:get failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return fail(
        IPC_ERROR_CODES.sessions.notFound,
        error instanceof Error ? error.message : 'Session not found',
      );
    }
  });

  /**
   * Update thread metadata (title, status)
   */
  ipcMainInstance.handle(
    'sessions:update',
    async (_event, sessionId: string, updates: Partial<SessionDisplay>) => {
      try {
        const updated = await services.learningService.updateSession(sessionId, {
          title: updates.title,
          status: updates.status as 'active' | 'paused' | 'completed' | undefined,
        });
        if (!updated) {
          return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
        }
        return ok(toSessionDisplay(updated));
      } catch (error) {
        logger.error('sessions:update failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        return fail(
          IPC_ERROR_CODES.sessions.notFound,
          error instanceof Error ? error.message : 'Session not found',
        );
      }
    },
  );

  /**
   * Delete a thread
   */
  ipcMainInstance.handle('sessions:delete', async (_event, sessionId: string) => {
    try {
      const deleted = await services.learningService.deleteSession(sessionId);
      return ok({ deleted });
    } catch (error) {
      logger.error('sessions:delete failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return fail(
        IPC_ERROR_CODES.sessions.notFound,
        error instanceof Error ? error.message : 'Failed to delete session',
      );
    }
  });

  /**
   * Update thread title
   */
  ipcMainInstance.handle(
    'sessions:update-title',
    async (_event, sessionId: string, title: string) => {
      try {
        const updated = await services.learningService.updateSessionTitle(sessionId, title);
        if (!updated) {
          return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
        }
        return ok(undefined);
      } catch (error) {
        logger.error('sessions:update-title failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        return fail(
          IPC_ERROR_CODES.sessions.notFound,
          error instanceof Error ? error.message : 'Session not found',
        );
      }
    },
  );

  /**
   * Get recent threads
   */
  ipcMainInstance.handle('sessions:get-recent', async (_event, options?: { limit?: number }) => {
    try {
      const limit = options?.limit ?? 10;
      const sessions = await services.learningService.getRecentSessions({ limit });
      return ok(sessions.map(toSessionDisplay));
    } catch (error) {
      logger.error('sessions:get-recent failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return fail(
        IPC_ERROR_CODES.sessions.notFound,
        error instanceof Error ? error.message : 'Failed to get recent sessions',
      );
    }
  });

  /**
   * Search threads
   */
  ipcMainInstance.handle('sessions:search', async (_event, payload: SessionsSearchPayload) => {
    try {
      const result = await services.learningService.searchSessions(
        payload.query ?? '',
        payload.filters,
      );
      return ok({
        sessions: result.sessions.map(toSessionDisplay),
        total: result.totalResults,
        query: result.query,
        hasMore: false,
      });
    } catch (error) {
      logger.error('sessions:search failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return fail(
        IPC_ERROR_CODES.sessions.notFound,
        error instanceof Error ? error.message : 'Failed to search sessions',
      );
    }
  });

  /**
   * Get session statistics
   */
  ipcMainInstance.handle('sessions:get-statistics', async () => {
    try {
      const stats = await services.learningService.getSessionStatistics();
      return ok({
        ...stats,
        totalTokensUsed: 0, // Not tracked yet
      } satisfies SessionStatistics);
    } catch (error) {
      logger.error('sessions:get-statistics failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return fail(
        IPC_ERROR_CODES.sessions.notFound,
        error instanceof Error ? error.message : 'Failed to get session statistics',
      );
    }
  });

  logger.info('Sessions handlers registered (SQLite-backed, thread-focused)');
};
