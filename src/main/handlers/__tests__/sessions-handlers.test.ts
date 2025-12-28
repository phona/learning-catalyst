/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupSessionsHandlers } from '../sessions-handlers';
import { ipcMain } from 'electron';

const handlerMap = new Map<string, (...args: unknown[]) => any>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => any) => {
      handlerMap.set(channel, handler);
    },
  },
}));

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => logger),
};

const loggerService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => logger),
};

const learningService: any = {
  startLearningSession: vi.fn(async (params: any) => ({
    id: 'session-123',
    ...params,
  })),
  getSession: vi.fn(async (sessionId: string) => {
    if (sessionId === 'session-123') {
      return {
        id: 'session-123',
        topic: 'Test Session',
        difficulty: 'intermediate',
        status: 'active',
        progress: 0,
        duration: 0,
        agentType: 'learning',
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }),
  updateSession: vi.fn(async (sessionId: string, updates: any) => {
    if (sessionId === 'session-123') {
      return {
        id: 'session-123',
        topic: updates.title || 'Test Session',
        difficulty: 'intermediate',
        status: updates.status || 'active',
        progress: 0,
        duration: 0,
        agentType: 'learning',
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }),
  deleteSession: vi.fn(async (sessionId: string) => {
    return sessionId === 'session-123';
  }),
  updateSessionTitle: vi.fn(async (sessionId: string, title: string) => {
    return sessionId === 'session-123';
  }),
  getRecentSessions: vi.fn(async ({ limit = 20 }: { limit?: number }) => {
    return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      id: `session-${i + 1}`,
      topic: `Test Session ${i + 1}`,
      difficulty: 'intermediate',
      status: 'active',
      progress: 0,
      duration: 0,
      agentType: 'learning',
      updatedAt: new Date().toISOString(),
    }));
  }),
  searchSessions: vi.fn(async (query: string, filters?: any) => ({
    sessions: [],
    totalResults: 0,
    query,
  })),
  getSessionStatistics: vi.fn(async () => ({
    totalSessions: 0,
    totalMessages: 0,
    averageSessionDuration: 0,
  })),
};

const getHandler = (channel: string) => {
  const handler = handlerMap.get(channel);
  expect(handler).toBeDefined();
  return handler as any;
};

describe('sessions handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
    vi.clearAllMocks();
    setupSessionsHandlers(ipcMain, {
      learningService,
      loggerService,
    });
  });

  describe('sessions:create', () => {
    it('creates session with default title', async () => {
      const response = await getHandler('sessions:create')(null, {
        title: undefined,
      });

      expect(response.sessionId).toBe('session-123');
      expect(response.session.topic).toBe('New Chat');
      expect(learningService.startLearningSession).toHaveBeenCalledWith({
        topic: 'New Chat',
        goals: [],
        difficulty: 'intermediate',
        agentType: 'learning',
        learningStyle: 'visual',
      });
    });

    it('creates session with custom title', async () => {
      const response = await getHandler('sessions:create')(null, {
        title: 'Custom Thread',
      });

      expect(response.session.topic).toBe('Custom Thread');
    });

    it('creates session with threadId parameter', async () => {
      const response = await getHandler('sessions:create')(null, {
        title: 'Thread with ID',
        threadId: 'thread-123',
      });

      expect(response.session.topic).toBe('Thread with ID');
    });

    it('throws on service failure', async () => {
      learningService.startLearningSession.mockRejectedValueOnce(
        new Error('Service error'),
      );

      await expect(getHandler('sessions:create')(null, {
        title: 'Test',
      })).rejects.toThrow('Service error');
    });
  });

  describe('sessions:get', () => {
    it('retrieves session by ID', async () => {
      const response = await getHandler('sessions:get')(null, 'session-123');

      expect(response.id).toBe('session-123');
      expect(response.title).toBe('Test Session');
    });

    it('throws for non-existent session', async () => {
      await expect(getHandler('sessions:get')(null, 'session-missing')).rejects.toThrow('Session not found');
    });
  });

  describe('sessions:list', () => {
    it('returns paginated session list', async () => {
      const response = await getHandler('sessions:list')(null, {
        limit: 20,
        offset: 0,
      });

      expect(response.sessions).toHaveLength(3);
      expect(response.total).toBe(3);
      expect(response.hasMore).toBe(false);
    });

    it('returns sessions with correct format', async () => {
      const response = await getHandler('sessions:list')(null, {
        limit: 20,
        offset: 0,
      });

      expect(response.sessions[0]).toEqual({
        id: 'session-1',
        title: 'Test Session 1',
        topic: 'Test Session 1',
        difficulty: 'intermediate',
        status: 'active',
        progress: 0,
        agentType: 'learning',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        duration: 0,
      });
    });

    it('uses default limit when not provided', async () => {
      await getHandler('sessions:list')(null, {});

      expect(learningService.getRecentSessions).toHaveBeenCalledWith({
        limit: 20,
      });
    });

    it('handles offset correctly', async () => {
      await getHandler('sessions:list')(null, {
        limit: 10,
        offset: 5,
      });

      expect(learningService.getRecentSessions).toHaveBeenCalledWith({
        limit: 15, // limit + offset
      });
    });
  });

  describe('sessions:update', () => {
    it('updates session title', async () => {
      const response = await getHandler('sessions:update')(null, 'session-123', {
        title: 'Updated Title',
      });

      expect(response.title).toBe('Updated Title');
      expect(learningService.updateSession).toHaveBeenCalledWith('session-123', {
        title: 'Updated Title',
        status: undefined,
      });
    });

    it('updates session status', async () => {
      const response = await getHandler('sessions:update')(null, 'session-123', {
        status: 'completed',
      });

      expect(response.status).toBe('completed');
      expect(learningService.updateSession).toHaveBeenCalledWith('session-123', {
        title: undefined,
        status: 'completed',
      });
    });

    it('throws for non-existent session', async () => {
      learningService.updateSession.mockResolvedValueOnce(null);

      await expect(getHandler('sessions:update')(null, 'session-missing', {
        title: 'New Title',
      })).rejects.toThrow('Session not found');
    });
  });

  describe('sessions:delete', () => {
    it('deletes session successfully', async () => {
      const response = await getHandler('sessions:delete')(null, 'session-123');

      expect(response.deleted).toBe(true);
      expect(learningService.deleteSession).toHaveBeenCalledWith('session-123');
    });

    it('returns deleted: false for non-existent session', async () => {
      const response = await getHandler('sessions:delete')(null, 'session-missing');

      expect(response.deleted).toBe(false);
    });
  });

  describe('sessions:update-title', () => {
    it('updates session title', async () => {
      const response = await getHandler('sessions:update-title')(null, 'session-123', 'New Title');

      expect(response).toBeUndefined();
      expect(learningService.updateSessionTitle).toHaveBeenCalledWith(
        'session-123',
        'New Title',
      );
    });

    it('throws for non-existent session', async () => {
      learningService.updateSessionTitle.mockResolvedValueOnce(false);

      await expect(getHandler('sessions:update-title')(
        null,
        'session-missing',
        'New Title',
      )).rejects.toThrow('Session not found');
    });
  });

  describe('sessions:get-recent', () => {
    it('returns recent sessions with default limit', async () => {
      const response = await getHandler('sessions:get-recent')(null, {});

      expect(response).toHaveLength(3);
      expect(learningService.getRecentSessions).toHaveBeenCalledWith({ limit: 10 });
    });

    it('returns recent sessions with custom limit', async () => {
      const response = await getHandler('sessions:get-recent')(null, { limit: 5 });

      expect(response).toHaveLength(3);
      expect(learningService.getRecentSessions).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('learning:get-recent-sessions (compat)', () => {
    it('returns recent sessions and forwards limit', async () => {
      const response = await getHandler('learning:get-recent-sessions')(null, { limit: 7 });

      expect(response).toHaveLength(3);
      expect(learningService.getRecentSessions).toHaveBeenCalledWith({ limit: 7 });
    });
  });

  describe('sessions:search', () => {
    it('searches sessions with query', async () => {
      learningService.searchSessions.mockResolvedValueOnce({
        sessions: [
          {
            id: 'session-1',
            topic: 'Python',
            difficulty: 'intermediate',
            status: 'active',
            progress: 0,
            duration: 0,
            agentType: 'learning',
            updatedAt: new Date().toISOString(),
          },
        ],
        totalResults: 1,
        query: 'python',
      });

      const response = await getHandler('sessions:search')(null, {
        query: 'python',
      });

      expect(response.sessions).toHaveLength(1);
      expect(response.total).toBe(1);
      expect(response.query).toBe('python');
    });

    it('searches sessions with filters', async () => {
      const filters = { status: 'active' };

      await getHandler('sessions:search')(null, {
        query: 'test',
        filters,
      });

      expect(learningService.searchSessions).toHaveBeenCalledWith('test', filters);
    });
  });

  describe('sessions:get-statistics', () => {
    it('returns session statistics', async () => {
      learningService.getSessionStatistics.mockResolvedValueOnce({
        totalSessions: 10,
        totalMessages: 100,
        averageSessionDuration: 300,
      });

      const response = await getHandler('sessions:get-statistics')(null);

      expect(response.totalSessions).toBe(10);
      expect(response.totalMessages).toBe(100);
      expect(response.averageSessionDuration).toBe(300);
      expect(response.totalTokensUsed).toBe(0);
    });
  });

  describe('sessions:get-global-statistics (compat)', () => {
    it('returns session statistics', async () => {
      learningService.getSessionStatistics.mockResolvedValueOnce({
        totalSessions: 10,
        totalMessages: 100,
        averageSessionDuration: 300,
      });

      const response = await getHandler('sessions:get-global-statistics')(null);

      expect(response.totalSessions).toBe(10);
      expect(response.totalMessages).toBe(100);
      expect(response.averageSessionDuration).toBe(300);
      expect(response.totalTokensUsed).toBe(0);
    });
  });

  describe('removed handlers', () => {
    it('does not register sessions:save-message', () => {
      expect(handlerMap.has('sessions:save-message')).toBe(false);
    });

    it('does not register sessions:save-session-with-messages', () => {
      expect(handlerMap.has('sessions:save-session-with-messages')).toBe(false);
    });

    it('does not register sessions:list-messages', () => {
      expect(handlerMap.has('sessions:list-messages')).toBe(false);
    });
  });
});
