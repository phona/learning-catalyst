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
});
