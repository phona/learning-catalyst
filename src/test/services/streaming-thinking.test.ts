/**
 * Tests for Streaming and Thinking Functionality
 * Tests the core streaming and thinking logic without React dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../../stores/useChatStore';
import type { StreamChunk, Message } from '../../types/ai';

describe('Streaming and Thinking Core Functionality', () => {
  let store: ReturnType<typeof useChatStore.getState>;

  beforeEach(() => {
    // Reset the store to initial state
    store = useChatStore.getState();
    useChatStore.setState({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      thinkingContent: '',
      showThinking: true,
      selectedProvider: 'openai',
      inputText: '',
      error: null,
      isLoading: false,
      currentSession: null,
    });
    vi.clearAllMocks();
  });

  describe('Streaming State Management', () => {
    it('should initialize with correct default values', () => {
      expect(store.isStreaming).toBe(false);
      expect(store.streamingContent).toBe('');
      expect(store.thinkingContent).toBe('');
      expect(store.showThinking).toBe(true);
    });

    it('should set streaming state correctly', () => {
      store.setStreaming(true);
      expect(store.isStreaming).toBe(true);

      store.setStreaming(false);
      expect(store.isStreaming).toBe(false);
    });

    it('should reset streaming state properly', () => {
      // Set up some streaming content
      useChatStore.setState({
        isStreaming: true,
        streamingContent: 'Some response content',
        thinkingContent: 'Some thinking content',
      });

      // Reset streaming
      store.resetStreaming();

      expect(useChatStore.getState().isStreaming).toBe(false);
      expect(useChatStore.getState().streamingContent).toBe('');
      expect(useChatStore.getState().thinkingContent).toBe('');
    });
  });

  describe('Stream Chunk Processing', () => {
    it('should handle content chunks correctly', () => {
      store.setStreaming(true);

      // Add first content chunk
      store.appendStreamChunk({
        content: 'Hello',
      });

      expect(useChatStore.getState().streamingContent).toBe('Hello');

      // Add second content chunk
      store.appendStreamChunk({
        content: ' world!',
      });

      expect(useChatStore.getState().streamingContent).toBe('Hello world!');
    });

    it('should handle thinking/reasoning chunks correctly', () => {
      store.setStreaming(true);

      // Add thinking chunk
      store.appendStreamChunk({
        reasoning_content: 'Let me think about this...',
      });

      expect(useChatStore.getState().thinkingContent).toBe('Let me think about this...');

      // Add more thinking content
      store.appendStreamChunk({
        reasoning_content: ' The user wants to understand React.',
      });

      expect(useChatStore.getState().thinkingContent).toBe('Let me think about this... The user wants to understand React.');
    });

    it('should handle mixed content and reasoning chunks', () => {
      store.setStreaming(true);

      // Add thinking chunk
      store.appendStreamChunk({
        reasoning_content: 'Analyzing the question...',
      });

      // Add content chunk
      store.appendStreamChunk({
        content: 'React is ',
      });

      // Add more thinking
      store.appendStreamChunk({
        reasoning_content: ' Need to provide examples.',
      });

      // Add more content
      store.appendStreamChunk({
        content: 'a JavaScript library.',
      });

      const currentState = useChatStore.getState();
      expect(currentState.thinkingContent).toBe('Analyzing the question... Need to provide examples.');
      expect(currentState.streamingContent).toBe('React is a JavaScript library.');
    });

    it('should handle empty chunks gracefully', () => {
      store.setStreaming(true);

      expect(() => {
        store.appendStreamChunk({});
        store.appendStreamChunk({ content: '' });
        store.appendStreamChunk({ reasoning_content: '' });
        store.appendStreamChunk({ content: null, reasoning_content: undefined });
      }).not.toThrow();

      const currentState = useChatStore.getState();
      expect(currentState.streamingContent).toBe('');
      expect(currentState.thinkingContent).toBe('');
    });
  });

  describe('Thinking Display Controls', () => {
    it('should toggle thinking display correctly', () => {
      expect(useChatStore.getState().showThinking).toBe(true);

      store.toggleThinking();
      expect(useChatStore.getState().showThinking).toBe(false);

      store.toggleThinking();
      expect(useChatStore.getState().showThinking).toBe(true);
    });

    it('should set thinking display state directly', () => {
      store.setShowThinking(false);
      expect(useChatStore.getState().showThinking).toBe(false);

      store.setShowThinking(true);
      expect(useChatStore.getState().showThinking).toBe(true);
    });

    it('should manage thinking content independently of display state', () => {
      store.setStreaming(true);

      // Add thinking content
      store.appendStreamChunk({
        reasoning_content: 'This is my thought process.',
      });

      // Hide thinking display
      store.setShowThinking(false);

      const currentState = useChatStore.getState();
      expect(currentState.thinkingContent).toBe('This is my thought process.');
      expect(currentState.showThinking).toBe(false);

      // Show thinking display
      store.setShowThinking(true);

      expect(currentState.thinkingContent).toBe('This is my thought process.');
      expect(currentState.showThinking).toBe(true);
    });
  });

  describe('Message Management with Thinking', () => {
    it('should handle messages with thinking content', () => {
      const messageWithThinking: Message = {
        id: '1',
        role: 'assistant',
        content: 'Here is my response',
        thinking_content: 'I should explain this clearly',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      store.addMessage(messageWithThinking);

      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].thinking_content).toBe('I should explain this clearly');
      expect(messages[0].provider).toBe('chatglm');
    });

    it('should handle messages without thinking content', () => {
      const messageWithoutThinking: Message = {
        id: '2',
        role: 'assistant',
        content: 'Simple response',
        timestamp: new Date(),
        provider: 'openai',
      };

      store.addMessage(messageWithoutThinking);

      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].thinking_content).toBeUndefined();
      expect(messages[0].provider).toBe('openai');
    });

    it('should update existing messages', () => {
      const message: Message = {
        id: '3',
        role: 'assistant',
        content: 'Original content',
        timestamp: new Date(),
        provider: 'openai',
      };

      store.addMessage(message);

      // Update the message
      store.updateMessage('3', {
        content: 'Updated content',
        thinking_content: 'Added thinking later',
      });

      const messages = useChatStore.getState().messages;
      expect(messages[0].content).toBe('Updated content');
      expect(messages[0].thinking_content).toBe('Added thinking later');
    });
  });

  describe('Provider Integration', () => {
    it('should handle provider selection', () => {
      store.setSelectedProvider('chatglm');
      expect(useChatStore.getState().selectedProvider).toBe('chatglm');

      store.setSelectedProvider('openai');
      expect(useChatStore.getState().selectedProvider).toBe('openai');
    });

    it('should handle model selection', () => {
      store.setSelectedModel('gpt-4');
      expect(useChatStore.getState().selectedModel).toBe('gpt-4');

      store.setSelectedModel('glm-4');
      expect(useChatStore.getState().selectedModel).toBe('glm-4');
    });

    it('should track provider-specific behavior', () => {
      // Test ChatGLM provider (should support thinking)
      store.setSelectedProvider('chatglm');
      const chatglmMessage: Message = {
        id: '4',
        role: 'assistant',
        content: 'ChatGLM response',
        thinking_content: 'ChatGLM thinking process',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      store.addMessage(chatglmMessage);
      expect(useChatStore.getState().messages[0].provider).toBe('chatglm');

      // Test OpenAI provider (typically doesn't have thinking)
      store.setSelectedProvider('openai');
      const openaiMessage: Message = {
        id: '5',
        role: 'assistant',
        content: 'OpenAI response',
        timestamp: new Date(),
        provider: 'openai',
      };

      store.addMessage(openaiMessage);
      const messages = useChatStore.getState().messages;
      expect(messages[1].provider).toBe('openai');
      expect(messages[1].thinking_content).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed stream chunks', () => {
      store.setStreaming(true);

      expect(() => {
        store.appendStreamChunk({ content: null as any });
        store.appendStreamChunk({ reasoning_content: undefined as any });
        store.appendStreamChunk({ content: 123 as any });
      }).not.toThrow();

      // Should not break the streaming state
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it('should handle rapid chunk updates', () => {
      store.setStreaming(true);

      // Simulate rapid chunk updates (like during real streaming)
      const chunks = [
        { content: 'R' },
        { content: 'e' },
        { content: 'a' },
        { content: 'c' },
        { content: 't' },
        { reasoning_content: ' Building the word...' },
        { content: ' is ' },
        { content: 'awesome' },
        { reasoning_content: ' Done!' },
      ];

      chunks.forEach(chunk => store.appendStreamChunk(chunk));

      expect(useChatStore.getState().streamingContent).toBe('React is awesome');
      expect(useChatStore.getState().thinkingContent).toBe(' Building the word... Done!');
    });

    it('should maintain state consistency during operations', () => {
      // Start streaming
      store.setStreaming(true);
      expect(useChatStore.getState().isStreaming).toBe(true);

      // Add content
      store.appendStreamChunk({ content: 'Test content' });
      expect(useChatStore.getState().streamingContent).toBe('Test content');

      // Toggle thinking
      store.toggleThinking();
      expect(useChatStore.getState().showThinking).toBe(false);

      // Add message
      const message: Message = {
        id: '6',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };
      store.addMessage(message);

      // State should remain consistent
      const currentState = useChatStore.getState();
      expect(currentState.isStreaming).toBe(true);
      expect(currentState.streamingContent).toBe('Test content');
      expect(currentState.showThinking).toBe(false);
      expect(currentState.messages).toHaveLength(1);
      expect(currentState.messages[0].content).toBe('Hello');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large content without memory issues', () => {
      store.setStreaming(true);

      // Simulate large streaming content
      const largeContent = 'A'.repeat(10000);
      store.appendStreamChunk({ content: largeContent });

      expect(useChatStore.getState().streamingContent).toHaveLength(10000);
    });

    it('should handle many small chunks efficiently', () => {
      store.setStreaming(true);

      // Add 100 small chunks
      for (let i = 0; i < 100; i++) {
        store.appendStreamChunk({ content: `${i} ` });
      }

      const content = useChatStore.getState().streamingContent;
      expect(content).toContain('0 1 2 3');
      expect(content.split(' ')).toHaveLength(100); // Each chunk adds a number and space
    });
  });
});