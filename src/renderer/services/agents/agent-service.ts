import type { ElectronAPI } from '@/shared/types/electron-api';
import type { AgentDisplay } from '@/renderer/types/agent';

export interface AgentStatus {
  agentId: string;
  isOnline: boolean;
  isProcessing: boolean;
  currentTask?: string;
}

export interface AgentService {
  getAvailableAgents: () => Promise<AgentDisplay[]>;
  selectAgentForSession: (params: {
    sessionId: string;
    agentType: AgentDisplay['type'];
  }) => Promise<AgentDisplay>;
  getAgentStatus: (agentId: string) => Promise<AgentStatus>;
}

export function createAgentService(apiClient: ElectronAPI): AgentService {
  const normalizeCategory = (category?: string): AgentDisplay['category'] => {
    const allowed: AgentDisplay['category'][] = ['learning', 'analysis', 'creative'];
    return allowed.includes(category as AgentDisplay['category'])
      ? (category as AgentDisplay['category'])
      : 'learning';
  };

  const mapAgent = (
    agent: import('@/shared/types/electron-api/agent-api').AgentDisplay,
  ): AgentDisplay => {
    const statsSource = (agent as { stats?: Partial<AgentDisplay['stats']> }).stats;
    return {
      ...agent,
      category: normalizeCategory(agent.category),
      stats: {
        sessionsCount: statsSource?.sessionsCount ?? 0,
        avgRating: statsSource?.avgRating ?? 0,
        totalInteractions: statsSource?.totalInteractions ?? 0,
        successRate: statsSource?.successRate ?? 0,
      },
    };
  };

  const getAvailableAgents = async () => {
    const maybe = (apiClient as any).awaitReady;
    if (typeof maybe === 'function') {
      await maybe();
    }
    const response = await apiClient.agents.getAvailableAgents();
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load agents');
    }
    return response.data.map(mapAgent);
  };

  const selectAgentForSession = async (params: {
    sessionId: string;
    agentType: AgentDisplay['type'];
  }) => {
    const response = await apiClient.agents.selectAgentForSession(params);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to select agent');
    }
    const agent = (response.data as any).agent ?? (response.data as any);
    return mapAgent(agent);
  };

  const getAgentStatus = async (agentId: string) => {
    return {
      agentId,
      isOnline: true,
      isProcessing: false,
    };
  };

  return {
    getAvailableAgents,
    selectAgentForSession,
    getAgentStatus,
  };
}
