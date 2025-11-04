/**
 * Chat Service - Simplified Chat Interface
 *
 * Provides a very simple interface for chat functionality that hides all
 * the complexity of agent management, sessions, and streaming.
 */

import { catalystService } from './CatalystService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatStreamChunk {
  type: 'thinking' | 'content' | 'error' | 'complete';
  content: string;
  timestamp: number;
}

/**
 * Simple chat service that abstracts away complexity
 */
export class ChatService {
  /**
   * Send a message and get a simple response
   */
  async sendMessage(message: string, options: {
    sessionId?: string;
    agentId?: string;
  } = {}): Promise<ChatMessage> {
    const result = await catalystService.sendChat(message, {
      sessionId: options.sessionId,
      agentId: options.agentId
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    return {
      id: result.messageId || 'unknown',
      role: 'assistant',
      content: 'Message sent successfully',
      timestamp: new Date()
    };
  }

  /**
   * Send a message with streaming response
   */
  async sendMessageStream(
    message: string,
    onChunk: (chunk: ChatStreamChunk) => void,
    options: {
      sessionId?: string;
      agentId?: string;
    } = {}
  ): Promise<ChatMessage> {
    const result = await catalystService.sendChatStream(
      message,
      {
        sessionId: options.sessionId,
        agentId: options.agentId
      },
      (chunk) => {
        // Transform streaming chunk to simple format
        const simpleChunk: ChatStreamChunk = {
          type: chunk.type === 'data' ? 'content' : chunk.type,
          content: typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content),
          timestamp: chunk.timestamp
        };
        onChunk(simpleChunk);
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    return {
      id: result.messageId || 'unknown',
      role: 'assistant',
      content: 'Streaming completed',
      timestamp: new Date()
    };
  }

  /**
   * Get available agents
   */
  async getAvailableAgents() {
    return catalystService.getAvailableAgents();
  }

  /**
   * Cancel current execution
   */
  async cancelExecution(executionId: string) {
    return catalystService.cancelExecution(executionId);
  }
}

export const chatService = new ChatService();