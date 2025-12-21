import { describe, expect, it } from 'vitest';
import { createAgentService } from '../agent-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { APIResponse } from '@/shared/types/electron-api/base';
import type { AgentDisplay } from '@/shared/types/electron-api/agent-api';

const createMockApi = (overrides: Partial<ElectronAPI['agents']> = {}): ElectronAPI =>
  ({
    // Only the agents domain is required for these tests, other domains are minimal mocks
    chat: {} as any,
    aiSDK: {} as any,
    learning: {} as any,
    knowledge: {} as any,
    analytics: {} as any,
    sessions: {} as any,
    content: {} as any,
    settings: {} as any,
    catalyst: {} as any,
    awaitReady: async () => ({ status: 'ready', timestamp: new Date().toISOString() } as any),
    awaitConfigChange: async () => ({ status: 'ready', timestamp: new Date().toISOString() } as any),
    getWorkspacePath: async () => '',
    readDirectory: async () => [],
    readFile: async () => '',
    writeFile: async () => {},
    existsFile: async () => false,
    showOpenDialog: async () => ({ canceled: true }),
    showSaveDialog: async () => ({ canceled: true }),
    onMenuAction: () => {},
    onIPCError: () => () => {},
    handleError: () => {},
    healthCheck: async () => ({ status: 'healthy', apis: {} }),
    getVersion: async () => ({ version: '1.0.0', build: 'test', platform: 'test' }),
    trackEvent: async () => {},
    getErrorBuffer: async () => [],
    clearErrorBuffer: async () => ({ cleared: true }),
    relaunchApp: async () => ({ relaunching: false }),
    agents: {
      getAvailableAgents: overrides.getAvailableAgents!,
      selectAgentForSession: overrides.selectAgentForSession!,
      setAgentPersonality: async () => ({ success: true, data: {} as any }),
      setResponseStyle: async () => ({ success: true, data: {} as any }),
      getAgentCapabilities: async () => ({ success: true, data: {} as any }),
      tryAgentFeature: async () => ({ success: true, data: {} as any }),
    },
  }) as unknown as ElectronAPI;

describe('renderer/services/agents/agent-service', () => {
  it('maps agent stats and normalizes category', async () => {
    const api = createMockApi({
      getAvailableAgents: async (): Promise<APIResponse<AgentDisplay[]>> => ({
        success: true,
        data: [
          {
            id: 'a1',
            type: 'assessment' as const,
            name: 'Analyzer',
            description: 'desc',
            avatar: '',
            color: '#fff',
            capabilities: [],
            isAvailable: true,
            category: 'unknown', // should be normalized to "learning"
            stats: {
              sessionsCount: 5,
              avgRating: 4.2,
            },
            specialties: [],
            languages: [],
            difficulty: 'intermediate' as const,
            interactive: true,
          },
        ],
      }),
    });

    const service = createAgentService(api);
    const agents = await service.getAvailableAgents();

    expect(agents[0].category).toBe('learning');
    expect(agents[0].stats).toEqual({
      sessionsCount: 5,
      avgRating: 4.2,
      totalInteractions: 0,
      successRate: 0,
    });
  });

  it('throws when agent list cannot be loaded', async () => {
    const api = createMockApi({
      getAvailableAgents: async (): Promise<APIResponse<AgentDisplay[]>> => ({
        success: false,
        error: 'boom',
        code: 'load_failed',
      }),
    });
    const service = createAgentService(api);

    await expect(service.getAvailableAgents()).rejects.toThrow('Failed to load agents');
  });

  it('selects agent for session and maps nested agent payloads', async () => {
    const api = createMockApi({
      selectAgentForSession: async (params: { sessionId: string; agentType: string }) => ({
        success: true,
        data: {
          agent: {
            id: 'agent-123',
            type: 'learning' as const,
            name: 'Helper',
            description: '',
            avatar: '',
            color: '#000',
            capabilities: [],
            isAvailable: true,
            category: 'analysis',
            stats: {
              sessionsCount: 0,
              avgRating: 0,
            },
            specialties: [],
            languages: [],
            difficulty: 'intermediate' as const,
            interactive: true,
          },
          context: {
            sessionId: params.sessionId,
            agentId: 'agent-123',
            agentSettings: {} as any,
            sessionHistory: {
              previousSessions: 0,
              avgRating: 0,
              totalInteractionTime: '0m',
            },
            personalizedSettings: {
              preferredTopics: [],
              avoidedTopics: [],
              communicationStyle: 'friendly',
              pacePreference: 'medium' as const,
            },
            initialContext: [],
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
      getAvailableAgents: async () => ({
        success: true,
        data: [],
      }),
      selectAgentForSession: async (params: { sessionId: string; agentType: string }) => ({
        success: true,
        data: {
          agent: {
            id: 'a',
            type: 'learning' as const,
            name: 'Learning Agent',
            description: '',
            avatar: '',
            color: '#000',
            capabilities: [],
            isAvailable: true,
            category: 'learning',
            stats: { sessionsCount: 0, avgRating: 0 },
            specialties: [],
            languages: [],
            difficulty: 'intermediate' as const,
            interactive: true,
          },
          context: {
            sessionId: params.sessionId,
            agentId: 'a',
            agentSettings: {} as any,
            sessionHistory: {
              previousSessions: 0,
              avgRating: 0,
              totalInteractionTime: '0m',
            },
            personalizedSettings: {
              preferredTopics: [],
              avoidedTopics: [],
              communicationStyle: 'friendly',
              pacePreference: 'medium' as const,
            },
            initialContext: [],
          },
        },
      }),
    });
    const service = createAgentService(api);

    const status = await service.getAgentStatus('agent-1');

    expect(status).toEqual({ agentId: 'agent-1', isOnline: true, isProcessing: false });
  });
});
