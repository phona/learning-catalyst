import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionList } from '../SessionList';

const baseSession = {
  id: 's1',
  title: 'First',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [{ id: 'm1', role: 'user', content: 'hi' }],
};

const renderList = (override: Partial<React.ComponentProps<typeof SessionList>> = {}) => {
  const onOpenSession = vi.fn();
  const onRefresh = vi.fn();
  const onNearBottom = vi.fn();
  const props: React.ComponentProps<typeof SessionList> = {
    sessions: [baseSession],
    newSessionIds: new Set(),
    activeSessionId: undefined,
    onOpenSession,
    onRefresh,
    loading: false,
    error: '',
    hasMore: false,
    scrollRef: { current: null },
    onNearBottom,
    ...override,
  };

  const utils = render(<SessionList {...props} />);
  return { ...props, utils };
};

describe('SessionList', () => {
  it('shows empty state when there are no sessions', () => {
    renderList({ sessions: [] });
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
  });

  it('shows error state when error provided', () => {
    renderList({ sessions: [], error: 'boom' });
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('shows loading state when loading and no sessions', () => {
    const { utils } = renderList({ sessions: [], loading: true });
    const placeholders = utils.container.querySelectorAll('.animate-pulse');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('renders sessions and triggers callbacks', () => {
    const { onOpenSession, onRefresh } = renderList();

    fireEvent.click(screen.getByRole('button', { name: /Refresh recent sessions/i }));
    expect(onRefresh).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('option', { name: /First/i }));
    expect(onOpenSession).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));

    expect(screen.getByText(/All sessions loaded/i)).toBeInTheDocument();
  });

  it('sets up infinite scroll when more sessions are available', () => {
    const onNearBottom = vi.fn();
    renderList({ hasMore: true, onNearBottom });

    expect(onNearBottom).toHaveBeenCalled();
  });
});
