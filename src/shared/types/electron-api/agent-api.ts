/**
 * Agent API Types
 *
 * Type definitions for agent-related IPC communication
 * between renderer and main processes.
 */

import { AgentConfig, AgentExecutionRequest, AgentExecutionChunk, ServiceExecutionContext } from '../../main/services/types';

/**
 * Agent execution request from renderer
 */
export interface AgentExecutionRequestAPI {
  agentId: string;
  input: string | Record<string, any>;
  sessionId: string;
  options: {
    stream?: boolean;
    tools?: string[];
    timeout?: number;
    maxIterations?: number;
  };
}

/**
 * Agent execution chunk sent from main to renderer
 */
export interface AgentExecutionChunkAPI {
  type: 'start' | 'progress' | 'tool-call' | 'tool-result' | 'data' | 'error' | 'complete';
  content: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Agent execution response
 */
export interface AgentExecutionResponse {
  success: boolean;
  executionId: string;
  data?: any;
  error?: string;
  chunks?: AgentExecutionChunkAPI[];
}

/**
 * Agent status information
 */
export interface AgentStatus {
  agentId: string;
  name: string;
  type: string;
  enabled: boolean;
  registered: boolean;
}

/**
 * Agent execution status
 */
export interface AgentExecutionStatus {
  executionId: string;
  agentId: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  startTime: number;
  endTime?: number;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

/**
 * Streaming agent execution interface
 */
export interface StreamingAgentExecution {
  executionId: string;
  port: MessagePort;
  start(): Promise<void>;
  cancel(): Promise<void>;
  onChunk(callback: (chunk: AgentExecutionChunkAPI) => void): void;
  onComplete(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
}

/**
 * Agent API interface for renderer process
 */
export interface AgentAPI {
  // Agent execution
  executeAgent(request: AgentExecutionRequestAPI): Promise<AgentExecutionResponse>;
  executeAgentStream(request: AgentExecutionRequestAPI): Promise<StreamingAgentExecution>;

  // Agent management
  getAgents(): Promise<AgentStatus[]>;
  getAgent(agentId: string): Promise<AgentStatus | null>;
  registerAgent(config: AgentConfig): Promise<{ success: boolean }>;
  unregisterAgent(agentId: string): Promise<{ success: boolean }>;

  // Execution management
  cancelExecution(executionId: string): Promise<{ success: boolean }>;
  getExecutionStatus(executionId: string): Promise<AgentExecutionStatus>;
  getActiveExecutions(): Promise<AgentExecutionStatus[]>;
}