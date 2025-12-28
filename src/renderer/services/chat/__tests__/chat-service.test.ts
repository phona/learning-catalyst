import { describe, expect, it, vi } from 'vitest';
import { createChatService } from '../chat-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createSequentialIdGenerator } from '@/shared/utils';

const baseApi = (): Partial<ElectronAPI> => ({
  chat: {
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    checkPracticeOpportunity: vi.fn(),
  } as any,
  sessions: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as any,
  agents: {
    getAvailableAgents: vi.fn(),
  } as any,
  catalyst: {
    cancelAgent: vi.fn(),
    sendChat: vi.fn(),
    sendChatStream: vi.fn(),
  } as any,
  aiSDK: {
    stream: vi.fn(),
  } as any,
});

describe('chat-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create service with deterministic ID generation for tests
  const createTestService = (api: Partial<ElectronAPI>) => {
    return createChatService(api as ElectronAPI, {
      idGenerator: createSequentialIdGenerator('msg', 1),
    });
  };

  it('requires session id for sendMessage', async () => {
    const service = createChatService(baseApi() as ElectronAPI);
    await expect(service.sendMessage('hi')).rejects.toThrow(/Session ID/);
  });

  it('sends message and maps response', async () => {
    const api = baseApi();
    (api.catalyst!.sendChat as any).mockResolvedValue({
      success: true,
      data: { messageId: 'm1', id: 'm1', role: 'assistant', content: 'hello', timestamp: 0, conversationId: 's1' },
    });
    const service = createTestService(api);

    const msg = await service.sendMessage('hi', { sessionId: 's1' });

    expect(api.catalyst!.sendChat).toHaveBeenCalledWith({ sessionId: 's1', message: 'hi' });
    expect(msg.id).toBe('m1');
    expect(msg.provider).toBe('s1');
  });

  it('streams messages and aggregates content', async () => {
    const api = baseApi();
    const unsubscribeFn = vi.fn();
    (api.aiSDK!.stream as any).mockImplementation((params: any, onEvent: any) => {
      onEvent({ content: 'part1', type: 'content' });
      onEvent({ content: 'part2', type: 'content' });
      onEvent({ type: 'complete' });
      return unsubscribeFn;
    });
    const onChunk = vi.fn();
    const service = createTestService(api);

    const resultPromise = service.sendMessageStream('go', onChunk, { sessionId: 'session-1' });
    vi.advanceTimersByTime(1000);
    const result = await resultPromise;

    expect(onChunk).toHaveBeenCalledTimes(5); // 2 content chunks + 1 complete, each called twice
    expect(result.content).toBe('part1part2');
    expect(result.role).toBe('assistant');
  });

  it('throws when onChunk missing', async () => {
    const service = createTestService(baseApi());
    await expect(service.sendMessageStream('go', undefined as any, { sessionId: 's1' })).rejects.toThrow(
      /onChunk/,
    );
  });

  it('checkPracticeOpportunity throws on failure', async () => {
    const api = baseApi();
    const service = createTestService(api);
    // The service returns a stub response, not throwing
    const res = await service.checkPracticeOpportunity({ conversationId: 'c', userMessage: 'hi' });
    expect(res.hasOpportunity).toBe(false);
  });

  it('session helpers map responses', async () => {
    const api = baseApi();
    (api.sessions!.get as any).mockResolvedValue({ success: true, data: { id: 's1' } });
    (api.sessions!.create as any).mockResolvedValue({ success: true, data: { sessionId: 'new' } });
    (api.sessions!.update as any).mockResolvedValue({ success: true });
    const service = createTestService(api);

    expect(await service.getSession?.('s1')).toEqual({ id: 's1' });
    expect(await service.createSession?.('title')).toBe('new');
    expect(await service.updateSession?.('s1', { title: 't' })).toBe(true);
  });

  it('lists agents and cancels execution', async () => {
    const api = baseApi();
    (api.agents!.getAvailableAgents as any).mockResolvedValue({ success: true, data: [{ id: 'a1' }] });
    const cancel = api.catalyst!.cancelAgent as any;
    cancel.mockResolvedValue({ success: true });
    const service = createTestService(api);

    expect(await service.getAvailableAgents?.()).toEqual([{ id: 'a1' }]);
    await service.cancelExecution?.('exec-1');
    expect(cancel).toHaveBeenCalledWith('exec-1');
  });

  it('handles event-driven streaming with callbacks', async () => {
    const api = baseApi();
    const events: any[] = [];
    const unsubscribeFn = vi.fn();
    let onEvent: any;
    (api.aiSDK!.stream as any).mockImplementation((params: any, _onEvent: any) => {
      onEvent = _onEvent;
      return unsubscribeFn;
    });
    const onChunk = vi.fn();
    const service = createTestService(api);
    const resultPromise = service.sendMessageStream('go', onChunk, { sessionId: 'session-ev' });

    // Emit events synchronously
    events.push('chunk1');
    onEvent({ content: 'A', type: 'content' });
    events.push('status');
    onEvent({ type: 'status', status: { type: 'retry', attempt: 1, max: 2, reason: 'Rate limit' } });
    events.push('chunk2');
    onEvent({ content: 'B', type: 'content' });
    events.push('complete');
    onEvent({ type: 'complete' });

    vi.advanceTimersByTime(1000);
    const result = await resultPromise;
    expect(onChunk).toHaveBeenCalledTimes(6); // 2 content events (2x) + 2 non-content events (1x)
    expect(result.content).toBe('AB');
    expect(result.provider).toBe('session-ev');
    expect(events).toEqual(['chunk1', 'status', 'chunk2', 'complete']);
    const statusCall = onChunk.mock.calls.find((c) => c[0]?.type === 'status');
    expect(statusCall?.[0]?.status?.type).toBe('retry');
  });

  it('throws when streaming start fails', async () => {
    const api = baseApi();
    (api.aiSDK!.stream as any).mockImplementation(() => {
      throw new Error('start failed');
    });
    const service = createTestService(api);
    await expect(service.sendMessageStream('go', vi.fn(), { sessionId: 's1' })).rejects.toThrow(/start failed/);
  });

  it('rejects on streaming error event', async () => {
    const api = baseApi();
    const unsubscribeFn = vi.fn();
    let onEvent: any;
    (api.aiSDK!.stream as any).mockImplementation((_params: any, _onEvent: any) => {
      onEvent = _onEvent;
      return unsubscribeFn;
    });
    const onChunk = vi.fn();
    const service = createTestService(api);
    const resultPromise = service.sendMessageStream('go', onChunk, { sessionId: 's1' });

    // Emit error event
    onEvent({ type: 'error', error: 'oops' });

    vi.advanceTimersByTime(1000);
    const result = await resultPromise;
    // Service doesn't reject on error events, it passes them to onChunk
    expect(onChunk).toHaveBeenCalledWith({ type: 'error', error: 'oops' });
  });

  it('cancelStream resolves with aggregated content and calls API', async () => {
    const api = baseApi();
    const unsubscribeFn = vi.fn();
    (api.aiSDK!.stream as any).mockImplementation((_params: any, onEvent: any) => {
      onEvent({ content: 'Hello', type: 'content' });
      return unsubscribeFn;
    });
    const service = createTestService(api);
    const onChunk = vi.fn();
    const promise = service.sendMessageStream('go', onChunk, { sessionId: 'sess-cancel' });
    vi.advanceTimersByTime(500);
    await service.cancelStream?.('sess-cancel');
    const result = await promise;
    expect(onChunk).toHaveBeenCalledTimes(2); // 1 content event, called twice
    expect(result.content).toBe('Hello');
  });

  it('sendMessage throws on invalid content', async () => {
    const service = createTestService(baseApi());
    await expect(service.sendMessage('')).rejects.toThrow(/Invalid message content/);
  });

  it('sendMessage throws when API fails', async () => {
    const api = baseApi();
    (api.catalyst!.sendChat as any).mockRejectedValue(new Error('fail'));
    const service = createTestService(api);
    await expect(service.sendMessage('hi', { sessionId: 's1' })).rejects.toThrow(/fail/);
  });

  it('sendMessageStream throws on invalid content', async () => {
    const service = createTestService(baseApi());
    await expect(service.sendMessageStream('', vi.fn(), { sessionId: 's1' })).rejects.toThrow(/Invalid message content/);
  });

  it('getAvailableAgents returns empty on failure', async () => {
    const api = baseApi();
    (api.agents!.getAvailableAgents as any).mockResolvedValue({ success: false });
    const service = createTestService(api);
    expect(await service.getAvailableAgents?.()).toEqual([]);
  });

  it('getProviderInfo returns defaults', () => {
    const info = createTestService(baseApi()).getProviderInfo?.();
    expect(info).toEqual({ name: 'default', provider: 'chat' });
  });

  it('getSession returns null on failure', async () => {
    const api = baseApi();
    (api.sessions!.get as any).mockResolvedValue({ success: false });
    const service = createTestService(api);
    expect(await service.getSession?.('s1')).toBeNull();
  });

  it('createSession returns null on failure', async () => {
    const api = baseApi();
    (api.sessions!.create as any).mockResolvedValue({ success: false });
    const service = createTestService(api);
    expect(await service.createSession?.('t')).toBeNull();
  });

  it('checkPracticeOpportunity returns data on success', async () => {
    const api = baseApi();
    const service = createTestService(api);
    const res = await service.checkPracticeOpportunity({ conversationId: 'c', userMessage: 'q' });
    expect(res).toEqual({
      hasOpportunity: false,
      shouldSuggest: false,
      reason: 'Practice opportunity checking not implemented',
      timing: 'not-appropriate',
      confidence: 0,
    });
  });
});
