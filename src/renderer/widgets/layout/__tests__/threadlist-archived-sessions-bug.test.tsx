/**
 * @fileoverview ThreadList archived sessions bug tests
 *
 * Repro:
 * - sessions are retrieved (but categorized as archived)
 * - sidebar renders only regular threads (default archived=false)
 * - result: thread list looks "stuck" / empty after refresh
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThreadListSidebar } from '@/renderer/widgets/layout/ThreadListSidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/renderer/stores/useAppStore';

// Mock dependencies (router + app store)
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

vi.mock('@/renderer/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

// Keep the UI dependencies very small for this bug repro.
vi.mock('@/renderer/shared/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Separator: () => <div role="separator" />,
}));

vi.mock('@heroicons/react/24/outline', () => ({
  MapIcon: () => <div data-testid="map-icon" />,
  ChartBarIcon: () => <div data-testid="chart-bar-icon" />,
  MagnifyingGlassIcon: () => <div data-testid="magnifying-glass-icon" />,
  CogIcon: () => <div data-testid="cog-icon" />,
  ArchiveBoxIcon: () => <div data-testid="archive-box-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
}));

type MockAssistantState = {
  threads: {
    isLoading: boolean;
    threadIds: string[];
    archivedThreadIds: string[];
  };
};

let assistantState: MockAssistantState = {
  threads: {
    isLoading: false,
    threadIds: [],
    archivedThreadIds: [],
  },
};

function setAssistantThreads(next: MockAssistantState['threads']): void {
  assistantState = { threads: next };
}

// Mock assistant-ui primitives with the same default behavior:
// ThreadListPrimitive.Items uses archived=false unless specified.
vi.mock('@assistant-ui/react', () => ({
  ThreadListPrimitive: {
    Root: ({ children }: any) => <div data-testid="thread-list-root">{children}</div>,
    New: ({ children, asChild }: any) => (asChild ? children : <button>{children}</button>),
    Items: ({ archived = false }: any) => {
      const ids = archived ? assistantState.threads.archivedThreadIds : assistantState.threads.threadIds;
      return (
        <div data-testid={archived ? 'thread-items-archived' : 'thread-items-regular'}>
          {ids.map((id: string) => (
            <div key={id} data-testid="threadlist-item" data-thread-id={id} />
          ))}
        </div>
      );
    },
  },
  ThreadListItemPrimitive: {
    Root: ({ children }: any) => <div>{children}</div>,
    Title: ({ fallback }: any) => <span>{fallback}</span>,
    Archive: ({ children }: any) => <>{children}</>,
  },
  AssistantIf: ({ condition, children }: any) => {
    const ok = typeof condition === 'function' ? condition(assistantState) : Boolean(condition);
    return ok ? children : null;
  },
  useAssistantApi: () => ({
    threadListItem: () => ({ getState: () => ({ id: 'thread-1' }) }),
    threads: () => ({ switchToThread: vi.fn() }),
  }),
}));

describe('?? BUG: ThreadList sidebar hides archived sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as vi.Mock).mockReturnValue(vi.fn());
    (useLocation as unknown as vi.Mock).mockReturnValue({ pathname: '/chat' });
    (useAppStore as unknown as vi.Mock).mockReturnValue({ setCurrentView: vi.fn() });
  });

  it('repro: when only archived sessions exist, sidebar renders empty list', () => {
    setAssistantThreads({
      isLoading: false,
      threadIds: [],
      archivedThreadIds: ['session-1', 'session-2'],
    });

    render(<ThreadListSidebar open={true} />);

    // Sidebar renders, but no items appear because it only mounts regular items (archived=false).
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByTestId('thread-items-regular')).toBeInTheDocument();
    expect(screen.queryAllByTestId('threadlist-item')).toHaveLength(0);
  });

  it.fails('BUG: archived sessions should be visible in thread list', () => {
    setAssistantThreads({
      isLoading: false,
      threadIds: [],
      archivedThreadIds: ['session-1', 'session-2'],
    });

    render(<ThreadListSidebar open={true} />);

    // Expected: history sessions render in the sidebar.
    // Actual (today): they are in archivedThreadIds, but the sidebar only renders threadIds.
    expect(screen.queryAllByTestId('threadlist-item')).toHaveLength(2);
  });
});

