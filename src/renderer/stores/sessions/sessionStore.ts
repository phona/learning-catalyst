/**
 * Session Store - Frontend state management for sessions
 * Clean architecture with display-optimized state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SessionDisplay, SessionSearchFilters, SessionCreateRequest } from '../../types';

interface SessionState {
  // Session data
  sessions: SessionDisplay[];
  currentSession: SessionDisplay | null;
  totalSessions: number;
  hasMore: boolean;

  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;

  // Search and filter state
  searchQuery: string;
  filters: SessionSearchFilters;
  selectedSessions: Set<string>;

  // Error state
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;

  // Actions
  setSessions: (sessions: SessionDisplay[]) => void;
  addSession: (session: SessionDisplay) => void;
  updateSession: (sessionId: string, updates: Partial<SessionDisplay>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (session: SessionDisplay | null) => void;

  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setDeleting: (deleting: boolean) => void;
  setError: (error: string | null) => void;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SessionSearchFilters) => void;
  clearFilters: () => void;

  // Selection actions
  selectSession: (sessionId: string) => void;
  deselectSession: (sessionId: string) => void;
  selectAllSessions: () => void;
  clearSelection: () => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // API actions
  loadSessions: (filters?: SessionSearchFilters) => Promise<void>;
  createSession: (request: SessionCreateRequest) => Promise<SessionDisplay>;
  updateSessionData: (sessionId: string, updates: Partial<SessionDisplay>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  getCurrentSession: (sessionId: string) => Promise<SessionDisplay | null>;
  createNewSession: (request?: SessionCreateRequest) => Promise<SessionDisplay>;

  // Utility actions
  refreshSessions: () => Promise<void>;
  resetSessionState: () => void;
}

const initialState = {
  sessions: [],
  currentSession: null,
  totalSessions: 0,
  hasMore: false,
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  searchQuery: '',
  filters: {},
  selectedSessions: new Set<string>(),
  error: null,
  currentPage: 1,
  pageSize: 20,
};

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // State setters
    setSessions: (sessions) => set({ sessions }),
    addSession: (session) =>
      set((state) => ({
        sessions: [session, ...state.sessions],
        totalSessions: state.totalSessions + 1,
      })),
    updateSession: (sessionId, updates) =>
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId ? { ...session, ...updates } : session,
        ),
        currentSession:
          state.currentSession?.id === sessionId
            ? { ...state.currentSession, ...updates }
            : state.currentSession,
      })),
    removeSession: (sessionId) =>
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== sessionId),
        totalSessions: state.totalSessions - 1,
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      })),
    setCurrentSession: (session) => set({ currentSession: session }),

    setLoading: (loading) => set({ loading }),
    setCreating: (creating) => set({ creating }),
    setUpdating: (updating) => set({ updating }),
    setDeleting: (deleting) => set({ deleting }),
    setError: (error) => set({ error }),

    // Search and filter actions
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setFilters: (filters) => set({ filters }),
    clearFilters: () => set({ filters: {}, searchQuery: '' }),

    // Selection actions
    selectSession: (sessionId) =>
      set((state) => {
        const newSelected = new Set(state.selectedSessions);
        newSelected.add(sessionId);
        return { selectedSessions: newSelected };
      }),
    deselectSession: (sessionId) =>
      set((state) => {
        const newSelected = new Set(state.selectedSessions);
        newSelected.delete(sessionId);
        return { selectedSessions: newSelected };
      }),
    selectAllSessions: () =>
      set((state) => {
        const newSelected = new Set<string>();
        state.sessions.forEach((session) => {
          newSelected.add(session.id);
        });
        return { selectedSessions: newSelected };
      }),
    clearSelection: () => set({ selectedSessions: new Set<string>() }),

    // Pagination actions
    setCurrentPage: (currentPage) => set({ currentPage }),
    setPageSize: (pageSize) => set({ pageSize }),

    // API actions - These are now pure state setters
    // Actual API calls should be made in components using service hooks
    loadSessions: async (filters) => {
      // Note: This should be called from a component with proper error handling
      // The actual API call should happen in a service or component
      set({ loading: true, error: null });
    },

    createSession: async (request) => {
      // Note: This should be called from a component with proper error handling
      // The actual API call should happen in a service or component
      set({ creating: true, error: null });
      throw new Error(
        'Session creation should be done through service hooks, not directly in store',
      );
    },

    updateSessionData: async (sessionId, updates) => {
      // Note: This should be called from a component with proper error handling
      set({ updating: true, error: null });
      get().updateSession(sessionId, updates);
      set({ updating: false });
    },

    deleteSession: async (sessionId) => {
      // Note: This should be called from a component with proper error handling
      set({ deleting: true, error: null });
      get().removeSession(sessionId);
      set({ deleting: false });
    },

    getCurrentSession: async (sessionId) => {
      // Note: This should be called from a component with proper error handling
      return null;
    },

    createNewSession: async (request = {}) => {
      const defaultRequest: SessionCreateRequest = {
        title: 'New Learning Session',
        agentType: 'learning',
        difficulty: 'medium',
        tags: [],
        ...request,
      };

      return await get().createSession(defaultRequest);
    },

    // Utility actions
    refreshSessions: async () => {
      const { filters } = get();
      await get().loadSessions(filters);
    },

    resetSessionState: () => set(initialState),
  })),
);

// Selectors for derived state
export const useSessions = () => useSessionStore((state) => state.sessions);
export const useCurrentSession = () => useSessionStore((state) => state.currentSession);
export const useSessionsLoading = () => useSessionStore((state) => state.loading);
export const useSessionError = () => useSessionStore((state) => state.error);
export const useFilteredSessions = () =>
  useSessionStore((state) => {
    const { sessions, searchQuery, filters } = state;

    let filtered = sessions;

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      );
    }

    // Apply filters
    if (filters.agentType) {
      filtered = filtered.filter((session) => session.agentType === filters.agentType);
    }

    if (filters.difficulty) {
      filtered = filtered.filter((session) => session.difficulty === filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((session) =>
        filters.tags!.some((tag) => session.tags.includes(tag)),
      );
    }

    return filtered;
  });

// Actions hook
export const useSessionActions = () =>
  useSessionStore((state) => ({
    setSessions: state.setSessions,
    addSession: state.addSession,
    updateSession: state.updateSession,
    removeSession: state.removeSession,
    setCurrentSession: state.setCurrentSession,
    loadSessions: state.loadSessions,
    createSession: state.createSession,
    updateSessionData: state.updateSessionData,
    deleteSession: state.deleteSession,
    getCurrentSession: state.getCurrentSession,
    createNewSession: state.createNewSession,
    refreshSessions: state.refreshSessions,
    setSearchQuery: state.setSearchQuery,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    selectSession: state.selectSession,
    deselectSession: state.deselectSession,
    selectAllSessions: state.selectAllSessions,
    clearSelection: state.clearSelection,
    resetSessionState: state.resetSessionState,
  }));
