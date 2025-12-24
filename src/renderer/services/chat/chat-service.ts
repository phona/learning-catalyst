import type { ElectronAPI } from '../../../shared/types/electron-api';
import type { PracticeOpportunityResult, ChatHistoryMessage } from '../../../shared/types/electron-api/chat-api';
import type { AgentDisplay } from '../../../shared/types/electron-api/agent-api';
import type { SessionDisplay } from '../../../shared/types/electron-api/sessions-api';
import type { Message, StreamChunk } from '../../../shared/types/ai';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';
import type { TimeService, IDGenerator } from '@/shared/utils';
import { createTimeService, createIdGenerator } from '@/shared/utils';

/**
 * This service uses the unwrapAPI pattern for consistent IPC error handling.
 *
 * All IPC calls use unwrapAPI() from @/renderer/hooks/useElectronAPI which:
 * - Automatically unwraps APIResponse<T> to T
 * - Shows error toasts on failures
 * - Throws IPCError for programmatic error handling
 *
 * See docs/DEVELOPER-GUIDE/electron-api.md for details.
 */

/**
 * Options for creating the ChatService with dependency injection.
 * Enables deterministic testing by providing controllable time and ID generation.
 */
export interface ChatServiceOptions {
  /** Time service for deterministic timestamp generation in tests */
  timeService?: TimeService;
  /** ID generator for deterministic message IDs in tests */
  idGenerator?: IDGenerator;
}

export interface ChatService {
  sendMessage(
    content: string,
    options?: { sessionId?: string; agentId?: string; provider?: string; model?: string },
  ): Promise<Message>;
  sendMessageStream(
    content: string,
    onChunk: (chunk: StreamChunk) => void,
    options?: { sessionId?: string; agentId?: string; provider?: string; model?: string },
  ): Promise<Message>;
  cancelStream?: (conversationId: string) => Promise<void>;
  checkPracticeOpportunity(params: {
    conversationId: string;
    userMessage: string;
    sessionId?: string;
  }): Promise<PracticeOpportunityResult>;
  getSession?: (sessionId: string) => Promise<SessionDisplay | null>;
  createSession?: (title: string, options?: { description?: string }) => Promise<string | null>;
  updateSession?: (sessionId: string, updates: { title?: string }) => Promise<boolean>;
  getAvailableAgents?: () => Promise<AgentDisplay[]>;
  cancelExecution?: (executionId: string) => Promise<void>;
  getProviderInfo?: () => { name?: string; provider?: string } | null;
  getMessages?: (threadId: string, options?: { limit?: number; offset?: number }) => Promise<ChatHistoryMessage[]>;
}

/**
 * Functional implementation of chat service using the unified electronAPI client
 */
