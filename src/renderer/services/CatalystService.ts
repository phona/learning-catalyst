/**
 * Catalyst Service - Renderer IPC Interface
 *
 * Provides the renderer-side interface to the main process CatalystService
 * through dependency-injected IPC communication following proper architecture patterns.
 */

import type {
  CatalystRequest,
  AgentDisplay,
  ActiveExecution,
  StreamChunk
} from '@/shared/types/electron-api';
import { ICatalystIPCClient } from './ipc/ICatalystIPCClient';
import { ICatalystService, AgentInfo, ExecutionInfo } from './interfaces/ICatalystService';
import {
  ChatResponse,
  AgentsResponse,
  SessionResponse,
  ExecutionCancelResponse
} from './ipc/ICatalystIPCClient';
import { ElectronIPCClient } from './ipc/ElectronIPCClient';

export interface ChatOptions {
  sessionId?: string;
  agentId?: string;
  message?: string;
}

export interface ChatStreamOptions {
  sessionId?: string;
  agentId?: string;
}

/**
 * Renderer-side CatalystService that communicates with main process via dependency-injected IPC
 * Implements proper dependency injection pattern for testability and maintainability
 */
export class CatalystService implements ICatalystService {
  constructor(private ipcClient: ICatalystIPCClient) {}

  /**
   * Send a chat message via dependency-injected IPC client
   */
  async sendChat(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: 'Message cannot be empty'
      };
    }

    try {
      const request: CatalystRequest = {
        message: message.trim(),
        sessionId: options.sessionId,
        agentId: options.agentId
      };

      const response = await this.ipcClient.sendChat(request);
      return this.transformToChatResponse(response);
    } catch (error) {
      console.error('CatalystService.sendChat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a chat message with streaming response via dependency-injected IPC client
   */
  async sendChatStream(
    message: string,
    onChunk: (chunk: StreamChunk) => void,
    options: ChatStreamOptions = {}
  ): Promise<ChatResponse> {
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: 'Message cannot be empty'
      };
    }

    if (typeof onChunk !== 'function') {
      return {
        success: false,
        error: 'Streaming callback is required'
      };
    }

    try {
      const request: CatalystRequest = {
        message: message.trim(),
        sessionId: options.sessionId,
        agentId: options.agentId,
        onChunk
      };

      const response = await this.ipcClient.sendChatStream(request);
      return this.transformToChatResponse(response);
    } catch (error) {
      console.error('CatalystService.sendChatStream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get available agents via dependency-injected IPC client
   */
  async getAvailableAgents(): Promise<AgentsResponse> {
    try {
      const response = await this.ipcClient.getAvailableAgents({});
      return this.transformToAgentsResponse(response);
    } catch (error) {
      console.error('CatalystService.getAvailableAgents error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get session via dependency-injected IPC client
   */
  async getSession(sessionId: string): Promise<SessionResponse> {
    if (!sessionId || sessionId.trim().length === 0) {
      return {
        success: false,
        error: 'Session ID is required'
      };
    }

    try {
      const response = await this.ipcClient.getSession({ sessionId: sessionId.trim() });
      return this.transformToSessionResponse(response);
    } catch (error) {
      console.error('CatalystService.getSession error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Cancel execution via dependency-injected IPC client
   */
  async cancelExecution(executionId: string): Promise<ExecutionCancelResponse> {
    if (!executionId || executionId.trim().length === 0) {
      return {
        success: false,
        error: 'Execution ID is required'
      };
    }

    try {
      const response = await this.ipcClient.cancelExecution({ executionId: executionId.trim() });
      return this.transformToExecutionCancelResponse(response);
    } catch (error) {
      console.error('CatalystService.cancelExecution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get active executions (derived from agents or separate call)
   */
  async getActiveExecutions(): Promise<{
    success: boolean;
    executions?: ActiveExecution[];
    error?: string;
  }> {
    try {
      // This could be a separate IPC call or derived from agent status
      // For now, we'll return empty or could be extended based on requirements
      return {
        success: true,
        executions: []
      };
    } catch (error) {
      console.error('CatalystService.getActiveExecutions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Transform IPC response to typed chat response
   */
  private transformToChatResponse(response: unknown): ChatResponse {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: 'Invalid response received'
      };
    }

    const responseObj = response as Record<string, unknown>;

    return {
      success: responseObj.success as boolean || false,
      messageId: responseObj.data && typeof responseObj.data === 'object'
        ? (responseObj.data as { messageId?: string }).messageId
        : undefined,
      response: responseObj.data && typeof responseObj.data === 'object'
        ? (responseObj.data as { response?: string }).response
        : undefined,
      error: responseObj.error as string | undefined
    };
  }

  /**
   * Transform IPC response to typed agents response
   */
  private transformToAgentsResponse(response: unknown): AgentsResponse {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: 'Invalid response received'
      };
    }

    const responseObj = response as Record<string, unknown>;

    return {
      success: responseObj.success as boolean || false,
      agents: responseObj.data && typeof responseObj.data === 'object'
        ? (responseObj.data as { agents?: AgentDisplay[] }).agents
        : undefined,
      error: responseObj.error as string | undefined
    };
  }

  /**
   * Transform IPC response to typed session response
   */
  private transformToSessionResponse(response: unknown): SessionResponse {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: 'Invalid response received'
      };
    }

    const responseObj = response as Record<string, unknown>;

    return {
      success: responseObj.success as boolean || false,
      session: responseObj.data && typeof responseObj.data === 'object'
        ? (responseObj.data as { session?: unknown }).session
        : undefined,
      error: responseObj.error as string | undefined
    };
  }

  /**
   * Transform IPC response to typed execution cancel response
   */
  private transformToExecutionCancelResponse(response: unknown): ExecutionCancelResponse {
    if (!response || typeof response !== 'object') {
      return {
        success: false,
        error: 'Invalid response received'
      };
    }

    const responseObj = response as Record<string, unknown>;

    return {
      success: responseObj.success as boolean || false,
      error: responseObj.error as string | undefined
    };
  }
}