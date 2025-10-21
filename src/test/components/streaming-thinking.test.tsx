/**
 * Tests for Streaming and Thinking Display Functionality
 * Validates the real-time streaming response and ChatGLM thinking process display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'zustand';
import { ChatArea } from '../../components/Chat/ChatArea';
import { MessageBubble } from '../../components/Chat/MessageBubble';
import { useChatStore } from '../../stores/useChatStore';
import type { Message } from '../../types/ai';

// Mock the chat service
vi.mock('../../services/ai/chatService', () => ({
  chatService: {
    sendMessage: vi.fn(),
    processStreamResponse: vi.fn(),
    setCurrentSession: vi.fn(),
    getProviderInfo: vi.fn(),
    initializeProvider: vi.fn(),
  },
}));

// Mock the config store
vi.mock('../../stores/useConfigStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => ({
      config: {
        ai: {
          providers: {
            openai: { name: 'OpenAI', api_key: 'test-key', enabled: true },
            chatglm: { name: 'ChatGLM', api_key: 'test-key', enabled: true },
          },
        },
      },
    })),
  },
}));

// Helper to render with chat store provider
const renderWithChatStore = (component: React.ReactElement) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <div>
        {children}
      </div>
    );
  };
  return render(component, { wrapper: Wrapper });
};

describe('Streaming and Thinking Display Functionality', () => {
  beforeEach(() => {
    // Reset chat store state
    const { setState } = useChatStore.getState();
    setState({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      thinkingContent: '',
      showThinking: true,
      selectedProvider: 'openai',
    });
    vi.clearAllMocks();
  });

  describe('ChatArea Streaming State', () => {
    it('should display empty state when no messages', () => {
      renderWithChatStore(<ChatArea />);

      expect(screen.getByText('Welcome to Learning Catalyst')).toBeInTheDocument();
      expect(screen.getByText('Start a conversation with your AI learning companion')).toBeInTheDocument();
    });

    it('should display streaming message during active streaming', () => {
      const { setState } = useChatStore.getState();

      // Set up streaming state
      setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello, explain React',
            timestamp: new Date(),
          },
        ],
        isStreaming: true,
        streamingContent: 'React is a JavaScript library',
        thinkingContent: 'The user wants to understand React concepts',
      });

      renderWithChatStore(<ChatArea />);

      // Should show the streaming content
      expect(screen.getByText('React is a JavaScript library')).toBeInTheDocument();
    });

    it('should handle thinking display toggle', () => {
      const { setState } = useChatStore.getState();

      setState({
        messages: [],
        isStreaming: true,
        streamingContent: 'Some response',
        thinkingContent: 'Thinking about the answer',
        showThinking: false,
      });

      renderWithChatStore(<ChatArea />);

      // Thinking content should not be visible when showThinking is false
      expect(screen.queryByText(/Thinking about the answer/)).not.toBeInTheDocument();

      // Toggle thinking display
      const { toggleThinking } = useChatStore.getState();
      toggleThinking();

      // Now thinking should be visible (would need re-render)
      setState({ showThinking: true });

      expect(screen.getByText(/Thinking about the answer/)).toBeInTheDocument();
    });
  });

  describe('MessageBubble Thinking Display', () => {
    it('should display thinking toggle button for ChatGLM messages', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Here is the explanation',
        thinking_content: 'Let me think about this step by step',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      render(
        <MessageBubble
          message={message}
          showThinking={false}
          canToggleThinking={true}
          onToggleThinking={vi.fn()}
        />
      );

      // Should show the thinking toggle button
      expect(screen.getByTitle('Show thinking process')).toBeInTheDocument();
      expect(screen.getByText('Show')).toBeInTheDocument();
    });

    it('should not show thinking toggle for non-ChatGLM messages', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Here is the explanation',
        timestamp: new Date(),
        provider: 'openai',
      };

      render(
        <MessageBubble
          message={message}
          showThinking={false}
          canToggleThinking={false}
          onToggleThinking={vi.fn()}
        />
      );

      // Should not show thinking toggle for OpenAI messages
      expect(screen.queryByText('Show')).not.toBeInTheDocument();
      expect(screen.queryByText('Hide')).not.toBeInTheDocument();
    });

    it('should display thinking content when enabled', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Final answer here',
        thinking_content: '## My thought process\n\n1. Analyze the question\n2. Formulate response\n3. Provide examples',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      render(
        <MessageBubble
          message={message}
          showThinking={true}
          canToggleThinking={true}
          onToggleThinking={vi.fn()}
        />
      );

      // Should show thinking section
      expect(screen.getByText('AI Thinking Process')).toBeInTheDocument();
      expect(screen.getByText('My thought process')).toBeInTheDocument();
      expect(screen.getByText('1. Analyze the question')).toBeInTheDocument();

      // Should also show the actual message content
      expect(screen.getByText('Final answer here')).toBeInTheDocument();
    });

    it('should call toggle callback when thinking button is clicked', () => {
      const mockToggleThinking = vi.fn();
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Response',
        thinking_content: 'Thinking process',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      render(
        <MessageBubble
          message={message}
          showThinking={false}
          canToggleThinking={true}
          onToggleThinking={mockToggleThinking}
        />
      );

      // Click the thinking toggle button
      const thinkingButton = screen.getByTitle('Show thinking process');
      fireEvent.click(thinkingButton);

      expect(mockToggleThinking).toHaveBeenCalledTimes(1);
    });

    it('should display streaming indicator during active streaming', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Streaming response',
        timestamp: new Date(),
        provider: 'openai',
      };

      render(
        <MessageBubble
          message={message}
          isStreaming={true}
        />
      );

      // Should show streaming cursor indicator
      expect(screen.getByText('▊')).toBeInTheDocument();
    });

    it('should render markdown in thinking content', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Final response',
        thinking_content: '# Analysis\n\n**Important point**: This is key.\n\n- Item 1\n- Item 2',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      render(
        <MessageBubble
          message={message}
          showThinking={true}
          canToggleThinking={true}
          onToggleThinking={vi.fn()}
        />
      );

      // Should render markdown properly
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Important point: This is key.')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Streaming Integration', () => {
    it('should handle stream chunk updates correctly', () => {
      const { setState, appendStreamChunk } = useChatStore.getState();

      // Start with empty content
      setState({
        streamingContent: '',
        thinkingContent: '',
        isStreaming: true,
      });

      // Add thinking chunk
      appendStreamChunk({
        reasoning_content: 'Let me think about this question... ',
      });

      expect(useChatStore.getState().thinkingContent).toBe('Let me think about this question... ');

      // Add content chunk
      appendStreamChunk({
        content: 'React is a ',
      });

      expect(useChatStore.getState().streamingContent).toBe('React is a ');

      // Add more content
      appendStreamChunk({
        content: 'JavaScript library for building user interfaces.',
      });

      expect(useChatStore.getState().streamingContent).toBe('React is a JavaScript library for building user interfaces.');
    });

    it('should reset streaming state properly', () => {
      const { setState, resetStreaming } = useChatStore.getState();

      // Set up streaming state
      setState({
        isStreaming: true,
        streamingContent: 'Some content',
        thinkingContent: 'Some thinking',
      });

      expect(useChatStore.getState().isStreaming).toBe(true);
      expect(useChatStore.getState().streamingContent).toBe('Some content');
      expect(useChatStore.getState().thinkingContent).toBe('Some thinking');

      // Reset streaming
      resetStreaming();

      expect(useChatStore.getState().isStreaming).toBe(false);
      expect(useChatStore.getState().streamingContent).toBe('');
      expect(useChatStore.getState().thinkingContent).toBe('');
    });
  });

  describe('Provider-Specific Behavior', () => {
    it('should enable thinking for ChatGLM provider', () => {
      const { setState, setSelectedProvider } = useChatStore.getState();

      setState({
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'Response',
            thinking_content: 'ChatGLM thinking process',
            timestamp: new Date(),
            provider: 'chatglm',
          },
        ],
        showThinking: true,
        selectedProvider: 'chatglm',
      });

      renderWithChatStore(<ChatArea />);

      // Should find thinking content for ChatGLM
      expect(screen.getByText('ChatGLM thinking process')).toBeInTheDocument();
    });

    it('should handle OpenAI responses without thinking content', () => {
      const { setState } = useChatStore.getState();

      setState({
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'OpenAI response',
            timestamp: new Date(),
            provider: 'openai',
          },
        ],
        showThinking: true,
        selectedProvider: 'openai',
      });

      renderWithChatStore(<ChatArea />);

      // Should show OpenAI response but no thinking content
      expect(screen.getByText('OpenAI response')).toBeInTheDocument();
      expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing thinking content gracefully', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Response without thinking',
        timestamp: new Date(),
        provider: 'chatglm',
      };

      render(
        <MessageBubble
          message={message}
          showThinking={true}
          canToggleThinking={false} // Should be false if no thinking_content
          onToggleThinking={vi.fn()}
        />
      );

      // Should show the message but no thinking section
      expect(screen.getByText('Response without thinking')).toBeInTheDocument();
      expect(screen.queryByText('AI Thinking Process')).not.toBeInTheDocument();
    });

    it('should handle malformed stream chunks', () => {
      const { appendStreamChunk } = useChatStore.getState();

      // Should handle chunks without content or reasoning
      expect(() => {
        appendStreamChunk({});
      }).not.toThrow();

      expect(() => {
        appendStreamChunk({ content: null, reasoning_content: undefined });
      }).not.toThrow();
    });
  });

  describe('User Experience', () => {
    it('should provide appropriate visual feedback during streaming', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Streaming text here',
        timestamp: new Date(),
        provider: 'openai',
      };

      render(
        <MessageBubble
          message={message}
          isStreaming={true}
        />
      );

      // Should show streaming cursor
      const streamingCursor = screen.getByText('▊');
      expect(streamingCursor).toHaveClass('animate-pulse');
    });

    it('should show copy functionality for assistant messages', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'This message can be copied',
        timestamp: new Date(),
        provider: 'openai',
      };

      render(
        <MessageBubble
          message={message}
        />
      );

      // Should have copy button
      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();
    });

    it('should display message metadata when available', () => {
      const message: Message = {
        id: '1',
        role: 'assistant',
        content: 'Response',
        timestamp: new Date('2024-01-01T12:00:00'),
        provider: 'openai',
        tokens_used: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      render(
        <MessageBubble
          message={message}
        />
      );

      // Should show token usage
      expect(screen.getByText(/Tokens used:/)).toBeInTheDocument();
      expect(screen.getByText(/30/)).toBeInTheDocument();
    });
  });
});