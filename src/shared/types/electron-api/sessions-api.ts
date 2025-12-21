import type {
  SessionSearchResult,
  SessionSearchQuery,
} from '../session';

import type { SessionUpdateRequest, SessionCreateRequest } from '../../../renderer/types/session';
import type { APIResponse } from './base';

/**
 * Display-ready session for lists
 */
export interface SessionDisplay {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  archived?: boolean;
  pinned?: boolean;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'active' | 'paused' | 'completed' | 'archived';
  progress?: number;
  duration?: number;
  agentType?: string;
}

export interface SessionStatistics {
  totalSessions: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalTokensUsed: number;
  averageMessagesPerSession: number;
}

export type SessionListResponse = APIResponse<{
  sessions: SessionDisplay[];
  total: number;
  hasMore: boolean;
}>;

export type SessionMutationResponse = APIResponse<{
  sessionId: string;
  session?: SessionDisplay;
}>;

export interface SessionsAPI {
  list: (options?: { query?: string; limit?: number; offset?: number }) => Promise<
    APIResponse<{
      sessions: SessionDisplay[];
      total: number;
      hasMore: boolean;
    }>
  >;
  create: (
    payload: SessionCreateRequest,
  ) => Promise<APIResponse<{ sessionId: string; session?: SessionDisplay }>>;
  get: (sessionId: string) => Promise<APIResponse<SessionDisplay | undefined>>;
  update: (
    sessionId: string,
    updates: SessionUpdateRequest,
  ) => Promise<APIResponse<SessionDisplay | undefined>>;
  delete: (sessionId: string) => Promise<APIResponse<{ deleted: boolean }>>;
  updateTitle: (sessionId: string, title: string) => Promise<APIResponse<void>>;
  getRecentSessions: (limit?: number) => Promise<APIResponse<SessionDisplay[]>>;
  getGlobalStatistics: () => Promise<SessionStatistics>;
  searchSessions: (query: string) => Promise<SessionDisplay[]>;
}
