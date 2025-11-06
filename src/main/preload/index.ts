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
import {
  ElectronAPI,
  ChatAPI,
  LearningAPI,
  KnowledgeAPI,
  AnalyticsAPI,
  AgentsAPI,
  ContentAPI,
  SettingsAPI
} from '@/shared/types/electron-api';

// ============================================================================
// 1. Chat & Conversation API
// ============================================================================

/**
 * Chat & Conversation API
 *
 * Manages real-time conversations with AI agents.
 * All methods return display-optimized data ready for UI rendering.
 */
const chatAPI: ChatAPI = {
  /**
   * Starts a new conversation with an AI agent
   * @param params.agentType - Type of agent ('learning', 'tutoring', 'assessment', 'practice')
   * @param params.topic - Optional topic to focus the conversation
   * @param params.preferences - User preferences for response style, difficulty, etc.
   * @returns Promise<ConversationDisplay> - Display-ready conversation object
   */
  startConversation: (params) =>
    ipcRenderer.invoke('chat:startConversation', params),

  /**
   * Sends a message and gets response (non-streaming)
   * Use this for simple Q&A where streaming isn't needed
   * @param params.conversationId - Active conversation ID
   * @param params.message - Message content to send
   * @param params.attachments - Optional file attachments
   * @returns Promise<MessageDisplay> - Complete response message
   */
  sendMessage: (params) =>
    ipcRenderer.invoke('chat:sendMessage', params),

  /**
   * Sends a message with streaming response
   * Use this for long responses or when you want real-time feedback
   * @param params.conversationId - Active conversation ID
   * @param params.message - Message content to send
   * @param params.attachments - Optional file attachments
   * @returns Promise<AsyncIterable<string>> - Stream of response chunks
   */
  sendMessageStream: (params) => {
    return new Promise((resolve) => {
      const streamReadyHandler = (event: any) => {
        const port = event.ports[0];
        const stream = {
          async *[Symbol.asyncIterator]() {
            const messageHandler = (event: MessageEvent) => {
              const { type, chunk, isComplete, error } = event.data;
              switch (type) {
                case 'chat:chunk': yield chunk; break;
                case 'chat:complete': port.close(); return;
                case 'chat:error': throw new Error(error);
              }
            };
            port.onmessage = messageHandler;
            port.start();
          }
        };
        resolve(stream);
        ipcRenderer.removeListener('chat:stream-ready', streamReadyHandler);
      };
      ipcRenderer.on('chat:stream-ready', streamReadyHandler);
      ipcRenderer.send('chat:streamMessage', params);
    });
  },

  /**
   * Gets conversation history with display optimization
   * Returns messages formatted for UI display with relative timestamps
   * @param conversationId - Conversation ID
   * @returns Promise<ConversationHistory> - Conversation data
   */
  getConversationHistory: (conversationId: string) =>
    ipcRenderer.invoke('chat:getConversation', conversationId),

  /**
   * Lists all conversations
   * Returns conversations with basic information for UI display
   * @returns Promise<ConversationDisplay[]> - Array of conversations
   */
  listConversations: () =>
    ipcRenderer.invoke('chat:listConversations'),

  /**
   * Deletes a conversation
   * Removes conversation and associated messages
   * @param conversationId - Conversation to delete
   * @returns Promise<{ success: boolean, deleted: boolean }>
   */
  deleteConversation: (conversationId: string) =>
    ipcRenderer.invoke('chat:deleteConversation', conversationId)
};

// ============================================================================
// 2. Learning & Sessions API
// ============================================================================

/**
 * Learning & Sessions API
 *
 * Manages structured learning sessions with progress tracking.
 * Focuses on educational outcomes and learning analytics.
 */
