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
import type { KnowledgeAPI } from './knowledge-api';
import type { AnalyticsAPI } from './analytics-api';
import type { AgentsAPI, ContentAPI } from './agent-api';


import type { SettingsAPI, SettingsUtility } from './settings-api';
import type { CatalystAPI } from './catalyst-api';
import type { Message as AIMessage } from '../ai';
import type { SessionsAPI } from './sessions-api';
import type { DirectoryFilterConfig, DirectoryScanResult } from '../filesystem';
import type { IPCErrorPayload, BufferedIPCError } from '../ipc-error';
import type { AppConfig } from '../config';
// Import base types to re-export
import type { SystemReadyPayload, ConfigChangedPayload, IPCError } from './base';
import type { AISDKAPI } from './base';

// Re-export base types
export type {
  SystemReadyPayload,
  ConfigChangedPayload,
  IPCError,
  APIResponse,
  APIResponseError,
  AISDKAPI,
  ConversationDisplay,
  MessageDisplay,
  TypingIndicator,
  ConversationSummary,
  ConversationHistory,
  ConversationContext,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext
} from './base';

// Re-export const value
export { READY_TIMEOUT_MS } from './base';

// Export API interfaces
export type { ChatAPI };
export type { KnowledgeAPI };
export type { AnalyticsAPI };
export type { AgentsAPI };
export type { ContentAPI };
export type { SettingsAPI, SettingsUtility };
export type { SessionsAPI };
export type { CatalystAPI };

// Export the main electronAPI interface
export interface ElectronAPI {
  // System events
  onceSystemReady: (callback: (payload: SystemReadyPayload) => void) => void;
  onConfigChanged: (callback: (payload: ConfigChangedPayload) => void) => void;
  awaitReady: (options?: { timeoutMs?: number }) => Promise<SystemReadyPayload>;

  // Chat domain
  chat: ChatAPI;

  // Knowledge domain
  knowledge: KnowledgeAPI;

  // Analytics domain
  analytics: AnalyticsAPI;

  // Agents domain
  agents: AgentsAPI;

  // Content domain
  content: ContentAPI;

  // Settings domain
  settings: SettingsAPI;

  // Sessions domain
  sessions: SessionsAPI;

  // Catalyst domain
  catalyst: CatalystAPI;

  // AI SDK streaming
  aiSDK: AISDKAPI;

  // File operations
  openFile: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  saveFile: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  showDirectoryDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  existsFile: (filePath: string) => Promise<boolean>;
  readDirectory: (dirPath: string, recursive?: boolean, maxDepth?: number, filterConfig?: DirectoryFilterConfig) => Promise<any[]>;
  getWorkspacePath: () => Promise<string | null>;

  // Error handling
  onIPCError: (handler: (payload: IPCErrorPayload) => void) => () => void;
  getErrorBuffer: () => Promise<BufferedIPCError[]>;
  clearErrorBuffer: () => Promise<{ cleared: boolean }>;

  // System utilities
  handleError: (error: Error | string, context: string, severity?: string) => void;
  healthCheck: () => Promise<{ status: 'healthy' | 'degraded' | 'offline'; apis: Record<string, unknown> }>;
  getVersion: () => Promise<{ version: string; build: string; platform: string }>;
  trackEvent: (event: { name: string; properties?: object }) => Promise<void>;
  relaunchApp: () => Promise<{ relaunching: boolean }>;
  awaitConfigChange: (options?: { timeoutMs?: number }) => Promise<ConfigChangedPayload>;
  onMenuAction: (handler: (action: string, data?: unknown) => void) => () => void;
}

