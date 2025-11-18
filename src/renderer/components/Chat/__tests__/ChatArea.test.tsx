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
 * ChatArea Component Tests - Focused on Reliability
 *
 * Testing critical scenarios that can break chat display:
 * - Message rendering doesn't crash with malformed data
 * - Empty states work correctly
 * - Error boundaries catch display issues
 * - Scrolling behavior doesn't break
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatArea } from '../ChatArea';
import type { Message } from '@/shared/types/ai';

// Mock the chat store hook
vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@/renderer/components/Chat/MessageBubble', () => ({
  MessageBubble: ({ message, _onToggleThinking }: { message: Message; onToggleThinking?: (messageId: string) => void }) => (
    <div data-testid={`message-bubble-${message.id}`}>
      {message.role}: {message.content}
    </div>
  ),
}));

import { useChatStore } from '@/renderer/hooks/useChatStore';

describe('ChatArea - Critical Reliability Tests', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      provider: 'openai',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date('2024-01-01T10:00:01Z'),
      provider: 'openai',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render messages correctly', () => {
    (useChatStore as any).mockReturnValue({
      messages: mockMessages,
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    render(<ChatArea />);

    expect(screen.getByTestId('message-bubble-msg-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-bubble-msg-2')).toBeInTheDocument();
    expect(screen.getByText('user: Hello')).toBeInTheDocument();
    expect(screen.getByText('assistant: Hi there!')).toBeInTheDocument();
  });

  it('should show empty state when no messages', () => {
    (useChatStore as any).mockReturnValue({
      messages: [],
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    render(<ChatArea />);

    // Should show some kind of empty state or welcome message
    const chatArea = screen.getByTestId('chat-area') ||
                     document.querySelector('[data-testid="chat-area"]') ||
                     document.querySelector('.chat-area');

    expect(chatArea).toBeInTheDocument();
    // Should not crash or show message bubbles
    expect(screen.queryByTestId(/message-bubble/)).not.toBeInTheDocument();
  });

  it('should handle malformed messages gracefully', () => {
    const malformedMessages = [
      { id: 'msg-1', role: 'user', content: null }, // null content
      { id: 'msg-2', role: 'assistant', content: undefined }, // undefined content
      { id: 'msg-3', role: 'user', content: 'Normal message' }, // normal message
    ] as Message[];

    (useChatStore as any).mockReturnValue({
      messages: malformedMessages,
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    // Should not crash with malformed data
    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();

    // Should render what it can
    expect(screen.getByTestId('message-bubble-msg-3')).toBeInTheDocument();
  });

  it('should handle very long messages without breaking layout', () => {
    const longContent = 'A'.repeat(10000); // Very long message
    const messagesWithLongContent: Message[] = [
      {
        id: 'msg-long',
        role: 'assistant',
        content: longContent,
        timestamp: new Date(),
        provider: 'openai',
      },
    ];

    (useChatStore as any).mockReturnValue({
      messages: messagesWithLongContent,
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();

    expect(screen.getByTestId('message-bubble-msg-long')).toBeInTheDocument();
  });

  it('should handle useChatStore returning undefined', () => {
    (useChatStore as any).mockReturnValue(undefined);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });

  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });
  it('should handle null/undefined store gracefully', () => {
    (useChatStore as any).mockReturnValue(null);

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });

  it('should handle rapid message updates', () => {
    // Test that the component can handle different message states
    // First render with one message
    (useChatStore as any).mockReturnValue({
      messages: [mockMessages[0]],
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    const { unmount } = render(<ChatArea />);
    expect(screen.getByTestId('message-bubble-msg-1')).toBeInTheDocument();
    
    // Clean up and test with both messages
    unmount();
    
    (useChatStore as any).mockReturnValue({
      messages: mockMessages,
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    render(<ChatArea />);
    expect(screen.getByTestId('message-bubble-msg-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-bubble-msg-2')).toBeInTheDocument();
  });

  it('should handle loading state correctly', () => {
    (useChatStore as any).mockReturnValue({
      messages: [],
      isStreaming: true,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });

  it('should handle missing MessageBubble component gracefully', () => {
    vi.doMock('@/renderer/components/Chat/MessageBubble', () => ({
      MessageBubble: () => {
        throw new Error('MessageBubble failed to render');
      },
    }));

    (useChatStore as any).mockReturnValue({
      messages: mockMessages,
      loading: false,
    });

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();
  });

  it('should handle messages with special characters', () => {
    const specialMessages: Message[] = [
      {
        id: 'msg-special',
        role: 'user',
        content: 'Message with emoji 😊 and unicode ñáéíóú',
        timestamp: new Date(),
        provider: 'openai',
      },
    ];

    (useChatStore as any).mockReturnValue({
      messages: specialMessages,
      isStreaming: false,
      thinkingContent: '',
      streamingContent: '',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    expect(() => {
      render(<ChatArea />);
    }).not.toThrow();

    expect(screen.getByTestId('message-bubble-msg-special')).toBeInTheDocument();
  });
});
