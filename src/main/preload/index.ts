/**
 * Complete 7-Domain electronAPI Implementation
 *
 * This file implements the official electronAPI specification with all 7 domains:
 * 1. Chat & Conversation API
 * 2. Learning & Sessions API
 * 3. Knowledge & Discovery API
 * 4. Analytics & Progress API
 * 5. Agent Management API
 * 6. Content & Discovery API
 * 7. Settings & Configuration API
 *
 * Replaces the previous implementation to align with official specification.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_EVENTS } from '@/shared/types/ipc';
import type {
  SystemReadyPayload,
  ConfigChangedPayload,
  AISDKAPI,
} from '@/shared/types/electron-api';
import type { IpcRendererEvent } from 'electron';
import {
  ElectronAPI,
  ChatAPI,
  KnowledgeAPI,
  AnalyticsAPI,
  SettingsAPI,
  SettingsUtility,
  SessionsAPI,
  CatalystAPI,
} from '@/shared/types/electron-api';
import type {
  ConceptParsingResult,
  ConceptIngestionPlan,
} from '@/shared/types/electron-api/knowledge-api';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { IPC_ERROR_CHANNEL } from '@/shared/types/ipc-error';
import type { AppConfig } from '@/shared/types/config';
import { Chan } from 'ts-chan';
import type { Message as AIMessage } from '@/shared/types/ai';
import { SessionSearchQuery } from '@/shared/types';

// ============================================================================
// 1. Chat & Conversation API
// ============================================================================

/**
 * Chat API
 *
 * Provides methods for generating session titles and streaming AI conversations.
 */
const chatAPI: ChatAPI = {
  /**
   * Generate session title asynchronously with AI
   * Updates the database with the generated title
   */
  generateTitle: async (messageText: string) => 
    ipcRenderer.invoke('chat:generate-title', messageText),

  /**
   * Get complete message history for a chat session
   */
  getMessages: async (threadId: string, options?: { limit?: number; offset?: number }) =>
    ipcRenderer.invoke('chat:get-messages', threadId, options),
};

/**
 * AI SDK bridge for Assistant UI
 * Returns a MessagePort that streams AI SDK protocol chunks from the main process.
 */
const aiSDK: AISDKAPI = {
  stream: (
    params,
    callback: (data: unknown) => void,
    onComplete?: () => void,
  ) => {
    const { port1, port2 } = new MessageChannel();
    const streamId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let cancelRequested = false;

    console.log('[Preload] DEBUG - params:', JSON.stringify(params, null, 2));
    console.log('[Preload] Creating stream interface:', streamId);

    ipcRenderer.postMessage('chat:start-stream', { streamId, ...params }, [port2]);

    port1.onmessage = (event) => {
      callback(event.data);
    };
    // @ts-expect-error - onclose exists but not in type definition
    port1.onclose = () => {
      console.log('[Preload] Stream ended:', streamId);
      onComplete?.();
    };

    return () => {
      if (cancelRequested) return;
      cancelRequested = true;
      ipcRenderer.send('chat:cancel-stream', { streamId });
      port1.close();
    };
  },
};

// 3. Knowledge & Discovery API
// ============================================================================

/**
 * Knowledge & Discovery API
 *
 * Provides access to the knowledge graph and learning content discovery.
 * Focuses on conceptual understanding and knowledge exploration.
 */
