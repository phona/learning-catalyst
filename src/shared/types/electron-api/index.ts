/**
 * Electron API Interfaces - 7-Domain Architecture
 *
 * This module provides the official 7-domain electronAPI structure with comprehensive
 * type safety and display-optimized interfaces for modern learning applications.
 *
 * The 7 domains are:
 * 1. Chat & Conversation API
 * 2. Learning & Sessions API
 * 3. Knowledge & Discovery API
 * 4. Analytics & Progress API
 * 5. Agent Management API
 * 6. Content & Discovery API
 * 7. Settings & Configuration API
 */

// Import individual API interfaces from the 8-domain structure
import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron';
import type { ChatAPI } from './chat-api';
import type { LearningAPI } from './learning-api';
import type { KnowledgeAPI } from './knowledge-api';
import type { AnalyticsAPI } from './analytics-api';
import type { AgentsAPI } from './agent-api';
import type { ContentAPI } from './content-api';
import type { SettingsAPI, SettingsUtility } from './settings-api';
import type { CatalystAPI } from './catalyst-api';
import type { SessionsAPI } from './sessions-api';
import type { DirectoryFilterConfig, DirectoryScanResult } from '../filesystem';
import type { IPCErrorPayload, BufferedIPCError } from '../ipc-error';
import type { AppConfig } from '../config'; // Re-export individual API interfaces
export type {
  ChatAPI,
  LearningAPI,
  KnowledgeAPI,
  AnalyticsAPI,
  AgentsAPI,
  ContentAPI,
  SettingsAPI,
  SessionsAPI,
  CatalystAPI,
};

// Export SettingsUtility interface for renderer consumption
export type { SettingsUtility } from './settings-api';

export type {
  ConversationHistory,
  ConversationContext,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext,
  ChatStatus,
  ChatStreamEvent,
  ErrorCategory,
  PromptHistoryItem,
  PromptSearchRequest,
  PromptSearchResponse,
  PromptRole,
} from './chat-api';
export type { AgentDisplay, AgentContext } from './agent-api';

// Re-export service response types
export type {
  ChatResponse,
  AgentsResponse,
  SessionResponse,
  ExecutionCancelResponse,
  ActiveExecution,
  StreamChunk,
} from './catalyst-api';

// Export key display-optimized types for convenience
export type {
  ConversationDisplay,
  MessageDisplay,
  AgentDisplay as ChatAgentDisplay,
  TypingIndicator,
  ConversationSummary,
} from './chat-api';

export type {
  LearningSessionDisplay,
  SessionDisplay,
  LearningProgressDisplay,
  AchievementDisplay,
  LearningPathDisplay,
} from './learning-api';

export type {
  ConceptExplorationDisplay,
  KnowledgeMapDisplay,
  RelatedConceptsDisplay,
  ExplanationDisplay,
  ExerciseDisplay,
} from './knowledge-api';

export type {
  DashboardDisplay,
  ProgressChartDisplay,
  AchievementDisplay as AnalyticsAchievementDisplay,
  UsageStatsDisplay,
  TokenUsageDisplay,
} from './analytics-api';

export type {
  AgentDisplay as ManagementAgentDisplay,
  AgentCapabilitiesDisplay,
  AgentSettings,
  FeatureDemoDisplay,
} from './agent-api';

export type {
  ContentRecommendationDisplay,
  ResourceSearchResultDisplay,
  DocumentAnalysisDisplay,
  ProjectDisplay,
  ImportResultDisplay,
} from './content-api';

export type { UserPreferencesDisplay, LearningSettingsDisplay } from './settings-api';
export type { ProviderConfig } from '../config';

/**
 * Main ElectronAPI interface - 8 Complete Domains
 *
 * This composite interface combines all 8 API domains to provide a unified
 * interface that matches the documented electronAPI specification.
 *
 * Features:
 * - Display-optimized types ready for UI consumption
 * - Comprehensive error handling and validation
 * - Streaming support for real-time interactions
 * - Progressive enhancement patterns
 * - Type-safe communication between processes
 */
