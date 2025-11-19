/**
 * Catalyst API - Main Process Service Communication
 *
 * Provides type-safe interface for accessing the main process CatalystService
 * through IPC communication. This is the bridge between renderer process
 * and main process AI orchestration services.
 */

// Import related types from other APIs
import type { AgentDisplay } from './agent-api';
import type { SessionDisplay } from './learning-api';

/**
 * Main Catalyst API interface for renderer-main communication
 */
export interface CatalystAPI {
  /**
   * Execute an agent with the given input and context
   * @param params - Execution parameters including agent, input, and context
   * @returns Promise<AgentExecutionResult> - Execution result with metadata
   */
  executeAgent: (params: AgentExecutionRequest) => Promise<AgentExecutionResult>;

  /**
   * Execute an agent with streaming response
   * @param params - Execution parameters with streaming configuration
   * @param port - MessagePort for streaming communication
   * @returns Promise<AgentExecutionResult> - Initial execution result
   */
  executeAgentStream: (params: AgentExecutionRequest, port: MessagePort) => Promise<AgentExecutionResult>;

  /**
   * Cancel a running agent execution
   * @param executionId - ID of the execution to cancel
   * @returns Promise<{ success: boolean }> - Cancellation result
   */
  cancelAgent: (executionId: string) => Promise<{ success: boolean }>;

  /**
   * Get the status of a specific agent execution
   * @param executionId - ID of the execution to check
   * @returns Promise<AgentExecutionStatus> - Current execution status
   */
  getAgentStatus: (executionId: string) => Promise<AgentExecutionStatus>;

  /**
   * Get all available agents with their configurations
   * @returns Promise<AgentDisplay[]> - Array of available agents
   */
  listAgents: () => Promise<AgentDisplay[]>;

  /**
   * Get currently active agent executions
   * @returns Promise<ActiveExecution[]> - Array of active executions
   */
  getActiveExecutions: () => Promise<ActiveExecution[]>;

  /**
   * Register a new agent configuration
   * @param agentConfig - Agent configuration to register
   * @returns Promise<{ success: boolean; agentId?: string }> - Registration result
   */
  registerAgent: (agentConfig: AgentRegistrationRequest) => Promise<{ success: boolean; agentId?: string }>;

  /**
   * Unregister an agent
   * @param agentId - ID of the agent to unregister
   * @returns Promise<{ success: boolean }> - Unregistration result
   */
  unregisterAgent: (agentId: string) => Promise<{ success: boolean }>;

  /**
   * Send a chat message through the catalyst system
   * @param params - Chat message parameters
   * @returns Promise<CatalystResponse> - Chat response
   */
  sendChat: (params: CatalystRequest) => Promise<CatalystResponse>;

  /**
   * Send a chat message with streaming response
   * @param params - Chat message parameters with streaming callback
   * @returns Promise<CatalystResponse> - Initial chat response
   */
  sendChatStream: (params: CatalystRequest) => Promise<CatalystResponse>;

  /**
   * Get session information
   * @param params - Session request parameters
   * @returns Promise<CatalystResponse> - Session response
   */
  getSession: (params: CatalystRequest) => Promise<CatalystResponse>;

  /**
   * Cancel execution by ID
   * @param params - Cancellation parameters
   * @returns Promise<CatalystResponse> - Cancellation response
   */
  cancelExecution: (params: CatalystRequest) => Promise<CatalystResponse>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Agent execution request parameters
 */
export interface AgentExecutionRequest {
  agentId: string;
  input: string;
  context: {
    id: string;
    sessionId: string;
    userId: string;
    timestamp: number;
    correlationId: string;
    [key: string]: any;
  };
  options: {
    stream?: boolean;
    timeout?: number;
    maxTokens?: number;
    temperature?: number;
    [key: string]: any;
  };
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  success: boolean;
  messageId?: string;
  executionId?: string;
  response?: string;
  error?: string;
  metadata?: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    [key: string]: any;
  };
}

/**
 * Agent execution status
 */
export interface AgentExecutionStatus {
  found: boolean;
  execution?: {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    agentId: string;
    startTime: number;
    endTime?: number;
    progress?: number;
    result?: any;
    error?: string;
  };
}

/**
 * Active execution information
 */
export interface ActiveExecution {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  progress?: number;
  sessionId?: string;
}

/**
 * Agent registration request
 */
export interface AgentRegistrationRequest {
  id: string;
  name: string;
  type: string;
  description?: string;
  capabilities: string[];
  modelConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  settings?: Record<string, any>;
}

/**
 * Catalyst request for chat and session operations
 */
export interface CatalystRequest {
  message?: string;
  sessionId?: string;
  agentId?: string;
  executionId?: string;
  onChunk?: (chunk: StreamChunk) => void;
  [key: string]: any;
}

/**
 * Catalyst response wrapper
 */
export interface CatalystResponse {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  session?: any;
  agents?: any[];
  metadata?: Record<string, any>;
}

/**
 * Stream chunk for streaming responses
 */
export interface StreamChunk {
  type: 'thinking' | 'content' | 'error' | 'complete' | 'data';
  content: string | object;
  timestamp: number;
}

// ============================================================================
// Service Response Types for Renderer Services
// ============================================================================

/**
 * Standardized chat response for renderer services
 */
export interface ChatResponse {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

/**
 * Standardized agents response for renderer services
 */
export interface AgentsResponse {
  success: boolean;
  agents?: AgentDisplay[];
  error?: string;
}

/**
 * Standardized session response for renderer services
 */
export interface SessionResponse {
  success: boolean;
  session?: unknown;
  error?: string;
}

/**
 * Standardized execution cancel response for renderer services
 */
export interface ExecutionCancelResponse {
  success: boolean;
  error?: string;
}