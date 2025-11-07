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
            return new Promise((resolveStream, rejectStream) => {
              const messageHandler = (event: MessageEvent) => {
                const { type, chunk, isComplete, error } = event.data;
                switch (type) {
                  case 'chat:chunk': resolveStream(chunk); break;
                  case 'chat:complete': port.close(); resolveStream(undefined); return;
                  case 'chat:error': rejectStream(new Error(error)); return;
                }
              };
              port.onmessage = messageHandler;
              port.start();
            });
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
   * Gets real-time typing indicator
   * Use this to show when the AI is typing or processing
   * @param conversationId - Active conversation ID
   * @returns Promise<TypingIndicator> - Typing status and agent info
   */
  getTypingIndicator: (conversationId: string) =>
    ipcRenderer.invoke('chat:getTypingIndicator', conversationId),

  /**
   * Gets conversation history with display optimization
   * Returns messages formatted for UI display with relative timestamps
   * @param conversationId - Conversation ID
   * @param options - Optional pagination and filter options
   * @returns Promise<ConversationHistory> - Conversation data
   */
  getConversationHistory: (conversationId: string, options?: any) =>
    ipcRenderer.invoke('chat:getConversation', { conversationId, ...options }),

  /**
   * Pauses an active conversation
   * Use this when user wants to temporarily stop the conversation
   * @param conversationId - Active conversation ID
   * @returns Promise<{ success: boolean; message: string }>
   */
  pauseConversation: (conversationId: string) =>
    ipcRenderer.invoke('chat:pauseConversation', conversationId),

  /**
   * Resumes a paused conversation
   * Restores the conversation context and continues
   * @param conversationId - Paused conversation ID
   * @returns Promise<{ success: boolean; context: ConversationContext }>
   */
  resumeConversation: (conversationId: string) =>
    ipcRenderer.invoke('chat:resumeConversation', conversationId),

  /**
   * Ends a conversation and generates summary
   * Returns a summary of key points covered in the conversation
   * @param conversationId - Conversation to end
   * @returns Promise<ConversationSummary> - Summary and key takeaways
   */
  endConversation: (conversationId: string) =>
    ipcRenderer.invoke('chat:endConversation', conversationId)

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
   * Gets the structured learning path for a session
   * Returns the planned sequence of topics and activities
   * @param sessionId - Learning session ID
   * @returns Promise<LearningPathDisplay> - Structured learning path
   */
  getLearningPath: (sessionId: string) =>
    ipcRenderer.invoke('learning:getPath', sessionId),

  /**
   * Pauses an active learning session
   * Saves current state and stops progress tracking
   * @param sessionId - Active learning session ID
   * @returns Promise<{ success: boolean; resumeData: any }>
   */
  pauseSession: (sessionId: string) =>
    ipcRenderer.invoke('learning:pauseSession', sessionId),

  /**
   * Resumes a paused learning session
   * Restores session state and continues progress tracking
   * @param sessionId - Paused learning session ID
   * @returns Promise<{ success: boolean; context: LearningContext }>
   */
  resumeSession: (sessionId: string) =>
    ipcRenderer.invoke('learning:resumeSession', sessionId),

  /**
   * Completes a learning session and generates summary
   * Calculates achievements and provides recommendations
   * @param sessionId - Learning session to complete
   * @returns Promise<SessionCompletionDisplay> - Completion summary and recommendations
   */
  completeSession: (sessionId: string) =>
    ipcRenderer.invoke('learning:completeSession', sessionId),

  /**
   * Gets recent learning sessions for quick access
   * Returns sessions ordered by last activity
   * @param options - Optional filter and limit options
   * @returns Promise<SessionDisplay[]> - Array of recent sessions
   */
  getRecentSessions: (options?: any) =>
    ipcRenderer.invoke('learning:getRecentSessions', options),

  /**
   * Searches learning sessions with advanced filters
   * Supports text search and multiple filter criteria
   * @param query - Search query string
   * @param filters - Filter options
   * @returns Promise<SessionSearchResultDisplay> - Search results with pagination
   */
  searchSessions: (query: string, filters?: any) =>
    ipcRenderer.invoke('learning:searchSessions', query, filters)
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
   * @param params.conceptName - Name of the concept to explore
   * @param params.depth - 'basic' | 'intermediate' | 'advanced' - depth of exploration
   * @returns Promise<ConceptExplorationDisplay> - Detailed concept information
   */
  exploreConcept: (params: { conceptName: string; depth: 'basic' | 'intermediate' | 'advanced' }) =>
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
   * Gets knowledge map data for visualization
   * Returns structured data for knowledge graph rendering
   * @param sessionId - Optional session ID to focus on session-specific knowledge
   * @returns Promise<KnowledgeMapDisplay> - Knowledge graph data for visualization
   */
  getKnowledgeMap: (sessionId?: string) =>
    ipcRenderer.invoke('knowledge:getKnowledgeMap', sessionId),

  /**
   * Searches the knowledge base for specific content
   * Supports natural language queries and semantic search
   * @param query - Search query string
   * @returns Promise<KnowledgeSearchResultDisplay> - Search results with relevance scores
   */
  searchKnowledge: (query: string) =>
    ipcRenderer.invoke('knowledge:search', query),

  /**
   * Gets explanation for a concept in specific style
   * Provides different ways to understand the same concept
   * @param params.conceptId - ID of the concept to explain
   * @param params.style - 'simple' | 'technical' | 'analogy' | 'example' | 'visual'
   * @returns Promise<ExplanationDisplay> - Concept explanation in requested style
   */
  getExplanation: (params: {
    conceptId: string;
    style: 'simple' | 'technical' | 'analogy' | 'example' | 'visual';
  }) =>
    ipcRenderer.invoke('knowledge:getExplanation', params),

  /**
   * Gets practice exercises for a specific concept
   * Provides hands-on learning opportunities with varying difficulty
   * @param params.conceptId - ID of the concept to practice
   * @param params.difficulty - 'beginner' | 'intermediate' | 'advanced'
   * @returns Promise<ExerciseDisplay[]> - Array of practice exercises
   */
  getPracticeExercises: (params: {
    conceptId: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }) =>
    ipcRenderer.invoke('knowledge:getPracticeExercises', params)
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
   * @param params.timeRange - '7days' | '30days' | '90days' | '1year'
   * @param params.topic - Optional topic filter (null for all topics)
   * @returns Promise<ProgressChartDisplay> - Chart-ready progress data
   */
  getProgressChart: (params: {
    timeRange: '7days' | '30days' | '90days' | '1year';
    topic?: string | null;
  }) =>
    ipcRenderer.invoke('analytics:getProgressChart', params),

  /**
   * Gets all user achievements and milestones
   * Returns achievements with completion status and metadata
   * @returns Promise<AchievementDisplay[]> - Array of achievements
   */
  getAchievements: () =>
    ipcRenderer.invoke('analytics:getAchievements'),

  /**
   * Unlocks an achievement and handles rewards
   * Called when user meets achievement criteria
   * @param achievementId - ID of the achievement to unlock
   * @returns Promise<{ success: boolean; reward?: AchievementReward }>
   */
  unlockAchievement: (achievementId: string) =>
    ipcRenderer.invoke('analytics:unlockAchievement', achievementId),

  /**
   * Gets detailed usage statistics
   * Provides insights into learning patterns and habits
   * @param timeRange - Time range for statistics
   * @returns Promise<UsageStatsDisplay> - Detailed usage analytics
   */
  getUsageStats: (timeRange: '7days' | '30days' | '90days' | '1year') =>
    ipcRenderer.invoke('analytics:getUsageStats', timeRange),

  /**
   * Gets token usage and cost information
   * Important for monitoring API usage and costs
   * @param timeRange - Time range for token statistics
   * @returns Promise<TokenUsageDisplay> - Token usage breakdown
   */
  getTokenUsage: (timeRange: '7days' | '30days' | '90days' | '1year') =>
    ipcRenderer.invoke('analytics:getTokenUsage', timeRange)
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
   * Selects an agent for a specific session
   * Associates the agent with the session and applies preferences
   * @param params.sessionId - Learning session ID
   * @param params.agentType - Type of agent to select
   * @returns Promise<{ success: boolean; agent: AgentDisplay; context: AgentContext }>
   */
  selectAgentForSession: (params: {
    sessionId: string;
    agentType: string;
  }) =>
    ipcRenderer.invoke('agent:selectForSession', params),

  /**
   * Sets personality preferences for an agent
   * Customizes how the agent interacts and responds
   * @param params.agentId - Agent ID to configure
   * @param params.personality - Personality description
   * @returns Promise<{ success: boolean; updatedSettings: AgentSettings }>
   */
  setAgentPersonality: (params: {
    agentId: string;
    personality: 'friendly encouraging' | 'formal professional' | 'casual friendly' | 'technical expert';
  }) =>
    ipcRenderer.invoke('agent:setPersonality', params),

  /**
   * Sets response style preferences for a session
   * Controls the format and depth of agent responses
   * @param params.sessionId - Session ID to apply settings to
   * @param params.style - Response style configuration
   * @returns Promise<{ success: boolean; appliedSettings: ResponseStyleSettings }>
   */
  setResponseStyle: (params: {
    sessionId: string;
    style: any;
  }) =>
    ipcRenderer.invoke('agent:setResponseStyle', params),

  /**
   * Gets detailed capabilities for a specific agent
   * Useful for showcasing agent features and limitations
   * @param agentId - Agent ID to get capabilities for
   * @returns Promise<AgentCapabilitiesDisplay> - Detailed capability information
   */
  getAgentCapabilities: (agentId: string) =>
    ipcRenderer.invoke('agent:getCapabilities', agentId),

  /**
   * Demonstrates a specific agent feature
   * Provides interactive preview of agent capabilities
   * @param params.agentId - Agent ID to demonstrate
   * @param params.feature - Feature name to demonstrate
   * @returns Promise<FeatureDemoDisplay> - Interactive feature demonstration
   */
  tryAgentFeature: (params: {
    agentId: string;
    feature: string;
  }) =>
    ipcRenderer.invoke('agent:tryFeature', params)
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
   * Gets recommended learning content for a topic
   * Suggests relevant materials based on topic and skill level
   * @param params.topic - Learning topic or concept
   * @param params.level - 'beginner' | 'intermediate' | 'advanced'
   * @returns Promise<ContentRecommendationDisplay[]> - Array of recommended content
   */
  getRecommendedContent: (params: {
    topic: string;
    level: 'beginner' | 'intermediate' | 'advanced';
  }) =>
    ipcRenderer.invoke('content:getRecommendedContent', params),

  /**
   * Searches learning resources across multiple sources
   * Performs comprehensive search with intelligent filtering
   * @param query - Search query string
   * @returns Promise<ResourceSearchResultDisplay> - Search results with relevance ranking
   */
  searchLearningResources: (query: string) =>
    ipcRenderer.invoke('content:searchResources', query),

  /**
   * Analyzes a document for learning content
   * Extracts concepts, structure, and learning value from documents
   * @param filePath - Path to the document to analyze
   * @returns Promise<DocumentAnalysisDisplay> - Detailed document analysis
   */
  analyzeDocument: (filePath: string) =>
    ipcRenderer.invoke('content:analyzeDocument', filePath),

  /**
   * Extracts concepts from raw text content
   * Identifies key learning concepts and their relationships
   * @param content - Text content to analyze
   * @returns Promise<ConceptExtractionDisplay[]> - Array of extracted concepts
   */
  extractConcepts: (content: string) =>
    ipcRenderer.invoke('content:extractConcepts', content)
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
  updatePreferences: (preferences: any) =>
    ipcRenderer.invoke('settings:updatePreferences', preferences),

  /**
   * Gets available AI providers and their status
   * Returns configured and available AI providers
   * @returns Promise<ProviderDisplay[]> - Array of AI providers
   */
  getAvailableProviders: () =>
    ipcRenderer.invoke('settings:getAvailableProviders'),

  /**
   * Configures an AI provider with authentication and settings
   * Sets up or updates provider configuration
   * @param params.provider - Provider ID to configure
   * @param params.config - Provider configuration object
   * @returns Promise<{ success: boolean; providerId: string; status: string }>
   */
  configureProvider: (params: { provider: string; config: any }) =>
    ipcRenderer.invoke('settings:configureProvider', params),

  /**
   * Gets learning-specific settings
   * Returns settings related to learning preferences and goals
   * @returns Promise<LearningSettingsDisplay> - Learning configuration settings
   */
  getLearningSettings: () =>
    ipcRenderer.invoke('settings:getLearningSettings'),

  /**
   * Updates learning-specific settings
   * Modifies learning preferences, goals, and tracking settings
   * @param settings - Learning settings to update
   * @returns Promise<{ success: boolean; updatedSettings: any; impact: string[] }>
   */
  updateLearningSettings: (settings: any) =>
    ipcRenderer.invoke('settings:updateLearningSettings', settings)

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