const learningAPI: LearningAPI = {
  /**
   * Starts a new structured learning session
   * Creates a session with specific learning goals and tracks progress
   * @param params.topic - Main topic for the learning session
   * @param params.goals - Array of specific learning objectives
   * @param params.difficulty - 'beginner' | 'intermediate' | 'advanced'
   * @param params.agentType - Type of AI agent to guide the session
   * @param params.learningStyle - 'visual' | 'auditory' | 'kinesthetic' | 'reading'
   * @returns Promise<LearningSessionDisplay> - Session object with progress tracking
   */
  startLearningSession: (params) =>
    ipcRenderer.invoke('learning:startSession', params),

  /**
   * Gets detailed progress for a learning session
   * Returns comprehensive progress data for UI display
   * @param sessionId - Learning session ID
   * @returns Promise<LearningProgressDisplay> - Detailed progress information
   */
  getSessionProgress: (sessionId: string) =>
    ipcRenderer.invoke('learning:getProgress', sessionId),

  /**
   * Lists all learning sessions
   * Returns sessions with basic information for UI display
   * @returns Promise<SessionDisplay[]> - Array of learning sessions
   */
  listSessions: () =>
    ipcRenderer.invoke('learning:listSessions'),

  /**
   * Updates progress for a learning session
   * Records progress updates and achievements
   * @param params.sessionId - Learning session ID
   * @param params.progress - Progress value (0-1)
   * @param params.type - Type of progress update
   * @returns Promise<{ success: boolean, updatedProgress: ProgressUpdate }>
   */
  updateProgress: (params) =>
    ipcRenderer.invoke('learning:updateProgress', params),

  /**
   * Gets personalized recommendations
   * Returns learning recommendations based on current progress
   * @param sessionId - Learning session ID
   * @returns Promise<RecommendationDisplay[]> - Array of recommendations
   */
  getRecommendations: (sessionId: string) =>
    ipcRenderer.invoke('learning:getRecommendations', sessionId),

  /**
   * Generates a learning path
   * Creates a structured learning path for a topic
   * @param params.topic - Topic to create path for
   * @param params.currentLevel - Current skill level
   * @param params.targetLevel - Target skill level
   * @returns Promise<LearningPathDisplay> - Generated learning path
   */
  generateLearningPath: (params) =>
    ipcRenderer.invoke('learning:generatePath', params)
};

// ============================================================================
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
   * @param conceptName - Name of the concept to explore
   * @param depth - 'basic' | 'intermediate' | 'advanced' - depth of exploration
   * @returns Promise<ConceptExplorationDisplay> - Detailed concept information
   */
  exploreConcept: (params) =>
    ipcRenderer.invoke('knowledge:exploreConcept', params),

  /**
   * Gets concepts related to a given concept
   * Useful for knowledge graph navigation and discovery
   * @param conceptId - ID of the concept to find relations for
   * @returns Promise<RelatedConceptsDisplay> - Array of related concepts with relationships
   */
  getRelatedConcepts: (conceptId: string) =>
    ipcRenderer.invoke('knowledge:getRelatedConcepts', conceptId),

  /**
   * Searches the knowledge base for specific content
   * Supports natural language queries and semantic search
   * @param params.query - Search query string
   * @param params.filters - Search filters
   * @returns Promise<KnowledgeSearchResultDisplay> - Search results with relevance scores
   */
  searchKnowledge: (params) =>
    ipcRenderer.invoke('knowledge:search', params),

  /**
   * Builds a knowledge graph
   * Creates a visualizable knowledge graph from concepts
   * @param params.concepts - Array of concepts to include
   * @param params.includeRelationships - Whether to include relationships
   * @param params.title - Optional title for the graph
   * @returns Promise<KnowledgeGraphDisplay> - Knowledge graph data
   */
  buildKnowledgeGraph: (params) =>
    ipcRenderer.invoke('knowledge:buildGraph', params),

  /**
   * Gets concept hierarchy
   * Returns hierarchical structure of concepts
   * @param params.rootConcept - Root concept for hierarchy
   * @param params.maxDepth - Maximum depth to traverse
   * @returns Promise<ConceptHierarchyDisplay> - Hierarchical concept data
   */
  getConceptHierarchy: (params) =>
    ipcRenderer.invoke('knowledge:getHierarchy', params)
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
  /**
   * Gets comprehensive learning dashboard data
   * Returns all key metrics needed for dashboard display
   * @returns Promise<DashboardDisplay> - Complete dashboard data
   */
  getDashboard: () =>
    ipcRenderer.invoke('analytics:getDashboard'),

  /**
   * Gets progress chart data for visualization
   * Returns structured data for various chart types
   * @param params.timeRange - Time range for chart data
   * @param params.topic - Optional topic filter
   * @returns Promise<ProgressChartDisplay> - Chart-ready progress data
   */
  getProgressChart: (params) =>
    ipcRenderer.invoke('analytics:getProgressChart', params),

  /**
   * Gets learning insights
   * Returns personalized learning insights and recommendations
   * @param params.timeRange - Time range for insights
   * @param params.type - Type of insights
   * @returns Promise<InsightsDisplay> - Learning insights
   */
  getInsights: (params) =>
    ipcRenderer.invoke('analytics:getInsights', params),

  /**
   * Gets detailed performance metrics
   * Returns comprehensive performance analysis
   * @param params.timeRange - Time range for metrics
   * @param params.breakdown - Level of detail breakdown
   * @returns Promise<PerformanceDisplay> - Performance metrics
   */
  getPerformance: (params) =>
    ipcRenderer.invoke('analytics:getPerformance', params)
};

// ============================================================================
// 5. Agent Management API
// ============================================================================

/**
 * Agent Management API
 *
 * Manages AI agent selection, configuration, and interaction preferences.
 * Focuses on personalizing the AI learning experience.
 */
