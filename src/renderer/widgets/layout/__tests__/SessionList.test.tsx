/**
 * ThreadListSidebar Component Tests
 *
 * Test suite for the ThreadListSidebar component ensuring:
 * - Knowledge navigation section works correctly
 * - Conversations section with Assistant UI integration
 * - TypeScript strict mode compliance
 * - Proper navigation and routing behavior
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThreadListSidebar } from '../ThreadListSidebar';
import { useAppStore } from '@/renderer/stores/useAppStore';

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock @assistant-ui/react components
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
  },
  AssistantIf: ({ condition, children }: any) => {
    // Default to showing children (not loading)
    return children;
  },
}));

// Mock UI components
vi.mock('@/renderer/shared/ui/Button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/renderer/shared/ui/Separator', () => ({
  Separator: ({ ...props }: any) => <div data-testid="separator" {...props} />,
}));

// Mock Zustand store
vi.mock('@/renderer/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

describe('ThreadListSidebar', () => {
  const mockSetCurrentView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      setCurrentView: mockSetCurrentView,
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

    it('should render knowledge section with navigation items', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Discovery')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render conversations section', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByTestId('new-thread-button')).toBeInTheDocument();
    });

    it('should render separator between sections', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });
  });

  describe('Knowledge Navigation', () => {
    it('should navigate to knowledge map when Knowledge Map is clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map');
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('knowledge-map');
    });

    it('should navigate to progress when Dashboard is clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('progress');
    });

    it('should navigate to discovery when Discovery is clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const discoveryButton = screen.getByText('Discovery');
      fireEvent.click(discoveryButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('discovery');
    });

    it('should navigate to settings when Settings is clicked', () => {
      render(<ThreadListSidebar open={true} />);

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('settings');
    });
  });

  describe('Assistant UI Integration', () => {
    it('should render ThreadListPrimitive.Root with correct structure', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should render ThreadListPrimitive.New for new conversations', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('new-thread-button')).toBeInTheDocument();
    });

    it('should render ThreadListPrimitive.Items container', () => {
      render(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-items')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render as an aside element', () => {
      render(<ThreadListSidebar open={true} />);

      const sidebar = screen.getByTestId('thread-list-root').closest('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('w-64', 'bg-white', 'dark:bg-gray-800');
    });

    it('should have proper CSS classes for styling', () => {
      render(<ThreadListSidebar open={true} />);

      const sidebar = screen.getByTestId('thread-list-root').closest('aside');
      expect(sidebar).toHaveClass(
        'w-64',
        'bg-white',
        'dark:bg-gray-800',
        'border-r',
        'border-gray-200',
        'dark:border-gray-700',
        'flex',
        'flex-col',
        'h-full'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid navigation clicks', () => {
      render(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map');

      // Click multiple times rapidly
      fireEvent.click(knowledgeMapButton);
      fireEvent.click(knowledgeMapButton);
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledTimes(3);
    });

    it('should handle empty knowledge navigation gracefully', () => {
      render(<ThreadListSidebar open={true} />);

      // Component should still render the basic structure
      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
      expect(screen.getByText('Knowledge')).toBeInTheDocument();
    });
  });

  describe('TypeScript Compliance', () => {
    it('should accept open prop as boolean', () => {
      expect(() => {
        render(<ThreadListSidebar open={true} />);
        render(<ThreadListSidebar open={false} />);
      }).not.toThrow();
    });

    it('should have correct component type', () => {
      expect(typeof ThreadListSidebar).toBe('function');
    });
  });

  describe('Accessibility', () => {
    it('should render semantic HTML structure', () => {
      render(<ThreadListSidebar open={true} />);

      // Should render as an aside element
      const sidebar = screen.getByTestId('thread-list-root').closest('aside');
      expect(sidebar?.tagName).toBe('ASIDE');
    });

    it('should include proper button roles', () => {
      render(<ThreadListSidebar open={true} />);

      // Navigation buttons should have proper button elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
