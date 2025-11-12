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

export interface SessionStatistics {
  totalSessions: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalTokensUsed: number;
  averageMessagesPerSession: number;
}

export interface SessionListResponse {
  success: boolean;
  sessions: SessionDisplay[];
  total: number;
  hasMore: boolean;
  error?: string;
}

export interface SessionMutationResponse {
  success: boolean;
  sessionId?: string;
  session?: SessionDisplay;
  error?: string;
}

export interface SessionsAPI {
  list: (options?: { query?: string; limit?: number; offset?: number }) => Promise<SessionListResponse>;
  create: (payload: SessionCreateRequest) => Promise<SessionMutationResponse>;
  get: (sessionId: string) => Promise<{ success: boolean; session?: SessionDisplay; error?: string }>;
  update: (
    sessionId: string,
    updates: SessionUpdateRequest
  ) => Promise<{ success: boolean; session?: SessionDisplay; error?: string }>;
  delete: (sessionId: string) => Promise<{ success: boolean; deleted?: boolean; error?: string }>;
  saveMessage: (
    sessionId: string,
    message: ConversationMessage
  ) => Promise<{ success: boolean; error?: string }>;
  saveSessionWithMessages: (
    session: MemorySession,
    messages: ConversationMessage[]
  ) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  updateTitle: (sessionId: string, title: string) => Promise<{ success: boolean; error?: string }>;
  getRecentSessions: (options?: { limit?: number }) => Promise<{ success: boolean; sessions: SessionDisplay[]; error?: string }>;
  search: (query: SessionSearchQuery) => Promise<{ success: boolean; results: SessionSearchResult; error?: string }>;
  getStatistics: () => Promise<{ success: boolean; statistics: SessionStatistics; error?: string }>;
}
