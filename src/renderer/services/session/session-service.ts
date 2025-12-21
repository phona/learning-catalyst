import { createSessionId as _createSessionId } from '@/shared/utils/helpers';
import type {
  SessionStatistics,
  SessionListResponse,
} from '@/shared/types/electron-api/sessions-api';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { SessionDisplay } from '@/shared/types/electron-api/sessions-api';
import type { SessionCreateRequest } from '@/renderer/types/session';

export interface SessionService {
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
   * Update the session title
   */
  const updateSessionTitle = async (sessionId: string, title: string): Promise<void> => {
    const response = await apiClient.sessions.updateTitle(sessionId, title);

    if (!response.success) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Session API request failed');
    }
  };

  /**
   * Fetch recent sessions for the UI
   */
  const getRecentSessions = async (limit = 10): Promise<SessionDisplay[]> => {
    await apiClient.awaitReady();
    const response = await apiClient.sessions.getRecentSessions(limit);

    if (!response.success) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Session API request failed');
    }

    const data = response.data || [];
    return data;
  };

  /**
   * Fetch global session statistics for dashboards
   * TODO: Implement when getStatistics API is available
   */
  // const getGlobalStatistics = async (): Promise<SessionStatistics> => {
  //   const response = await apiClient.sessions.getStatistics();
  //
  //   if (!response.success) {
  //     throw new Error(typeof response.error === 'string' ? response.error : 'Session API request failed');
  //   }
  //
  //   return response.data as SessionStatistics;
  // };

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
      throw new Error(typeof response.error === 'string' ? response.error : 'Session API request failed');
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
    console.log('[SessionService] getSession request', { sessionId });
    const response = await apiClient.sessions.get(sessionId);
    if (!response.success || !response.data) {
      console.warn('[SessionService] getSession not found or failed', {
        sessionId,
        success: response.success,
      });
      return null;
    }
    console.log('[SessionService] getSession success', { sessionId });
    return response.data as SessionDisplay;
  };

  const createSession = async (payload: SessionCreateRequest): Promise<SessionDisplay> => {
    console.log('[SessionService] createSession request', { title: payload?.title });
    const response = await apiClient.sessions.create(payload);
    if (!response.success || !response.data?.sessionId) {
      console.warn('[SessionService] createSession failed', {
        error: response.error,
      });
      throw new Error(typeof response.error === 'string' ? response.error : 'Session API request failed');
    }

    // Fetch full session details if returned
    if (response.data.session) {
      console.log('[SessionService] createSession returned full session');
      return response.data.session as SessionDisplay;
    }

    const created = await getSession(response.data.sessionId);
    if (!created) {
      // Fallback minimal structure
      console.log('[SessionService] createSession fallback minimal record', {
        id: response.data.sessionId,
      });
      return {
        id: response.data.sessionId,
        title: payload.title,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      } as unknown as SessionDisplay;
    }
    console.log('[SessionService] createSession fetched full record', {
      id: created.id,
      title: (created as any)?.title,
    });
    return created;
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    const response = await apiClient.sessions.delete(sessionId);
    if (!response.success) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Session delete failed');
    }
  };

  // const searchSessions = async (
//     query: string,
//     filters?: Record<string, unknown>,
//   ): Promise<SessionListData> => {
//     // TODO: Implement when search API is available
//     // For now, use the list method with query filter
//     const response = await apiClient.sessions.list({ query, limit: 50 });
//     if (!response.success) {
//       throw new Error(typeof response.error === 'string' ? response.error : 'Session search failed');
//     }
//     const data = response.data;
//
//     return {
//       sessions: data?.sessions ?? [],
//       total: data?.total ?? 0,
//       hasMore: data?.hasMore ?? false,
//     };
//   };

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
    getRecentSessions,
    listSessions,
    getSession,
    generateAITitle,
    generateSessionId,
    updateSessionTitle,
    createSession,
    deleteSession,
    getGlobalStatistics: async (): Promise<SessionStatistics> => {
      const response = await unwrapAPI(electronAPI.sessions.getGlobalStatistics());
      return response;
    },
    searchSessions: async (query: string): Promise<SessionDisplay[]> => {
      const response = await unwrapAPI(electronAPI.sessions.searchSessions(query));
      return response;
    },
  };
};
