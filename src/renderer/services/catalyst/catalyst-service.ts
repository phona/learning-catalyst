import type { ElectronAPI } from '../../../shared/types/electron-api';
import type { ChatOptions } from '../../../shared/types/ai';
import type {
  ActiveExecution,
  StreamChunk,
  ChatResponse,
  AgentsResponse,
  SessionResponse,
  ExecutionCancelResponse,
} from '../../../shared/types/electron-api';

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
  getActiveExecutions(): Promise<{
    success: boolean;
    executions?: ActiveExecution[];
    error?: string;
  }>;
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

        const response = await electronAPI.catalyst.sendChat({
          message: message.trim(),
          agentId: options?.agentId || 'default',
          sessionId: options?.sessionId || 'default',
          stream: false,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Chat request failed');
        }

        return {
          success: true,
          messageId: (response.data as any).messageId,
          response: (response.data as any).response,
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
          error: 'Message cannot be empty',
        };
      }

      if (typeof onChunk !== 'function') {
        return {
          success: false,
          error: 'onChunk callback is required for streaming',
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
          throw new Error(response.error || 'Chat stream failed');
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
        if (!electronAPI?.catalyst?.listAgents) {
          throw new Error('Catalyst listAgents API not available');
        }

        const agents = await electronAPI.catalyst.listAgents();
        if (!agents.success || !agents.data) {
          throw new Error(agents.error || 'Failed to get agents');
        }

        return {
          success: true,
          agents: agents.data as any,
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

        const session = await electronAPI.sessions.get(sessionId);
        if (!session.success || !session.data) {
          throw new Error(session.error || 'Failed to get session');
        }

        return {
          success: true,
          session: session.data as any,
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

        const result = await electronAPI.catalyst.cancelAgent(executionId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to cancel execution');
        }

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

    async getActiveExecutions(): Promise<{
      success: boolean;
      executions?: ActiveExecution[];
      error?: string;
    }> {
      try {
        if (!electronAPI?.catalyst?.getActiveExecutions) {
          throw new Error('Catalyst getActiveExecutions API not available');
        }

        const executions = await electronAPI.catalyst.getActiveExecutions();
        if (!executions.success) {
          throw new Error(executions.error || 'Failed to get active executions');
        }

        return {
          success: true,
          executions: executions.data as any,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get active executions',
        };
      }
    },
  };
};
