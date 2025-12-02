import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import { ChatProcessingOverlay } from '../ChatProcessingOverlay';
import type { ChatState } from '@/renderer/stores/chat/chatStore';

vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(),
}));
import { useChatStore } from '@/renderer/hooks/useChatStore';
const mockUseChatStore = vi.mocked(useChatStore);

describe('ChatProcessingOverlay', () => {
  const baseState: Partial<ChatState> = {
    isStreaming: false,
    setProcessingTraceCollapsed: vi.fn(),
  };

  const withState = (state: Partial<ChatState>) => {
    mockUseChatStore.mockImplementation((selector?: any) => {
      const fullState = { ...baseState, ...state } as ChatState;
      return selector ? selector(fullState) : (fullState as unknown);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there is no processing trace', () => {
    withState({ processingTrace: null });

    const { container } = render(<ChatProcessingOverlay />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows expanded overlay with events and collapse control', async () => {
    const setCollapsed = vi.fn();
    const startedAt = Date.now();
    withState({
      processingTrace: {
        messageId: 'm1',
        startedAt,
        completedAt: startedAt + 1200,
        events: [
          { id: 'e1', kind: 'thought', label: 'Thought process', at: startedAt },
          {
            id: 'e2',
            kind: 'tool',
            label: 'tool search start',
            tool: 'search',
            phase: 'start',
            at: startedAt + 35,
          },
          {
            id: 'e3',
            kind: 'tool',
            label: 'tool search end',
            tool: 'search',
            phase: 'end',
            at: startedAt + 220,
            durationMs: 185,
          },
        ],
        toolCount: 1,
        warningCount: 0,
        errorCount: 0,
        collapsed: false,
        activeToolStarts: {},
      },
      setProcessingTraceCollapsed: setCollapsed,
    });

    render(<ChatProcessingOverlay />);

    expect(screen.getByText(/Processing trace/i)).toBeInTheDocument();
    expect(screen.getByText(/Thought process/i)).toBeInTheDocument();
    expect(screen.getByText(/tool search start/i)).toBeInTheDocument();
    expect(screen.getByText(/tool search end/i)).toBeInTheDocument();
    expect(screen.getByText(/⚡/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Collapse/i }));
    expect(setCollapsed).toHaveBeenCalledWith(true);
  });

  it('shows collapsed pill and reopens when clicked', async () => {
    const setCollapsed = vi.fn();
    const startedAt = Date.now();
    withState({
      processingTrace: {
        messageId: 'm1',
        startedAt,
        completedAt: startedAt + 500,
        events: [{ id: 'e1', kind: 'thought', label: 'Thinking', at: startedAt }],
        toolCount: 0,
        warningCount: 0,
        errorCount: 0,
        collapsed: true,
        activeToolStarts: {},
      },
      setProcessingTraceCollapsed: setCollapsed,
    });

    render(<ChatProcessingOverlay inline />);

    const pill = screen.getByRole('button', { name: /Expand processing details/i });
    expect(pill).toBeInTheDocument();
    await userEvent.click(pill);
    expect(setCollapsed).toHaveBeenCalledWith(false);
  });
});