const knowledgeAPI: KnowledgeAPI = {
  /**
   * Explores a concept in detail with related information
   * Provides comprehensive concept analysis for learning
   * @param params.conceptName - Name of the concept to explore
   * @param params.depth - 'basic' | 'intermediate' | 'advanced' - depth of exploration
   * @returns Promise<ConceptExplorationDisplay> - Detailed concept information
   */
  exploreConcept: (params: { conceptName: string; depth: 'basic' | 'intermediate' | 'advanced' }) =>
    ipcRenderer.invoke('knowledge:explore-concept', params),

  /**
   * Gets concepts related to a given concept
   * Useful for knowledge graph navigation and discovery
   * @param conceptId - ID of the concept to find relations for
   * @returns Promise<RelatedConceptsDisplay> - Array of related concepts with relationships
   */
  getRelatedConcepts: (conceptId: string) =>
    ipcRenderer.invoke('knowledge:get-related-concepts', conceptId),

  /**
   * Gets knowledge map data for visualization
   * Returns structured data for knowledge graph rendering
   * @param sessionId - Optional session ID to focus on session-specific knowledge
   * @returns Promise<KnowledgeMapDisplay> - Knowledge graph data for visualization
   */
  getKnowledgeMap: (sessionId?: string) => ipcRenderer.invoke('knowledge:get-map', sessionId),

  /**
   * Searches the knowledge base for specific content
   * Supports natural language queries and semantic search
   * @param query - Search query string
   * @returns Promise<KnowledgeSearchResultDisplay> - Search results with relevance scores
   */
  searchKnowledge: (query: string) => ipcRenderer.invoke('knowledge:search', query),

  /**
   * Parses uploaded materials into concepts and relationships
   * Splits documents by headings/paragraphs, sends each segment through LangChain, and vectors the parsed chunks for semantic search.
   * @param params - Payload containing files/content and parsing options (confidenceThreshold, maxConceptsPerFile)
   * @returns Promise<ConceptParsingResult> - Normalized parsing result with statistics
   */
  parseConcepts: (params: {
    files?: Array<{
      fileName?: string;
      filePath?: string;
      title?: string;
      content: string;
      format?: 'markdown' | 'text';
      metadata?: Record<string, unknown>;
    }>;
    content?: string;
    jobId?: string;
    resume?: boolean;
    options?: {
      confidenceThreshold?: number;
      maxConceptsPerFile?: number;
    };
    userId?: string;
  }) => ipcRenderer.invoke('knowledge:parse-concepts', params),

  /**
   * Clears persisted parsing job cache on disk
   */
  clearParsingJobs: () => ipcRenderer.invoke('knowledge:clear-parsing-jobs'),

  /**
   * Ingests a previously parsed result into the knowledge graph
   * @param params.result - Result returned by parseConcepts
   * @param params.options - Optional metadata for ingestion
   */
  ingestConcepts: (params: {
    result: ConceptParsingResult;
    plan?: ConceptIngestionPlan;
    options?: {
      userId?: string;
      materialId?: string;
      sessionId?: string;
      source?: string;
    };
  }) => ipcRenderer.invoke('knowledge:ingest-concepts', params),
};

// ============================================================================
// 4. Analytics & Progress API
// ============================================================================

/**
 * Analytics & Progress API
 *
 * Provides comprehensive learning analytics and progress tracking.
 * Focuses on motivation through achievement and progress visualization.
 */
