/**
 * Base types for Electron API
 *
 * Common types shared across all API modules.
 */

import type { Message as AIMessage } from '../ai';

export type AISDKTextPart = { type: 'text'; text: string };

/**
 * Delta-only user input for Bucket 2 chat transport.
 * We intentionally keep this minimal: only text parts are supported today.
 */
export type AISDKNewUserMessage = string | { content?: string; parts?: AISDKTextPart[] };

export type AISDKStreamParams =
  | {
      /**
       * Stable thread id (maps to LangGraph `thread_id` / checkpoint namespace).
       */
      conversationId?: string;
      /**
       * Bucket 2: send only the new user message delta.
       */
      newUserMessage: AISDKNewUserMessage;
    }
  | {
      /**
       * Compatibility window (legacy Bucket 1): full history.
       * Main should prefer `newUserMessage` when present.
       */
      conversationId?: string;
      messages: Array<
        Pick<AIMessage, 'role' | 'content'> & {
          parts?: AISDKTextPart[];
          id?: string;
        }
      >;
    };

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIResponseError;
  code?: string;
}

export interface APIResponseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemReadyPayload {
  status: 'ready' | 'loading';
  ready: { ipcHandlersRegistered: boolean; startMs?: number };
}

export interface ConfigChangedPayload {
  changedKeys?: string[];
  config?: unknown;
  timestamp?: number;
}

export interface IPCError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const READY_TIMEOUT_MS = 5000;

export interface AISDKAPI {
  stream: (
    params: AISDKStreamParams,
    callback: (data: unknown) => void,
    onComplete?: () => void,
  ) => () => void;
}

// Missing conversation and message types
export interface ConversationDisplay {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface MessageDisplay {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
}

export interface TypingIndicator {
  isTyping: boolean;
  userId?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string;
  updatedAt: string;
}

export interface ConversationHistory {
  conversations: ConversationDisplay[];
  total: number;
}

export interface ConversationContext {
  sessionId: string;
  conversation: ConversationDisplay;
  messages: MessageDisplay[];
}

export interface PracticeOpportunityResult {
  id: string;
  concept: string;
  difficulty: string;
  completed: boolean;
}

export interface NaturalPracticeSuggestion {
  concept: string;
  suggestion: string;
  difficulty: string;
}

export interface UserLearningContext {
  currentSession?: string;
  recentConcepts: string[];
  progress: number;
}
