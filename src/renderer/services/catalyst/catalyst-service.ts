import type { ElectronAPI } from '../../../shared/types/electron-api';
import type { ChatOptions } from '../../../shared/types/ai';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';

// Local type definitions for catalyst service
interface StreamChunk {
  type: 'thinking' | 'content' | 'error' | 'complete' | 'data';
  content: string | object;
  timestamp: number;
}

interface ChatErrorObject {
  code: string;
  message: string;
}

interface ChatResponse {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string | ChatErrorObject;
}

interface AgentsResponse {
  success: boolean;
  agents?: unknown[];
  error?: string;
}

interface SessionResponse {
  success: boolean;
  session?: unknown;
  error?: string;
}

interface ExecutionCancelResponse {
  success: boolean;
  error?: string;
}

// Define ChatStreamOptions locally since it's not found
export interface ChatStreamOptions extends ChatOptions {
  agentId?: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface CatalystService {
  sendChat(message: string, options?: ChatStreamOptions): Promise<ChatResponse>;
  sendChatStream(
    message: string,
    onChunk: (chunk: StreamChunk) => void,
    options?: ChatStreamOptions,
  ): Promise<ChatResponse>;
  getAvailableAgents(): Promise<AgentsResponse>;
  getSession(sessionId: string): Promise<SessionResponse>;
  cancelExecution(executionId: string): Promise<ExecutionCancelResponse>;
  // Deprecated methods removed: getActiveExecutions
}

/**
 * Functional implementation of catalyst service using electronAPI
 */
export const createCatalystService = (electronAPI: ElectronAPI): CatalystService => {
  return {
    async sendChat(message: string, options?: ChatStreamOptions): Promise<ChatResponse> {
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Message cannot be empty',
        };
      }

      try {
        if (!electronAPI?.catalyst?.sendChat) {
          throw new Error('Catalyst sendChat API not available');
        }

        const data = await unwrapAPI(electronAPI.catalyst.sendChat({
          message: message.trim(),
          agentId: options?.agentId || 'default',
          sessionId: options?.sessionId || 'default',
          stream: false,
        }));

        return {
          success: true,
          messageId: (data as any).messageId,
          response: (data as any).response,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Chat request failed',
        };
      }
    },

    async sendChatStream(
      message: string,
      onChunk: (chunk: StreamChunk) => void,
      options?: ChatStreamOptions,
    ): Promise<ChatResponse> {
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: { code: 'invalid_message', message: 'Message cannot be empty' },
        };
      }

      if (typeof onChunk !== 'function') {
        return {
          success: false,
          error: { code: 'invalid_callback', message: 'onChunk callback is required for streaming' },
        };
      }

      try {
        if (!electronAPI?.catalyst?.sendChatStream) {
          throw new Error('Catalyst sendChatStream API not available');
        }

        const response = await electronAPI.catalyst.sendChatStream({
          message: message.trim(),
          agentId: options?.agentId || 'default',
          sessionId: options?.sessionId || 'default',
          onChunk,
        });

        if (!response.success || !response.data) {
          const errorMsg = typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Chat stream failed';
          throw new Error(errorMsg);
        }

        return {
          success: true,
          messageId: (response.data as any).messageId,
          response: (response.data as any).response,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Chat stream failed',
        };
      }
    },

    async getAvailableAgents(): Promise<AgentsResponse> {
      try {
        // Use the agents API instead of deprecated catalyst.listAgents
        if (!electronAPI?.agents?.getAvailableAgents) {
          throw new Error('Agents API not available');
        }

        const agents = await unwrapAPI(electronAPI.agents.getAvailableAgents());

        return {
          success: true,
          agents: agents as any,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get agents',
        };
      }
    },

    async getSession(sessionId: string): Promise<SessionResponse> {
      if (!sessionId || sessionId.trim().length === 0) {
        return {
          success: false,
          error: 'Session ID is required',
        };
      }

      try {
        if (!electronAPI?.sessions?.get) {
          throw new Error('Sessions API not available');
        }

        const session = await unwrapAPI(electronAPI.sessions.get(sessionId));

        return {
          success: true,
          session: session as any,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get session',
        };
      }
    },

    async cancelExecution(executionId: string): Promise<ExecutionCancelResponse> {
      if (!executionId || executionId.trim().length === 0) {
        return {
          success: false,
          error: 'Execution ID is required',
        };
      }

      try {
        if (!electronAPI?.catalyst?.cancelAgent) {
          throw new Error('Catalyst cancelAgent API not available');
        }

        await unwrapAPI(electronAPI.catalyst.cancelAgent(executionId));

        return {
          success: true,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel execution',
        };
      }
    },
  };
};
