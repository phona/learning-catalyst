
import { generateSimpleTitle, generateSessionId as createSessionId } from '@/shared/utils/session-utils';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';
import type { SessionStatistics, SessionListResponse } from '@/shared/types/electron-api/sessions-api';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';

export interface SessionService {
  saveSessionWithMessages(session: MemorySession, messages: ConversationMessage[]): Promise<string>;
  getRecentSessions(limit?: number): Promise<SessionDisplay[]>;
  getGlobalStatistics(): Promise<SessionStatistics>;
  listSessions(options?: { query?: string; limit?: number; offset?: number }): Promise<SessionListResponse>;
  generateAITitle(userMessage: string): Promise<string>;
  generateSessionId(): string;
  saveMessage(sessionId: string, message: ConversationMessage): Promise<void>;
  updateSessionTitle(sessionId: string, title: string): Promise<void>;
}

/**
 * Functional implementation of session service using the unified electronAPI client
 */
export const createSessionService = (apiClient: ElectronAPI): SessionService => {
  /**
   * Persist all messages for a session via IPC
   */
  const saveSessionWithMessages = async (
    memorySession: MemorySession,
    messages: ConversationMessage[]
  ): Promise<string> => {
    const response = await apiClient.sessions.saveSessionWithMessages(memorySession, messages);

    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }

    return response.sessionId || memorySession.id || createSessionId();
  };

  /**
   * Save a single message for streaming updates
   */
  const saveMessage = async (sessionId: string, message: ConversationMessage): Promise<void> => {
    const response = await apiClient.sessions.saveMessage(sessionId, message);

    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
  };

  /**
   * Update the session title
   */
  const updateSessionTitle = async (sessionId: string, title: string): Promise<void> => {
    const response = await apiClient.sessions.updateTitle(sessionId, title);

    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
  };

  /**
   * Fetch recent sessions for the UI
   */
  const getRecentSessions = async (limit = 10): Promise<SessionDisplay[]> => {
    const response = await apiClient.sessions.getRecentSessions({ limit });

    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }

    return response.sessions;
  };

  /**
   * Fetch global session statistics for dashboards
   */
  const getGlobalStatistics = async (): Promise<SessionStatistics> => {
    const response = await apiClient.sessions.getStatistics();

    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }

    return response.statistics;
  };

  /**
   * List sessions with optional filters
   */
  const listSessions = async (
    options?: { query?: string; limit?: number; offset?: number }
  ): Promise<SessionListResponse> => {
    const response = await apiClient.sessions.list(options);

    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }

    return response;
  };

  /**
   * Generate a session title using heuristics (no IPC required)
   */
  const generateAITitle = async (userMessage: string): Promise<string> => {
    return generateSimpleTitle(userMessage);
  };

  /**
   * Provide session identifiers compatible with previous implementation
   */
  const generateSessionId = (): string => {
    return createSessionId();
  };

  return {
    saveSessionWithMessages,
    getRecentSessions,
    getGlobalStatistics,
    listSessions,
    generateAITitle,
    generateSessionId,
    saveMessage,
    updateSessionTitle,
  };
};
