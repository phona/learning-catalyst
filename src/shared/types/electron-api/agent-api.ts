/**
 * Agent API - Agent Management Interface
 *
 * Provides type-safe interface for agent management operations
 * through IPC communication.
 */

import type { APIResponse } from './base';

/**
 * Agent display information
 */
export interface AgentDisplay {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  isAvailable: boolean;
  capabilities?: string[];
}

/**
 * Agent context settings
 */
export interface AgentContext {
  agentSettings: {
    personality?: string;
    responseStyle?: string;
    detailLevel?: string;
  };
}

/**
 * Agent capabilities display
 */
export interface AgentCapabilities {
  supportsStreaming: boolean;
  supportsContext: boolean;
  supportsTools: boolean;
  supportedModels: string[];
}

/**
 * Feature demo result
 */
export interface FeatureDemo {
  featureName: string;
  description: string;
  result: unknown;
}

/**
 * Agent Management API interface
 */
export interface AgentsAPI {
  /**
   * Get list of available agents
   * @returns Promise<APIResponse<AgentDisplay[]>> - Array of available agents
   */
  getAvailableAgents: () => Promise<APIResponse<AgentDisplay[]>>;

  /**
   * Select an agent for a session
   * @param agentId - ID of the agent to select
   * @returns Promise<APIResponse<{ agent: AgentDisplay; context: AgentContext }>> - Selected agent with context
   */
  selectAgentForSession: (agentId: string) => Promise<APIResponse<{ agent: AgentDisplay; context: AgentContext }>>;

  /**
   * Set agent personality
   * @param agentId - ID of the agent
   * @param personality - Personality settings
   * @returns Promise<APIResponse<AgentContext['agentSettings']>> - Updated settings
   */
  setAgentPersonality: (agentId: string, personality: string) => Promise<APIResponse<AgentContext['agentSettings']>>;

  /**
   * Set response style
   * @param agentId - ID of the agent
   * @param style - Response style settings
   * @returns Promise<APIResponse<AgentContext['agentSettings']>> - Updated settings
   */
  setResponseStyle: (agentId: string, style: Record<string, unknown>) => Promise<APIResponse<AgentContext['agentSettings']>>;

  /**
   * Get agent capabilities
   * @param agentId - ID of the agent
   * @returns Promise<APIResponse<AgentCapabilities>> - Agent capabilities
   */
  getAgentCapabilities: (agentId: string) => Promise<APIResponse<AgentCapabilities>>;

  /**
   * Try an agent feature
   * @param agentId - ID of the agent
   * @param feature - Feature name to try
   * @returns Promise<APIResponse<FeatureDemo>> - Feature demo result
   */
  tryAgentFeature: (agentId: string, feature: string) => Promise<APIResponse<FeatureDemo>>;
}

/**
 * Learning content summary
 */
export interface LearningContentSummary {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  concepts: string[];
  estimatedTime: string;
}

/**
 * Content import result
 */
export interface ContentImportResult {
  summary: LearningContentSummary;
  processedFiles: number;
  totalFiles: number;
}

/**
 * Content API interface
 * Provides learning content import and management operations
 */
export interface ContentAPI {
  /**
   * Import learning content from files
   * @param fileList - Optional list of files to import
   * @returns Promise<APIResponse<ContentImportResult>> - Import results
   */
  importLearningContent: (fileList?: FileList) => Promise<APIResponse<ContentImportResult>>;
}
