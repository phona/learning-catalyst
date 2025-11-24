import { describe, expect, it } from 'vitest';
import { createSessionService } from '../session-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createMockElectronAPI, ok, fail } from '@/test/utils/electron-api-fixture';

const minimalSession = {
  id: 's1',
  title: 'Session 1',
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [],
};

describe('session-service', () => {
  it('saves session with messages and falls back to generated id', async () => {
    const api = createMockElectronAPI({
      sessions: {
        saveSessionWithMessages: async () => ok({}), // no sessionId returned
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    const id = await svc.saveSessionWithMessages({ id: '', title: '', messages: [] } as any, []);
    expect(id).toMatch(/session/);
  });

  it('throws on saveSessionWithMessages failure', async () => {
    const api = createMockElectronAPI({
      sessions: { saveSessionWithMessages: async () => fail('boom') } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    await expect(
      svc.saveSessionWithMessages({ id: 'x', title: '', messages: [] } as any, []),
    ).rejects.toThrow(/boom/);
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
        saveMessage: async () => ok(undefined),
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
    await svc.saveMessage('created', { id: 'm', role: 'user', content: '' } as any);
  });

  it('searches sessions and handles missing fields', async () => {
    const api = createMockElectronAPI({
      sessions: {
        search: async () => ok({ sessions: undefined, total: undefined, hasMore: undefined }),
      } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    const res = await svc.searchSessions('q');
    expect(res.total).toBe(0);
    expect(res.sessions).toEqual([]);
  });

  it('propagates list/search errors', async () => {
    const api = createMockElectronAPI({
      sessions: { list: async () => fail('bad'), search: async () => fail('worse') } as any,
    });
    const svc = createSessionService(api as ElectronAPI);
    await expect(svc.listSessions()).rejects.toThrow(/bad/);
    await expect(svc.searchSessions('x')).rejects.toThrow(/worse/);
  });
});

