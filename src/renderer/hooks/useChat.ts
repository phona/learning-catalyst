/**
 * Use Chat Hook - Simplified Chat Interface
 *
 * React hook that provides a simple interface for chat functionality using the new
 * high-level ChatService with dependency injection. This replaces the complex useChatStore
 * with a cleaner implementation that abstracts away the multi-agent architecture complexity.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatService } from '@/renderer/services/services-provider';
import type { Message as ChatMessage, StreamChunk as BaseStreamChunk } from '@/shared/types/ai';
import type { ChatService } from '@/renderer/services/chat/chat-service';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';

type ChatStreamChunk = BaseStreamChunk & { type?: string };

export interface UseChatOptions {
  sessionId?: string;
  agentId?: string;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseChatResult {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  currentSession: SessionDisplay | null;

  // Actions
  sendMessage: (content: string, options?: { agentId?: string }) => Promise<void>;
  sendMessageStream: (
    content: string,
    onChunk?: (chunk: ChatStreamChunk) => void,
    options?: { agentId?: string },
  ) => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearMessages: () => void;
  setError: (error: string | null) => void;

  // Session management
  createSession: (title: string, description?: string) => Promise<string | null>;
  loadSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (title: string) => Promise<void>;

  // Agent management
  getAvailableAgents: () => Promise<any[]>;
  setSelectedAgent: (agentId: string) => void;
  selectedAgent: string | null;
}

export function useChat(options: UseChatOptions = {}): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionDisplay | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(options.agentId ?? null);

  const streamingExecutionRef = useRef<string | null>(null);
  const chatService = useChatService();

  // Load session by ID - define before useEffect to fix dependency issue
  const loadSession = useCallback(
    async (sessionId: string) => {
      if (!chatService) return;

      try {
        setIsLoading(true);
        setError(null);

        const session = chatService.getSession ? await chatService.getSession(sessionId) : null;

        if (session) {
          setCurrentSession(session);
          // Messages would need to be loaded separately
          setMessages([]);
        } else {
          setError('Session not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
        setError(errorMessage);
        options.onError?.(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    },
    [chatService, options.onError],
  );

  // Load initial session if provided
  useEffect(() => {
    if (options.sessionId && chatService) {
      loadSession(options.sessionId);
    }
  }, [options.sessionId, chatService, loadSession]);

  // Send a simple message
  const sendMessage = useCallback(
    async (content: string, sendOptions: { agentId?: string } = {}) => {
      if (!chatService) return;

      try {
        setIsLoading(true);
        setError(null);

        // Add user message to local state
        const userMessage: ChatMessage = {
          id: `user_${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Ensure session exists
        let sessionId: string | undefined = currentSession?.id ?? options.sessionId;
        if (!sessionId && chatService.createSession) {
          const createdId = await chatService.createSession('Untitled Session');
          if (!createdId) {
            throw new Error('Failed to create session');
          }
          await loadSession(createdId);
          sessionId = createdId;
        }

        // Send message using chat service
        const response = await chatService.sendMessage(content, {
          sessionId,
          agentId: sendOptions.agentId ?? selectedAgent ?? undefined,
        });

        // Add assistant message to local state
        setMessages((prev) => [...prev, response]);
        options.onMessage?.(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        options.onError?.(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    },
    [
      chatService,
      currentSession,
      options.sessionId,
      selectedAgent,
      options.onMessage,
      options.onError,
    ],
  );

  // Send a message with streaming response
  const sendMessageStream = useCallback(
    async (
      content: string,
      onChunk?: (chunk: ChatStreamChunk) => void,
      sendOptions: { agentId?: string } = {},
    ) => {
      if (!chatService) return;

      try {
        setIsLoading(true);
        console.log('[useChat] isStreaming -> true');
        setIsStreaming(true);
        setError(null);

        // Add user message to local state
        const userMessage: ChatMessage = {
          id: `user_${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
        };
            console.log('[useChat] user message queued', { id: userMessage.id });
            setMessages((prev) => [...prev, userMessage]);

        // Create a placeholder assistant message for streaming
        const assistantMessageId = `assistant_${Date.now()}`;
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
            console.log('[useChat] assistant placeholder queued', { id: assistantMessageId });
            setMessages((prev) => [...prev, assistantMessage]);

        let streamingContent = '';

        // Ensure session exists
        let sessionId: string | undefined = currentSession?.id ?? options.sessionId;
        if (!sessionId && chatService.createSession) {
          const createdId = await chatService.createSession('Untitled Session');
          if (!createdId) {
            throw new Error('Failed to create session');
          }
          await loadSession(createdId);
          sessionId = createdId;
        }
        console.log('[useChat] Streaming start', { sessionId, contentLen: content.length });
        streamingExecutionRef.current = sessionId ?? null;

        // Send streaming message using chat service
        const response = await chatService.sendMessageStream(
          content,
          (chunk: ChatStreamChunk) => {
            if (chunk.type === 'content' && chunk.content) {
              console.debug('[useChat] Chunk', { len: String(chunk.content.length) });
                    streamingContent += chunk.content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId ? { ...msg, content: streamingContent } : msg,
                      ),
                    );
                    console.debug('[useChat] assistant content length', { len: streamingContent.length });
                  }
                  onChunk?.(chunk);
                },
          {
            sessionId,
            agentId: sendOptions.agentId ?? selectedAgent ?? undefined,
          },
        );

        // Update the final assistant message
        console.log('[useChat] final assistant content set', { len: response.content?.length ?? 0 });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: response.content } : msg,
          ),
        );

        options.onMessage?.(response);
      } catch (err) {
        console.error('[useChat] Streaming failed', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        options.onError?.(new Error(errorMessage));
      } finally {
        console.log('[useChat] isStreaming -> false');
        console.log('[useChat] Streaming end');
        setIsLoading(false);
        setIsStreaming(false);
        
      }
    },
    [
      chatService,
      currentSession,
      options.sessionId,
      selectedAgent,
      options.onMessage,
      options.onError,
    ],
  );

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    const sessionId = streamingExecutionRef.current ?? currentSession?.id ?? options.sessionId ?? null;
    if (sessionId && chatService?.cancelStream) {
      try {
        console.log('[useChat] Stop requested', { sessionId });
        await chatService.cancelStream(sessionId);
        streamingExecutionRef.current = null;
      } catch (err) {
        console.error('Failed to stop streaming:', err);
      }
    }
    console.log('[useChat] isStreaming -> false (stop)');
    setIsStreaming(false);
  }, [chatService, currentSession, options.sessionId]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Create new session
  const createSession = useCallback(
    async (title: string, description?: string) => {
      try {
        const sessionId = chatService.createSession
          ? await chatService.createSession(title, { description })
          : null;

        if (sessionId) {
          // Load the newly created session
          await loadSession(sessionId);
        }

        return sessionId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
        setError(errorMessage);
        options.onError?.(new Error(errorMessage));
        return null;
      }
    },
    [loadSession, options.onError],
  );

  // Update session title
  const updateSessionTitle = useCallback(
    async (title: string) => {
      if (!currentSession) return;

      try {
        const success = chatService.updateSession
          ? await chatService.updateSession(currentSession.id, { title })
          : false;

        if (success) {
          setCurrentSession((prev: SessionDisplay | null) => (prev ? { ...prev, title } : null));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
        setError(errorMessage);
        options.onError?.(new Error(errorMessage));
      }
    },
    [currentSession, options.onError],
  );

  // Get available agents
  const getAvailableAgents = useCallback(async () => {
    try {
      return chatService.getAvailableAgents ? await chatService.getAvailableAgents() : [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get agents';
      setError(errorMessage);
      options.onError?.(new Error(errorMessage));
      return [];
    }
  }, [options.onError]);

  return {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    currentSession,

    // Actions
    sendMessage,
    sendMessageStream,
    stopStreaming,
    clearMessages,
    setError,

    // Session management
    createSession,
    loadSession,
    updateSessionTitle,

    // Agent management
    getAvailableAgents,
    setSelectedAgent,
    selectedAgent,
  };
}
