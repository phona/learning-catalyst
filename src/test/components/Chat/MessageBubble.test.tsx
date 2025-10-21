import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from '@/components/Chat/MessageBubble';
import type { Message } from '@/types/ai';

// Mock ReactMarkdown and SyntaxHighlighter
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown">{children}</div>;
  };
});

jest.mock('react-syntax-highlighter', () => {
  return function MockSyntaxHighlighter({ children }: { children: string }) {
    return <div data-testid="code-block">{children}</div>;
  };
});

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('MessageBubble', () => {
  const baseUserMessage: Message = {
    id: '1',
    role: 'user',
    content: 'Hello, AI!',
    timestamp: new Date('2024-01-01T10:00:00'),
  };

  const baseAssistantMessage: Message = {
    id: '2',
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    timestamp: new Date('2024-01-01T10:00:01'),
  };

  const systemMessage: Message = {
    id: '3',
    role: 'system',
    content: 'System initialized',
    timestamp: new Date('2024-01-01T10:00:02'),
  };

  const toolMessage: Message = {
    id: '4',
    role: 'tool',
    content: 'Tool execution result',
    timestamp: new Date('2024-01-01T10:00:03'),
  };

  beforeEach(() => {
    mockWriteText.mockClear();
  });

  describe('User Messages', () => {
    it('renders user message with correct styling', () => {
      render(<MessageBubble message={baseUserMessage} />);

      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();

      const messageContainer = screen.getByText('Hello, AI!').closest('div');
      expect(messageContainer).toHaveClass('whitespace-pre-wrap', 'break-words');

      // User message should be right-aligned
      const messageWrapper = screen.getByText('Hello, AI!').closest('div')?.parentElement?.parentElement;
      expect(messageWrapper).toHaveClass('justify-end');
    });

    it('shows user avatar with correct styling', () => {
      render(<MessageBubble message={baseUserMessage} />);

      const avatar = document.querySelector('.bg-blue-600.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('shows streaming indicator for user messages', () => {
      render(<MessageBubble message={baseUserMessage} isStreaming={true} />);

      const streamingIndicator = screen.getByText('▊');
      expect(streamingIndicator).toBeInTheDocument();
      expect(streamingIndicator).toHaveClass('animate-pulse');
    });
  });

  describe('Assistant Messages', () => {
    it('renders assistant message with correct styling', () => {
      render(<MessageBubble message={baseAssistantMessage} />);

      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();

      // Assistant message should be left-aligned
      const messageWrapper = screen.getByText('Hello! How can I help you today?').closest('div')?.parentElement?.parentElement;
      expect(messageWrapper).toHaveClass('justify-start');
    });

    it('shows assistant avatar with correct styling', () => {
      render(<MessageBubble message={baseAssistantMessage} />);

      const avatar = document.querySelector('.bg-green-600.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('renders markdown content', () => {
      const markdownMessage: Message = {
        ...baseAssistantMessage,
        content: '# Title\n\n**Bold text**',
      };

      render(<MessageBubble message={markdownMessage} />);

      const markdown = screen.getByTestId('markdown');
      expect(markdown).toBeInTheDocument();
      expect(markdown).toHaveTextContent('# Title\n\n**Bold text**');
    });

    it('displays provider information', () => {
      const messageWithProvider: Message = {
        ...baseAssistantMessage,
        provider: 'openai',
      };

      render(<MessageBubble message={messageWithProvider} />);

      expect(screen.getByText('via openai')).toBeInTheDocument();
    });

    it('has copy button for assistant messages', () => {
      render(<MessageBubble message={baseAssistantMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();

      fireEvent.click(copyButton);
      expect(mockWriteText).toHaveBeenCalledWith('Hello! How can I help you today?');
    });

    it('displays token usage when available', () => {
      const messageWithTokens: Message = {
        ...baseAssistantMessage,
        tokens_used: 150,
      };

      render(<MessageBubble message={messageWithTokens} />);

      expect(screen.getByText('Tokens used: 150')).toBeInTheDocument();
    });

    it('displays thinking content when enabled', () => {
      const messageWithThinking: Message = {
        ...baseAssistantMessage,
        thinking_content: 'Let me think about this step by step...',
      };

      render(<MessageBubble message={messageWithThinking} showThinking={true} />);

      expect(screen.getByText('Let me think about this step by step...')).toBeInTheDocument();
    });

    it('hides thinking content when disabled', () => {
      const messageWithThinking: Message = {
        ...baseAssistantMessage,
        thinking_content: 'Let me think about this step by step...',
      };

      render(<MessageBubble message={messageWithThinking} showThinking={false} />);

      expect(screen.queryByText('Let me think about this step by step...')).not.toBeInTheDocument();
    });

    it('displays tool calls when present', () => {
      const messageWithToolCalls: Message = {
        ...baseAssistantMessage,
        tool_calls: [
          {
            id: 'tool1',
            type: 'function',
            function: {
              name: 'calculate',
              arguments: '{"expression": "2+2"}',
            },
          },
        ],
      };

      render(<MessageBubble message={messageWithToolCalls} />);

      expect(screen.getByText('Tool Calls')).toBeInTheDocument();
      expect(screen.getByText('calculate({"expression": "2+2"})')).toBeInTheDocument();
    });

    it('shows streaming indicator for assistant messages', () => {
      render(<MessageBubble message={baseAssistantMessage} isStreaming={true} />);

      const streamingIndicator = screen.getByText('▊');
      expect(streamingIndicator).toBeInTheDocument();
      expect(streamingIndicator).toHaveClass('animate-pulse');
    });
  });

  describe('System Messages', () => {
    it('renders system message with special styling', () => {
      render(<MessageBubble message={systemMessage} />);

      expect(screen.getByText('System initialized')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();

      const container = screen.getByText('System initialized').closest('div')?.parentElement;
      expect(container).toHaveClass('bg-yellow-50', 'dark:bg-yellow-900/20', 'border', 'border-yellow-200');
      expect(container?.parentElement).toHaveClass('justify-center');
    });

    it('shows warning icon for system messages', () => {
      render(<MessageBubble message={systemMessage} />);

      const icon = document.querySelector('.text-yellow-600');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Tool Messages', () => {
    it('renders tool message with correct avatar', () => {
      render(<MessageBubble message={toolMessage} />);

      expect(screen.getByText('Tool execution result')).toBeInTheDocument();
      expect(screen.getByText('Tool')).toBeInTheDocument();

      const avatar = document.querySelector('.bg-purple-600.rounded-full');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Utility Functions', () => {
    it('formats timestamp correctly', () => {
      const messageWithTime: Message = {
        ...baseUserMessage,
        timestamp: new Date('2024-01-01T14:30:45'),
      };

      render(<MessageBubble message={messageWithTime} />);

      expect(screen.getByText('14:30')).toBeInTheDocument();
    });

    it('handles missing timestamp gracefully', () => {
      const messageWithoutTime: Message = {
        ...baseUserMessage,
        timestamp: undefined,
      };

      render(<MessageBubble message={messageWithoutTime} />);

      expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument();
    });

    it('handles clipboard errors gracefully', () => {
      mockWriteText.mockRejectedValueOnce(new Error('Copy failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<MessageBubble message={baseAssistantMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      fireEvent.click(copyButton);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy text:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper button titles', () => {
      render(<MessageBubble message={baseAssistantMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();
    });

    it('uses semantic markup for roles', () => {
      render(<MessageBubble message={baseUserMessage} />);

      const roleLabel = screen.getByText('You');
      expect(roleLabel).toHaveClass('text-sm', 'font-medium');
    });
  });
});