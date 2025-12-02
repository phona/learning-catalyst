import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createChatStore, type ChatStoreDependencies } from '@/renderer/stores/chat/chatStore';
import {
  createMockChatService,
  createMockElectronAPI,
  createMockSessionService,
} from '@/renderer/stores/chat/__tests__/test-utils';

describe('chatStore history', () => {
  let dependencies: ChatStoreDependencies;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
    dependencies = {
      sessionService: createMockSessionService(),
      electronAPI: createMockElectronAPI(),
      chatService: createMockChatService(createMockElectronAPI()),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds, retrieves and clears history per session with newest first', () => {
    const store = createChatStore(dependencies);
    const { addHistoryEntry, getHistoryForSession, clearHistory } = store.getState();

    addHistoryEntry({ id: 'h1', text: 'first', sessionId: 's1', createdAt: 1 });
    addHistoryEntry({ id: 'h2', text: 'second', sessionId: 's1', createdAt: 2 });
    addHistoryEntry({ id: 'h3', text: 'other', sessionId: 's2', createdAt: 3 });

    const s1 = getHistoryForSession('s1');
    expect(s1.map((h) => h.id)).toEqual(['h2', 'h1']);

    clearHistory('s1');
    expect(getHistoryForSession('s1')).toHaveLength(0);
    expect(getHistoryForSession('s2')).toHaveLength(1);

    clearHistory();
    expect(getHistoryForSession('s2')).toHaveLength(0);
  });

  it('keeps only the latest 200 entries per session', () => {
    const store = createChatStore(dependencies);
    const { addHistoryEntry, getHistoryForSession } = store.getState();

    for (let i = 0; i < 201; i += 1) {
      addHistoryEntry({
        id: `h-${i}`,
        text: `msg-${i}`,
        sessionId: 's1',
        createdAt: i,
      });
    }

    const s1 = getHistoryForSession('s1');
    expect(s1).toHaveLength(200);
    expect(s1[199].id).toBe('h-1'); // oldest preserved among capped list after trimming
    expect(s1[0].id).toBe('h-200'); // newest first
  });

  it('logs history when sendMessage is used', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.create = vi.fn().mockResolvedValue({
      success: true,
      data: { sessionId: 's-send' },
    });
    const store = createChatStore({ ...dependencies, electronAPI });

    await store.getState().sendMessage('hello world');

    const history = store.getState().getHistoryForSession('s-send');
    expect(history[0]).toMatchObject({ text: 'hello world', sessionId: 's-send' });
  });

  it('logs history when sendMessageStream is used', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.create = vi.fn().mockResolvedValue({
      success: true,
      data: { sessionId: 's-stream' },
    });
    const store = createChatStore({ ...dependencies, electronAPI });

    await store.getState().sendMessageStream('stream me');

    const history = store.getState().getHistoryForSession('s-stream');
    expect(history[0]).toMatchObject({ text: 'stream me', sessionId: 's-stream' });
  });
});
