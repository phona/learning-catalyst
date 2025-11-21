import type { ElectronAPI } from '@/shared/types/electron-api';
import type { PracticeOpportunityResult } from '@/shared/types/electron-api/chat-api';
import type { Message, StreamChunk, ChatOptions } from '@/shared/types/ai';
import type { Session } from '@/shared/types/session';

export interface ChatService {
  sendMessage(content: string, session: Session, options?: ChatOptions): Promise<Message>;
  sendMessageStream(content: string, session: Session, onChunk: (chunk: StreamChunk) => void, options?: ChatOptions): Promise<void>;
  checkPracticeOpportunity(params: {
    conversationId: string;
    userMessage: string;
    sessionId?: string;
  }): Promise<PracticeOpportunityResult>;
}

/**
 * Functional implementation of chat service using the unified electronAPI client
 */
export const createChatService = (apiClient: ElectronAPI): ChatService => {
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

    const response = await apiClient.chat.sendMessage({
      conversationId: options?.sessionId || session.id,
      message: content
    });

    // MessageDisplay is the direct response, not wrapped in a success object
    return {
      id: response.id || 'unknown',
      role: 'assistant',
      content: response.content || 'Response from AI',
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
      const streamResult = await apiClient.chat.sendMessageStream({
        conversationId: options?.sessionId || session.id,
        message: content
      });

      // Process the stream and call onChunk for each received chunk
      // sendMessageStream returns AsyncIterable<string> directly
      for await (const chunk of streamResult) {
        onChunk({ content: chunk });
      }
    } catch (error) {
      console.error('Error in sendMessageStream:', error);
      throw error;
    }
  };

  const checkPracticeOpportunity = async (params: {
    conversationId: string;
    userMessage: string;
    sessionId?: string;
  }): Promise<PracticeOpportunityResult> => {
    const { conversationId, userMessage } = params;
    const result = await apiClient.chat.checkPracticeOpportunity({
      conversationId,
      userMessage
    });

    return result;
  };

  return {
    sendMessage,
    sendMessageStream,
    checkPracticeOpportunity,
  };
};