const analyticsAPI: AnalyticsAPI = {
  getDashboard: () => ipcRenderer.invoke('analytics:get-dashboard'),

  getProgressChart: (params: {
    timeRange: '7days' | '30days' | '90days' | '1year';
    topic?: string | null;
    metric: 'mastery' | 'sessions' | 'time' | 'concepts';
    conceptIds?: string[];
    includeGoal?: boolean;
  }) => ipcRenderer.invoke('analytics:get-progress-chart', params),

  /**
   * Gets all user achievements and milestones
   * Returns achievements with completion status and metadata
   * @returns Promise<AchievementDisplay[]> - Array of achievements
   */
  getAchievements: () => ipcRenderer.invoke('analytics:get-achievements'),

  /**
   * Unlocks an achievement and handles rewards
   * Called when user meets achievement criteria
   * @param achievementId - ID of the achievement to unlock
   * @returns Promise<{ success: boolean; reward?: AchievementReward }>
   */
  unlockAchievement: (achievementId: string) =>
    ipcRenderer.invoke('analytics:unlock-achievement', achievementId),

  getUsageStats: (params: {
    timeRange: '7days' | '30days' | '90days' | '1year';
    includePatterns?: boolean;
    includeEngagement?: boolean;
  }) => ipcRenderer.invoke('analytics:get-usage-stats', params),

  getTokenUsage: (params: {
    timeRange: '7days' | '30days' | '90days' | '1year';
    includeByProvider?: boolean;
    includeByFeature?: boolean;
    includeProjections?: boolean;
  }) => ipcRenderer.invoke('analytics:get-token-usage', params),

  /**
   * Tracks a learning session
   * Creates or updates a learning session record
   * @param session - Session data to track
   * @returns Promise<string> - Session ID
   */
  trackSession: (session: unknown) => ipcRenderer.invoke('analytics:track-session', session),

  /**
   * Updates concept progress
   * Records progress updates for specific concepts
   * @param conceptId - ID of the concept
   * @param update - Progress update data
   * @returns Promise<void> - Update confirmation
   */
  updateConceptProgress: (conceptId: string, update: unknown) =>
    ipcRenderer.invoke('analytics:update-concept-progress', conceptId, update),

  exportData: (params: { format: 'json' | 'csv'; include?: string[] }) =>
    ipcRenderer.invoke('analytics:export-data', params),

  importData: (params: {
    data: string;
    format: 'json' | 'csv';
    overwrite?: boolean;
    validateOnly?: boolean;
  }) => ipcRenderer.invoke('analytics:import-data', params),

  /**
   * Gets concept progress details
   * Returns detailed progress information for a specific concept
   * @param conceptId - ID of the concept
   * @returns Promise<APIResponse<ConceptProgressDisplay>> - Concept progress data
   */
  getConceptProgress: (conceptId: string) =>
    ipcRenderer.invoke('analytics:get-concept-progress', conceptId),

  /**
   * Gets session history
   * Returns paginated list of learning sessions
   * @param params - Session history request parameters
   * @returns Promise<APIResponse<SessionDisplay[]>> - Session list
   */
  getSessionHistory: (params?: {
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'duration' | 'masteryLevel';
    sortOrder?: 'asc' | 'desc';
    conceptIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  }) => ipcRenderer.invoke('analytics:get-session-history', params),

  /**
   * Checks for new achievements
   * Evaluates and returns any newly unlocked achievements
   * @param sessionId - Optional session ID to check achievements for
   * @returns Promise<APIResponse<AchievementDisplay[]>> - New achievements
   */
  checkAchievements: (sessionId?: string) =>
    ipcRenderer.invoke('analytics:check-achievements', sessionId),

  /**
   * Gets learning trends data
   * Returns learning trend analysis for specified periods
   * @param params - Trends request parameters
   * @returns Promise<APIResponse<LearningTrendDisplay>> - Trends data
   */
  getLearningTrends: (params: {
    period: 'daily' | 'weekly' | 'monthly';
    metric: 'mastery' | 'sessions' | 'time' | 'concepts';
    conceptIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  }) => ipcRenderer.invoke('analytics:get-learning-trends', params),

  /**
   * Gets study streak information
   * Returns current and historical study streak data
   * @returns Promise<APIResponse<StudyStreakDisplay>> - Streak information
   */
  getStudyStreak: () => ipcRenderer.invoke('analytics:get-study-streak'),

  /**
   * Gets time statistics
   * Returns detailed time-based learning statistics
   * @param params - Time stats request parameters
   * @returns Promise<APIResponse<TimeStatsDisplay>> - Time statistics
   */
  getTimeStats: (params?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    includeBreakdown?: boolean;
    includeComparisons?: boolean;
  }) => ipcRenderer.invoke('analytics:get-time-stats', params),
};

// ============================================================================
// Sessions API
// ============================================================================

const sessionsAPI: SessionsAPI = {
  list: (options: unknown) => ipcRenderer.invoke('sessions:list', options),
  create: (payload: unknown) => ipcRenderer.invoke('sessions:create', payload),
  get: (sessionId: string) => ipcRenderer.invoke('sessions:get', sessionId),
  update: (sessionId: string, updates: unknown) =>
    ipcRenderer.invoke('sessions:update', sessionId, updates),
  delete: (sessionId: string) => ipcRenderer.invoke('sessions:delete', sessionId),
  updateTitle: (sessionId: string, title: string) =>
    ipcRenderer.invoke('sessions:update-title', sessionId, title),
  // Use learning:get-recent-sessions (the registered handler) for recent sessions
  getRecentSessions: (options: unknown) =>
    ipcRenderer.invoke('learning:get-recent-sessions', options),
  getGlobalStatistics: () => ipcRenderer.invoke('sessions:get-global-statistics'),
  searchSessions: (query: string) => ipcRenderer.invoke('sessions:search', query),
};

