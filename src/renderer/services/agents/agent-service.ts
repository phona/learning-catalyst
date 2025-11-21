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
    const response = await apiClient.agents.getAvailableAgents();
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to load agents');
    }
    return response.data;
  };

  const selectAgentForSession = async (params: {
    sessionId: string;
    agentType: AgentDisplay['type'];
  }) => {
    const response = await apiClient.agents.selectAgentForSession(params);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to select agent');
    }
    return (response.data as any).agent ?? (response.data as any);
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
