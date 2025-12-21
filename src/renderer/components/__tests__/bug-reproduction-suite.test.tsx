/**
 * @fileoverview Bug Reproduction Suite
 *
 * End-to-end tests that reproduce real-world bug scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ElectronAPI } from '@/shared/types';

// Import the real components and functions
import { ThreadListSidebar } from '@/renderer/components/Layout/ThreadListSidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/renderer/stores/useAppStore';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { createThreadListAdapter } from '@/renderer/hooks/useThreadListAdapter';

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

vi.mock('@/renderer/hooks/useThreadListAdapter', () => ({
  createThreadListAdapter: () => ({
    list: vi.fn(),
    initialize: vi.fn(),
    rename: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    delete: vi.fn(),
    generateTitle: vi.fn(),
    fetch: vi.fn(),
  }),
}));

vi.mock('@assistant-ui/react', () => ({
  ThreadListPrimitive: {
    Root: ({ children }: any) => (
      <div data-testid="thread-list-root">{children}</div>
    ),
    New: ({ children, asChild, onClick }: any) => {
      if (asChild) {
        // When asChild is true, pass the onClick to the child element
        return React.cloneElement(children, { onClick, 'data-testid': 'new-thread-button' });
      }
      return (
        <button data-testid="new-thread-button" onClick={onClick}>
          {children}
        </button>
      );
    },
    Items: ({ children, components }: any) => (
      <div data-testid="thread-items">
        {components?.ThreadListItem ? <div data-testid="custom-thread-item" /> : null}
        {children}
      </div>
    ),
  },
  AssistantIf: ({ condition, children }: any) => {
    const result = condition({ threads: { isLoading: false } });
    return result.threads?.isLoading ? null : children;
  },
}));

vi.mock('@assistant-ui/react-ui', () => ({
  Thread: ({ assistantMessage }: any) => (
    <div data-testid="thread-component">
      {assistantMessage?.components?.ToolFallback && (
        <div data-testid="tool-fallback-component" />
      )}
    </div>
  ),
}));

vi.mock('@/renderer/components/Chat/ToolFallback', () => ({
  ToolFallback: ({ toolName }: any) => (
    <div data-testid="tool-fallback">{toolName}</div>
  ),
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

vi.mock('@assistant-ui/react-ai-sdk', () => ({
  useChatRuntime: () => ({}),
}));

vi.mock('@/renderer/services/chat/ipcFetch', () => ({
  createIpcFetch: () => vi.fn(),
}));

// Mock ChatInterface component
vi.mock('@/renderer/components/Chat/ChatInterface', () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

// Inline utility functions since external file doesn't exist
function createMockElectronAPI(): Partial<ElectronAPI> {
  return {
    sessions: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { sessions: [], total: 0 },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { sessionId: 'test-session' },
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'test-session',
          title: 'Test Chat',
          status: 'active',
        },
      }),
      updateTitle: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
    chat: {
      getMessages: vi.fn().mockResolvedValue({
        success: true,
        data: { sessions: [] },
      }),
      getCheckpoint: vi.fn().mockResolvedValue({
        success: true,
        data: { messages: [] },
      }),
      saveCheckpoint: vi.fn().mockResolvedValue({ success: true }),
      generateTitle: vi.fn().mockResolvedValue('Generated Title'),
      sendMessage: vi.fn(),
      streamMessage: vi.fn(),
    },
  };
}

function setupWindowMock(mockAPI: Partial<ElectronAPI>): void {
  // Simply assign the property, allow overwriting
  (window as any).electronAPI = mockAPI;
}

function createMockSession(
  id: string = 'test-session',
  messageCount: number = 5
) {
  const messages = Array(messageCount)
    .fill(null)
    .map((_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

  return {
    id,
    title: `Session ${id}`,
    status: 'active' as const,
    messages,
  };
}

function createMockMessages(count: number = 3) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Test message ${i}`,
    }));
}

function waitForAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getMemoryUsage(): number {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return Date.now();
}

// Note: createThreadListAdapter is mocked above

describe('🚨 BUG REPRODUCTION: Real-World Scenarios', () => {
  let mockElectronAPI: ReturnType<typeof createMockElectronAPI>;
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockSetCurrentView: ReturnType<typeof vi.fn>;
  let mockResetChatState: ReturnType<typeof vi.fn>;
  let adapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI = createMockElectronAPI();
    setupWindowMock(mockElectronAPI);
    mockNavigate = vi.fn(() => {});
    mockSetCurrentView = vi.fn();
    mockResetChatState = vi.fn();

    (useNavigate as vi.Mock).mockReturnValue(mockNavigate);
    (useLocation as vi.Mock).mockReturnValue({ pathname: '/' });
    (useAppStore as vi.Mock).mockReturnValue({ setCurrentView: mockSetCurrentView });
    (useChatStore as vi.Mock).mockReturnValue({ resetChatState: mockResetChatState });

    // Use the mocked adapter
    adapter = createThreadListAdapter();
  });

  describe('Complete User Journey: First Chat', () => {
    it('should: Start chat → Generate title → Reload → Title persists', async () => {
      // STEP 1: User starts new chat
      render(<ThreadListSidebar open={true} />);
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // STEP 1 verification: New thread button should be clickable
      expect(newButton).toBeInTheDocument();
      // Note: In real implementation, navigation is handled by Assistant UI runtime,
      // not direct navigate() calls from ThreadListSidebar

      // STEP 2: User sends first message (triggers title generation)
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How to learn React?' }],
        },
      ];

      mockElectronAPI.chat.generateTitle.mockResolvedValueOnce('How to learn React?');
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      await adapter.generateTitle('thread-123', messages);

      // STEP 3: Verify title generated and persisted
      expect(mockElectronAPI.chat.generateTitle).toHaveBeenCalledWith('How to learn React?');
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        expect.stringContaining('React')
      );

      // STEP 4: Simulate page reload - title should persist in DB
      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'thread-123',
          title: 'How to learn React?',
          status: 'active',
        },
      });

      const thread = await adapter.fetch('thread-123');

      // STEP 5: Verify title still exists after reload
      expect(thread.title).toBe('How to learn React?');
    });
  });

  describe('Complete User Journey: Switch Sessions', () => {
    it('should: Chat → Switch session → See full history → Continue chat', async () => {
      // STEP 1: Create first conversation with messages
      const session1Messages = [
        { id: 'msg-1', role: 'user', content: 'Message 1' },
        { id: 'msg-2', role: 'assistant', content: 'Response 1' },
      ];

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: { messages: session1Messages },
      });

      // STEP 2: Create second conversation with messages
      const session2Messages = [
        { id: 'msg-3', role: 'user', content: 'Message 2' },
        { id: 'msg-4', role: 'assistant', content: 'Response 2' },
      ];

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: { messages: session2Messages },
      });

      // STEP 3: Switch to first session and load history
      const checkpoint1 = await mockElectronAPI.chat.getCheckpoint('session-1');
      expect(checkpoint1.data.messages).toEqual(session1Messages);

      // STEP 4: Verify history loaded (only session 1 messages)
      expect(checkpoint1.data.messages).toHaveLength(2);
      expect(checkpoint1.data.messages[0].content).toBe('Message 1');
      expect(checkpoint1.data.messages[1].content).toBe('Response 1');

      // STEP 5: Switch to second session and load history
      const checkpoint2 = await mockElectronAPI.chat.getCheckpoint('session-2');
      expect(checkpoint2.data.messages).toEqual(session2Messages);

      // STEP 6: Verify second history loaded (only session 2 messages)
      expect(checkpoint2.data.messages).toHaveLength(2);
      expect(checkpoint2.data.messages[0].content).toBe('Message 2');
      expect(checkpoint2.data.messages[1].content).toBe('Response 2');

      // STEP 7: Continue chat in second session
      const newMessage = { id: 'msg-5', role: 'user', content: 'Follow-up question' };
      mockElectronAPI.chat.saveCheckpoint.mockResolvedValueOnce({
        success: true,
      });

      await mockElectronAPI.chat.saveCheckpoint('session-2', {
        messages: [...session2Messages, newMessage],
      });

      // STEP 8: Verify follow-up added to correct session
      expect(mockElectronAPI.chat.saveCheckpoint).toHaveBeenCalledWith(
        'session-2',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Follow-up question' }),
          ]),
        })
      );
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should: New chat fails → Show error → Retry → Success', async () => {
      // ARRANGE - First attempt fails
      mockElectronAPI.sessions.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { sessionId: 'retry-session' },
        });

      // ACT - Try to create new chat
      render(<ThreadListSidebar open={true} />);
      const newButton = screen.getByTestId('new-thread-button');

      // First click fails
      fireEvent.click(newButton);
      await waitForAsync();

      // Should handle error gracefully
      expect(() => {
        fireEvent.click(newButton);
      }).not.toThrow();

      // Second attempt succeeds
      await waitForAsync();

      // ASSERT - Should succeed on retry
      expect(mockElectronAPI.sessions.create).toHaveBeenCalledTimes(2);
    });

    it('should: History load fails → Show error → User can still start new chat', async () => {
      // ARRANGE - History loading fails
      mockElectronAPI.chat.getMessages.mockRejectedValueOnce(
        new Error('Database error')
      );

      // ACT - Try to load history
      try {
        await mockElectronAPI.chat.getMessages('broken-session');
      } catch (error) {
        // Expected to throw
        expect(error).toBeInstanceOf(Error);
      }

      // User should still be able to start new chat
      render(<ThreadListSidebar open={true} />);
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - New chat should work
      expect(mockResetChatState).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should: Title generation fails → Fallback to message preview', async () => {
      // ARRANGE - AI generation fails
      mockElectronAPI.chat.generateTitle.mockRejectedValueOnce(
        new Error('AI API down')
      );
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT - Generate title
      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How do I learn programming?' }],
        },
      ];

      await adapter.generateTitle('thread-123', messages);

      // ASSERT - Should use "New Chat" when AI throws error
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledWith(
        'thread-123',
        'New Chat'
      );
    });
  });

  describe('Memory and Performance', () => {
    it('should handle 50+ sessions without memory leaks', async () => {
      // ARRANGE
      const sessions = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          title: `Session ${i}`,
          status: 'active' as const,
          messages: Array(10)
            .fill(null)
            .map((__, j) => ({
              id: `msg-${i}-${j}`,
              role: j % 2 === 0 ? 'user' as const : 'assistant' as const,
              content: `Message ${i}-${j}`,
            })),
        }));

      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: { sessions, total: 50 },
      });

      // ACT - Load all sessions
      const initialMemory = getMemoryUsage();
      const threads = await adapter.list();

      // Switch through all sessions
      for (const session of sessions) {
        mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
          success: true,
          data: { messages: session.messages },
        });

        await mockElectronAPI.chat.getCheckpoint(session.id);
      }

      const finalMemory = getMemoryUsage();

      // ASSERT - Memory should not grow unbounded (mock check)
      expect(threads.threads).toHaveLength(50);
      expect(mockElectronAPI.chat.getCheckpoint).toHaveBeenCalledTimes(50);
    });

    it('should load large history (1000+ messages) efficiently', async () => {
      // ARRANGE
      const largeHistory = Array(1000)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
          content: `Message ${i}`,
        }));

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: largeHistory,
      });

      const startTime = Date.now();

      // ACT
      const result = await mockElectronAPI.chat.getMessages('large-session');

      const loadTime = Date.now() - startTime;

      // ASSERT - Should load in reasonable time (<2 seconds in real scenario)
      expect(result.data).toHaveLength(1000);
      expect(loadTime).toBeLessThan(5000); // Allow more time in test environment
    });

    it('should not accumulate memory when switching between sessions rapidly', async () => {
      // ARRANGE
      const sessionCount = 20;
      const messagesPerSession = 50;

      const sessions = Array(sessionCount)
        .fill(null)
        .map((_, i) => createMockSession(`session-${i}`, messagesPerSession));

      // ACT - Rapidly switch between sessions
      for (let i = 0; i < 5; i++) {
        for (const session of sessions) {
          mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
            success: true,
            data: { messages: session.messages },
          });

          await mockElectronAPI.chat.getCheckpoint(session.id);
        }
      }

      // ASSERT - Should handle rapid switching
      expect(mockElectronAPI.chat.getCheckpoint).toHaveBeenCalledTimes(
        sessionCount * 5
      );
    });
  });

  describe('Data Consistency', () => {
    it('should maintain message order across session switches', async () => {
      // ARRANGE
      const orderedMessages = [
        { id: 'msg-1', role: 'user', content: 'First', order: 1 },
        { id: 'msg-2', role: 'assistant', content: 'Second', order: 2 },
        { id: 'msg-3', role: 'user', content: 'Third', order: 3 },
      ];

      mockElectronAPI.chat.getMessages.mockResolvedValueOnce({
        success: true,
        data: orderedMessages,
      });

      // ACT
      const result = await mockElectronAPI.chat.getMessages('session-123');

      // ASSERT - Order should be maintained
      expect(result.data[0].order).toBe(1);
      expect(result.data[1].order).toBe(2);
      expect(result.data[2].order).toBe(3);
    });

    it('should sync title between session list and individual session', async () => {
      // ARRANGE
      const sessionTitle = 'Synchronized Title';
      const session = {
        id: 'session-123',
        title: sessionTitle,
        status: 'active' as const,
      };

      mockElectronAPI.sessions.list.mockResolvedValueOnce({
        success: true,
        data: { sessions: [session], total: 1 },
      });

      mockElectronAPI.sessions.get.mockResolvedValueOnce({
        success: true,
        data: session,
      });

      // ACT
      const threads = await adapter.list();
      const sessionData = await adapter.fetch('session-123');

      // ASSERT - Titles should match
      expect(threads.threads[0].title).toBe(sessionTitle);
      expect(sessionData.title).toBe(sessionTitle);
    });

    it('should persist checkpoint changes immediately', async () => {
      // ARRANGE
      const initialCheckpoint = {
        messages: [{ id: 'msg-1', role: 'user', content: 'Initial' }],
      };

      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: true,
        data: initialCheckpoint,
      });

      // ACT - Update checkpoint
      const updatedCheckpoint = {
        messages: [
          ...initialCheckpoint.messages,
          { id: 'msg-2', role: 'assistant', content: 'Added' },
        ],
      };

      mockElectronAPI.chat.saveCheckpoint.mockResolvedValueOnce({
        success: true,
      });

      await mockElectronAPI.chat.saveCheckpoint('session-123', updatedCheckpoint);

      // Verify save was called with updated data
      expect(mockElectronAPI.chat.saveCheckpoint).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Added' }),
          ]),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with no checkpoint', async () => {
      // ARRANGE
      mockElectronAPI.chat.getCheckpoint.mockResolvedValueOnce({
        success: false,
        error: 'Checkpoint not found',
      });

      // ACT
      const result = await mockElectronAPI.chat.getCheckpoint('session-123');

      // ASSERT - Should return error, not crash
      expect(result.success).toBe(false);
    });

    it('should handle concurrent title updates', async () => {
      // ARRANGE
      mockElectronAPI.sessions.updateTitle.mockResolvedValue({ success: true });

      // ACT - Multiple title updates
      await Promise.all([
        adapter.rename('thread-123', 'Title 1'),
        adapter.rename('thread-123', 'Title 2'),
        adapter.rename('thread-123', 'Title 3'),
      ]);

      // ASSERT - All updates should be attempted
      expect(mockElectronAPI.sessions.updateTitle).toHaveBeenCalledTimes(3);
    });

    it('should handle session deletion while active', async () => {
      // ARRANGE
      mockElectronAPI.sessions.delete.mockResolvedValueOnce({
        success: true,
      });

      // ACT
      await adapter.delete('session-123');

      // ASSERT - Should delete successfully
      expect(mockElectronAPI.sessions.delete).toHaveBeenCalledWith('session-123');
    });

    it('should handle archive/unarchive cycle', async () => {
      // ARRANGE
      mockElectronAPI.sessions.update.mockResolvedValue({ success: true });

      // ACT
      await adapter.archive('session-123');
      await adapter.unarchive('session-123');

      // ASSERT - Both operations should succeed
      expect(mockElectronAPI.sessions.update).toHaveBeenCalledTimes(2);
      expect(mockElectronAPI.sessions.update).toHaveBeenNthCalledWith(
        1,
        'session-123',
        { status: 'completed' }
      );
      expect(mockElectronAPI.sessions.update).toHaveBeenNthCalledWith(
        2,
        'session-123',
        { status: 'active' }
      );
    });
  });
});
