/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




import { generateSimpleTitle, generateSessionId as createSessionId } from '@/shared/utils/session-utils';
import type { ConversationMessage, MemorySession } from '@/shared/types/session';
import type { SessionStatistics, SessionListResponse } from '@/shared/types/electron-api/sessions-api';
import type { ElectronAPIClient } from '../api/electron-api-client';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';

export interface SessionService {
  saveSessionWithMessages(session: MemorySession, messages: ConversationMessage[]): Promise<string>;
  getRecentSessions(limit?: number): Promise<SessionDisplay[]>;
  getGlobalStatistics(): Promise<SessionStatistics>;
  listSessions(options?: { query?: string; limit?: number; offset?: number }): Promise<SessionListResponse>;
  generateAITitle(userMessage: string): Promise<string>;
  generateSessionId(): string;
}

/**
 * Clean implementation of session service using the unified electronAPI client
 */
export class DefaultSessionService implements SessionService {
  constructor(private readonly apiClient: ElectronAPIClient) {}

  /**
   * Persist all messages for a session via IPC
   */
  async saveSessionWithMessages(memorySession: MemorySession, messages: ConversationMessage[]): Promise<string> {
    const response = await this.apiClient.sessions.saveSessionWithMessages(memorySession, messages);
    
    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
    
    return response.sessionId || memorySession.id || createSessionId();
  }

  /**
   * Save a single message for streaming updates
   */
  async saveMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    const response = await this.apiClient.sessions.saveMessage(sessionId, message);
    
    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
  }

  /**
   * Update the session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const response = await this.apiClient.sessions.updateTitle(sessionId, title);
    
    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
  }

  /**
   * Fetch recent sessions for the UI
   */
  async getRecentSessions(limit = 10): Promise<SessionDisplay[]> {
    const response = await this.apiClient.sessions.getRecentSessions({ limit });
    
    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
    
    return response.sessions;
  }

  /**
   * Fetch global session statistics for dashboards
   */
  async getGlobalStatistics(): Promise<SessionStatistics> {
    const response = await this.apiClient.sessions.getStatistics();
    
    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
    
    return response.statistics;
  }

  /**
   * List sessions with optional filters
   */
  async listSessions(options?: { query?: string; limit?: number; offset?: number }): Promise<SessionListResponse> {
    const response = await this.apiClient.sessions.list(options);
    
    if (!response.success) {
      throw new Error(response.error || 'Session API request failed');
    }
    
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