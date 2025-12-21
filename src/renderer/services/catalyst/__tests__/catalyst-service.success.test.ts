import { describe, it, expect, vi } from 'vitest';
import { createCatalystService } from '@/renderer/services/catalyst/catalyst-service';

const buildApi = () => {
  const catalyst = {
    sendChat: vi.fn().mockResolvedValue({
      success: true,
      data: { messageId: 'm1', response: 'ok' },
    }),
    sendChatStream: vi.fn().mockResolvedValue({
      success: true,
      data: { messageId: 'm2', response: 'stream-ok' },
    }),
    listAgents: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'agent-1', name: 'Agent', type: 'learning' }],
    }),
    cancelAgent: vi.fn().mockResolvedValue({ success: true, data: { cancelled: true } }),
    getActiveExecutions: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'exec-1', status: 'running' as const, agentId: 'agent-1', startTime: Date.now() }],
    }),
  };

  const sessions = {
    get: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 's1', status: 'active' },
    }),
  };

  return { catalyst, sessions } as any;
};

describe('catalyst-service success paths', () => {
  it('sends chat and returns message', async () => {
    const api = buildApi();
    const service = createCatalystService(api);

    const res = await service.sendChat('hello');

    expect(api.catalyst.sendChat).toHaveBeenCalled();
    expect(res.success).toBe(true);
    expect(res.messageId).toBe('m1');
    expect(res.response).toBe('ok');
  });

  it('streams chat and forwards chunks', async () => {
    const api = buildApi();
    const service = createCatalystService(api);
    const onChunk = vi.fn();

    const res = await service.sendChatStream('hi there', onChunk, { agentId: 'a1' });

    expect(api.catalyst.sendChatStream).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'hi there',
        agentId: 'a1',
      }),
    );
    expect(res.success).toBe(true);
  });

  it('lists agents successfully', async () => {
    const api = buildApi();
    const service = createCatalystService(api);

    const res = await service.getAvailableAgents();

    expect(res.success).toBe(true);
    expect(res.agents?.[0].id).toBe('agent-1');
  });

  it('retrieves session by id', async () => {
    const api = buildApi();
    const service = createCatalystService(api);

    const res = await service.getSession('s1');

    expect(api.sessions.get).toHaveBeenCalledWith('s1');
    expect(res.success).toBe(true);
    expect((res.session as any)?.id).toBe('s1');
  });

  it('cancels execution and lists active executions', async () => {
    const api = buildApi();
    const service = createCatalystService(api);

    const cancelRes = await service.cancelExecution('exec-1');
    const active = await service.getActiveExecutions();

    expect(cancelRes.success).toBe(true);
    expect(api.catalyst.cancelAgent).toHaveBeenCalledWith('exec-1');
    expect(active.executions?.[0].id).toBe('exec-1');
  });
});