// ============================================================================
// Catalyst API
// ============================================================================

const catalystAPI: CatalystAPI = {
  executeAgent: (params: unknown) => ipcRenderer.invoke('catalyst:execute-agent', params),
  executeAgentStream: (params: unknown, port: MessagePort) =>
    ipcRenderer.invoke('catalyst:execute-agent-stream', params, port),
  cancelAgent: (executionId: string) => ipcRenderer.invoke('catalyst:cancel-agent', executionId),
  getAgentStatus: (executionId: string) =>
    ipcRenderer.invoke('catalyst:get-agent-status', executionId),
  // Deprecated methods removed: listAgents, getActiveExecutions
  registerAgent: (agentConfig: unknown) =>
    ipcRenderer.invoke('catalyst:register-agent', agentConfig),
  unregisterAgent: (agentId: string) => ipcRenderer.invoke('catalyst:unregister-agent', agentId),
  sendChat: (params: unknown) => ipcRenderer.invoke('catalyst:send-chat', params),
  sendChatStream: (params: unknown) => ipcRenderer.invoke('catalyst:send-chat-stream', params),
  getSession: (params: unknown) => ipcRenderer.invoke('catalyst:get-session', params),
  cancelExecution: (params: unknown) => ipcRenderer.invoke('catalyst:cancel-execution', params),
};
// ============================================================================
// 7. Settings & Configuration API
// ============================================================================

/**
 * Settings & Configuration API
 *
 * Manages user preferences, AI provider configuration, and application settings.
 * Focuses on personalizing the learning experience and managing technical configurations.
 */
const settingsAPI: SettingsAPI & SettingsUtility = {
  /**
   * Gets comprehensive user preferences
   * Returns all user-configurable settings in display-ready format
   * @returns Promise<UserPreferencesDisplay> - Complete user preferences
   */
  getUserPreferences: () => ipcRenderer.invoke('settings:get-user-preferences'),

  /**
   * Updates user preferences
   * Applies changes to user configuration settings
   * @param preferences - Partial preferences object to update
   * @returns Promise<{ success: boolean, updatedSettings: unknown, changes: string[] }>
   */
  updatePreferences: (preferences: unknown) =>
    ipcRenderer.invoke('settings:update-preferences', preferences),

  /**
   * Get available AI providers and their status
   * Returns configured and available AI providers
   */
  getAvailableProviders: () => ipcRenderer.invoke('settings:getAvailableProviders'),

  /**
   * Configures an AI provider with authentication and settings
   * Sets up or updates provider configuration
   * @param params.provider - Provider ID to configure
   * @param params.config - Provider configuration object
   */
  configureProvider: (params: { provider: string; config: unknown }) =>
    ipcRenderer.invoke('settings:configureProvider', params),

  /**
   * Gets learning-specific settings
   * Returns settings related to learning preferences and goals
   * @returns Promise<LearningSettingsDisplay> - Learning configuration settings
   */
  getLearningSettings: () => ipcRenderer.invoke('settings:get-learning-settings'),

  /**
   * Updates learning-specific settings
   * Modifies learning preferences, goals, and tracking settings
   * @param settings - Learning settings to update
   * @returns Promise<{ success: boolean; updatedSettings: unknown; impact: string[] }>
   */
  updateLearningSettings: (settings: unknown) =>
    ipcRenderer.invoke('settings:update-learning-settings', settings),
  getAppVersion: () => ipcRenderer.invoke('settings:getAppVersion'),
  quit: () => ipcRenderer.invoke('settings:quitApp'),
  getConfig: () => ipcRenderer.invoke('settings:getWorkspaceConfig'),
  setConfig: (config: Partial<AppConfig>) =>
    ipcRenderer.invoke('settings:setWorkspaceConfig', config),
};

