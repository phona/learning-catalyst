/**
 * @fileoverview Verification Test - History Loading Fix
 *
 * Focus: renderer-side routing behavior.
 *
 * When the user refreshes or deep-links to `/chat/:sessionId`, the UI must
 * instruct Assistant UI's thread list runtime to switch to that thread.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChatInterface } from '@/renderer/components/Chat/ChatInterface';

const switchToThread = vi.fn();

const assistantApi = {
  threadListItem: vi.fn(),
  threads: vi.fn(() => ({ switchToThread })),
  on: vi.fn(() => () => {}),
};
// Mimic assistant-ui api shape
(assistantApi.threadListItem as any).source = true;

vi.mock('@assistant-ui/react', () => ({
  useAssistantApi: () => assistantApi,
}));

vi.mock('@assistant-ui/react-ui', () => ({
  Thread: () => <div data-testid="thread-component" />,
}));

describe('History Loading Fix - ChatInterface routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assistantApi.threadListItem as any).source = true;
  });

  it('switches to URL thread on page refresh', () => {
    assistantApi.threadListItem.mockReturnValue({
      getState: () => ({ id: '__LOCALID_abc', remoteId: undefined }),
    });

    render(
      <MemoryRouter initialEntries={['/chat/session-123']}>
        <Routes>
          <Route path="/chat/:sessionId" element={<ChatInterface />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
    expect(switchToThread).toHaveBeenCalledWith('session-123');
  });

  it('does not re-switch when already on the selected thread', () => {
    assistantApi.threadListItem.mockReturnValue({
      getState: () => ({ id: 'session-123', remoteId: 'session-123' }),
    });

    render(
      <MemoryRouter initialEntries={['/chat/session-123']}>
        <Routes>
          <Route path="/chat/:sessionId" element={<ChatInterface />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('thread-component')).toBeInTheDocument();
    expect(switchToThread).not.toHaveBeenCalled();
  });
});
