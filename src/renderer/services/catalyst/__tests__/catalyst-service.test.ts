import { describe, expect, it, vi } from 'vitest';
import { createCatalystService } from '../catalyst-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

const baseApi = (): Partial<ElectronAPI> => ({
  catalyst: {
    sendChat: vi.fn(),
    sendChatStream: vi.fn(),
    cancelAgent: vi.fn(),
    getActiveExecutions: vi.fn(),
  } as any,
  sessions: {
    get: vi.fn(),
  } as any,
});

describe('catalyst-service', () => {
  it('returns error when message is empty', async () => {
    const service = createCatalystService(baseApi() as ElectronAPI);
    const result = await service.sendChat('   ');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/empty/);
  });

  it('sends chat successfully with defaults', async () => {
    const api = baseApi();
    (api.catalyst!.sendChat as any).mockResolvedValue({
      success: true,
      data: { messageId: 'mid', response: 'hello' },
    });
    const service = createCatalystService(api as ElectronAPI);

    const result = await service.sendChat(' hi ');

    expect(api.catalyst!.sendChat).toHaveBeenCalledWith({
      message: 'hi',
      agentId: 'default',
      sessionId: 'default',
      stream: false,
    });
    expect(result).toEqual({ success: true, messageId: 'mid', response: 'hello' });
  });

  it('streams chat and forwards chunks', async () => {
    const api = baseApi();
    const chunkHandler = vi.fn();
    (api.catalyst!.sendChatStream as any).mockImplementation(async ({ onChunk }: any) => {
      onChunk({ type: 'token', content: 'partial' } as any);
      return { success: true, data: { messageId: 'm2', response: 'done' } };
    });
    const service = createCatalystService(api as ElectronAPI);

    const result = await service.sendChatStream('message', chunkHandler, { agentId: 'a1' });

    expect(chunkHandler).toHaveBeenCalledWith({ type: 'token', content: 'partial' });
    expect(result.success).toBe(true);
    expect(api.catalyst!.sendChatStream).toHaveBeenCalledWith({
      message: 'message',
      agentId: 'a1',
      sessionId: 'default',
      onChunk: chunkHandler,
    });
  });

  it('rejects stream when callback missing', async () => {
    const api = baseApi();
    const service = createCatalystService(api as ElectronAPI);
    // @ts-expect-error intentionally pass undefined handler
    const result = await service.sendChatStream('msg', undefined);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/onChunk/);
  });

  it('gets session details', async () => {
    const api = baseApi();
    (api.sessions!.get as any).mockResolvedValue({
      success: true,
      data: { id: 's1', title: 'Session 1' },
    });
    const service = createCatalystService(api as ElectronAPI);

    const result = await service.getSession('s1');

    expect(result.success).toBe(true);
    expect(result.session).toEqual({ id: 's1', title: 'Session 1' });
  });

  it('cancels execution and handles missing id', async () => {
    const api = baseApi();
    (api.catalyst!.cancelAgent as any).mockResolvedValue({ success: true });
    const service = createCatalystService(api as ElectronAPI);

    const empty = await service.cancelExecution(' ');
    expect(empty.success).toBe(false);

    const ok = await service.cancelExecution('exec-1');
    expect(ok.success).toBe(true);
    expect(api.catalyst!.cancelAgent).toHaveBeenCalledWith('exec-1');
  });

  it('lists active executions and handles missing API', async () => {
    const api = baseApi();
    (api.catalyst!.getActiveExecutions as any).mockResolvedValue({
      success: true,
      data: [{ id: 'e1' }],
    });
    const service = createCatalystService(api as ElectronAPI);

    const ok = await service.getActiveExecutions();
    expect(ok.executions?.[0]).toEqual({ id: 'e1' });

    const missing = createCatalystService({} as ElectronAPI);
    const res = await missing.getActiveExecutions();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not available/);
  });
});
