import type { ElectronAPI } from '../../../shared/types/electron-api';
import type { PracticeOpportunityResult } from '../../../shared/types/electron-api/chat-api';
import type { AgentDisplay } from '../../../shared/types/electron-api/agent-api';
import type { SessionDisplay } from '../../../shared/types/electron-api/learning-api';
import type { Message, StreamChunk } from '../../../shared/types/ai';

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
  resumeWorkflow?: (params: {
    conversationId: string;
    checkpointId: string;
    questionId?: string;
    action: 'answer' | 'skip' | 'resume_later';
    input?: string;
  }) => Promise<{ success: boolean; resumed: boolean }>;
}

/**
 * Functional implementation of chat service using the unified electronAPI client
 */
export const createChatService = (apiClient: ElectronAPI): ChatService => {
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

    // Use catalyst API for sending messages
    const response = await apiClient.catalyst.sendChat({
      message: content,
      sessionId: sessionId,
      agentId: options?.agentId,
    });

    if (!response.success || response.data == null) {
      throw new Error(response.error ?? 'Failed to send message');
    }

    return {
      id: response.data.messageId ?? `msg_${Date.now()}`,
      role: 'assistant',
      content: response.data.response ?? '',
      timestamp: new Date(),
      provider: sessionId,
    };
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
    const assistantId = `assistant_${Date.now()}`;
    const startTime = Date.now();

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
          const responseTime = Date.now() - startTime;
          resolve({
            id: assistantId,
            role: 'assistant',
            content: aggregated,
            timestamp: new Date(),
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
    const response = await apiClient.sessions.get(sessionId);
    if (!response.success) return null;
    return response.data ?? null;
  };

  const createSession = async (
    title: string,
    options?: { description?: string },
  ): Promise<string | null> => {
    const response = await apiClient.sessions.create({
      title,
      description: options?.description,
    });
    if (!response.success) return null;
    return response.data?.sessionId ?? null;
  };

  const updateSession = async (
    sessionId: string,
    updates: { title?: string },
  ): Promise<boolean> => {
    const response = await apiClient.sessions.update(sessionId, updates);
    return !!response.success;
  };

  const getAvailableAgents = async (): Promise<AgentDisplay[]> => {
    const response = await apiClient.agents.getAvailableAgents();
    if (!response.success || !response.data) return [];
    return response.data;
  };

  const cancelExecution = async (executionId: string): Promise<void> => {
    await apiClient.catalyst.cancelAgent(executionId);
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
          timestamp: new Date(),
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

  const resumeWorkflow = async (params: {
    conversationId: string;
    checkpointId: string;
    questionId?: string;
    action: 'answer' | 'skip' | 'resume_later';
    input?: string;
  }): Promise<{ success: boolean; resumed: boolean }> => {
    // This method doesn't exist in the current API, return a default response
    // In a real implementation, this would call the appropriate API endpoint
    return {
      success: false,
      resumed: false,
    };
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
    resumeWorkflow,
  };
};
