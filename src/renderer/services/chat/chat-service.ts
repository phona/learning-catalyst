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
import type { Message, StreamChunk, ChatOptions } from '@/shared/types/ai';
import type { Session } from '@/shared/types/session';

export interface ChatService {
  sendMessage(content: string, session: Session, options?: ChatOptions): Promise<Message>;
  sendMessageStream(content: string, session: Session, onChunk: (chunk: StreamChunk) => void, options?: ChatOptions): Promise<void>;
}

/**
 * Functional implementation of chat service using the unified electronAPI client
 */
export const createChatService = (apiClient: ElectronAPIClient): ChatService => {
  // Private utility functions
  const validateInputs = (content: string, session: Session) => {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid message content');
    }
    if (!session?.id) {
      throw new Error('Invalid session object');
    }
  };

  // Public service functions
  const sendMessage = async (
    content: string,
    session: Session,
    options?: { sessionId?: string; provider?: string; model?: string }
  ): Promise<Message> => {
    validateInputs(content, session);

    const response = await apiClient.chat.send(
      options?.sessionId || session.id,
      content
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to send message');
    }

    return {
      id: response.messageId || 'unknown',
      role: 'assistant',
      content: response.data?.content || 'Response from AI',
      timestamp: new Date(),
    };
  };

  const sendMessageStream = async (
    content: string,
    session: Session,
    onChunk: (chunk: StreamChunk) => void,
    options?: { sessionId?: string; provider?: string; model?: string }
  ): Promise<void> => {
    validateInputs(content, session);

    if (typeof onChunk !== 'function') {
      throw new Error('onChunk callback is required for streaming');
    }

    try {
      const streamResult = await apiClient.chat.sendStream(
        options?.sessionId || session.id,
        content
      );

      // Process the stream and call onChunk for each received chunk
      if (streamResult.success && streamResult.stream) {
        for await (const chunk of streamResult.stream) {
          onChunk(chunk);
        }
      }
    } catch (error) {
      console.error('Error in sendMessageStream:', error);
      throw error;
    }
  };

  return {
    sendMessage,
    sendMessageStream,
  };
};