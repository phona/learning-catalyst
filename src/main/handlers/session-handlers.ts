import { ipcMain } from 'electron';
import { mainServiceContainerManager } from '../services/container/service-container';
import type {
  SessionService,
  SessionSearchQuery,
  SessionCreateRequest,
  SessionUpdateRequest
} from '../services/session/session-service';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';

function getSessionService(): SessionService {
  if (!mainServiceContainerManager.isInitialized()) {
    throw new Error('Main service container is not initialized');
  }
  
  const service = mainServiceContainerManager.getService('sessionService');
  if (!service) {
    throw new Error('Session service is not initialized');
  }
  return service;
}

export function setupSessionHandlers(): void {
  ipcMain.handle('sessions:list', async (_event, options: { query?: string; limit?: number; offset?: number } = {}) => {
    try {
      const sessionService = getSessionService();
      const query: SessionSearchQuery = {
        query: options.query,
        limit: options.limit ?? 20,
        offset: options.offset ?? 0
      };
      const result = await sessionService.searchSessions(query);
      return {
        success: true,
        sessions: result.sessions,
        total: result.total,
        hasMore: result.hasMore
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:create', async (_event, payload: SessionCreateRequest) => {
    try {
      const sessionService = getSessionService();
      const sessionId = await sessionService.createSession(payload);
      const session = await sessionService.getSessionById(sessionId);
      return { success: true, sessionId, session };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:get', async (_event, sessionId: string) => {
    try {
      const sessionService = getSessionService();
      const session = await sessionService.getSessionById(sessionId);
      return { success: true, session };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:update', async (_event, sessionId: string, updates: SessionUpdateRequest) => {
    try {
      const sessionService = getSessionService();
      await sessionService.updateSession({ ...updates, sessionId });
      const session = await sessionService.getSessionById(sessionId);
      return { success: true, session };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:delete', async (_event, sessionId: string) => {
    try {
      const sessionService = getSessionService();
      const deleted = await sessionService.deleteSession(sessionId);
      return { success: true, deleted };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:save-message', async (_event, sessionId: string, message: ConversationMessage) => {
    try {
      const sessionService = getSessionService();
      await sessionService.saveMessage(sessionId, message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(
    'sessions:save-with-messages',
    async (_event, session: MemorySession, messages: ConversationMessage[]) => {
      try {
        const sessionService = getSessionService();
        const sessionId = await sessionService.saveSessionWithMessages(session, messages);
        return { success: true, sessionId };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
  );

  ipcMain.handle('sessions:update-title', async (_event, sessionId: string, title: string) => {
    try {
      const sessionService = getSessionService();
      await sessionService.updateSessionTitle(sessionId, title);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:get-recent', async (_event, options?: { limit?: number }) => {
    try {
      const sessionService = getSessionService();
      const sessions = await sessionService.getRecentSessions(options?.limit);
      return { success: true, sessions };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:search', async (_event, query: SessionSearchQuery) => {
    try {
      const sessionService = getSessionService();
      const result = await sessionService.searchSessions(query);
      return { success: true, results: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('sessions:get-stats', async () => {
    try {
      const sessionService = getSessionService();
      const statistics = await sessionService.getGlobalStatistics();
      return { success: true, statistics };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
