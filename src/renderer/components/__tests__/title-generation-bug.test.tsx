/**
 * @fileoverview Title Generation Bug Tests
 *
 * TDD tests to reproduce and fix the title generation bug:
 * - Title generation doesn't work
 * - Generated titles are lost after page reload
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThreadListSidebar } from '@/renderer/components/Layout/ThreadListSidebar';
import { createThreadListAdapter } from '@/renderer/hooks/useThreadListAdapter';
import {
  createMockSession,
  createMockMessages,
  createMockElectronAPI,
  setupWindowMock,
  waitForAsync,
} from '@/test/utils/bug-test-utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/renderer/stores/useAppStore';
import { useChatStore } from '@/renderer/hooks/useChatStore';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

vi.mock('@/renderer/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@assistant-ui/react', () => ({
  ThreadListPrimitive: {
    Root: ({ children }: any) => (
      <div data-testid="thread-list-root">{children}</div>
    ),
    New: ({ children, asChild, onClick }: any) =>
      asChild ? children : (
        <button data-testid="new-thread-button" onClick={onClick}>
          {children}
        </button>
      ),
    Items: ({ children, components }: any) => (
      <div data-testid="thread-items">
        {components?.ThreadListItem ? <div data-testid="custom-thread-item" /> : null}
        {children}
      </div>
    ),
  },
  AssistantIf: ({ condition, children }: any) => {
    const { threads } = condition({ threads: { isLoading: false } });
    return threads.isLoading ? null : children;
  },
}));

vi.mock('@/renderer/components/UI/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/renderer/components/UI/Separator', () => ({
  Separator: () => <div role="separator" />,
}));

vi.mock('@/renderer/components/UI/SidebarTrigger', () => ({
  SidebarTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('🚨 BUG: Title Generation and Persistence', () => {
  let mockElectronAPI: ReturnType<typeof createMockElectronAPI>;
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockSetCurrentView: ReturnType<typeof vi.fn>;
  let mockResetChatState: ReturnType<typeof vi.fn>;
  let adapter: ReturnType<typeof createThreadListAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI = createMockElectronAPI();
    setupWindowMock(mockElectronAPI);
    mockNavigate = vi.fn();
    mockSetCurrentView = vi.fn();
    mockResetChatState = vi.fn();

    (useNavigate as vi.Mock).mockReturnValue(mockNavigate);
    (useLocation as vi.Mock).mockReturnValue({ pathname: '/' });
    (useAppStore as vi.Mock).mockReturnValue({ setCurrentView: mockSetCurrentView });
    (useChatStore as vi.Mock).mockReturnValue({ resetChatState: mockResetChatState });

    adapter = createThreadListAdapter();
  });

  describe('Title Generation Flow', () => {
    it('should generate AI title after first message is sent', async () => {
      // ARRANGE
      const mockGenerateTitle = vi.fn().mockResolvedValue('How to learn JavaScript?');
      mockElectronAPI.chat.generateTitle = mockGenerateTitle;

      // ACT - Simulate title generation
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How to learn JavaScript?' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Title should be generated
      expect(mockGenerateTitle).toHaveBeenCalledWith('How to learn JavaScript?');
    });

    it('should persist generated title to SQLite immediately', async () => {
      // ARRANGE
      const mockUpdateTitle = vi.fn().mockResolvedValue({ success: true });
      mockElectronAPI.sessions.updateTitle = mockUpdateTitle;

      // ACT - Simulate title generation
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How to learn JavaScript?' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Title persisted to database
      expect(mockUpdateTitle).toHaveBeenCalledWith(
        'thread-123',
        expect.stringContaining('JavaScript')
      );
    });

    it('should show generated title in thread list immediately', async () => {
      // ARRANGE - Set up mock to return new title
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'thread-123',
              title: 'How to learn JavaScript?', // Generated title
              topic: null,
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      // ACT - Refresh thread list
      const threads = await adapter.list();

      // ASSERT - Title should appear in list
      expect(threads.threads[0].title).toBe('How to learn JavaScript?');
    });
  });

  describe('Title Persistence After Reload', () => {
    it('should reload persisted title after page reload', async () => {
      // ARRANGE - Simulate reload with persisted title
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'thread-123',
          title: 'How to learn JavaScript?', // Title saved in DB
          status: 'active',
        },
      });

      // ACT - Fetch thread after reload
      const thread = await adapter.fetch('thread-123');

      // ASSERT - Title should be loaded from DB
      expect(thread.title).toBe('How to learn JavaScript?');
    });

    it('should show persisted title in sidebar after reload', async () => {
      // ARRANGE
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'thread-123',
              title: 'How to learn JavaScript?',
              topic: null,
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      const { rerender } = render(<ThreadListSidebar open={true} />);

      // ACT - Simulate page reload by re-rendering
      await waitForAsync();
      rerender(<ThreadListSidebar open={true} />);

      // ASSERT - Title should still be visible
      expect(screen.getByText('How to learn JavaScript?')).toBeInTheDocument();
    });

    it('should not lose title even after multiple reloads', async () => {
      // ARRANGE
      for (let i = 0; i < 5; i++) {
        mockElectronAPI.sessions.get.mockResolvedValueOnce({
          success: true,
          data: {
            id: 'thread-123',
            title: 'Persistent Title',
            status: 'active',
          },
        });

        // ACT - Simulate reload
        const thread = await adapter.fetch('thread-123');

        // ASSERT - Title should persist
        expect(thread.title).toBe('Persistent Title');
      }
    });
  });

  describe('Title Generation Edge Cases', () => {
    it('should handle AI generation failure gracefully', async () => {
      // ARRANGE - AI generation fails
      mockElectronAPI.chat.generateTitle.mockRejectedValue(new Error('AI API down'));
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT - Generate title with failing AI
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How do I learn?' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should use "New Chat" when AI completely fails
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        'New Chat'
      );
    });

    it('should handle empty AI response', async () => {
      // ARRANGE - AI returns empty string
      mockElectronAPI.chat.generateTitle.mockResolvedValue('');
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Some question' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should use message preview when AI returns empty
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        expect.stringMatching(/.+/)
      );
    });

    it('should handle null AI response', async () => {
      // ARRANGE - AI returns null
      mockElectronAPI.chat.generateTitle.mockResolvedValue(null);
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Another question' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should use message preview when AI returns null
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        expect.stringContaining('Another question')
      );
    });

    it('should handle undefined AI response', async () => {
      // ARRANGE - AI returns undefined
      mockElectronAPI.chat.generateTitle.mockResolvedValue(undefined);
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Yet another question' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should use message preview when AI returns undefined
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        expect.stringContaining('Yet another')
      );
    });

    it('should truncate long titles to reasonable length', async () => {
      // ARRANGE
      const longText = 'This is a very long question about how to learn programming with many details';
      mockElectronAPI.chat.generateTitle.mockResolvedValue(longText);
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: longText }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should be truncated
      const callArgs = mockElectronAPI.sessions.updateTitle.mock.calls[0];
      expect(callArgs[1].length).toBeLessThanOrEqual(50);
      expect(callArgs[1]).toMatch(/^This is a very long question about how to learn/);
    });
  });

  describe('Title Update Propagation', () => {
    it('should update title when user manually renames', async () => {
      // ARRANGE
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT
      await adapter.rename('thread-123', 'My Custom Title');

      // ASSERT
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        'My Custom Title'
      );
    });

    it('should reflect manual rename in thread list', async () => {
      // ARRANGE
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'thread-123',
              title: 'My Custom Title',
              topic: null,
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      // ACT - Rename and reload list
      await adapter.rename('thread-123', 'My Custom Title');
      const threads = await adapter.list();

      // ASSERT - New title should be in list
      expect(threads.threads[0].title).toBe('My Custom Title');
    });
  });

  describe('Default Title Handling', () => {
    it('should use "New Chat" when no messages', async () => {
      // ARRANGE
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT - Generate title with no user messages
      const messages = [
        {
          id: 'msg-1',
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Hello!' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should use default
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        'New Chat'
      );
    });

    it('should use "New Chat" when title generation completely fails', async () => {
      // ARRANGE
      mockElectronAPI.chat.generateTitle.mockRejectedValue(new Error('Network error'));
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Test' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should fallback to default
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        'New Chat'
      );
    });
  });

  describe('Thread List Integration', () => {
    it('should display title in thread list item', async () => {
      // ARRANGE
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: 'Generated Title',
              topic: null,
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      // ACT
      render(<ThreadListSidebar open={true} />);

      // ASSERT - Title should be visible
      expect(screen.getByText('Generated Title')).toBeInTheDocument();
    });

    it('should use topic as fallback when title is null', async () => {
      // ARRANGE
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: null,
              topic: 'Topic Fallback',
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      // ACT
      const threads = await adapter.list();

      // ASSERT - Should use topic
      expect(threads.threads[0].title).toBe('Topic Fallback');
    });

    it('should use "New Chat" when both title and topic are null', async () => {
      // ARRANGE
      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: {
          sessions: [
            {
              id: 'session-1',
              title: null,
              topic: null,
              status: 'active',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      // ACT
      const threads = await adapter.list();

      // ASSERT - Should use default
      expect(threads.threads[0].title).toBe('New Chat');
    });
  });
});
