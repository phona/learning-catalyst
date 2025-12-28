import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let lastThreadProps: any = null;

vi.mock('@assistant-ui/react-ui', () => ({
  Thread: (props: any) => {
    lastThreadProps = props;
    return <div data-testid="thread" />;
  },
}));

const navigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ sessionId: 'thread-123' }),
}));

const switchToThread = vi.fn();

const threadListItem = Object.assign(
  () => ({
    getState: () => ({ id: 'thread-123', remoteId: 'remote-123' }),
  }),
  { source: true },
);

vi.mock('@assistant-ui/react', () => ({
  useAssistantApi: () => ({
    threadListItem,
    threads: () => ({ switchToThread }),
    on: () => () => {},
  }),
}));

vi.mock('@/renderer/features/chat', () => ({
  ToolFallback: () => <div />,
  MarkdownText: ({ children }: any) => <>{children}</>,
}));

const MockAssistantMessageWithReasoning = () => <div />;
vi.mock('@/renderer/features/chat/ui/AssistantMessageWithReasoning', () => ({
  AssistantMessageWithReasoning: MockAssistantMessageWithReasoning,
}));

describe('ChatPage', () => {
  beforeEach(() => {
    lastThreadProps = null;
    navigate.mockClear();
    switchToThread.mockClear();
  });

  it('disables message edit action (pencil icon)', async () => {
    const { ChatPage } = await import('@/renderer/pages/chat/ChatPage');
    render(<ChatPage />);

    expect(screen.getByTestId('thread')).toBeInTheDocument();
    expect(lastThreadProps?.userMessage?.allowEdit).toBe(false);
  });

  it('wires AssistantMessageWithReasoning into Thread components', async () => {
    const { ChatPage } = await import('@/renderer/pages/chat/ChatPage');
    render(<ChatPage />);

    expect(lastThreadProps?.components?.AssistantMessage).toBe(MockAssistantMessageWithReasoning);
  });
});
