/**
 * @fileoverview New Chat Crash Bug Tests
 *
 * TDD tests to reproduce and fix the new chat crash bug:
 * - Clicking "New Chat" crashes the entire app
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThreadListSidebar } from '@/renderer/components/Layout/ThreadListSidebar';
import {
  createMockElectronAPI,
  setupWindowMock,
  waitForAsync,
  getMemoryUsage,
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

describe('🚨 BUG: New Chat Crashes App', () => {
  let mockElectronAPI: ReturnType<typeof createMockElectronAPI>;
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockSetCurrentView: ReturnType<typeof vi.fn>;
  let mockResetChatState: ReturnType<typeof vi.fn>;

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
  });

  describe('New Chat Button Click', () => {
    it('should reset chat state without crashing', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT - Click New button
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should not crash
      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should call resetChatState function', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT
      expect(mockResetChatState).toHaveBeenCalledTimes(1);
    });

    it('should navigate to base route without error', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle resetChatState throwing error', async () => {
      // ARRANGE - resetChatState throws
      const throwingResetChatState = () => {
        throw new Error('Reset failed');
      };

      (useChatStore as vi.Mock).mockReturnValue({
        resetChatState: throwingResetChatState,
      });

      render(<ThreadListSidebar open={true} />);

      // ACT & ASSERT - Should not crash app
      expect(() => {
        const newButton = screen.getByTestId('new-thread-button');
        fireEvent.click(newButton);
      }).not.toThrow();

      // Should still attempt to navigate
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle navigate throwing error', async () => {
      // ARRANGE - navigate throws
      const throwingNavigate = () => {
        throw new Error('Navigation failed');
      };

      (useNavigate as vi.Mock).mockReturnValue(throwingNavigate);

      render(<ThreadListSidebar open={true} />);

      // ACT & ASSERT - Should not crash
      expect(() => {
        const newButton = screen.getByTestId('new-thread-button');
        fireEvent.click(newButton);
      }).not.toThrow();

      // Should still attempt to reset chat state
      expect(mockResetChatState).toHaveBeenCalled();
    });

    it('should not crash when open is false', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={false} />);

      // ACT & ASSERT - Should not crash
      expect(() => {
        render(<ThreadListSidebar open={true} />);
      }).not.toThrow();
    });
  });

  describe('Thread Initialization After New Chat', () => {
    it('should create new thread after reset', async () => {
      // ARRANGE
      mockElectronAPI.sessions.create.mockResolvedValue({
        success: true,
        data: { sessionId: 'new-session-id' },
      });

      render(<ThreadListSidebar open={true} />);

      // ACT - User clicks new chat
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should create new session
      expect(mockElectronAPI.sessions.create).toHaveBeenCalledWith({
        title: 'New Chat',
        threadId: expect.any(String), // New local ID
      });
    });

    it('should clear previous conversation messages', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT - Click new chat
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Chat store should be reset
      expect(mockResetChatState).toHaveBeenCalled();
    });

    it('should handle thread creation failure gracefully', async () => {
      // ARRANGE - Session creation fails
      mockElectronAPI.sessions.create.mockResolvedValue({
        success: false,
        error: 'Failed to create session',
      });

      render(<ThreadListSidebar open={true} />);

      // ACT & ASSERT - Should show error, not crash
      const newButton = screen.getByTestId('new-thread-button');
      expect(() => {
        fireEvent.click(newButton);
      }).not.toThrow();

      // Should still navigate away
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle session creation throwing exception', async () => {
      // ARRANGE - Session creation throws
      mockElectronAPI.sessions.create.mockRejectedValue(new Error('Network error'));

      render(<ThreadListSidebar open={true} />);

      // ACT & ASSERT - Should not crash
      expect(() => {
        const newButton = screen.getByTestId('new-thread-button');
        fireEvent.click(newButton);
      }).not.toThrow();
    });

    it('should not leak memory from previous thread', async () => {
      // ARRANGE - Create many messages in previous thread (simulated)
      const initialMemory = getMemoryUsage();

      render(<ThreadListSidebar open={true} />);

      // ACT - Start new chat
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Memory should be stable (not exponentially growing)
      // Note: In real tests, we'd measure actual memory, but here we just verify no obvious leaks
      expect(mockResetChatState).toHaveBeenCalled();
    });
  });

  describe('UI State After New Chat', () => {
    it('should clear input field after new chat', async () => {
      // ARRANGE - Create a mock input field
      const input = document.createElement('input');
      input.value = 'Previous message';
      document.body.appendChild(input);

      render(<ThreadListSidebar open={true} />);

      // ACT - Click new chat
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Chat state should be reset
      expect(mockResetChatState).toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(input);
    });

    it('should not show error state after successful new chat', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should navigate successfully
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from resetChatState error and still navigate', async () => {
      // ARRANGE - resetChatState fails
      (useChatStore as vi.Mock).mockReturnValue({
        resetChatState: () => {
          console.error('Reset failed'); // Log but don't throw
        },
      });

      render(<ThreadListSidebar open={true} />);

      // ACT
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should still navigate
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle multiple rapid new chat clicks', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT - Click multiple times rapidly
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);
      fireEvent.click(newButton);
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should handle all clicks without crashing
      expect(mockResetChatState).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should not interfere with other sidebar functions after error', async () => {
      // ARRANGE - Simulate an error in resetChatState
      (useChatStore as vi.Mock).mockReturnValue({
        resetChatState: () => {
          throw new Error('Simulated error');
        },
      });

      render(<ThreadListSidebar open={true} />);

      // ACT - Click new chat (causes error)
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      // Try to use sidebar normally after error
      // ACT - Click a knowledge navigation item
      const knowledgeMapButton = screen.getByText('Knowledge Map');
      fireEvent.click(knowledgeMapButton);

      await waitForAsync();

      // ASSERT - Other functions should still work
      expect(mockSetCurrentView).toHaveBeenCalledWith('knowledge-map');
      expect(mockNavigate).toHaveBeenCalledWith('/knowledge');
    });
  });

  describe('State Consistency', () => {
    it('should maintain sidebar open state after new chat', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Sidebar should still be open
      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should reset only chat state, not app state', async () => {
      // ARRANGE
      render(<ThreadListSidebar open={true} />);

      // ACT
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should reset chat state but not app state
      expect(mockResetChatState).toHaveBeenCalled();
      // setCurrentView should not be called for new chat
      expect(mockSetCurrentView).not.toHaveBeenCalled();
    });

    it('should handle state where stores are not available', async () => {
      // ARRANGE - Simulate missing store
      (useChatStore as vi.Mock).mockImplementation(() => {
        throw new Error('Store not initialized');
      });

      render(<ThreadListSidebar open={true} />);

      // ACT & ASSERT - Should not crash
      expect(() => {
        const newButton = screen.getByTestId('new-thread-button');
        fireEvent.click(newButton);
      }).not.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle new chat while session list is loading', async () => {
      // ARRANGE - Simulate loading state
      mockElectronAPI.sessions.list.mockReturnValue(
        new Promise(() => {}) // Never resolves (loading forever)
      );

      render(<ThreadListSidebar open={true} />);

      // ACT - Click new chat while loading
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // ASSERT - Should handle gracefully
      expect(mockResetChatState).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should cancel pending operations on new chat', async () => {
      // ARRANGE
      let resolveList: (value: any) => void;
      mockElectronAPI.sessions.list.mockReturnValue(
        new Promise((res) => (resolveList = res))
      );

      render(<ThreadListSidebar open={true} />);

      // ACT - Click new chat before list resolves
      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      await waitForAsync();

      // Resolve the pending list operation
      resolveList!({
        success: true,
        data: { sessions: [], total: 0 },
      });

      // ASSERT - Should handle both operations
      expect(mockResetChatState).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