const agentsAPI: AgentsAPI = {
  /**
   * Gets all available AI agents with display information
   * Returns agents optimized for selection UI
   * @returns Promise<AgentDisplay[]> - Array of available agents
   */
  getAvailableAgents: () =>
    ipcRenderer.invoke('agent:list'),

  /**
   * Executes an agent with specific parameters
   * Runs the agent and returns execution results
   * @param request - Agent execution request with parameters
   * @returns Promise<AgentExecutionResult> - Execution results
   */
  executeAgent: (request) =>
    ipcRenderer.invoke('agent:execute', request),

  /**
   * Cancels a running agent execution
   * Stops the agent execution and cleanup resources
   * @param executionId - Execution ID to cancel
   * @returns Promise<{ success: boolean, cancelledAt: string }>
   */
  cancelAgentExecution: (executionId: string) =>
    ipcRenderer.invoke('agent:cancel', executionId),

  /**
   * Gets status of an agent execution
   * Returns current execution status and progress
   * @param executionId - Execution ID to check
   * @returns Promise<AgentExecutionStatus> - Current execution status
   */
  getAgentExecutionStatus: (executionId: string) =>
    ipcRenderer.invoke('agent:status', executionId),

  /**
   * Lists all agent executions
   * Returns history of agent executions with status
   * @returns Promise<AgentExecution[]> - Array of execution records
   */
  getAgentExecutions: () =>
    ipcRenderer.invoke('agent:executions'),

  /**
   * Registers a new agent
   * Adds a new agent to the system with configuration
   * @param agentConfig - Agent configuration object
   * @returns Promise<{ success: boolean, agentId: string }>
   */
  registerAgent: (agentConfig) =>
    ipcRenderer.invoke('agent:register', agentConfig),

  /**
   * Unregisters an agent
   * Removes an agent from the system
   * @param agentId - Agent ID to unregister
   * @returns Promise<{ success: boolean, unregisteredAt: string }>
   */
  unregisterAgent: (agentId: string) =>
    ipcRenderer.invoke('agent:unregister', agentId)
};

// ============================================================================
// 6. Content & Discovery API
// ============================================================================

/**
 * Content & Discovery API
 *
 * Manages learning content import, discovery, and analysis.
 * Focuses on expanding the knowledge base with relevant content.
 */