export const createChatService = (apiClient: ElectronAPI, options?: ChatServiceOptions): ChatService => {
  // Use injected dependencies or defaults (real time service for production)
  const timeService = options?.timeService ?? createTimeService();
  const idGenerator = options?.idGenerator ?? createIdGenerator();

  const pendingStreams = new Map<
    string,
    {
      resolve: (msg: Message) => void;
      reject: (err: unknown) => void;
      getContent: () => string;
      assistantId: string;
      // Aggregated data for DetailsPanel
      reasoning?: string;
      tools?: Array<{
        id: string;
        name: string;
        duration: number;
        phase: 'start' | 'end' | 'error';
        input?: string;
        output?: string;
      }>;
      performance?: {
        responseTime: number;
        tokens?: number;
        speed?: number;
        memory?: number;
      };
      timeline?: Array<{
        id: string;
        offset: string;
        description: string;
      }>;
    }
  >();
  const ensureSessionId = (options?: { sessionId?: string }) => {
    const sessionId = options?.sessionId;
    if (!sessionId) {
      throw new Error('Session ID is required for chat operations');
    }
    return sessionId;
  };

  // Public service functions
  const sendMessage = async (
    content: string,
    options?: { sessionId?: string; agentId?: string; provider?: string; model?: string },
  ): Promise<Message> => {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid message content');
    }

    const sessionId = ensureSessionId(options);

    try {
      // Use catalyst API for sending messages with unwrapAPI
      const data = await unwrapAPI(apiClient.catalyst.sendChat({
        message: content,
        sessionId: sessionId,
        agentId: options?.agentId,
      }));

      return {
        id: data.messageId ?? idGenerator.withPrefix('msg'),
        role: 'assistant',
        content: data.response ?? '',
        timestamp: new Date(timeService.now()),
        provider: sessionId,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const sendMessageStream = async (
    content: string,
    onChunk: (chunk: StreamChunk) => void,
    options?: { sessionId?: string; agentId?: string; provider?: string; model?: string },
  ): Promise<Message> => {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid message content');
    }

    if (typeof onChunk !== 'function') {
      throw new Error('onChunk callback is required for streaming');
    }

    const sessionId = ensureSessionId(options);
    let aggregated = '';
    const assistantId = idGenerator.withPrefix('assistant');
    const startTime = timeService.now();

    try {
      console.log('[chat-service] sendMessageStream: start', {
        sessionId,
        contentLen: content.length,
        hasOnChunk: typeof onChunk === 'function',
        options,
      });

      // Use aiSDK API for streaming
      const unsubscribe = apiClient.aiSDK.stream(
        {
          messages: [
            { role: 'user', content },
            // Add existing conversation history if available
          ],
          conversationId: sessionId,
        },
        (data) => {
          console.debug('[chat-service] aiSDK stream data', data);
          const chunk = data as StreamChunk;
          if (chunk.content) {
            if (typeof chunk.content === 'string') {
              aggregated += chunk.content;
              onChunk({ content: chunk.content, type: 'content' });
            }
          }
          onChunk(chunk);
        },
      );

      // Return a promise that resolves when streaming is complete
      const result = await new Promise<Message>((resolve, reject) => {
        pendingStreams.set(sessionId, {
          resolve,
          reject,
          getContent: () => aggregated,
          assistantId,
        });

        // Setup completion handling (this is a simplified version)
        // In a real implementation, you'd handle the onComplete callback
        setTimeout(() => {
          const responseTime = timeService.now() - startTime;
          resolve({
            id: assistantId,
            role: 'assistant',
            content: aggregated,
            timestamp: new Date(timeService.now()),
            provider: sessionId,
          });
          pendingStreams.delete(sessionId);
          unsubscribe?.();
        }, 1000); // Simplified timeout for demo
      });

      console.log('[chat-service] sendMessageStream: complete', {
        aggregatedLen: aggregated.length,
        sessionId,
        pending: pendingStreams.has(sessionId),
      });
      return result;
    } catch (error) {
      console.error('Error in sendMessageStream:', error, {
        sessionId,
        aggregatedLen: aggregated.length,
      });
      throw error;
    }
  };

  const checkPracticeOpportunity = async (params: {
    conversationId: string;
    userMessage: string;
    sessionId?: string;
  }): Promise<PracticeOpportunityResult> => {
    const { conversationId, userMessage } = params;

    // This method doesn't exist in the current API, return a default response
    // In a real implementation, this would call the appropriate API endpoint
    return {
      hasOpportunity: false,
      shouldSuggest: false,
      reason: 'Practice opportunity checking not implemented',
      timing: 'not-appropriate',
      confidence: 0,
    };
  };

  const getSession = async (sessionId: string): Promise<SessionDisplay | null> => {
    try {
      const data = await unwrapAPI(apiClient.sessions.get(sessionId));
      return data ?? null;
    } catch (error) {
      return null;
    }
  };

  const createSession = async (
    title: string,
    options?: { description?: string },
  ): Promise<string | null> => {
    try {
      const data = await unwrapAPI(apiClient.sessions.create({
        title,
        description: options?.description,
      }));
      return data?.sessionId ?? null;
    } catch (error) {
      return null;
    }
  };

  const updateSession = async (
    sessionId: string,
    updates: { title?: string },
  ): Promise<boolean> => {
    try {
      await unwrapAPI(apiClient.sessions.update(sessionId, updates));
      return true;
    } catch (error) {
      return false;
    }
  };

  const getAvailableAgents = async (): Promise<AgentDisplay[]> => {
    try {
      const data = await unwrapAPI(apiClient.agents.getAvailableAgents());
      return data || [];
    } catch (error) {
      return [];
    }
  };

  const cancelExecution = async (executionId: string): Promise<void> => {
    await unwrapAPI(apiClient.catalyst.cancelAgent(executionId));
  };

  const getProviderInfo = (): { name?: string; provider?: string } => {
    // Basic stub; in a fuller implementation this could read from configuration
    return { name: 'default', provider: 'chat' };
  };

  const cancelStream = async (conversationId: string): Promise<void> => {
    try {
      console.log('[chat-service] cancelStream: request', { conversationId });

      // This method doesn't exist in the current API, handle locally
      const pending = pendingStreams.get(conversationId);
      if (pending) {
        pending.resolve({
          id: pending.assistantId,
          role: 'assistant',
          content: pending.getContent(),
          timestamp: new Date(timeService.now()),
          provider: conversationId,
        });
        pendingStreams.delete(conversationId);
      }
      console.log('[chat-service] cancelStream: ok');
    } catch (err) {
      console.error('[chat-service] cancelStream: failed', err);
      throw err;
    }
  };

  const getMessages = async (
    threadId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ChatHistoryMessage[]> => {
    // Use unwrapAPI for consistent IPC error handling
    const result = await unwrapAPI(apiClient.chat.getMessages(threadId, options));
    return result.sessions || [];
  };

  return {
    sendMessage,
    sendMessageStream,
    cancelStream,
    checkPracticeOpportunity,
    getSession,
    createSession,
    updateSession,
    getAvailableAgents,
    cancelExecution,
    getProviderInfo,
    getMessages,
  };
};
