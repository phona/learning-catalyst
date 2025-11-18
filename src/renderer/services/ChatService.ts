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


/**
 * Chat Service - Simplified Chat Interface
 *
 * Provides a very simple interface for chat functionality that hides all
 * the complexity of agent management, sessions, and streaming.
 * Now uses proper dependency injection pattern.
 */

import { ICatalystService } from './interfaces/ICatalystService';

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
 * Uses dependency injection for the catalyst service
 */
export class ChatService {
  constructor(private readonly catalystService: ICatalystService) {}

  /**
   * Send a message and get a simple response
   */
  async sendMessage(message: string, options: {
    sessionId?: string;
    agentId?: string;
  } = {}): Promise<ChatMessage> {
    const result = await this.catalystService.sendChat(message, {
      sessionId: options.sessionId,
      agentId: options.agentId
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    return {
      id: result.messageId || 'unknown',
      role: 'assistant',
      content: result.response || 'Message sent successfully',
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
    const result = await this.catalystService.sendChatStream(
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
      content: result.response || 'Streaming completed',
      timestamp: new Date()
    };
  }

  /**
   * Get available agents
   */
  async getAvailableAgents() {
    return this.catalystService.getAvailableAgents();
  }

  /**
   * Cancel current execution
   */
  async cancelExecution(executionId: string) {
    return this.catalystService.cancelExecution(executionId);
  }
}