import { describe, expect, it, beforeEach } from 'vitest';
import { useAgentStore, setAgentService } from '../agents/agentStore';
import type { AgentService } from '@/renderer/services/agents/agent-service';

const mockAgent = {
  id: 'a1',
  name: 'Agent 1',
  type: 'learning',
  description: '',
  avatar: '',
  color: '#fff',
  capabilities: [],
  isAvailable: true,
  category: 'test',
  stats: { sessionsCount: 0, avgRating: 0 },
  specialties: [],
  languages: [],
  difficulty: 'beginner',
  interactive: true,
};

describe('agentStore behavior', () => {
  beforeEach(() => {
    useAgentStore.setState((state) => ({
      ...state,
      agents: [],
      availableAgents: [],
      selectedAgent: null,
      loading: false,
      selecting: false,
      switching: false,
      searchQuery: '',
      selectedCategory: '',
      error: null,
      agentStatuses: new Map(),
    }));
    setAgentService(null);
  });

  it('manages agent lists and selection locally', () => {
    const store = useAgentStore.getState();
    store.setAgents([mockAgent]);
    expect(useAgentStore.getState().availableAgents).toHaveLength(1);
    store.addAgent({ ...mockAgent, id: 'a2', isAvailable: false });
    expect(useAgentStore.getState().agents).toHaveLength(2);
    store.updateAgent('a1', { name: 'Updated' });
    expect(useAgentStore.getState().agents[0].name).toBe('Updated');
    store.setSelectedAgent(mockAgent);
    expect(useAgentStore.getState().selectedAgent?.id).toBe('a1');
  });

  it('tracks statuses with set/update', () => {
    const store = useAgentStore.getState();
    store.setAgentStatus('a1', { isOnline: true, isProcessing: false });
    expect(useAgentStore.getState().agentStatuses.get('a1')?.isOnline).toBe(true);
    store.updateAgentStatus('a1', { isProcessing: true, currentTask: 'doing' });
    expect(useAgentStore.getState().agentStatuses.get('a1')?.currentTask).toBe('doing');
  });

  it('loadAgents sets error when service missing', async () => {
    const store = useAgentStore.getState();
    await store.loadAgents();
    expect(useAgentStore.getState().error).toMatch(/not initialized/i);
  });

  it('loadAgents/selectAgent/getAgentStatus call service when provided', async () => {
    const service: AgentService = {
      getAvailableAgents: async () => [mockAgent],
      selectAgentForSession: async () => mockAgent,
      getAgentStatus: async () => ({ isOnline: true, isProcessing: false }),
    } as any;
    setAgentService(service);
    const store = useAgentStore.getState();
    await store.loadAgents();
    expect(useAgentStore.getState().agents).toHaveLength(1);
    await store.selectAgent({ sessionId: 's1', agentType: 'learning' });
    expect(useAgentStore.getState().selectedAgent?.id).toBe('a1');
    await store.getAgentStatus('a1');
    expect(useAgentStore.getState().agentStatuses.get('a1')?.isOnline).toBe(true);
  });
});

