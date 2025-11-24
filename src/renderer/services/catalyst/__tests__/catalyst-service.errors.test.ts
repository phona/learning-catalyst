import { describe, it, expect, vi } from 'vitest';
import { createCatalystService } from '@/renderer/services/catalyst/catalyst-service';

const baseApi: any = {
  catalyst: {
    sendChat: vi.fn(),
    sendChatStream: vi.fn(),
    getSession: vi.fn(),
    cancelExecution: vi.fn(),
    getActiveExecutions: vi.fn(),
    getAvailableAgents: vi.fn(),
  },
};

describe('catalyst-service error paths', () => {
  it('returns error when message is empty', async () => {
    const svc = createCatalystService(baseApi);
    const res = await svc.sendChat('');
    expect(res.success).toBe(false);
  });

  it('returns error when onChunk is missing for stream', async () => {
    const svc = createCatalystService(baseApi);
    const res = await svc.sendChatStream('hi', undefined as any);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/onChunk/i);
  });

  it('fails when underlying sendChat API throws', async () => {
    baseApi.catalyst.sendChat.mockRejectedValue(new Error('boom'));
    const svc = createCatalystService(baseApi);
    const res = await svc.sendChat('hello');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/boom/);
  });

  it('fails when sendChatStream API not available', async () => {
    const svc = createCatalystService({ catalyst: {} } as any);
    const res = await svc.sendChatStream('hello', () => {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not available/);
  });

  it('propagates API error when sendChatStream returns failure', async () => {
    baseApi.catalyst.sendChatStream.mockResolvedValue({
      success: false,
      error: { message: 'stream failed' },
    });
    const svc = createCatalystService(baseApi);
    const res = await svc.sendChatStream('hello', () => {});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/stream failed/);
  });
});
