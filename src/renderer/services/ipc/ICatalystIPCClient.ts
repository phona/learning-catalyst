import type {
  CatalystRequest,
  CatalystResponse,
  AgentDisplay,
  ActiveExecution,
  StreamChunk
} from '@/shared/types/electron-api';

/**
 * IPC Client interface for Catalyst service communication
 * Provides abstraction layer for IPC communication with main process
 */
export interface ICatalystIPCClient {
  /**
   * Send a chat message to main process
   * @param request - Chat request containing message and options
   * @returns Promise resolving to chat response
   */
  sendChat(request: CatalystRequest): Promise<CatalystResponse>;

  /**
   * Send a chat message with streaming response
   * @param request - Chat request with streaming callback
   * @returns Promise resolving to streaming response
   */
  sendChatStream(request: CatalystRequest): Promise<CatalystResponse>;

  /**
   * Get available AI agents from main process
   * @param request - Request object (may be empty)
   * @returns Promise resolving to agents list response
   */
  getAvailableAgents(request: CatalystRequest): Promise<CatalystResponse>;

  /**
   * Get session information from main process
   * @param request - Session request containing session ID
   * @returns Promise resolving to session response
   */
  getSession(request: CatalystRequest): Promise<CatalystResponse>;

  /**
   * Cancel an active execution
   * @param request - Cancel request containing execution ID
   * @returns Promise resolving to cancel response
   */
  cancelExecution(request: CatalystRequest): Promise<CatalystResponse>;
}

/**
 * Standardized response types for better type safety
 */
export interface ChatResponse {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

export interface AgentsResponse {
  success: boolean;
  agents?: AgentDisplay[];
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  session?: unknown;
  error?: string;
}

export interface ExecutionCancelResponse {
  success: boolean;
  error?: string;
}