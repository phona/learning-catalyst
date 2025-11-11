import { describe, it, beforeEach, beforeAll, vi, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { useSessionInit } from '@/renderer/hooks/useSessionInit';

vi.mock('@/renderer/hooks/useSessionInit', () => ({
  useSessionInit: vi.fn(),
}));

vi.mock('@/renderer/components/UI', () => ({
  MessageSkeleton: ({ isUser }: { isUser?: boolean }) => (
    <div data-testid={`message-skeleton-${isUser ? 'user' : 'assistant'}`}>
      Skeleton
    </div>
  ),
}));

vi.mock('@/renderer/components/Chat/ChatArea', () => ({
  ChatArea: () => <div data-testid="chat-area">Chat Area</div>,
}));

vi.mock('@/renderer/components/Chat/ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input">Chat Input</div>,
}));

let renderChatInterface: typeof import('@/test/utils/renderWithServices')['renderChatInterface'];

beforeAll(async () => {
  const module = await import('@/test/utils/renderWithServices');
  renderChatInterface = module.renderChatInterface;
});

describe('ChatInterface smoke coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeletons when session is loading', async () => {
    const sessionInitMock = vi.mocked(useSessionInit);
    sessionInitMock.mockReturnValue({
      loading: true,
      error: null,
    });

    await renderChatInterface();

    const userSkeletons = await screen.findAllByTestId('message-skeleton-user');
    const assistantSkeletons = await screen.findAllByTestId('message-skeleton-assistant');

    expect(userSkeletons.length).toBeGreaterThan(0);
    expect(assistantSkeletons.length).toBeGreaterThan(0);
  });

  it('renders chat surface when session is ready', async () => {
    const sessionInitMock = vi.mocked(useSessionInit);
    sessionInitMock.mockReturnValue({
      loading: false,
      error: null,
    });

    await renderChatInterface();

    expect(await screen.findByTestId('chat-area')).toBeInTheDocument();
    expect(await screen.findByTestId('chat-input')).toBeInTheDocument();
    expect(screen.queryByTestId('message-skeleton-user')).not.toBeInTheDocument();
  });
});
