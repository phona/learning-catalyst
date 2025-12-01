import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatArea } from '../ChatArea';
import { renderWithServices } from '@/test/utils/renderWithServices';

vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@/renderer/components/Chat/MessageBubble', () => ({
  MessageBubble: ({ message }: { message: any }) => (
    <div data-testid={`message-bubble-${message.id}`}>{message.role}: {message.content}</div>
  ),
}));

import { useChatStore } from '@/renderer/hooks/useChatStore';

describe('ChatArea - No duplicate bubbles during streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the assistant placeholder without an extra streaming bubble', () => {
    const messages = [
      { id: 'msg_u', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
      { id: 'msg_a', role: 'assistant', content: 'Thinking...', status: 'typing', timestamp: new Date().toISOString() },
    ];

    (useChatStore as any).mockReturnValue({
      messages,
      isStreaming: true,
      streamingMessageId: 'msg_a',
      thinkingContent: '',
      streamingContent: 'Thinking...',
      autoScroll: true,
      updateMessage: vi.fn(),
    });

    renderWithServices(<ChatArea />);

    expect(screen.getByTestId('message-bubble-msg_u')).toBeInTheDocument();
    expect(screen.getByTestId('message-bubble-msg_a')).toBeInTheDocument();
    expect(screen.queryByTestId('message-bubble-streaming')).not.toBeInTheDocument();
    const bubbles = screen.getAllByTestId(/message-bubble-/);
    expect(bubbles.length).toBe(messages.length);
  });
});