export interface ElectronAPI {
  // 7 Complete API Domains
  chat: ChatAPI;
  learning: LearningAPI;
  knowledge: KnowledgeAPI;
  analytics: AnalyticsAPI;
  sessions: SessionsAPI;
  agents: AgentsAPI;
  content: ContentAPI;
  settings: SettingsAPI & SettingsUtility;
  awaitReady: (options?: { timeoutMs?: number }) => Promise<SystemReadyPayload>;
  awaitConfigChange: (options?: { timeoutMs?: number }) => Promise<ConfigChangedPayload>;
  getWorkspacePath: () => Promise<string>;
  readDirectory: (
    path: string,
    recursive?: boolean,
    maxDepth?: number,
    filterConfig?: DirectoryFilterConfig,
  ) => Promise<DirectoryScanResult[]>;
  readFile: (filePath: string, encoding?: BufferEncoding) => Promise<string>;
  writeFile: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<void>;
  existsFile: (filePath: string) => Promise<boolean>;
  showOpenDialog: (options?: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  showSaveDialog: (options?: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  onMenuAction: (handler: (action: string, data?: unknown) => void) => void;
  onIPCError: (handler: (payload: IPCErrorPayload) => void) => () => void;

  // Catalyst API for main process service communication
  catalyst: CatalystAPI;

  // Utility methods for better error handling and debugging

  /**
   * Centralized error handling and reporting
   * Logs errors to backend for debugging and analytics
   * @param error - Error object or message
   * @param context - Context where the error occurred
   * @param severity - 'info' | 'warning' | 'error' | 'critical'
   */
  handleError: (
    error: Error | string,
    context: string,
    severity?: 'info' | 'warning' | 'error' | 'critical',
  ) => void;

  /**
   * Checks API health and connectivity
   * Useful for debugging connection issues
   * @returns Promise<{ status: 'healthy' | 'degraded' | 'offline', apis: Object }>
   */
  healthCheck: () => Promise<{ status: 'healthy' | 'degraded' | 'offline'; apis: object }>;

  /**
   * Gets application version and build information
   * Useful for debugging and support
   * @returns Promise<{ version: string, build: string, platform: string }>
   */
  getVersion: () => Promise<{ version: string; build: string; platform: string }>;

  /**
   * Logs user interactions for analytics
   * Helps understand how users interact with the application
   * @param event - Event name and properties
   */
  trackEvent: (event: { name: string; properties?: object }) => Promise<void>;

  // System utilities
  getErrorBuffer: () => Promise<BufferedIPCError[]>;
  clearErrorBuffer: () => Promise<{ cleared: boolean }>;
  relaunchApp: () => Promise<{ relaunching: boolean }>;
}

export interface SystemReadyPayload {
  status: 'ready' | 'loading';
  ready: { ipcHandlersRegistered: boolean };
}

export interface ConfigChangedPayload {
  changedKeys?: string[];
  config?: Partial<AppConfig>;
  timestamp?: number;
}

export const READY_TIMEOUT_MS = 30000;

/**
 * Type helpers for dependency injection and testing
 */

/**
 * Create a partial ElectronAPI for testing or mocking
 */
export type PartialElectronAPI<T extends keyof ElectronAPI> = Pick<ElectronAPI, T>;

/**
 * Helper type for creating API mocks
 */
export type ElectronAPIMock = Partial<ElectronAPI>;

/**
 * Utility type for extracting specific API functionality
 */
export type ExtractAPI<T> = T extends keyof ElectronAPI ? Pick<ElectronAPI, T> : never;

/**
 * Type-safe API domain selector
 */
export type APIDomain =
  | 'chat'
  | 'learning'
  | 'knowledge'
  | 'analytics'
  | 'sessions'
  | 'agents'
  | 'content'
  | 'settings';

/**
 * API response types for consistent error handling
 * Error must be provided when success is false
 */
export type APIResponseError = {
  code: string;
  message: string;
  details?: unknown;
};

export type APIResponse<T = unknown> =
  | {
      success: true;
      data?: T;
      error?: never;
      metadata?: {
        timestamp: string;
        requestId: string;
        processingTime: number;
      };
    }
  | {
      success: false;
      error: APIResponseError;
      data?: never;
      metadata?: {
        timestamp: string;
        requestId: string;
        processingTime: number;
      };
    };
