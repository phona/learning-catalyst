/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




import type { ElectronAPIClient } from '../api/electron-api-client';
import type {
  ChatMessage,
  ChatResponse,
  StreamChunk,
  AgentInfo,
  ActiveExecution,
  ChatStreamOptions,
  ChatOptions
} from '@/shared/types/catalyst';

export interface CatalystService {
  sendChat(message: string, options?: ChatOptions): Promise<ChatResponse>;
  sendChatStream(
    message: string,
    onChunk: (chunk: StreamChunk) => void,
    options?: ChatStreamOptions
  ): Promise<ChatResponse>;
  getAvailableAgents(): Promise<{agents: AgentInfo[]}>;
  getSession(sessionId: string): Promise<{success: boolean; session?: any; error?: string}>;
  cancelExecution(executionId: string): Promise<{success: boolean; error?: string}>;
  getActiveExecutions(): Promise<{success: boolean; executions?: ActiveExecution[]; error?: string}>;
}

/**
 * Functional implementation of catalyst service using the unified electronAPI client
 */
export const createCatalystService = (apiClient: ElectronAPIClient): CatalystService => {
  return {
    async sendChat(message: string, options?: ChatOptions): Promise<ChatResponse> {
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Message cannot be empty'
        };
      }

      const response = await apiClient.catalyst.sendChat({
        message: message.trim(),
        options: options || {
          agentId: 'default',
          sessionId: 'default',
          stream: false,
          context: {}
        }
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Chat request failed'
        };
      }

      return {
        success: true,
        data: response.data
      };
    },

    async sendChatStream(
      message: string,
      onChunk: (chunk: StreamChunk) => void,
      options?: ChatStreamOptions
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
          error: 'onChunk callback is required for streaming'
        };
      }

      try {
        // Use the streaming endpoint which will call onChunk for each received chunk
        const response = await apiClient.catalyst.sendChatStream({
          message: message.trim(),
          onChunk,
          options: options || {
            agentId: 'default',
            sessionId: 'default',
            context: {}
          }
        });

        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Chat stream failed'
        };
      }
    },

    async getAvailableAgents(): Promise<{agents: AgentInfo[]}> {
      const response = await apiClient.catalyst.getAvailableAgents();

      if (!response.success) {
        throw new Error(response.error || 'Failed to get available agents');
      }

      return {
        agents: response.data?.agents || []
      };
    },

    async getSession(sessionId: string): Promise<{success: boolean; session?: any; error?: string}> {
      if (!sessionId || sessionId.trim().length === 0) {
        return {
          success: false,
          error: 'Session ID is required'
        };
      }

      const response = await apiClient.catalyst.getSession(sessionId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to get session'
        };
      }

      return {
        success: true,
        session: response.data
      };
    },

    async cancelExecution(executionId: string): Promise<{success: boolean; error?: string}> {
      if (!executionId || executionId.trim().length === 0) {
        return {
          success: false,
          error: 'Execution ID is required'
        };
      }

      const response = await apiClient.catalyst.cancelExecution(executionId);

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to cancel execution'
        };
      }

      return {
        success: true
      };
    },

    async getActiveExecutions(): Promise<{success: boolean; executions?: ActiveExecution[]; error?: string}> {
      const response = await apiClient.catalyst.getActiveExecutions();

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to get active executions'
        };
      }

      return {
        success: true,
        executions: response.data?.executions || []
      };
    }
  };
};