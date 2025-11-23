/**
 * Display-optimized type definitions for UI layer
 * Exports all types that are optimized for frontend display
 */

// Core display types
export type {
  SessionDisplay,
  SessionListDisplay,
  SessionSearchFilters,
  SessionCreateRequest,
  SessionUpdateRequest,
} from './session';
export type {
  MessageDisplay,
  MessageListDisplay,
  MessageSendRequest,
  MessageAttachment,
  MessageReaction,
  ToolCallDisplay,
  MessageStreamChunk,
  MessageMetadata,
} from './message';
export type {
  AgentDisplay,
  AgentListDisplay,
  AgentCategory,
  AgentSelectRequest,
  AgentStatusDisplay,
  AgentPerformanceMetrics,
  AgentSettings,
  DEFAULT_AGENT_CATEGORIES,
  DEFAULT_AGENT_SETTINGS,
} from './agent';
export type {
  KnowledgeNodeDisplay,
  KnowledgeEdgeDisplay,
  KnowledgeGraphDisplay,
  GraphLayout,
  KnowledgeSearchResult,
  KnowledgePathDisplay,
  ConceptMasteryDisplay,
  KnowledgeFilters,
  KnowledgeInteractionDisplay,
  KNOWLEDGE_NODE_COLORS,
  KNOWLEDGE_EDGE_TYPES,
} from './knowledge';

// Legacy UI types (for compatibility during migration)
export type {
  UIState,
  ChatUIState,
  MenuItem,
  KeyboardShortcut,
  Theme,
  NotificationData,
  ModalProps,
  ToastProps,
} from './ui';

// Common display utilities
export interface PaginationDisplay {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LoadingDisplay {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

/**
 * Error details structure for comprehensive error reporting
 */
export interface ErrorDetails {
  field?: string; // Which field or property caused the error
  value?: unknown; // The problematic value that caused the error
  context?: Record<string, unknown>; // Additional context information
  stack?: string; // Error stack trace (if available)
  timestamp?: string; // When the error occurred
}

export interface ErrorDisplay {
  hasError: boolean;
  message: string;
  code?: string;
  details?: ErrorDetails;
  canRetry?: boolean;
}

export interface SearchDisplay<T> {
  results: T[];
  query: string;
  total: number;
  hasMore: boolean;
  loading?: boolean;
}
