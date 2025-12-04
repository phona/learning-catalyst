import type { ElectronAPI } from '@/shared/types/electron-api';
import type { PracticeOpportunityResult } from '@/shared/types/electron-api/chat-api';
import type { AgentDisplay } from '@/shared/types/electron-api/agent-api';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type { Message, StreamChunk } from '@/shared/types/ai';

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
    const response = await apiClient.chat.sendMessage({
      conversationId: sessionId,
      message: content,
    });

    if (!response.success || response.data == null) {
      throw new Error(response.error?.message ?? 'Failed to send message');
    }

    return {
      id: response.data.id,
      role: response.data.role,
      content: response.data.content,
      timestamp: new Date(response.data.timestamp),
      provider: response.data.conversationId,
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
    const streamData = {
      reasoning: '',
      tools: [] as NonNullable<typeof pendingStreams extends Map<any, infer V> ? V : any>['tools'],
      performance: {
        responseTime: 0,
      } as NonNullable<typeof pendingStreams extends Map<any, infer V> ? V : any>['performance'],
      timeline: [] as NonNullable<typeof pendingStreams extends Map<any, infer V> ? V : any>['timeline'],
    };

    try {
      console.log('[chat-service] sendMessageStream: start', {
        sessionId,
        contentLen: content.length,
        hasOnChunk: typeof onChunk === 'function',
        options,
      });

      const started = await apiClient.chat.sendMessageStream(
        {
          conversationId: sessionId,
          message: content,
        },
        (evt) => {
          console.debug('[chat-service] stream event', {
            type: evt.type,
            hasChunk: !!(evt as any).chunk,
            hasStatus: !!(evt as any).status,
            error: (evt as any).error,
          });
          if (evt.type === 'chunk') {
            const chunk = evt.chunk as unknown;
            if (typeof chunk === 'string') {
              console.debug('[chat-service] stream chunk', { len: String(chunk.length) });
              aggregated += chunk;
              onChunk({ content: chunk, type: 'content' });
            } else if (chunk && typeof chunk === 'object') {
              const typed = chunk as StreamChunk;
              console.debug('[chat-service] stream chunk object', {
                type: typed.type ?? 'content',
                hasContent: Boolean(typed.content),
              });
              if (!typed.type || typed.type === 'content') {
                const text = typed.content ?? '';
                aggregated += text;
              }
              onChunk(typed);
            } else {
              const fallback = String(chunk ?? '');
              aggregated += fallback;
              onChunk({ type: 'content', content: fallback });
            }
          } else if (evt.type === 'complete') {
            const resolver = pendingStreams.get(sessionId)?.resolve;
            if (resolver) {
              console.debug('[chat-service] stream complete event');
              const responseTime = Date.now() - startTime;
              resolver({
                id: assistantId,
                role: 'assistant',
                content: aggregated,
                timestamp: new Date(),
                provider: sessionId,
                reasoning: streamData.reasoning || undefined,
                tools: streamData.tools.length > 0 ? streamData.tools : undefined,
                performance: {
                  ...streamData.performance,
                  responseTime,
                },
                timeline: streamData.timeline.length > 0 ? streamData.timeline : undefined,
              });
              pendingStreams.delete(sessionId);
            }
          } else if (evt.type === 'error') {
            console.debug('[chat-service] stream error event', { error: evt.error });
            // Bubble a status to ensure UI shows failure context before rejecting
            onChunk({
              type: 'status',
              status: { type: 'fail', category: 'unknown', suggestion: evt.error },
            } as StreamChunk & { status?: unknown });
            const rejecter = pendingStreams.get(sessionId)?.reject;
            if (rejecter) {
              rejecter(new Error(evt.error || 'Streaming error'));
              pendingStreams.delete(sessionId);
            }
          } else if (evt.type === 'status') {
            console.debug('[chat-service] stream status', evt.status);
            // Collect status data for DetailsPanel
            const status = evt.status;
            if (status && typeof status === 'object' && 'type' in status) {
              if (status.type === 'thought' && 'text' in status) {
                streamData.reasoning += (streamData.reasoning ? '\n\n' : '') + status.text;
              } else if (status.type === 'tool' && 'tool' in status && 'phase' in status) {
                const existingTool = streamData.tools.find(t => t.name === status.tool);
                const toolEntry = {
                  id: `tool_${status.tool}_${Date.now()}_${Math.random()}`,
                  name: status.tool,
                  duration: 0, // Will be calculated
                  phase: status.phase as 'start' | 'end' | 'error',
                  input: status.detail && status.phase === 'start' ? status.detail : undefined,
                  output: status.detail && status.phase === 'end' ? status.detail : undefined,
                };
                if (existingTool) {
                  Object.assign(existingTool, toolEntry);
                } else {
                  streamData.tools.push(toolEntry);
                }
              } else if (status.type === 'timeline_event' && 'event' in status) {
                const event = status.event;
                if (event && typeof event === 'object' && 'type' in event && 'text' in event) {
                  const offsetMs = Date.now() - startTime;
                  const offset = offsetMs < 1000
                    ? `${offsetMs}ms`
                    : `${(offsetMs / 1000).toFixed(1)}s`;
                  streamData.timeline.push({
                    id: event.id || `event_${Date.now()}_${Math.random()}`,
                    offset,
                    description: event.text || 'Event',
                  });
                }
              }
            }
            onChunk({ type: 'status', status: evt.status } as StreamChunk & { status?: unknown });
          }
        },
      );

      // If the API returns an async iterable, consume it
      const data = (started as any)?.data;
      const isAsyncIterable = data && typeof data[Symbol.asyncIterator] === 'function';
      if (isAsyncIterable) {
        for await (const chunk of data as AsyncIterable<unknown>) {
          if (typeof chunk === 'string') {
            aggregated += chunk;
            onChunk({ content: chunk, type: 'content' });
          } else if (chunk && typeof chunk === 'object') {
            const typed = chunk as StreamChunk;
            if (!typed.type || typed.type === 'content') {
              aggregated += typed.content ?? '';
            }
            onChunk(typed);
          } else {
            const part = String(chunk ?? '');
            aggregated += part;
            onChunk({ content: part, type: 'content' });
          }
        }
        const responseTime = Date.now() - startTime;
        return {
          id: assistantId,
          role: 'assistant',
          content: aggregated,
          timestamp: new Date(),
          provider: sessionId,
          reasoning: streamData.reasoning || undefined,
          tools: streamData.tools.length > 0 ? streamData.tools : undefined,
          performance: {
            ...streamData.performance,
            responseTime,
          },
          timeline: streamData.timeline.length > 0 ? streamData.timeline : undefined,
        };
      }

      if (!started.success || !started.data?.started) {
        throw new Error(started.error?.message ?? 'Failed to start streaming');
      }

      // Wait until 'complete' or 'error' via the event callback
      const result = await new Promise<Message>((resolve, reject) => {
        pendingStreams.set(sessionId, {
          resolve,
          reject,
          getContent: () => aggregated,
          assistantId,
          reasoning: streamData.reasoning,
          tools: streamData.tools,
          performance: streamData.performance,
          timeline: streamData.timeline,
        });
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
    const response = await apiClient.chat.checkPracticeOpportunity({
      conversationId,
      userMessage,
    });

    if (!response.success || response.data == null) {
      throw new Error(response.error?.message ?? 'Failed to check practice opportunity');
    }

    return response.data;
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
      await apiClient.chat.cancelStream(conversationId);
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
  };
};