// ============================================================================
// Complete electronAPI Export with Error Handling
// ============================================================================

/**
 * Complete electronAPI Export
 *
 * Combines all API modules with centralized error handling and utilities.
 * Provides a unified interface for frontend-backend communication.
 */
// Buffered latest readiness + config change snapshots (capacity semantics via channels)
const systemReadyChan = new Chan<SystemReadyPayload>(1);
const configChangedChan = new Chan<ConfigChangedPayload>(8);

let lastSystemState: SystemReadyPayload | null = null;

const pushSystemSnapshot = (snapshot: SystemReadyPayload) => {
  if (lastSystemState?.status === 'ready' && snapshot.status !== 'ready') {
    console.warn('[Preload] Ignoring non-ready snapshot after ready', snapshot);
    return;
  }
  lastSystemState = snapshot;
  console.log('[Preload] SYSTEM_READY received', snapshot);
  try {
    // If the channel is full, drain the old value to make room for the new one.
    // This ensures we always have the latest state available and don't accumulate floating promises.
    if (!systemReadyChan.trySend(snapshot)) {
      systemReadyChan.tryRecv();
      // Try sending again, if it fails again (unlikely in single-threaded JS unless strictly tight), we drop it.
      // But since we just drained, it should succeed.
      systemReadyChan.trySend(snapshot);
    }
  } catch (error) {
    console.error('[Preload] systemReadyChan send failed', error);
  }
};

const pushConfigChange = (payload: ConfigChangedPayload) => {
  try {
    console.log('[Preload] settings:config:changed received', payload);
    if (!configChangedChan.trySend(payload)) {
      // For config changes, we also prefer dropping oldest if full to avoid leaks
      configChangedChan.tryRecv();
      configChangedChan.trySend(payload);
    }
  } catch (error) {
    console.error('[Preload] configChangedChan send failed', error);
  }
};

ipcRenderer.on(
  IPC_EVENTS.SYSTEM_READY,
  (_event: IpcRendererEvent, snapshot: SystemReadyPayload) => {
    pushSystemSnapshot(snapshot);
  },
);

ipcRenderer.on(
  'settings:config:changed',
  (_event: IpcRendererEvent, payload: ConfigChangedPayload) => {
    pushConfigChange(payload);
  },
);

