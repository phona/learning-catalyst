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

import type { MessageDisplay, MessageSendRequest } from '../../types';

const createChatClient = () => {
  const sendMessage = async (
    sessionId: string,
    content: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      const request: MessageSendRequest = {
        sessionId,
        message: {
          content,
          role: 'user'
        }
      };

      const response = await window.electronAPI.chat.send(request);

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      return response;
    } catch (error) {
      console.error('[ChatClient] sendMessage error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const sendMessageStream = async (
    sessionId: string,
    content: string
  ): Promise<AsyncIterable<string>> => {
    try {
      const request: MessageSendRequest = {
        sessionId,
        message: {
          content,
          role: 'user'
        }
      };

      return await window.electronAPI.chat.sendStream(request);
    } catch (error) {
      console.error('[ChatClient] sendMessageStream error:', error);
      throw error;
    }
  };

  const getSession = async (
    sessionId: string
  ): Promise<{ session?: any; messages?: MessageDisplay[]; error?: string }> => {
    try {
      const response = await window.electronAPI.chat.getSession(sessionId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get session');
      }

      return {
        session: response.session,
        messages: response.messages
      };
    } catch (error) {
      console.error('[ChatClient] getSession error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const getTypingStatus = async (
    sessionId: string
  ): Promise<{ isTyping: boolean; agentId?: string | null; error?: string }> => {
    try {
      const response = await window.electronAPI.chat.getStatus(sessionId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get typing status');
      }

      return {
        isTyping: response.isTyping,
        agentId: response.agentId
      };
    } catch (error) {
      console.error('[ChatClient] getTypingStatus error:', error);
      return {
        isTyping: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const retryMessage = async (
    sessionId: string,
    content: string,
    maxRetries = 3
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        console.log(`[ChatClient] Retry attempt ${attempt}/${maxRetries} for session ${sessionId}`);

        const result = await sendMessage(sessionId, content);

        if (result.success) {
          console.log(`[ChatClient] Retry successful on attempt ${attempt}`);
          return result;
        }

        lastError = result.error;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
          console.log(`[ChatClient] Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ChatClient] Retry attempt ${attempt} failed:`, lastError);
      }
    }

    console.error(`[ChatClient] All ${maxRetries} retry attempts failed`);
    return {
      success: false,
      error: lastError || `Failed after ${maxRetries} attempts`
    };
  };

  const validateMessage = (content: string): { isValid: boolean; error?: string } => {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Message content is required' };
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    if (trimmedContent.length > 10000) {
      return { isValid: false, error: 'Message is too long (max 10,000 characters)' };
    }

    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(trimmedContent)) {
        return { isValid: false, error: 'Message contains potentially harmful content' };
      }
    }

    return { isValid: true };
  };

  const formatMessage = (content: string): string => content
    .trim()
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');

  const estimateResponseTime = (content: string): number => {
    const baseTime = 1000;
    const lengthFactor = content.length * 10;
    let complexityFactor = 0;

    if (content.includes('?')) {
      complexityFactor += 2000;
    }

    if (content.includes('```') || content.includes('code')) {
      complexityFactor += 3000;
    }

    if (content.includes('explain') || content.includes('analyze')) {
      complexityFactor += 1500;
    }

    return baseTime + lengthFactor + complexityFactor;
  };

  return {
    sendMessage,
    sendMessageStream,
    getSession,
    getTypingStatus,
    retryMessage,
    validateMessage,
    formatMessage,
    estimateResponseTime
  };
};

export const chatClient = createChatClient();
