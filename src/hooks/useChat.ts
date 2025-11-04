/**
 * Use Chat Hook - Simplified Chat Interface
 *
 * React hook that provides a simple interface for chat functionality using the new
 * high-level ChatService. This replaces the complex useChatStore with a cleaner
 * implementation that abstracts away the multi-agent architecture complexity.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { chatService, type ChatMessage, type ChatStreamChunk } from '@/services/ChatService';
import type { SessionInfo } from '@/services/CatalystService';

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
  currentSession: SessionInfo | null;

  // Actions
  sendMessage: (content: string, options?: { agentId?: string }) => Promise<void>;
  sendMessageStream: (
    content: string,
    onChunk?: (chunk: ChatStreamChunk) => void,
    options?: { agentId?: string }
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
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(options.agentId || null);

  const streamingExecutionRef = useRef<string | null>(null);

  // Load initial session if provided
  useEffect(() => {
    if (options.sessionId) {
      loadSession(options.sessionId);
    }
  }, [options.sessionId]);

  // Load session by ID
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const session = await chatService.getSession ? await chatService.getSession(sessionId) : null;

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
  }, [options.onError]);

  // Send a simple message
  const sendMessage = useCallback(async (
    content: string,
    sendOptions: { agentId?: string } = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add user message to local state
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Send message using chat service
      const response = await chatService.sendMessage(content, {
        sessionId: currentSession?.id || options.sessionId,
        agentId: sendOptions.agentId || selectedAgent || undefined
      });

      // Add assistant message to local state
      setMessages(prev => [...prev, response]);
      options.onMessage?.(response);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      options.onError?.(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, options.sessionId, selectedAgent, options.onMessage, options.onError]);

  // Send a message with streaming response
  const sendMessageStream = useCallback(async (
    content: string,
    onChunk?: (chunk: ChatStreamChunk) => void,
    sendOptions: { agentId?: string } = {}
  ) => {
    try {
      setIsLoading(true);
      setIsStreaming(true);
      setError(null);

      // Add user message to local state
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Create a placeholder assistant message for streaming
      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      let streamingContent = '';

      // Send streaming message using chat service
      const response = await chatService.sendMessageStream(
        content,
        (chunk) => {
          // Update streaming content
          if (chunk.type === 'content') {
            streamingContent += chunk.content;

            // Update the assistant message in local state
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: streamingContent }
                : msg
            ));
          }

          // Call external chunk handler
          onChunk?.(chunk);
        },
        {
          sessionId: currentSession?.id || options.sessionId,
          agentId: sendOptions.agentId || selectedAgent || undefined
        }
      );

      // Update the final assistant message
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: response.content }
          : msg
      ));

      options.onMessage?.(response);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      options.onError?.(new Error(errorMessage));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [currentSession, options.sessionId, selectedAgent, options.onMessage, options.onError]);

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    if (streamingExecutionRef.current) {
      try {
        await chatService.cancelExecution(streamingExecutionRef.current);
        streamingExecutionRef.current = null;
      } catch (err) {
        console.error('Failed to stop streaming:', err);
      }
    }
    setIsStreaming(false);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Create new session
  const createSession = useCallback(async (title: string, description?: string) => {
    try {
      const sessionId = await chatService.createSession ? await chatService.createSession(title, { description }) : null;

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
  }, [loadSession, options.onError]);

  // Update session title
  const updateSessionTitle = useCallback(async (title: string) => {
    if (!currentSession) return;

    try {
      const success = await chatService.updateSession ? await chatService.updateSession(currentSession.id, { title }) : false;

      if (success) {
        setCurrentSession(prev => prev ? { ...prev, title } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
      setError(errorMessage);
      options.onError?.(new Error(errorMessage));
    }
  }, [currentSession, options.onError]);

  // Get available agents
  const getAvailableAgents = useCallback(async () => {
    try {
      return await chatService.getAvailableAgents();
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
    selectedAgent
  };
}