const contentAPI: ContentAPI = {
  /**
   * Explores local projects for learning content
   * Scans file system for code, documentation, and learning materials
   * @returns Promise<ProjectDisplay[]> - Array of discoverable local projects
   */
  exploreLocalProjects: () =>
    ipcRenderer.invoke('content:exploreProjects'),

  /**
   * Imports learning content from files
   * Processes files and extracts learning concepts and materials
   * @param files - FileList from file input or drag-drop
   * @returns Promise<ImportResultDisplay> - Import results and extracted content
   */
  importLearningContent: (files: FileList) =>
    ipcRenderer.invoke('content:importContent', files),

  /**
   * Discovers learning resources from various sources
   * Finds and analyzes learning materials from different platforms
   * @param params - Discovery parameters with filters and options
   * @returns Promise<ResourceDiscoveryDisplay[]> - Array of discovered resources
   */
  discoverResources: (params) =>
    ipcRenderer.invoke('content:discoverResources', params),

  /**
   * Analyzes a project for learning content
   * Scans project files and extracts learning materials
   * @param params - Project analysis parameters
   * @returns Promise<ProjectAnalysisDisplay> - Detailed project analysis
   */
  analyzeProject: (params) =>
    ipcRenderer.invoke('content:analyzeProject', params)
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
const settingsAPI: SettingsAPI = {
  /**
   * Gets comprehensive user preferences
   * Returns all user-configurable settings in display-ready format
   * @returns Promise<UserPreferencesDisplay> - Complete user preferences
   */
  getUserPreferences: () =>
    ipcRenderer.invoke('settings:getPreferences'),

  /**
   * Updates user preferences
   * Applies changes to user configuration settings
   * @param preferences - Partial preferences object to update
   * @returns Promise<{ success: boolean, updatedSettings: any, changes: string[] }>
   */
  updatePreferences: (preferences) =>
    ipcRenderer.invoke('settings:updatePreferences', preferences),

  /**
   * Exports user settings to a file
   * Creates a backup of user preferences and configuration
   * @param params - Export parameters including format and options
   * @returns Promise<ExportResultDisplay> - Export results with file info
   */
  exportSettings: (params) =>
    ipcRenderer.invoke('settings:export', params),

  /**
   * Imports settings from a file or source
   * Restores user preferences from backup or external source
   * @param params - Import parameters with source and merge options
   * @returns Promise<ImportResultDisplay> - Import results with applied changes
   */
  importSettings: (params) =>
    ipcRenderer.invoke('settings:import', params),

  /**
   * Resets settings to default values
   * Restores all settings to their original defaults
   * @returns Promise<ResetResultDisplay> - Reset results with changes made
   */
  resetToDefaults: () =>
    ipcRenderer.invoke('settings:resetDefaults'),

  /**
   * Gets system information and status
   * Returns comprehensive system and application information
   * @returns Promise<SystemInfoDisplay> - Detailed system information
   */
  getSystemInfo: () =>
    ipcRenderer.invoke('settings:getSystemInfo'),

  /**
   * Gets workspace configuration
   * Returns workspace-specific configuration settings
   * @returns Promise<WorkspaceConfig> - Workspace configuration object
   */
  getWorkspaceConfig: () =>
    ipcRenderer.invoke('settings:getWorkspaceConfig'),

  /**
   * Sets workspace configuration
   * Updates workspace-specific configuration settings
   * @param config - Workspace configuration object
   * @returns Promise<{ success: boolean }> - Operation result
   */
  setWorkspaceConfig: (config) =>
    ipcRenderer.invoke('settings:setWorkspaceConfig', config),

  /**
   * Gets workspace configuration value by key
   * Retrieves specific configuration value using dot notation
   * @param key - Configuration key (supports dot notation)
   * @returns Promise<any> - Configuration value
   */
  getWorkspaceConfigKey: (key: string) =>
    ipcRenderer.invoke('settings:getWorkspaceConfigKey', key),

  /**
   * Sets workspace configuration value by key
   * Updates specific configuration value using dot notation
   * @param key - Configuration key (supports dot notation)
   * @param value - Configuration value to set
   * @returns Promise<{ success: boolean }> - Operation result
   */
  setWorkspaceConfigKey: (key: string, value: any) =>
    ipcRenderer.invoke('settings:setWorkspaceConfigKey', key, value),

  /**
   * Deletes workspace configuration key
   * Removes specific configuration key using dot notation
   * @param key - Configuration key to delete (supports dot notation)
   * @returns Promise<{ success: boolean }> - Operation result
   */
  deleteWorkspaceConfigKey: (key: string) =>
    ipcRenderer.invoke('settings:deleteWorkspaceConfigKey', key),

  /**
   * Resets workspace configuration
   * Clears all workspace configuration settings
   * @returns Promise<{ success: boolean }> - Operation result
   */
  resetWorkspaceConfig: () =>
    ipcRenderer.invoke('settings:resetWorkspaceConfig'),

  /**
   * Gets application version
   * Returns the current application version information
   * @returns Promise<string> - Application version
   */
  getAppVersion: () =>
    ipcRenderer.invoke('settings:getAppVersion'),

  /**
   * Gets user data path
   * Returns the path to the user data directory
   * @returns Promise<string> - User data directory path
   */
  getUserDataPath: () =>
    ipcRenderer.invoke('settings:getUserDataPath'),

  /**
   * Gets documents path
   * Returns the path to the user's documents directory
   * @returns Promise<string> - Documents directory path
   */
  getDocumentsPath: () =>
    ipcRenderer.invoke('settings:getDocumentsPath'),

  /**
   * Gets application path
   * Returns the path to the application executable
   * @returns Promise<string> - Application executable path
   */
  getAppPath: () =>
    ipcRenderer.invoke('settings:getAppPath'),

  /**
   * Quits the application
   * Initiates application shutdown process
   * @returns Promise<void> - Operation completes when shutdown starts
   */
  quitApplication: () =>
    ipcRenderer.invoke('settings:quitApp')
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
const electronAPI = {
  // API Modules - 7 Complete Domains
  chat: chatAPI,
  learning: learningAPI,
  knowledge: knowledgeAPI,
  analytics: analyticsAPI,
  agents: agentsAPI,
  content: contentAPI,
  settings: settingsAPI,

  // Utility methods for better error handling and debugging

  /**
   * Centralized error handling and reporting
   * Logs errors to backend for debugging and analytics
   * @param error - Error object or message
   * @param context - Context where the error occurred
   * @param severity - 'info' | 'warning' | 'error' | 'critical'
   */
  handleError: (error: Error | string, context: string, severity: string = 'error') => {
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
      url: window.location.href
    });
  },

  /**
   * Checks API health and connectivity
   * Useful for debugging connection issues
   * @returns Promise<{ status: 'healthy' | 'degraded' | 'offline', apis: Object }>
   */
  healthCheck: () =>
    ipcRenderer.invoke('system:health-check'),

  /**
   * Gets application version and build information
   * Useful for debugging and support
   * @returns Promise<{ version: string, build: string, platform: string }>
   */
  getVersion: () =>
    ipcRenderer.invoke('system:get-version'),

  /**
   * Logs user interactions for analytics
   * Helps understand how users interact with the application
   * @param event - Event name and properties
   */
  trackEvent: (event: { name: string, properties?: object }) =>
    ipcRenderer.invoke('analytics:track-event', event)
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