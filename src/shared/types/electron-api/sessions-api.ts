import type {
  SessionSearchResult,
  SessionSearchQuery,
  MemorySession,
  ConversationMessage
} from '@/shared/types/session';

import type {
  SessionDisplay
} from './learning-api';

import type {
  SessionUpdateRequest,
  SessionCreateRequest
} from '@/renderer/types/session';
import type { APIResponse } from './index';

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
  list: (options?: { query?: string; limit?: number; offset?: number }) => Promise<APIResponse<{
    sessions: SessionDisplay[];
    total: number;
    hasMore: boolean;
  }>>;
  create: (payload: SessionCreateRequest) => Promise<APIResponse<{ sessionId: string; session?: SessionDisplay }>>;
  get: (sessionId: string) => Promise<APIResponse<SessionDisplay | undefined>>;
  update: (
    sessionId: string,
    updates: SessionUpdateRequest
  ) => Promise<APIResponse<SessionDisplay | undefined>>;
  delete: (sessionId: string) => Promise<APIResponse<{ deleted: boolean }>>;
  saveMessage: (
    sessionId: string,
    message: ConversationMessage
  ) => Promise<APIResponse<void>>;
  saveSessionWithMessages: (
    session: MemorySession,
    messages: ConversationMessage[]
  ) => Promise<APIResponse<{ sessionId: string }>>;
  updateTitle: (sessionId: string, title: string) => Promise<APIResponse<void>>;
  getRecentSessions: (options?: { limit?: number }) => Promise<APIResponse<SessionDisplay[]>>;
  search: (query: SessionSearchQuery) => Promise<APIResponse<SessionSearchResult>>;
  getStatistics: () => Promise<APIResponse<SessionStatistics>>;
}
