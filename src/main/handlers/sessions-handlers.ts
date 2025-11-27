/**
 * Sessions IPC Handlers
 *
 * Aligns with docs/DEVELOPER-GUIDE/electron-api.md sessions domain.
 */

import { ipcMain } from 'electron';
import type { LearningService } from '../services/domain/learning/learning-service';
import type { LoggerService } from '../services/core/logger/logger-service';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
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

const memorySessions = new Map<string, SessionDisplay>();

const defaultStats = (): SessionStatistics => ({
  totalSessions: 0,
  totalMessages: 0,
  totalUserMessages: 0,
  totalAssistantMessages: 0,
  totalTokensUsed: 0,
  averageMessagesPerSession: 0,
});

export const setupSessionsHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: SessionsDeps,
): void => {
  const logger = services.loggerService.child({ handler: 'sessions' });
  const ok = <T>(data: T): APIResponse<T> => ({ success: true, data });
  const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
    success: false,
    error: { code, message, details },
  });

  ipcMainInstance.handle(
    'sessions:list',
    async (_event, options?: { query?: string; limit?: number; offset?: number }) => {
      const limit = options?.limit ?? 20;
      const sessions = await services.learningService.getRecentSessions({ limit });
      const offset = options?.offset ?? 0;
      const sliced = sessions.slice(offset, offset + limit);
      return ok({
        sessions: sliced,
        total: sessions.length,
        hasMore: sessions.length > offset + sliced.length,
      });
    },
  );

  ipcMainInstance.handle('sessions:create', async (_event, payload: MemorySession) => {
    try {
      const session = await services.learningService.startLearningSession({
        topic: payload.metadata?.title ?? payload.title ?? 'New session',
        goals: payload.metadata?.learningObjectives ?? [],
        difficulty: payload.metadata?.difficulty ?? 'intermediate',
        agentType: payload.metadata?.primaryAgentId ?? 'learning',
        learningStyle: 'visual',
      });
      memorySessions.set(session.id, session as unknown as SessionDisplay);
      return ok({ sessionId: session.id, session });
    } catch (error) {
      logger.error('Failed to create session', { error });
      return fail(IPC_ERROR_CODES.sessions.createFailed, 'Unable to create session', error);
    }
  });

  ipcMainInstance.handle('sessions:get', async (_event, sessionId: string) => {
    if (memorySessions.has(sessionId)) {
      return ok(memorySessions.get(sessionId));
    }
    const sessions = await services.learningService.getRecentSessions({ limit: 50 });
    const found = sessions.find((s) => s.id === sessionId);
    if (!found) {
      return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
    }
    return ok(found);
  });

  ipcMainInstance.handle(
    'sessions:update',
    async (_event, sessionId: string, updates: Partial<SessionDisplay>) => {
      const existing = memorySessions.get(sessionId);
      if (!existing) {
        return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
      }
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      memorySessions.set(sessionId, updated);
      return ok(updated);
    },
  );

  ipcMainInstance.handle('sessions:delete', async (_event, sessionId: string) => {
    const deleted = memorySessions.delete(sessionId);
    return ok({ deleted });
  });

  ipcMainInstance.handle(
    'sessions:save-message',
    async (_event, sessionId: string, _message: ConversationMessage) => {
      const exists = memorySessions.has(sessionId);
      if (!exists) {
        return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
      }
      return ok(undefined);
    },
  );

  ipcMainInstance.handle(
    'sessions:save-session-with-messages',
    async (_event, session: MemorySession, _messages: ConversationMessage[]) => {
      const id = session.id ?? `session_${Date.now()}`;
      memorySessions.set(id, {
        id,
        title: session.title ?? 'Session',
        topic: session.metadata?.title ?? 'Session',
        difficulty: 'intermediate',
        status: 'active',
        progress: 0,
        agent: { type: 'learning', name: 'Learning' },
        lastActivity: new Date().toISOString(),
        duration: '0m',
      } as SessionDisplay);
      return ok({ sessionId: id });
    },
  );

  ipcMainInstance.handle(
    'sessions:update-title',
    async (_event, sessionId: string, title: string) => {
      const s = memorySessions.get(sessionId);
      if (!s) return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
      memorySessions.set(sessionId, { ...s, title });
      return ok(undefined);
    },
  );

  ipcMainInstance.handle('sessions:get-recent', async (_event, options?: { limit?: number }) => {
    const limit = options?.limit ?? 10;
    const sessions = await services.learningService.getRecentSessions({ limit });
    return ok(sessions);
  });

  ipcMainInstance.handle('sessions:search', async (_event, payload: SessionsSearchPayload) => {
    const result = await services.learningService.searchSessions(
      payload.query ?? '',
      payload.filters,
    );
    return ok({
      sessions: result.sessions,
      total: result.totalResults,
      query: result.query,
      hasMore: false,
    });
  });

  ipcMainInstance.handle('sessions:get-statistics', async () => {
    const stats = defaultStats();
    stats.totalSessions = memorySessions.size;
    stats.averageMessagesPerSession = 0;
    return ok(stats);
  });

  logger.info('Sessions handlers registered');
};
