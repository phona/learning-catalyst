
import type {
  ActiveExecution,
  StreamChunk,
  ChatResponse,
  AgentsResponse,
  SessionResponse,
  ExecutionCancelResponse
} from '@/shared/types/electron-api';
import type { ChatOptions } from '@/shared/types/ai';
import type { ChatStreamOptions } from '../catalyst/catalyst-service';

/**
 * Catalyst service interface for renderer process
 * Defines contract for AI agent communication and orchestration
 */
export interface ICatalystService {
  /**
   * Send a chat message to AI agents
   * @param message - The message to send
   * @param options - Optional chat configuration
   * @returns Promise resolving to chat response
   */
  sendChat(message: string, options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Send a chat message with streaming response
   * @param message - The message to send
   * @param onChunk - Callback for processing streaming chunks
   * @param options - Optional chat configuration
   * @returns Promise resolving to streaming response
   */
  sendChatStream(
    message: string,
    onChunk: (chunk: StreamChunk) => void,
    options?: ChatStreamOptions
  ): Promise<ChatResponse>;

  /**
   * Get available AI agents
   * @returns Promise resolving to list of available agents
   */
  getAvailableAgents(): Promise<AgentsResponse>;

  /**
   * Get session information
   * @param sessionId - Session identifier
   * @returns Promise resolving to session data
   */
  getSession(sessionId: string): Promise<SessionResponse>;

  /**
   * Cancel an active execution
   * @param executionId - Execution identifier to cancel
   * @returns Promise resolving to cancel result
   */
  cancelExecution(executionId: string): Promise<ExecutionCancelResponse>;

  /**
   * Get active executions
   * @returns Promise resolving to list of active executions
   */
  getActiveExecutions(): Promise<{
    success: boolean;
    executions?: ActiveExecution[];
    error?: string;
  }>;
}

/**
 * Agent information for display purposes
 */
export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  enabled: boolean;
  model_config?: {
    provider: string;
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
}

/**
 * Execution information for tracking
 */
export interface ExecutionInfo {
  id: string;
  agentId: string;
  status: string;
  startTime: string;
  progress?: number;
  error?: string;
}