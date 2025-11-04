/**
 * MessageBubble Component Tests - Renderer Process
 *
 * Comprehensive test suite for the enhanced MessageBubble component with streaming display,
 * agent status indicators, and performance metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from '@/renderer/components/Chat/MessageBubble';
import type { Message } from '@/shared/types/ai';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock remarkGfm
vi.mock('remark-gfm', () => ({
  default: () => {},
}));

// Mock SyntaxHighlighterWrapper
vi.mock('@/components/UI/SyntaxHighlighterWrapper', () => ({
  SyntaxHighlighterWrapper: ({ children }: { children: React.ReactNode }) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  ),
}));

describe('MessageBubble', () => {
  const baseMessage: Message = {
    id: 'msg-1',
    role: 'assistant',
    content: 'Hello, world!',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    provider: 'openai',
  };

  const userMessage: Message = {
    id: 'msg-2',
    role: 'user',
    content: 'User message',
    timestamp: new Date('2025-01-01T00:00:00Z'),
  };

  const systemMessage: Message = {
    id: 'msg-3',
    role: 'system',
    content: 'System notification',
    timestamp: new Date('2025-01-01T00:00:00Z'),
  };

  const toolMessage: Message = {
    id: 'msg-4',
    role: 'tool',
    content: 'Tool execution result',
    timestamp: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render user message correctly', () => {
      render(<MessageBubble message={userMessage} />);

      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('User message')).toBeInTheDocument();
      expect(screen.getByText('12:00 AM')).toBeInTheDocument();
    });

    it('should render assistant message correctly', () => {
      render(<MessageBubble message={baseMessage} />);

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
      expect(screen.getByText('openai')).toBeInTheDocument();
    });

    it('should render system message correctly', () => {
      render(<MessageBubble message={systemMessage} />);

      expect(screen.getByText('System notification')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render tool message correctly', () => {
      render(<MessageBubble message={toolMessage} />);

      expect(screen.getByText('Tool')).toBeInTheDocument();
      expect(screen.getByText('Tool execution result')).toBeInTheDocument();
    });

    it('should format timestamp correctly', () => {
      const messageWithTimestamp = {
        ...baseMessage,
        timestamp: new Date('2025-01-01T14:30:00Z'),
      };

      render(<MessageBubble message={messageWithTimestamp} />);

      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('should handle missing timestamp gracefully', () => {
      const messageWithoutTimestamp = {
        ...baseMessage,
        timestamp: undefined,
      };

      render(<MessageBubble message={messageWithoutTimestamp} />);

      expect(screen.queryByTextTime(/:/)).not.toBeInTheDocument();
    });
  });

  describe('Streaming Display', () => {
    it('should show streaming indicator when isStreaming is true', () => {
      render(<MessageBubble message={baseMessage} isStreaming={true} />);

      const streamingIndicator = screen.getByLabelText('AI is typing');
      expect(streamingIndicator).toBeInTheDocument();
      expect(streamingIndicator).toHaveClass('animate-pulse');
    });

    it('should show streaming progress when provided', () => {
      render(
        <MessageBubble
          message={baseMessage}
          isStreaming={true}
          streamingProgress={45}
        />
      );

      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('Generating response...')).toBeInTheDocument();

      // Check progress bar exists
      const progressBar = document.querySelector('[style*="width: 45%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show progress in user message content when streaming', () => {
      render(
        <MessageBubble
          message={userMessage}
          isStreaming={true}
          streamingProgress={30}
        />
      );

      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should not show streaming indicator when not streaming', () => {
      render(<MessageBubble message={baseMessage} isStreaming={false} />);

      expect(screen.queryByLabelText('AI is typing')).not.toBeInTheDocument();
      expect(screen.queryByText('Generating response...')).not.toBeInTheDocument();
    });
  });

  describe('Agent Status Indicators', () => {
    const agentStatus = {
      agentId: 'agent-1',
      agentName: 'Learning Agent',
      status: 'thinking' as const,
      currentAction: 'Analyzing question',
      progress: 60,
    };

    it('should display agent status when provided', () => {
      render(<MessageBubble message={baseMessage} agentStatus={agentStatus} />);

      expect(screen.getByText('Learning Agent: thinking')).toBeInTheDocument();
      expect(screen.getByText('Analyzing question')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should show correct status icon for thinking', () => {
      render(<MessageBubble message={baseMessage} agentStatus={agentStatus} />);

      const statusIcon = document.querySelector('.animate-spin');
      expect(statusIcon).toBeInTheDocument();
    });

    it('should show correct status for different agent states', () => {
      const statuses = [
        { status: 'processing' as const, expectedClass: 'animate-pulse' },
        { status: 'responding' as const, expectedClass: 'animate-pulse' },
        { status: 'error' as const, expectedClass: '' },
        { status: 'idle' as const, expectedClass: '' },
      ];

      statuses.forEach(({ status, expectedClass }) => {
        const { unmount } = render(
          <MessageBubble
            message={baseMessage}
            agentStatus={{ ...agentStatus, status }}
          />
        );

        const statusElement = screen.getByText(`Learning Agent: ${status}`);
        expect(statusElement).toBeInTheDocument();

        if (expectedClass) {
          const icon = statusElement.closest('div')?.querySelector(`.${expectedClass}`);
          expect(icon).toBeInTheDocument();
        }

        unmount();
      });
    });

    it('should not show agent status for user messages', () => {
      render(<MessageBubble message={userMessage} agentStatus={agentStatus} />);

      expect(screen.queryByText('Learning Agent: thinking')).not.toBeInTheDocument();
    });

    it('should handle agent status without progress', () => {
      const statusWithoutProgress = {
        ...agentStatus,
        progress: undefined,
      };

      render(<MessageBubble message={baseMessage} agentStatus={statusWithoutProgress} />);

      expect(screen.getByText('Learning Agent: thinking')).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('should handle agent status without current action', () => {
      const statusWithoutAction = {
        ...agentStatus,
        currentAction: undefined,
      };

      render(<MessageBubble message={baseMessage} agentStatus={statusWithoutAction} />);

      expect(screen.getByText('Learning Agent: thinking')).toBeInTheDocument();
      expect(screen.queryByText('Analyzing question')).not.toBeInTheDocument();
    });
  });

  describe('Performance Metrics', () => {
    const performanceMetrics = {
      responseTime: 1500,
      tokensPerSecond: 25.5,
      memoryUsage: 512 * 1024 * 1024, // 512MB in bytes
    };

    it('should display performance metrics when provided', () => {
      render(
        <MessageBubble
          message={baseMessage}
          performanceMetrics={performanceMetrics}
        />
      );

      expect(screen.getByText('Response: 1.5s')).toBeInTheDocument();
      expect(screen.getByText('25.5 tokens/s')).toBeInTheDocument();
      expect(screen.getByText('512.0MB')).toBeInTheDocument();
    });

    it('should format response time correctly', () => {
      const differentResponseTimes = [
        { time: 500, expected: '500ms' },
        { time: 5000, expected: '5.0s' },
        { time: 120000, expected: '2.0m' },
      ];

      differentResponseTimes.forEach(({ time, expected }) => {
        const { unmount } = render(
          <MessageBubble
            message={baseMessage}
            performanceMetrics={{ ...performanceMetrics, responseTime: time }}
          />
        );

        expect(screen.getByText(`Response: ${expected}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle partial performance metrics', () => {
      const partialMetrics = {
        responseTime: 800,
        // tokensPerSecond missing
        // memoryUsage missing
      };

      render(<MessageBubble message={baseMessage} performanceMetrics={partialMetrics} />);

      expect(screen.getByText('Response: 800ms')).toBeInTheDocument();
      expect(screen.queryByText('tokens/s')).not.toBeInTheDocument();
      expect(screen.queryByText('MB')).not.toBeInTheDocument();
    });

    it('should not show performance metrics section when not provided', () => {
      render(<MessageBubble message={baseMessage} />);

      expect(screen.queryByText('Response:')).not.toBeInTheDocument();
      expect(screen.queryByText('tokens/s')).not.toBeInTheDocument();
    });
  });

  describe('Token Usage Display', () => {
    const tokenUsage = {
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150,
    };

    it('should display token usage when provided', () => {
      const messageWithTokens = {
        ...baseMessage,
        tokens_used: tokenUsage,
      };

      render(<MessageBubble message={messageWithTokens} />);

      expect(screen.getByText('50 prompt / 100 completion')).toBeInTheDocument();
      expect(screen.getByText('150 total')).toBeInTheDocument();
    });

    it('should not show token usage when not provided', () => {
      render(<MessageBubble message={baseMessage} />);

      expect(screen.queryByText('prompt /')).not.toBeInTheDocument();
      expect(screen.queryByText('total')).not.toBeInTheDocument();
    });

    it('should show both performance metrics and token usage', () => {
      const messageWithBoth = {
        ...baseMessage,
        tokens_used: tokenUsage,
      };

      render(
        <MessageBubble
          message={messageWithBoth}
          performanceMetrics={performanceMetrics}
        />
      );

      expect(screen.getByText('Response: 1.5s')).toBeInTheDocument();
      expect(screen.getByText('50 prompt / 100 completion')).toBeInTheDocument();
    });
  });

  describe('Thinking Content', () => {
    const messageWithThinking = {
      ...baseMessage,
      thinking_content: 'Let me think about this step by step...',
    };

    it('should show thinking toggle button when thinking content exists', () => {
      render(<MessageBubble message={messageWithThinking} />);

      expect(screen.getByText('Show')).toBeInTheDocument();
      expect(screen.getByTitle('Show thinking process')).toBeInTheDocument();
    });

    it('should toggle thinking content visibility', () => {
      const onToggleThinking = vi.fn();
      render(
        <MessageBubble
          message={messageWithThinking}
          onToggleThinking={onToggleThinking}
        />
      );

      const toggleButton = screen.getByText('Show');
      fireEvent.click(toggleButton);

      expect(onToggleThinking).toHaveBeenCalledWith('msg-1');
    });

    it('should show thinking content when showThinking is true', () => {
      const visibleThinkingMessage = {
        ...messageWithThinking,
        showThinking: true,
      };

      render(<MessageBubble message={visibleThinkingMessage} />);

      expect(screen.getByText('Let me think about this step by step...')).toBeInTheDocument();
      expect(screen.getByText('AI Thinking Process')).toBeInTheDocument();
    });

    it('should show live thinking indicator when streaming', () => {
      render(
        <MessageBubble
          message={messageWithThinking}
          isStreaming={true}
        />
      );

      expect(screen.getByText('AI Thinking Process (Live)')).toBeInTheDocument();
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('should not show thinking toggle for user messages', () => {
      const userMessageWithThinking = {
        ...userMessage,
        thinking_content: 'User thinking...',
      };

      render(<MessageBubble message={userMessageWithThinking} />);

      expect(screen.queryByText('Show thinking process')).not.toBeInTheDocument();
    });

    it('should not show thinking toggle for system or tool messages', () => {
      const systemMessageWithThinking = {
        ...systemMessage,
        thinking_content: 'System thinking...',
      };

      render(<MessageBubble message={systemMessageWithThinking} />);

      expect(screen.queryByText('Show thinking process')).not.toBeInTheDocument();
    });

    it('should handle empty thinking content gracefully', () => {
      const messageWithEmptyThinking = {
        ...baseMessage,
        thinking_content: '   ', // whitespace only
      };

      render(<MessageBubble message={messageWithEmptyThinking} />);

      expect(screen.queryByText('Show thinking process')).not.toBeInTheDocument();
    });
  });

  describe('Tool Calls', () => {
    const messageWithToolCalls = {
      ...baseMessage,
      tool_calls: [
        {
          id: 'tool-1',
          type: 'function',
          function: {
            name: 'search_database',
            arguments: '{"query": "React hooks"}',
          },
        },
        {
          id: 'tool-2',
          type: 'function',
          function: {
            name: 'calculate_result',
            arguments: '{"expression": "2 + 2"}',
          },
        },
      ],
    };

    it('should display tool calls when provided', () => {
      render(<MessageBubble message={messageWithToolCalls} />);

      expect(screen.getByText('Tool Calls')).toBeInTheDocument();
      expect(screen.getByText('search_database({"query": "React hooks"})')).toBeInTheDocument();
      expect(screen.getByText('calculate_result({"expression": "2 + 2"})')).toBeInTheDocument();
    });

    it('should not show tool calls section when no tool calls', () => {
      render(<MessageBubble message={baseMessage} />);

      expect(screen.queryByText('Tool Calls')).not.toBeInTheDocument();
    });
  });

  describe('Message Actions', () => {
    it('should show copy button for assistant messages', () => {
      render(<MessageBubble message={baseMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();
    });

    it('should not show copy button for user messages', () => {
      render(<MessageBubble message={userMessage} />);

      expect(screen.queryByTitle('Copy message')).not.toBeInTheDocument();
    });

    it('should not show copy button for system messages', () => {
      render(<MessageBubble message={systemMessage} />);

      expect(screen.queryByTitle('Copy message')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MessageBubble message={baseMessage} />);

      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveAttribute('aria-labelledby', 'message-msg-1');
    });

    it('should announce live streaming status', () => {
      render(<MessageBubble message={baseMessage} isStreaming={true} />);

      const liveRegion = screen.getByLabelText('AI is typing');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper button labels', () => {
      const messageWithThinking = {
        ...baseMessage,
        thinking_content: 'Thinking...',
      };

      render(<MessageBubble message={messageWithThinking} />);

      const toggleButton = screen.getByTitle('Show thinking process');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-controls', 'thinking-msg-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle message without ID gracefully', () => {
      const messageWithoutId = { ...baseMessage, id: undefined };

      render(<MessageBubble message={messageWithoutId} />);

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('should handle invalid timestamp gracefully', () => {
      const messageWithInvalidTimestamp = {
        ...baseMessage,
        timestamp: new Date('invalid'),
      };

      render(<MessageBubble message={messageWithInvalidTimestamp} />);

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
  });
});