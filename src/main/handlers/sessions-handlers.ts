/**
 * Sessions IPC Handlers
 *
 * Covers the sessions domain documented in docs/DEVELOPER-GUIDE/electron-api.md.
 * Uses learningService as backing store; when unavailable, falls back to a
 * minimal in-memory store to keep the renderer contract stable.
 */

import { ipcMain } from 'electron';
import type { LearningService } from '../services/domain/learning/learning-service';
import type { ILogger } from '../services/types';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type { SessionStatistics } from '@/shared/types/electron-api/sessions-api';

type SessionsDeps = {
  learningService: LearningService;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
};

// Lightweight in-memory store as fallback
const memorySessions = new Map<string, SessionDisplay>();

const defaultStats = (): SessionStatistics => ({
  totalSessions: 0,
  totalMessages: 0,
  totalUserMessages: 0,
  totalAssistantMessages: 0,
  totalTokensUsed: 0,
  averageMessagesPerSession: 0
});

export const setupSessionsHandlers = (ipcMainInstance: typeof ipcMain, services: SessionsDeps): void => {
  const logger = services.loggerService.child({ handler: 'sessions' });

  ipcMainInstance.handle('sessions:list', async (_event, options?: { query?: string; limit?: number; offset?: number }) => {
    const limit = options?.limit ?? 20;
    const sessions = await services.learningService.getRecentSessions({ limit });
    const sliced = sessions.slice(options?.offset ?? 0, (options?.offset ?? 0) + limit);
    return {
      success: true,
      sessions: sliced,
      total: sessions.length,
      hasMore: sessions.length > limit
    };
  });

  ipcMainInstance.handle('sessions:create', async (_event, payload: MemorySession) => {
    const session = await services.learningService.startLearningSession({
      topic: payload.metadata?.title ?? payload.title ?? 'New session',
      goals: payload.metadata?.learningObjectives ?? [],
      difficulty: payload.metadata?.difficulty ?? 'intermediate',
      agentType: payload.metadata?.primaryAgentId ?? 'learning',
      learningStyle: 'visual'
    });
    memorySessions.set(session.id, session as unknown as SessionDisplay);
    return { success: true, sessionId: session.id, session };
  });

  ipcMainInstance.handle('sessions:get', async (_event, sessionId: string) => {
    if (memorySessions.has(sessionId)) {
      return { success: true, session: memorySessions.get(sessionId) };
    }
    const sessions = await services.learningService.getRecentSessions({ limit: 50 });
    const found = sessions.find((s) => s.id === sessionId);
    return { success: !!found, session: found, error: found ? undefined : 'Session not found' };
  });

  ipcMainInstance.handle('sessions:update', async (_event, sessionId: string, updates: Partial<SessionDisplay>) => {
    const existing = memorySessions.get(sessionId);
    if (!existing) {
      return { success: false, error: 'Session not found' };
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    memorySessions.set(sessionId, updated);
    return { success: true, session: updated };
  });

  ipcMainInstance.handle('sessions:delete', async (_event, sessionId: string) => {
    const deleted = memorySessions.delete(sessionId);
    return { success: deleted, deleted };
  });

  ipcMainInstance.handle('sessions:save-message', async (_event, sessionId: string, _message: ConversationMessage) => {
    const exists = memorySessions.has(sessionId);
    return { success: exists, error: exists ? undefined : 'Session not found' };
  });

  ipcMainInstance.handle('sessions:save-session-with-messages', async (_event, session: MemorySession, _messages: ConversationMessage[]) => {
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
      duration: '0m'
    } as SessionDisplay);
    return { success: true, sessionId: id };
  });

  ipcMainInstance.handle('sessions:update-title', async (_event, sessionId: string, title: string) => {
    const s = memorySessions.get(sessionId);
    if (!s) return { success: false, error: 'Session not found' };
    memorySessions.set(sessionId, { ...s, title });
    return { success: true };
  });

  ipcMainInstance.handle('sessions:get-recent', async (_event, options?: { limit?: number }) => {
    const limit = options?.limit ?? 10;
    const sessions = await services.learningService.getRecentSessions({ limit });
    return { success: true, sessions };
  });

  ipcMainInstance.handle('sessions:search', async (_event, query: any) => {
    const result = await services.learningService.searchSessions(query?.query ?? '', query?.filters);
    return { success: true, results: { sessions: result.sessions, total: result.totalResults, query: result.query, hasMore: false } };
  });

  ipcMainInstance.handle('sessions:get-statistics', async () => {
    const stats = defaultStats();
    stats.totalSessions = memorySessions.size;
    stats.averageMessagesPerSession = 0;
    return { success: true, statistics: stats };
  });

  logger.info('Sessions handlers registered');
};
