/**
 * Agent Store - Frontend state management for agents
 * Clean architecture with display-optimized state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AgentDisplay, AgentSelectRequest, AgentSettings } from '../../types';

interface AgentState {
  // Agent data
  agents: AgentDisplay[];
  availableAgents: AgentDisplay[];
  selectedAgent: AgentDisplay | null;

  // Loading states
  loading: boolean;
  selecting: boolean;
  switching: boolean;

  // Search and filter state
  searchQuery: string;
  selectedCategory: string;

  // Error state
  error: string | null;

  // Agent status tracking
  agentStatuses: Map<string, { isOnline: boolean; isProcessing: boolean; currentTask?: string }>;

  // Actions
  setAgents: (agents: AgentDisplay[]) => void;
  addAgent: (agent: AgentDisplay) => void;
  updateAgent: (agentId: string, updates: Partial<AgentDisplay>) => void;
  setSelectedAgent: (agent: AgentDisplay | null) => void;

  setLoading: (loading: boolean) => void;
  setSelecting: (selecting: boolean) => void;
  setSwitching: (switching: boolean) => void;
  setError: (error: string | null) => void;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;

  // Agent status actions
  setAgentStatus: (agentId: string, status: { isOnline: boolean; isProcessing: boolean; currentTask?: string }) => void;
  updateAgentStatus: (agentId: string, updates: Partial<{ isOnline: boolean; isProcessing: boolean; currentTask?: string }>) => void;

  // API actions
  loadAgents: () => Promise<void>;
  selectAgent: (request: AgentSelectRequest) => Promise<void>;
  getAgentStatus: (agentId: string) => Promise<void>;

  // Utility actions
  resetAgentState: () => void;
}

const initialState = {
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
};

export const useAgentStore = create<AgentState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // State setters
    setAgents: (agents) => set({ agents, availableAgents: agents.filter(a => a.isAvailable) }),
    addAgent: (agent) => set((state) => ({
      agents: [...state.agents, agent],
      availableAgents: agent.isAvailable
        ? [...state.availableAgents, agent]
        : state.availableAgents
    })),
    updateAgent: (agentId, updates) => set((state) => ({
      agents: state.agents.map(agent =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
      availableAgents: state.availableAgents.map(agent =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
      selectedAgent: state.selectedAgent?.id === agentId
        ? { ...state.selectedAgent, ...updates }
        : state.selectedAgent
    })),
    setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

    setLoading: (loading) => set({ loading }),
    setSelecting: (selecting) => set({ selecting }),
    setSwitching: (switching) => set({ switching }),
    setError: (error) => set({ error }),

    // Search and filter actions
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

    // Agent status actions
    setAgentStatus: (agentId, status) => set((state) => ({
      agentStatuses: new Map(state.agentStatuses.set(agentId, status))
    })),
    updateAgentStatus: (agentId, updates) => set((state) => {
      const currentStatus = state.agentStatuses.get(agentId) || { isOnline: true, isProcessing: false };
      const newStatus = { ...currentStatus, ...updates };
      const newStatuses = new Map(state.agentStatuses.set(agentId, newStatus));
      return { agentStatuses: newStatuses };
    }),

    // API actions
    loadAgents: async () => {
      try {
        set({ loading: true, error: null });

        if (typeof window !== 'undefined' && window.electronAPI?.agents) {
          const result = await window.electronAPI.agents.list();

          set({
            agents: result.agents,
            availableAgents: result.agents.filter(a => a.isAvailable),
            loading: false
          });
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
        set({ error: error.message, loading: false });
      }
    },

    selectAgent: async (request) => {
      try {
        set({ selecting: true, error: null });

        if (typeof window !== 'undefined' && window.electronAPI?.agents) {
          await window.electronAPI.agents.select(request.sessionId, request.agentId);

          // Update selected agent in store
          const agent = get().agents.find(a => a.id === request.agentId);
          if (agent) {
            get().setSelectedAgent(agent);
          }
        }

        set({ selecting: false });
      } catch (error) {
        console.error('Failed to select agent:', error);
        set({ error: error.message, selecting: false });
        throw error;
      }
    },

    getAgentStatus: async (agentId) => {
      try {
        if (typeof window !== 'undefined' && window.electronAPI?.agents) {
          const status = await window.electronAPI.agents.getStatus(agentId);

          get().setAgentStatus(agentId, {
            isOnline: status.isOnline,
            isProcessing: status.isProcessing,
            currentTask: status.currentTask
          });
        }
      } catch (error) {
        console.error('Failed to get agent status:', error);
        // Set default status on error
        get().setAgentStatus(agentId, {
          isOnline: false,
          isProcessing: false
        });
      }
    },

    // Utility actions
    resetAgentState: () => set(initialState)
  }))
);

// Selectors for derived state
export const useAgents = () => useAgentStore((state) => state.agents);
export const useAvailableAgents = () => useAgentStore((state) => state.availableAgents);
export const useSelectedAgent = () => useAgentStore((state) => state.selectedAgent);
export const useAgentsLoading = () => useAgentStore((state) => state.loading);
export const useAgentError = () => useAgentStore((state) => state.error);
export const useFilteredAgents = () => useAgentStore((state) => {
  const { availableAgents, searchQuery, selectedCategory } = state;

  let filtered = availableAgents;

  // Apply search query
  if (searchQuery) {
    filtered = filtered.filter(agent =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  // Apply category filter
  if (selectedCategory) {
    filtered = filtered.filter(agent => agent.category === selectedCategory);
  }

  return filtered;
});
export const useAgentStatus = (agentId: string) => useAgentStore((state) => state.agentStatuses.get(agentId));

// Actions hook
export const useAgentActions = () => useAgentStore((state) => ({
  setAgents: state.setAgents,
  addAgent: state.addAgent,
  updateAgent: state.updateAgent,
  setSelectedAgent: state.setSelectedAgent,
  loadAgents: state.loadAgents,
  selectAgent: state.selectAgent,
  getAgentStatus: state.getAgentStatus,
  setAgentStatus: state.setAgentStatus,
  updateAgentStatus: state.updateAgentStatus,
  setSearchQuery: state.setSearchQuery,
  setSelectedCategory: state.setSelectedCategory,
  resetAgentState: state.resetAgentState
}));

// Initialize agents on store creation
useAgentStore.getState().loadAgents();