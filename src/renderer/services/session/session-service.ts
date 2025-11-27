import { createSessionId as _createSessionId } from '@/shared/utils/helpers';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';
import type {
  SessionStatistics,
  SessionListResponse,
} from '@/shared/types/electron-api/sessions-api';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type { SessionCreateRequest } from '@/renderer/types/session';

export interface SessionService {
  saveSessionWithMessages(session: MemorySession, messages: ConversationMessage[]): Promise<string>;
  getRecentSessions(limit?: number): Promise<SessionDisplay[]>;
  getGlobalStatistics(): Promise<SessionStatistics>;
  listSessions(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionListData>;
  getSession(sessionId: string): Promise<SessionDisplay | null>;
  generateAITitle(userMessage: string, provider?: string, model?: string): Promise<string>;
  generateSessionId(): string;
  saveMessage(sessionId: string, message: ConversationMessage): Promise<void>;
  updateSessionTitle(sessionId: string, title: string): Promise<void>;
  createSession(payload: SessionCreateRequest): Promise<SessionDisplay>;
  deleteSession(sessionId: string): Promise<void>;
  searchSessions(query: string, filters?: Record<string, unknown>): Promise<SessionListData>;
}

type SessionListData = {
  sessions: SessionDisplay[];
  total: number;
  hasMore: boolean;
};

/**
 * Functional implementation of session service using the unified electronAPI client
 */
export const createSessionService = (apiClient: ElectronAPI): SessionService => {
  const generateSimpleTitle = (text: string): string => {
    const clean = (text || '').trim().replace(/\s+/g, ' ');
    if (!clean) return 'New Session';
    const words = clean.split(' ');
    const title = words.slice(0, 8).join(' ');
    return title.length > 0 ? title : 'New Session';
  };
  /**
   * Persist all messages for a session via IPC
   */
  const saveSessionWithMessages = async (
    memorySession: MemorySession,
    messages: ConversationMessage[],
  ): Promise<string> => {
    const response = await apiClient.sessions.saveSessionWithMessages(memorySession, messages);

    if (!response.success) {
      throw new Error(response.error?.message || 'Session API request failed');
    }

    return response.data?.sessionId || memorySession.id || _createSessionId();
  };

  /**
   * Save a single message for streaming updates
   */
  const saveMessage = async (sessionId: string, message: ConversationMessage): Promise<void> => {
    const response = await apiClient.sessions.saveMessage(sessionId, message);

    if (!response.success) {
      throw new Error(response.error?.message || 'Session API request failed');
    }
  };

  /**
   * Update the session title
   */
  const updateSessionTitle = async (sessionId: string, title: string): Promise<void> => {
    const response = await apiClient.sessions.updateTitle(sessionId, title);

    if (!response.success) {
      throw new Error(response.error?.message || 'Session API request failed');
    }
  };

  /**
   * Fetch recent sessions for the UI
   */
  const getRecentSessions = async (limit = 10): Promise<SessionDisplay[]> => {
    await apiClient.awaitReady();
    const response = await apiClient.sessions.getRecentSessions({ limit });

    if (!response.success) {
      throw new Error(response.error?.message || 'Session API request failed');
    }

    return response.data || [];
  };

  /**
   * Fetch global session statistics for dashboards
   */
  const getGlobalStatistics = async (): Promise<SessionStatistics> => {
    const response = await apiClient.sessions.getStatistics();

    if (!response.success) {
      throw new Error(response.error?.message || 'Session API request failed');
    }

    return response.data as SessionStatistics;
  };

  /**
   * List sessions with optional filters
   */
  const listSessions = async (options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionListData> => {
    const response = await apiClient.sessions.list(options);

    if (!response.success) {
      throw new Error(response.error?.message || 'Session API request failed');
    }

    return (
      response.data ?? {
        sessions: [],
        total: 0,
        hasMore: false,
      }
    );
  };

  const getSession = async (sessionId: string): Promise<SessionDisplay | null> => {
    const response = await apiClient.sessions.get(sessionId);
    if (!response.success || !response.data) {
      return null;
    }
    return response.data as SessionDisplay;
  };

  const createSession = async (payload: SessionCreateRequest): Promise<SessionDisplay> => {
    const response = await apiClient.sessions.create(payload);
    if (!response.success || !response.data?.sessionId) {
      throw new Error(response.error?.message || 'Session API request failed');
    }

    // Fetch full session details if returned
    if (response.data.session) {
      return response.data.session as SessionDisplay;
    }

    const created = await getSession(response.data.sessionId);
    if (!created) {
      // Fallback minimal structure
      return {
        id: response.data.sessionId,
        title: payload.title,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      } as unknown as SessionDisplay;
    }
    return created;
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    const response = await apiClient.sessions.delete(sessionId);
    if (!response.success) {
      throw new Error(response.error?.message || 'Session delete failed');
    }
  };

  const searchSessions = async (
    query: string,
    filters?: Record<string, unknown>,
  ): Promise<SessionListData> => {
    const response = await apiClient.sessions.search({ query, ...(filters ?? {}) });
    if (!response.success) {
      throw new Error(response.error?.message || 'Session search failed');
    }
    const data = response.data as
      | Partial<{
          sessions: SessionDisplay[];
          total: number;
          hasMore: boolean;
        }>
      | undefined;

    return {
      sessions: data?.sessions ?? [],
      total: data?.total ?? 0,
      hasMore: data?.hasMore ?? false,
    };
  };

  /**
   * Generate a session title using heuristics (no IPC required)
   */
  const generateAITitle = async (
    userMessage: string,
    _provider?: string,
    _model?: string,
  ): Promise<string> => {
    return generateSimpleTitle(userMessage);
  };

  /**
   * Provide session identifiers compatible with previous implementation
   */
  const generateSessionId = (): string => {
    return _createSessionId();
  };

  return {
    saveSessionWithMessages,
    getRecentSessions,
    getGlobalStatistics,
    listSessions,
    getSession,
    generateAITitle,
    generateSessionId,
    saveMessage,
    updateSessionTitle,
    createSession,
    deleteSession,
    searchSessions,
  };
};
