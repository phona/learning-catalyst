import { describe, expect, it, vi } from 'vitest';
import { createChatService } from '../chat-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

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
  } as any,
});

describe('chat-service', () => {
  it('requires session id for sendMessage', async () => {
    const service = createChatService(baseApi() as ElectronAPI);
    // @ts-expect-error no session
    await expect(service.sendMessage('hi')).rejects.toThrow(/Session ID/);
  });

  it('sends message and maps response', async () => {
    const api = baseApi();
    (api.chat!.sendMessage as any).mockResolvedValue({
      success: true,
      data: { id: 'm1', role: 'assistant', content: 'hello', timestamp: Date.now(), conversationId: 's1' },
    });
    const service = createChatService(api as ElectronAPI);

    const msg = await service.sendMessage('hi', { sessionId: 's1' });

    expect(api.chat!.sendMessage).toHaveBeenCalledWith({ conversationId: 's1', message: 'hi' });
    expect(msg.id).toBe('m1');
    expect(msg.provider).toBe('s1');
  });

  it('streams messages and aggregates content', async () => {
    const api = baseApi();
    const chunks = ['part1', 'part2'];
    (api.chat!.sendMessageStream as any).mockResolvedValue({
      success: true,
      data: (async function* () {
        for (const c of chunks) yield c;
      })(),
    });
    const onChunk = vi.fn();
    const service = createChatService(api as ElectronAPI);

    const result = await service.sendMessageStream('go', onChunk, { sessionId: 'session-1' });

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(result.content).toBe('part1part2');
    expect(result.role).toBe('assistant');
  });

  it('throws when onChunk missing', async () => {
    const service = createChatService(baseApi() as ElectronAPI);
    // @ts-expect-error missing callback
    await expect(service.sendMessageStream('go', undefined, { sessionId: 's1' })).rejects.toThrow(
      /onChunk/,
    );
  });

  it('checkPracticeOpportunity throws on failure', async () => {
    const api = baseApi();
    (api.chat!.checkPracticeOpportunity as any).mockResolvedValue({
      success: false,
      error: { message: 'fail' },
    });
    const service = createChatService(api as ElectronAPI);
    await expect(
      service.checkPracticeOpportunity({ conversationId: 'c', userMessage: 'hi' }),
    ).rejects.toThrow('fail');
  });

  it('session helpers map responses', async () => {
    const api = baseApi();
    (api.sessions!.get as any).mockResolvedValue({ success: true, data: { id: 's1' } });
    (api.sessions!.create as any).mockResolvedValue({ success: true, data: { sessionId: 'new' } });
    (api.sessions!.update as any).mockResolvedValue({ success: true });
    const service = createChatService(api as ElectronAPI);

    expect(await service.getSession?.('s1')).toEqual({ id: 's1' });
    expect(await service.createSession?.('title')).toBe('new');
    expect(await service.updateSession?.('s1', { title: 't' })).toBe(true);
  });

  it('lists agents and cancels execution', async () => {
    const api = baseApi();
    (api.agents!.getAvailableAgents as any).mockResolvedValue({ success: true, data: [{ id: 'a1' }] });
    const cancel = api.catalyst!.cancelAgent as any;
    cancel.mockResolvedValue({ success: true });
    const service = createChatService(api as ElectronAPI);

    expect(await service.getAvailableAgents?.()).toEqual([{ id: 'a1' }]);
    await service.cancelExecution?.('exec-1');
    expect(cancel).toHaveBeenCalledWith('exec-1');
  });

  it('handles event-driven streaming with callbacks', async () => {
    const api = baseApi();
    const events: any[] = [];
    (api.chat!.sendMessageStream as any).mockImplementation(async (params: any, onEvent: any) => {
      setTimeout(() => {
        events.push('chunk1');
        onEvent({ type: 'chunk', chunk: 'A' });
      }, 0);
      setTimeout(() => {
        events.push('status');
        onEvent({ type: 'status', status: { type: 'retry', attempt: 1, max: 2, reason: 'Rate limit' } });
      }, 1);
      setTimeout(() => {
        events.push('chunk2');
        onEvent({ type: 'chunk', chunk: 'B' });
      }, 2);
      setTimeout(() => {
        events.push('complete');
        onEvent({ type: 'complete' });
      }, 3);
      return { success: true, data: { started: true } };
    });
    const onChunk = vi.fn();
    const service = createChatService(api as ElectronAPI);
    const result = await service.sendMessageStream('go', onChunk, { sessionId: 'session-ev' });
    expect(onChunk).toHaveBeenCalledTimes(3);
    expect(result.content).toBe('AB');
    expect(result.provider).toBe('session-ev');
    expect(events).toEqual(['chunk1', 'status', 'chunk2', 'complete']);
    const statusCall = onChunk.mock.calls.find((c) => c[0]?.type === 'status');
    expect(statusCall?.[0]?.status?.type).toBe('retry');
  });

  it('throws when streaming start fails', async () => {
    const api = baseApi();
    (api.chat!.sendMessageStream as any).mockResolvedValue({ success: false, error: { message: 'start failed' } });
    const service = createChatService(api as ElectronAPI);
    await expect(service.sendMessageStream('go', vi.fn(), { sessionId: 's1' })).rejects.toThrow(/start failed|Failed to start streaming/);
  });

  it('rejects on streaming error event', async () => {
    const api = baseApi();
    (api.chat!.sendMessageStream as any).mockImplementation(async (_p: any, onEvent: any) => {
      setTimeout(() => {
        onEvent({ type: 'error', error: 'oops' });
      }, 0);
      return { success: true, data: { started: true } };
    });
    const service = createChatService(api as ElectronAPI);
    await expect(service.sendMessageStream('go', vi.fn(), { sessionId: 's1' })).rejects.toThrow(/oops/);
  });

  it('cancelStream resolves with aggregated content and calls API', async () => {
    const api = baseApi();
    (api.chat as any).cancelStream = vi.fn().mockResolvedValue({ success: true });
    (api.chat!.sendMessageStream as any).mockImplementation(async (_p: any, onEvent: any) => {
      setTimeout(() => {
        onEvent({ type: 'chunk', chunk: 'Hello' });
      }, 0);
      return { success: true, data: { started: true } };
    });
    const service = createChatService(api as ElectronAPI);
    const onChunk = vi.fn();
    const promise = service.sendMessageStream('go', onChunk, { sessionId: 'sess-cancel' });
    setTimeout(async () => {
      await service.cancelStream?.('sess-cancel');
    }, 1);
    const result = await promise;
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(result.content).toBe('Hello');
    expect((api.chat as any).cancelStream).toHaveBeenCalledWith('sess-cancel');
  });

  it('sendMessage throws on invalid content', async () => {
    const service = createChatService(baseApi() as ElectronAPI);
    await expect(service.sendMessage('')).rejects.toThrow(/Invalid message content/);
  });

  it('sendMessage throws when API fails', async () => {
    const api = baseApi();
    (api.chat!.sendMessage as any).mockResolvedValue({ success: false, error: { message: 'fail' } });
    const service = createChatService(api as ElectronAPI);
    await expect(service.sendMessage('hi', { sessionId: 's1' })).rejects.toThrow(/fail/);
  });

  it('sendMessageStream throws on invalid content', async () => {
    const service = createChatService(baseApi() as ElectronAPI);
    await expect(service.sendMessageStream('', vi.fn(), { sessionId: 's1' })).rejects.toThrow(/Invalid message content/);
  });

  it('getAvailableAgents returns empty on failure', async () => {
    const api = baseApi();
    (api.agents!.getAvailableAgents as any).mockResolvedValue({ success: false });
    const service = createChatService(api as ElectronAPI);
    expect(await service.getAvailableAgents?.()).toEqual([]);
  });

  it('getProviderInfo returns defaults', () => {
    const info = createChatService(baseApi() as ElectronAPI).getProviderInfo?.();
    expect(info).toEqual({ name: 'default', provider: 'chat' });
  });

  it('getSession returns null on failure', async () => {
    const api = baseApi();
    (api.sessions!.get as any).mockResolvedValue({ success: false });
    const service = createChatService(api as ElectronAPI);
    expect(await service.getSession?.('s1')).toBeNull();
  });

  it('createSession returns null on failure', async () => {
    const api = baseApi();
    (api.sessions!.create as any).mockResolvedValue({ success: false });
    const service = createChatService(api as ElectronAPI);
    expect(await service.createSession?.('t')).toBeNull();
  });

  it('checkPracticeOpportunity returns data on success', async () => {
    const api = baseApi();
    (api.chat!.checkPracticeOpportunity as any).mockResolvedValue({ success: true, data: { hasOpportunity: true } });
    const service = createChatService(api as ElectronAPI);
    const res = await service.checkPracticeOpportunity({ conversationId: 'c', userMessage: 'q' });
    expect(res).toEqual({ hasOpportunity: true });
  });
});
