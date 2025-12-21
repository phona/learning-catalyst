import type { ElectronAPI } from '@/shared/types/electron-api';
import type { AgentDisplay as RendererAgentDisplay } from '@/renderer/types/agent';
import type { AgentDisplay as APIAgentDisplay, AgentContext } from '@/shared/types/electron-api/agent-api';

export interface AgentStatus {
  agentId: string;
  isOnline: boolean;
  isProcessing: boolean;
  currentTask?: string;
}

export interface AgentService {
  getAvailableAgents: () => Promise<RendererAgentDisplay[]>;
  selectAgentForSession: (params: {
    sessionId: string;
    agentType: RendererAgentDisplay['type'];
  }) => Promise<RendererAgentDisplay>;
  getAgentStatus: (agentId: string) => Promise<AgentStatus>;
}

export function createAgentService(apiClient: ElectronAPI): AgentService {
  const normalizeCategory = (category?: string): RendererAgentDisplay['category'] => {
    const allowed: RendererAgentDisplay['category'][] = ['learning', 'analysis', 'creative'];
    return allowed.includes(category as RendererAgentDisplay['category'])
      ? (category as RendererAgentDisplay['category'])
      : 'learning';
  };

  const mapAgent = (
    agent: APIAgentDisplay,
  ): RendererAgentDisplay => {
    return {
      id: agent.id,
      type: agent.type as RendererAgentDisplay['type'],
      name: agent.name,
      description: agent.description,
      avatar: agent.avatar,
      color: agent.color,
      capabilities: agent.capabilities,
      isAvailable: agent.isAvailable,
      category: normalizeCategory(agent.category),
      stats: {
        sessionsCount: agent.stats.sessionsCount,
        avgRating: agent.stats.avgRating,
        totalInteractions: 0, // Not available from API, default to 0
        successRate: 0, // Not available from API, default to 0
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
    agentType: RendererAgentDisplay['type'];
  }) => {
    const response = await apiClient.agents.selectAgentForSession(params);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to select agent');
    }
    const agent = response.data.agent;
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