const recvWithTimeout = async <T>(
  channel: Chan<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${label} timeout`)), timeoutMs);
  try {
    const result = await channel.recv(controller.signal);
    if (result.done || result.value === undefined) {
      throw new Error(`${label} channel closed`);
    }
    return result.value as T;
  } catch (error: unknown) {
    if (error instanceof Error && error?.name === 'AbortError') {
      throw new Error(`${label} timeout`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const electronAPI = {
  // API Modules
  chat: chatAPI,
  aiSDK,
  knowledge: knowledgeAPI,
  analytics: analyticsAPI,


  settings: settingsAPI,
  sessions: sessionsAPI,
  catalyst: catalystAPI,
  getWorkspacePath: () => ipcRenderer.invoke('fs:get-workspace-path'),
  readDirectory: (path: string, recursive?: boolean, maxDepth?: number, filterConfig?: unknown) =>
    ipcRenderer.invoke('fs:read-directory', path, recursive, maxDepth, filterConfig),
  readFile: (filePath: string, encoding?: BufferEncoding) =>
    ipcRenderer.invoke('fs:read-file', filePath, encoding),
  writeFile: (filePath: string, content: string, encoding?: BufferEncoding) =>
    ipcRenderer.invoke('fs:write-file', filePath, content, encoding),
  existsFile: (filePath: string) => ipcRenderer.invoke('fs:exists-file', filePath),
  showOpenDialog: (options?: unknown) => ipcRenderer.invoke('dialog:show-open-dialog', options),
  showSaveDialog: (options?: unknown) => ipcRenderer.invoke('dialog:show-save-dialog', options),
  onMenuAction: (handler: (action: string, data?: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string, payload?: unknown) => {
      handler(action, payload);
    };
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },
  onIPCError: (handler: (payload: IPCErrorPayload) => void) => {
    const listener = (_event: IpcRendererEvent, payload: IPCErrorPayload) => {
      handler(payload);
    };
    ipcRenderer.on(IPC_ERROR_CHANNEL, listener);
    return () => ipcRenderer.removeListener(IPC_ERROR_CHANNEL, listener);
  },

  // Global error buffer accessors
  getErrorBuffer: () => ipcRenderer.invoke('system:get-error-buffer'),
  clearErrorBuffer: () => ipcRenderer.invoke('system:clear-error-buffer'),

  relaunchApp: () => ipcRenderer.invoke('system:relaunch-app'),

  // Utility methods for better error handling and debugging

  /**
   * Centralized error handling and reporting
   * Logs errors to backend for debugging and analytics
   * @param error - Error object or message
   * @param context - Context where the error occurred
   * @param severity - 'info' | 'warning' | 'error' | 'critical'
   */
  handleError: (error: Error | string, context: string, severity = 'error') => {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    console.error(`[Frontend] ${context}:`, error);

    // Report error to backend for analytics and debugging
    ipcRenderer.invoke('system:report-error', {
      error: errorMessage,
      context,
      stack,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  },

  /**
   * Checks API health and connectivity
   * Useful for debugging connection issues
   * @returns Promise<{ status: 'healthy' | 'degraded' | 'offline', apis: Object }>
   */
  healthCheck: () => ipcRenderer.invoke('system:health-check'),

  /**
   * Gets application version and build information
   * Useful for debugging and support
   * @returns Promise<{ version: string, build: string, platform: string }>
   */
  getVersion: () => ipcRenderer.invoke('system:get-version'),

  /**
   * Logs user interactions for analytics
   * Helps understand how users interact with the application
   * @param event - Event name and properties
   */
  trackEvent: (event: { name: string; properties?: object }) =>
    ipcRenderer.invoke('analytics:track-event', event),
  awaitReady: async (options?: { timeoutMs?: number }) => {
    const timeoutMs = options?.timeoutMs ?? 30000;
    console.log('[Preload] awaitReady start', timeoutMs);
    const isReady = (state: SystemReadyPayload | null) =>
      !!state && state.status === 'ready' && state.ready?.ipcHandlersRegistered === true;

    // First, try to hydrate from main in case we reloaded after the initial emit.
    if (!lastSystemState) {
      try {
        const latest = await ipcRenderer.invoke('system:get-latest-ready');
        if (latest) {
          pushSystemSnapshot(latest);
        }
      } catch (error) {
        console.warn('[Preload] failed to fetch latest ready snapshot', error);
      }
    }

    if (isReady(lastSystemState)) {
      console.log('[Preload] awaitReady immediate resolve');
      return lastSystemState as SystemReadyPayload;
    }
    const deadline = Date.now() + timeoutMs;
    let remaining = timeoutMs;
    while (remaining > 0) {
      const snapshot = await recvWithTimeout(systemReadyChan, remaining, 'Ready');
      lastSystemState = snapshot;
      if (isReady(snapshot)) {
        console.log('[Preload] awaitReady resolved');
        return snapshot;
      }
      remaining = deadline - Date.now();
    }
    console.warn('[Preload] awaitReady timeout');
    throw new Error('Ready timeout');
  },
  awaitConfigChange: async (options?: { timeoutMs?: number }) => {
    const timeoutMs = options?.timeoutMs ?? 30000;
    console.log('[Preload] awaitConfigChange start', timeoutMs);
    const event = await recvWithTimeout(configChangedChan, timeoutMs, 'Config change');
    console.log('[Preload] awaitConfigChange received');
    return event;
  },
};

// ============================================================================
// Type Definitions and Exports
// ============================================================================

// Add TypeScript declarations for global scope
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Expose the complete API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export default electronAPI;
