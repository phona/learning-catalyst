import { describe, expect, it } from 'vitest';
import { createSessionService } from '../session-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createMockElectronAPI, ok, fail } from '@/test/utils/electron-api-fixture';
import type { SessionDisplay } from '@/shared/types/electron-api/sessions-api';

const minimalSession: SessionDisplay = {
  id: 's1',
  title: 'Session 1',
  preview: 'Test session preview',
  messageCount: 0,
  lastActivity: 'just now',
  duration: '0 min',
  difficulty: 'beginner',
  tags: [],
  isActive: false,
  hasUnreadMessages: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [],
};

describe('session-service', () => {
  it('generates session ID', async () => {
    const api = createMockElectronAPI({});
    const svc = createSessionService(api as ElectronAPI);
    const id = svc.generateSessionId();
    expect(id).toMatch(/session/);
  });

  it('lists, gets, creates, updates and deletes sessions', async () => {
    const created = { ...minimalSession, id: 'created' };
    const api = createMockElectronAPI({
      sessions: {
        list: async () => ok({ sessions: [minimalSession], total: 1, hasMore: false }),
        get: async () => ok(created),
        create: async () => ok({ sessionId: 'created', session: created }),
        updateTitle: async () => ok(undefined),
        delete: async () => ok({ deleted: true }),
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    const list = await svc.listSessions();
    expect(list.sessions[0].id).toBe('s1');
    const session = await svc.getSession('created');
    expect(session?.id).toBe('created');
    const createdSession = await svc.createSession({ title: 'hi' } as any);
    expect(createdSession.id).toBe('created');
    await svc.updateSessionTitle('created', 'New');
    await svc.deleteSession('created');
  });

  it('searches sessions and handles missing fields', async () => {
    const api = createMockElectronAPI({
      sessions: {
        searchSessions: async () => [],
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    const res = await svc.searchSessions('q');
    expect(res.total).toBe(0);
    expect(res.sessions).toEqual([]);
  });

  it('propagates list/search errors', async () => {
    const api = createMockElectronAPI({
      sessions: {
        list: async () => fail('bad'),
        searchSessions: async () => {
          // searchSessions returns Promise<SessionDisplay[]>, so it should throw directly
          throw new Error('worse');
        },
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    await expect(svc.listSessions()).rejects.toThrow('bad');
    await expect(svc.searchSessions('x')).rejects.toThrow('worse');
  });

  it('gets recent sessions and global statistics', async () => {
    const recentSessions = [minimalSession];
    const statistics = {
      totalSessions: 5,
      totalMessages: 25,
      totalUserMessages: 12,
      totalAssistantMessages: 13,
      totalTokensUsed: 1500,
      averageMessagesPerSession: 5,
    };
    const api = createMockElectronAPI({
      sessions: {
        getRecentSessions: async () => ok(recentSessions),
        getGlobalStatistics: async () => statistics,
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    const recent = await svc.getRecentSessions();
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe('s1');
    const stats = await svc.getGlobalStatistics();
    expect(stats.totalSessions).toBe(5);
    expect(stats.totalMessages).toBe(25);
  });

  it('generates AI titles', async () => {
    const api = createMockElectronAPI({});
    const svc = createSessionService(api as ElectronAPI);
    const title = await svc.generateAITitle('What is machine learning?');
    expect(title).toBe('What is machine learning?');
    const title2 = await svc.generateAITitle('');
    expect(title2).toBe('New Session');
  });

  it('handles create session errors', async () => {
    const api = createMockElectronAPI({
      sessions: {
        create: async () => fail('Creation failed'),
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    await expect(
      svc.createSession({ title: 'Test' }),
    ).rejects.toThrow('Creation failed');
  });

  it('handles update title errors', async () => {
    const api = createMockElectronAPI({
      sessions: {
        updateTitle: async () => fail('Update failed'),
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    await expect(
      svc.updateSessionTitle('test-id', 'New Title'),
    ).rejects.toThrow('Update failed');
  });

  it('handles delete session errors', async () => {
    const api = createMockElectronAPI({
      sessions: {
        delete: async () => fail('Delete failed'),
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    await expect(
      svc.deleteSession('test-id'),
    ).rejects.toThrow('Delete failed');
  });

  it('handles get session errors', async () => {
    const api = createMockElectronAPI({
      sessions: {
        get: async () => fail('Get failed'),
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    const session = await svc.getSession('nonexistent');
    expect(session).toBeNull();
  });
});

