import { createSessionId as _createSessionId } from '@/shared/utils/helpers';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';
import type {
  SessionStatistics,
  SessionListResponse,
  SessionListData,
} from '@/shared/types/electron-api/sessions-api';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { SessionDisplay } from '@/shared/types/electron-api/sessions-api';
import type { SessionCreateRequest } from '@/renderer/types/session';

/**
 * This service uses the unwrapAPI pattern for consistent IPC error handling.
 *
 * All IPC calls use unwrapAPI() from @/renderer/hooks/useElectronAPI which:
 * - Automatically unwraps APIResponse<T> to T
 * - Shows error toasts on failures
 * - Throws IPCError for programmatic error handling
 *
 * See docs/DEVELOPER-GUIDE/electron-api.md for details.
 */

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
    await unwrapAPI(apiClient.sessions.updateTitle(sessionId, title));
  };

  /**
   * Fetch recent sessions for the UI
   */
  const getRecentSessions = async (limit = 10): Promise<SessionDisplay[]> => {
    await apiClient.awaitReady();
    const data = await unwrapAPI(apiClient.sessions.getRecentSessions(limit));
    return data || [];
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
    const data = await unwrapAPI(apiClient.sessions.list(options));

    return (
      data ?? {
        sessions: [],
        total: 0,
        hasMore: false,
      }
    );
  };

  const getSession = async (sessionId: string): Promise<SessionDisplay | null> => {
    console.log('[SessionService] getSession request', { sessionId });
    try {
      const data = await unwrapAPI(apiClient.sessions.get(sessionId));
      console.log('[SessionService] getSession success', { sessionId });
      return data as SessionDisplay;
    } catch (error) {
      console.warn('[SessionService] getSession not found or failed', {
        sessionId,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  };

  const createSession = async (payload: SessionCreateRequest): Promise<SessionDisplay> => {
    console.log('[SessionService] createSession request', { title: payload?.title });
    try {
      const data = await unwrapAPI(apiClient.sessions.create(payload));

      // Fetch full session details if returned
      if (data.session) {
        console.log('[SessionService] createSession returned full session');
        return data.session as SessionDisplay;
      }

      const created = await getSession(data.sessionId);
      if (!created) {
        // Fallback minimal structure
        console.log('[SessionService] createSession fallback minimal record', {
          id: data.sessionId,
        });
        return {
          id: data.sessionId,
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
    } catch (error) {
      console.warn('[SessionService] createSession failed', {
        error: error instanceof Error ? error.message : error,
      });
      throw new Error(error instanceof Error ? error.message : 'Session API request failed');
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    await unwrapAPI(apiClient.sessions.delete(sessionId));
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
      return await apiClient.sessions.getGlobalStatistics();
    },
    searchSessions: async (query: string, filters?: Record<string, unknown>): Promise<SessionListData> => {
      const response = await apiClient.sessions.searchSessions(query);
      return {
        sessions: response,
        total: response.length,
        hasMore: false,
      };
    },
  };
};
