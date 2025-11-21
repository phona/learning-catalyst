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
  const getAvailableAgents = async () => {
    const agents = await apiClient.agents.getAvailableAgents();
    return agents;
  };

  const selectAgentForSession = async (params: {
    sessionId: string;
    agentType: AgentDisplay['type'];
  }) => {
    const response = await apiClient.agents.selectAgentForSession(params);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to select agent');
    }
    return response.agent;
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
