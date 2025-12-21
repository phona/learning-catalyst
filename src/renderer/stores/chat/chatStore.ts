import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SessionsAPI } from '@/shared/types/electron-api';
import type { Session, SessionMetadata, SessionStatistics } from '@/shared/types/session';

export interface ChatStoreDependencies {
  electronAPI: {
    sessions: SessionsAPI;
  };
}

const DEFAULT_METADATA: SessionMetadata = {
  title: '',
  description: '',
  tags: [],
  category: undefined,
  difficulty: 'beginner',
  learningObjectives: [],
  topicsCovered: [],
  userId: undefined,
  archived: false,
  pinned: false,
  color: undefined,
  primaryAgentId: undefined,
  agentMode: undefined,
};

const DEFAULT_STATS: SessionStatistics = {
  totalMessages: 0,
  userMessages: 0,
  assistantMessages: 0,
  totalTokensUsed: 0,
  totalThinkingTokens: 0,
  sessionDuration: 0,
  averageResponseTime: 0,
  conceptsLearned: 0,
  checkpointsCreated: 0,
  productivityScore: 0,
  engagementScore: 0,
};

const normalizeSession = (partial: Partial<Session>): Session => ({
  id: partial.id ?? `session_${Date.now()}`,
  title: partial.title ?? 'Untitled Session',
  createdAt: partial.createdAt ?? new Date(),
  updatedAt: partial.updatedAt ?? new Date(),
  messages: partial.messages ?? [],
  metadata: { ...DEFAULT_METADATA, ...(partial.metadata ?? {}) },
  context: partial.context ?? {} as any,
  checkpoints: partial.checkpoints ?? [],
  statistics: { ...DEFAULT_STATS, ...(partial.statistics ?? {}) },
  agents: partial.agents ?? [],
  agent_states: partial.agent_states ?? [],
});

export interface ChatState {
  currentSessionId: string | null;
  currentSession: Session | null;
  currentAgent: string | null;
  setCurrentSession: (sessionId: string | null) => Promise<void>;
  setCurrentAgent: (agent: string | null) => void;
  updateCurrentSessionTitle: (title: string) => Promise<void>;
  resetChatState: () => void;
}

export function createChatStore(dependencies: ChatStoreDependencies) {
  const { sessions } = dependencies.electronAPI;

  return create<ChatState>()(
    subscribeWithSelector((set, get) => ({
      currentSessionId: null,
      currentSession: null,
      currentAgent: null,

      setCurrentSession: async (sessionId: string | null) => {
        if (!sessionId) {
          set({ currentSessionId: null, currentSession: null });
          return;
        }

        const response = await sessions.get(sessionId);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message ?? 'Failed to load session');
        }
        const session = normalizeSession(response.data as unknown as Session & { createdAt: string; updatedAt: string });
        set({ currentSessionId: session.id, currentSession: session });
      },

      setCurrentAgent: (agent) => set({ currentAgent: agent }),

      updateCurrentSessionTitle: async (title: string) => {
        const { currentSessionId, currentSession } = get();
        if (!currentSessionId) return;
        await sessions.update(currentSessionId, { title });
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              title,
              metadata: { ...currentSession.metadata, title },
            },
          });
        }
      },

      resetChatState: () => set({ currentSessionId: null, currentSession: null, currentAgent: null }),
    })),
  );
}
