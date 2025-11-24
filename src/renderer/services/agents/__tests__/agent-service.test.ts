import { describe, expect, it } from 'vitest';
import { createAgentService } from '../agent-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

const createMockApi = (overrides: Partial<ElectronAPI['agents']> = {}): ElectronAPI =>
  ({
    // @ts-expect-error only the agents domain is required for these tests
    agents: {
      getAvailableAgents: overrides.getAvailableAgents!,
      selectAgentForSession: overrides.selectAgentForSession!,
    },
  }) as ElectronAPI;

describe('renderer/services/agents/agent-service', () => {
  it('maps agent stats and normalizes category', async () => {
    const api = createMockApi({
      getAvailableAgents: async () => ({
        success: true,
        data: [
          {
            id: 'a1',
            type: 'analysis',
            name: 'Analyzer',
            description: 'desc',
            avatar: '',
            color: '#fff',
            capabilities: [],
            isAvailable: true,
            category: 'unknown', // should be normalized to "learning"
          } as any,
        ],
      }),
    });

    const service = createAgentService(api);
    const agents = await service.getAvailableAgents();

    expect(agents[0].category).toBe('learning');
    expect(agents[0].stats).toEqual({
      sessionsCount: 0,
      avgRating: 0,
      totalInteractions: 0,
      successRate: 0,
    });
  });

  it('throws when agent list cannot be loaded', async () => {
    const api = createMockApi({
      getAvailableAgents: async () => ({ success: false, error: { message: 'boom' } } as any),
    });
    const service = createAgentService(api);

    await expect(service.getAvailableAgents()).rejects.toThrow('boom');
  });

  it('selects agent for session and maps nested agent payloads', async () => {
    const api = createMockApi({
      selectAgentForSession: async () => ({
        success: true,
        data: {
          agent: {
            id: 'agent-123',
            type: 'learning',
            name: 'Helper',
            description: '',
            avatar: '',
            color: '#000',
            capabilities: [],
            isAvailable: true,
            category: 'analysis',
          },
        },
      }),
    });

    const service = createAgentService(api);
    const agent = await service.selectAgentForSession({ sessionId: 's1', agentType: 'learning' });

    expect(agent.id).toBe('agent-123');
    // category should pass through when already allowed
    expect(agent.category).toBe('analysis');
  });

  it('returns default status for getAgentStatus', async () => {
    const api = createMockApi({
      getAvailableAgents: async () => ({ success: true, data: [] }),
      selectAgentForSession: async () =>
        ({ success: true, data: { id: 'a', type: 'learning' } } as any),
    });
    const service = createAgentService(api);

    const status = await service.getAgentStatus('agent-1');

    expect(status).toEqual({ agentId: 'agent-1', isOnline: true, isProcessing: false });
  });
});
