/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createChatStore,
  type ChatStoreDependencies,
  type ChatState,
} from '@/renderer/stores/chat/chatStore';
import {
  createMockElectronAPI,
  createMockSessionService,
  createMockChatService,
} from '@/renderer/stores/chat/__tests__/test-utils';

type UIMessageDisplay = ChatState['messages'][number];

describe('chatStore advanced coverage', () => {
  let dependencies: ChatStoreDependencies;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    dependencies = {
      sessionService: createMockSessionService(),
      electronAPI: createMockElectronAPI(),
      chatService: createMockChatService(createMockElectronAPI()),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads session history and normalizes message status/thinking flags', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.get = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'session-1', title: 'Loaded title', metadata: { tags: ['x'] } },
    });
    electronAPI.chat.getConversationHistory = vi.fn().mockResolvedValue({
      success: true,
      data: {
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: 'Thinking...',
            timestamp: new Date().toISOString(),
            status: 'processing',
            conversationId: 'prov-123',
          },
        ],
      },
    });

    const store = createChatStore({ ...dependencies, electronAPI });
    await store.getState().setCurrentSession('session-1');

    const state = store.getState();
    expect(state.currentSessionId).toBe('session-1');
    expect(state.messages[0]).toMatchObject({
      id: 'm1',
      status: 'typing',
      showThinking: true,
    });
    expect(state.currentSession?.metadata.title).toBe('Loaded title');
  });

  it('sets error when session load rejects', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.get = vi.fn().mockRejectedValue(new Error('load failed'));

    const store = createChatStore({ ...dependencies, electronAPI });

    await expect(store.getState().setCurrentSession('missing-id')).rejects.toThrow('load failed');
    expect(store.getState().error).toContain('load failed');
  });

  it('falls back to generated session id when createNewSession fails', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.create = vi.fn().mockRejectedValue(new Error('network down'));

    const store = createChatStore({ ...dependencies, electronAPI });
    const newId = await store.getState().createNewSession();

    expect(newId).toMatch(/^session_/);
    expect(store.getState().currentSessionId).toBe(newId);
  });

  it('returns false when saving without an active session', async () => {
    const store = createChatStore(dependencies);
    const result = await store.getState().saveCurrentSession();
    expect(result.success).toBe(false);
  });

  it('logs and returns false when saveCurrentSession throws', async () => {
    const sessionService = createMockSessionService();
    (sessionService.saveSessionWithMessages as any).mockRejectedValue(new Error('boom'));
    const store = createChatStore({ ...dependencies, sessionService });
    await store.getState().setCurrentSession({ id: 's-save', title: 'Save Me' });
    store.getState().addMessage({
      id: 'm-save',
      role: 'user',
      content: 'hello',
      timestamp: new Date(),
      status: 'delivered',
    } as UIMessageDisplay);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await store.getState().saveCurrentSession();
    expect(result.success).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('creates session on first sendMessage and appends assistant reply', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.create = vi.fn().mockResolvedValue({
      success: true,
      data: { sessionId: 'new-session' },
    });
    electronAPI.chat.sendMessage = vi.fn().mockResolvedValue({
      success: true,
      data: {
        assistantMessage: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'hi there',
          timestamp: new Date().toISOString(),
          status: 'sent',
        },
      },
    });

    const store = createChatStore({ ...dependencies, electronAPI });
    await store.getState().sendMessage('hello');

    const { messages, currentSessionId, error, isLoading } = store.getState();
    expect(currentSessionId).toBe('new-session');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 'assistant-1', content: 'hi there' });
    expect(error).toBeNull();
    expect(isLoading).toBe(false);
  });

  it('propagates errors from sendMessage and stores error state', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.chat.sendMessage = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'network fail' },
    });

    const store = createChatStore({ ...dependencies, electronAPI });
    await expect(store.getState().sendMessage('oops')).rejects.toThrow('network fail');
    expect(store.getState().error).toBe('network fail');
    expect(store.getState().isLoading).toBe(false);
  });

  it('updates streaming message content and clears flags on finish', () => {
    const store = createChatStore(dependencies);
    store.getState().addMessage({
      id: 'stream-1',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'typing',
      showThinking: true,
    } as UIMessageDisplay);

    store.getState().startStreamingMessage('stream-1');
    store.getState().appendStreamingContent('Hello');
    store.getState().appendStreamingContent(' World');
    store.getState().finishStreamingMessage();

    const message = store.getState().messages.find((m) => m.id === 'stream-1');
    expect(message?.content).toBe('Hello World');
    expect(store.getState().streamingMessageId).toBeNull();
    expect(store.getState().streamingContent).toBe('');
    expect(store.getState().isTyping).toBe(false);
  });

  it('updates session title and metadata then delegates to API', async () => {
    const electronAPI = createMockElectronAPI();
    electronAPI.sessions.update = vi.fn().mockResolvedValue({ success: true });
    const store = createChatStore({ ...dependencies, electronAPI });
    await store.getState().setCurrentSession({ id: 's1', title: 'Old' });

    await store.getState().updateCurrentSessionTitle('New Title');

    expect(electronAPI.sessions.update).toHaveBeenCalledWith('s1', { title: 'New Title' });
    expect(store.getState().currentSession?.title).toBe('New Title');
    expect(store.getState().currentSession?.metadata.title).toBe('New Title');
  });

  it('throws when updating title without active session', async () => {
    const store = createChatStore(dependencies);
    await expect(store.getState().updateCurrentSessionTitle('No session')).rejects.toThrow(
      'No active session to update',
    );
  });

  it('uses selected provider/model for AI title generation', async () => {
    const sessionService = createMockSessionService();
    const store = createChatStore({ ...dependencies, sessionService });

    store.getState().setSelectedProvider('custom-provider');
    store.getState().setSelectedModel('custom-model');

    store.getState().addMessage({
      id: 'user-1',
      role: 'user',
      content: 'Teach me Rust',
      timestamp: new Date(),
      status: 'delivered',
    } as UIMessageDisplay);

    store.getState().addMessage({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Sure!',
      timestamp: new Date(),
      status: 'delivered',
    } as UIMessageDisplay);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionService.generateAITitle).toHaveBeenCalledWith(
      'Teach me Rust',
      'custom-provider',
      'custom-model',
    );
  });
});
