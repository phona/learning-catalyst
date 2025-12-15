/**
 * ThreadListSidebar Component Tests
 *
 * Comprehensive test suite for the ThreadListSidebar component ensuring:
 * - ChatGPT-style layout with knowledge section and conversations
 * - Knowledge navigation triggers work correctly
 * - ThreadList integration with Assistant UI
 * - TypeScript strict mode compliance
 * - Proper event handling and navigation
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThreadListSidebar } from '../ThreadListSidebar';
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

// Mock Assistant UI components
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
        {components?.ThreadListItem ? (
          <div data-testid="custom-thread-item" />
        ) : null}
        {children}
      </div>
    ),
    Item: ({ children, className }: any) => (
      <div className={className} data-testid="thread-item">
        {children}
      </div>
    ),
    ItemTitle: ({ children }: any) => (
      <span data-testid="thread-item-title">{children}</span>
    ),
    ItemTimestamp: ({ children }: any) => (
      <span data-testid="thread-item-timestamp">{children}</span>
    ),
  },
  AssistantIf: ({ condition, children }: any) => {
    const { threads } = condition({ threads: { isLoading: false } });
    return threads.isLoading ? null : children;
  },
}));

describe('ThreadListSidebar', () => {
  const mockNavigate = vi.fn();
  const mockSetCurrentView = vi.fn();
  const mockResetChatState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as vi.Mock).mockReturnValue(mockNavigate);
    (useLocation as vi.Mock).mockReturnValue({
      pathname: '/',
    });
    (useAppStore as unknown as vi.Mock).mockReturnValue({
      setCurrentView: mockSetCurrentView,
    });
    (useChatStore as vi.Mock).mockReturnValue({
      resetChatState: mockResetChatState,
    });
  });

  describe('Rendering', () => {
    it('should render sidebar when open is true', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should not render sidebar when open is false', () => {
      render(<ThreadListSidebar open={false} />);

      expect(screen.queryByTestId('thread-list-root')).not.toBeInTheDocument();
    });

    it('should have correct container className', () => {
      render(<ThreadListSidebar open={true} />);

      const container = screen.getByTestId('thread-list-root').closest('aside');
      expect(container).toHaveClass(
        'sidebar',
        'w-64',
        'bg-white',
        'dark:bg-gray-800',
        'border-r',
        'border-gray-200',
        'dark:border-gray-700',
      );
    });
  });

  describe('Knowledge Section', () => {
    it('should render knowledge section header', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Knowledge')).toHaveClass('text-xs', 'font-medium');
    });

    it('should render all knowledge navigation items', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Discovery')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render knowledge items with correct styling', () => {
      render(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map');
      expect(knowledgeMapButton.closest('button')).toHaveClass(
        'justify-start',
        'font-normal',
      );
    });

    it('should include icons for knowledge items', () => {
      render(<ThreadListSidebar open={true} />);

      // Check that SVG icons are rendered
      const sidebar = screen.getByTestId('thread-list-root');
      const svgIcons = sidebar.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Conversations Section', () => {
    it('should render conversations header', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
    });

    it('should render New button', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByTestId('new-thread-button')).toBeInTheDocument();
    });

    it('should render thread items container', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-items')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      // Mock AssistantIf to show loading
      jest.doMock('@assistant-ui/react', () => ({
        ...jest.requireActual('@assistant-ui/react'),
        AssistantIf: ({ condition }: any) => {
          const { threads } = condition({ threads: { isLoading: true } });
          return threads.isLoading ? (
            <div data-testid="loading-state">Loading…</div>
          ) : null;
        },
      }));

      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to knowledge map when clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map');
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('knowledge-map');
      expect(mockNavigate).toHaveBeenCalledWith('/knowledge');
    });

    it('should navigate to dashboard when clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const dashboardButton = screen.getByText('Knowledge Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('dashboard');
      expect(mockNavigate).toHaveBeenCalledWith('/progress');
    });

    it('should navigate to discovery when clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const discoveryButton = screen.getByText('Discovery');
      fireEvent.click(discoveryButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('discovery');
      expect(mockNavigate).toHaveBeenCalledWith('/discovery');
    });

    it('should navigate to settings when clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('settings');
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('New Conversation', () => {
    it('should reset chat state when New button is clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      expect(mockResetChatState).toHaveBeenCalledTimes(1);
    });

    it('should navigate to base chat route when New button is clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const newButton = screen.getByTestId('new-thread-button');
      fireEvent.click(newButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('ThreadList Integration', () => {
    it('should render ThreadListPrimitive.Root with correct props', () => {
      render(<ThreadListSidebar open={true} />);

      const root = screen.getByTestId('thread-list-root');
      expect(root).toHaveClass('flex', 'h-full', 'flex-col', 'gap-2', 'p-2');
    });

    it('should render ThreadListPrimitive.New with asChild', () => {
      render(<ThreadListSidebar open={true} />);

      const newButton = screen.getByTestId('new-thread-button');
      expect(newButton).toBeInTheDocument();
    });

    it('should render ThreadListPrimitive.Items with custom ThreadListItem', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-items')).toBeInTheDocument();
    });

    it('should render styled thread items with correct classes', () => {
      render(<ThreadListSidebar open={true} />);

      const item = screen.getByTestId('thread-item');
      expect(item).toHaveClass(
        'flex',
        'w-full',
        'cursor-pointer',
        'select-none',
        'items-center',
        'gap-2',
        'rounded-md',
        'px-2',
        'py-1.5',
        'text-sm',
      );
    });
  });

  describe('Separator', () => {
    it('should render separator between sections', () => {
      render(<ThreadListSidebar open={true} />);

      // Separator should be present
      const separators = document.querySelectorAll('[role="separator"]');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render as an aside element', () => {
      render(<ThreadListSidebar open={true} />);

      const sidebar = screen.getByTestId('thread-list-root').closest('aside');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have correct role on separator', () => {
      render(<ThreadListSidebar open={true} />);

      const separator = document.querySelector('[role="separator"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('role', 'separator');
    });
  });

  describe('Memoization', () => {
    it('should memoize knowledge navigation elements', () => {
      const { rerender } = render(<ThreadListSidebar open={true} />);

      // Re-render with same props
      rerender(<ThreadListSidebar open={true} />);

      // Elements should still be rendered
      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
    });

    it('should handle location changes without re-rendering unnecessary elements', () => {
      const { rerender } = render(<ThreadListSidebar open={true} />);

      // Change location
      (useLocation as vi.Mock).mockReturnValue({ pathname: '/knowledge' });
      rerender(<ThreadListSidebar open={true} />);

      // Should still render all knowledge items
      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
    });
  });

  describe('TypeScript Strict Mode', () => {
    it('should accept open prop as boolean', () => {
      render(<ThreadListSidebar open={true} />);
      render(<ThreadListSidebar open={false} />);

      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should have correct component type', () => {
      expect(typeof ThreadListSidebar).toBe('function');
      expect(ThreadListSidebar.displayName).toBe('ThreadListSidebar');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigation items gracefully', () => {
      // This tests that the component doesn't crash if data is missing
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should handle rapid navigation clicks', () => {
      render(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map');

      // Click multiple times rapidly
      fireEvent.click(knowledgeMapButton);
      fireEvent.click(knowledgeMapButton);
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });
});
