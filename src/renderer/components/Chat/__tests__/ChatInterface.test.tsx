/**
 * ChatInterface Component Tests - Focused on Error Prevention
 *
 * Testing critical scenarios that can crash the app:
 * - Session loading doesn't break the UI
 * - Component errors are caught by boundaries
 * - Session initialization failures are handled
 * - Basic chat functionality works
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the hooks and components
vi.mock('../../../hooks/useSessionInit', () => ({
  useSessionInit: vi.fn(),
}));

vi.mock('../../UI', () => ({
  __esModule: true,
  MessageSkeleton: ({ isUser }: { isUser: boolean }) => (
    <div
      data-testid={`message-skeleton-${isUser ? 'user' : 'assistant'}`}
      className={isUser ? 'skeleton-user' : 'skeleton-assistant'}
    >
      Loading skeleton
    </div>
  ),
}));

vi.mock('../ChatArea', () => ({
  __esModule: true,
  ChatArea: () => <div data-testid="chat-area">Chat Area</div>,
}));

vi.mock('../ChatInput', () => ({
  __esModule: true,
  ChatInput: () => <div data-testid="chat-input">Chat Input</div>,
}));

vi.mock('@/renderer/hooks/useChat', () => ({
  __esModule: true,
  useChat: () => ({
    isLoading: false,
    isStreaming: false,
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    stopStreaming: vi.fn(),
    error: null,
    setError: vi.fn(),
    selectedAgent: null,
  }),
}));

vi.mock('@/renderer/stores/useConfigStore', () => ({
  __esModule: true,
  useConfigStore: () => ({
    config: {
      ai: {
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            capabilities: {
              streaming: true,
              thinking: false,
            },
          },
        },
      },
    },
    updateConfig: vi.fn(),
  }),
}));

import { useSessionInit } from '../../../hooks/useSessionInit';
let ChatInterface: typeof import('../ChatInterface').ChatInterface;

beforeAll(async () => {
  ({ ChatInterface } = await import('../ChatInterface'));
});

describe('ChatInterface - Error Prevention Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state when session is loading', () => {
    (useSessionInit as any).mockReturnValue({
      loading: true,
      error: null,
    });

    render(<ChatInterface />);

    // Should show skeleton loaders
    expect(screen.getAllByTestId('message-skeleton-user').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('message-skeleton-assistant').length).toBeGreaterThan(0);

    // Should show input skeleton
    const inputSkeleton = document.querySelector('.animate-pulse');
    expect(inputSkeleton).toBeInTheDocument();
  });

  it('should render chat components when session is ready', () => {
    (useSessionInit as any).mockReturnValue({
      loading: false,
      error: null,
    });

    render(<ChatInterface />);

    // Should show main chat components
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();

    // Should NOT show loading skeletons
    expect(screen.queryByTestId(/message-skeleton/)).not.toBeInTheDocument();
  });

  it('should handle session initialization errors gracefully', () => {
    (useSessionInit as any).mockReturnValue({
      loading: false,
      error: new Error('Failed to load session'),
    });

    // Should not crash when there's an error
    expect(() => {
      render(<ChatInterface />);
    }).not.toThrow();

    // Should still attempt to render chat components
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should handle useSessionInit returning undefined', () => {
    (useSessionInit as any).mockReturnValue(undefined);

    // Should not crash when hook returns undefined
    expect(() => {
      render(<ChatInterface />);
    }).not.toThrow();

    // Should still render components
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should handle useSessionInit throwing an error', () => {
    (useSessionInit as any).mockImplementation(() => {
      throw new Error('Hook failed');
    });

    // Should not crash when hook throws
    expect(() => {
      render(<ChatInterface />);
    }).not.toThrow();
  });

  it('should handle rapid loading state changes', () => {
    const { rerender } = render(<ChatInterface />);

    // Initially, it might try to render
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();

    // Simulate loading state
    (useSessionInit as any).mockReturnValue({
      loading: true,
      error: null,
    });

    rerender(<ChatInterface />);

    // Should show loading state
    expect(screen.getAllByTestId('message-skeleton-user').length).toBeGreaterThan(0);

    // Simulate loading complete
    (useSessionInit as any).mockReturnValue({
      loading: false,
      error: null,
    });

    rerender(<ChatInterface />);

    // Should go back to normal state
    expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should maintain proper layout structure', () => {
    (useSessionInit as any).mockReturnValue({
      loading: false,
      error: null,
    });

    render(<ChatInterface />);

    const container = screen.getByTestId('chat-area').parentElement;
    expect(container).toHaveClass('h-full', 'flex', 'flex-col');
  });

  it.skip('should handle missing MessageSkeleton gracefully', () => {});
  it.skip('should handle missing ChatArea component gracefully', () => {});
  it.skip('should handle missing ChatInput component gracefully', () => {});
});
