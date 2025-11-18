import { generateSimpleTitle, generateSessionId as createSessionId } from '@/shared/utils/session-utils';
import type { ConversationMessage, MemorySession, SessionDisplay } from '@/shared/types/session';
import type { SessionStatistics, SessionListResponse } from '@/shared/types/electron-api/sessions-api';

type SessionsAPI = typeof window.electronAPI.sessions;

function ensureSessionsAPI(): SessionsAPI {
  if (!window?.electronAPI?.sessions) {
    throw new Error('Sessions API is not available. Ensure preload exposes sessions domain and the application is properly initialized.');
  }
  return window.electronAPI.sessions;
}

function assertSuccess<R extends { success: boolean; error?: string }>(response: R): asserts response is R & { success: true } {
  if (!response.success) {
    throw new Error(response.error || 'Session API request failed');
  }
}

/**
 * Wait for the sessions API to be available
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @param intervalMs - Interval to check availability
 */
async function waitForSessionsAPI(timeoutMs = 5000, intervalMs = 100): Promise<SessionsAPI> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (window?.electronAPI?.sessions) {
      return window.electronAPI.sessions;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Sessions API is not available. Ensure the application is properly initialized and Electron preload script is loaded.');
}

export class SessionService {
  /**
   * Persist all messages for a session via IPC
   */
  async saveSessionWithMessages(memorySession: MemorySession, messages: ConversationMessage[]): Promise<string> {
    const api = await waitForSessionsAPI(5000, 100);
    const response = await api.saveSessionWithMessages(memorySession, messages);
    assertSuccess(response);
    return response.sessionId || memorySession.id || createSessionId();
  }

  /**
   * Save a single message for streaming updates
   */
  async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    const api = await waitForSessionsAPI(5000, 100);
    const response = await api.saveMessage(sessionId, message);
    assertSuccess(response);
  }

  /**
   * Update the session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const api = await waitForSessionsAPI(5000, 100);
    const response = await api.updateTitle(sessionId, title);
    assertSuccess(response);
  }

  /**
   * Fetch recent sessions for the UI
   */
  async getRecentSessions(limit = 10): Promise<SessionDisplay[]> {
    // Use the more robust wait function to ensure API availability
    const api = await waitForSessionsAPI(5000, 100);
    const response = await api.getRecentSessions({ limit });
    assertSuccess(response);
    return response.sessions;
  }

  /**
   * Fetch global session statistics for dashboards
   */
  async getGlobalStatistics(): Promise<SessionStatistics> {
    const api = await waitForSessionsAPI(5000, 100);
    const response = await api.getStatistics();
    assertSuccess(response);
    return response.statistics;
  }

  /**
   * List sessions with optional filters
   */
  async listSessions(options?: { query?: string; limit?: number; offset?: number }): Promise<SessionListResponse> {
    const api = await waitForSessionsAPI(5000, 100);
    const response = await api.list(options);
    assertSuccess(response);
    return response;
  }

  /**
   * Generate a session title using heuristics (no IPC required)
   */
  async generateAITitle(userMessage: string): Promise<string> {
    return generateSimpleTitle(userMessage);
  }

  /**
   * Provide session identifiers compatible with previous implementation
   */
  generateSessionId(): string {
    return createSessionId();
  }
}

export const sessionService = new SessionService();
