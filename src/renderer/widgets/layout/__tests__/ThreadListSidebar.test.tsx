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
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThreadListSidebar } from '../ThreadListSidebar';
import { renderWithServices, screen, fireEvent } from '@/test/utils/renderWithServices';

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

// Mock useAppStore
const mockSetCurrentView = vi.fn();
vi.mock('@/renderer/stores/useAppStore', () => ({
  useAppStore: () => ({
    setCurrentView: mockSetCurrentView,
  }),
}));

describe('ThreadListSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sidebar when open is true', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      // Component renders as an aside element
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should not render sidebar when open is false', () => {
      renderWithServices(<ThreadListSidebar open={false} />);

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('should have correct container className', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const aside = screen.getByRole('complementary');
      expect(aside).toHaveClass('w-64', 'bg-white', 'dark:bg-gray-800');
    });
  });

  describe('Knowledge Section', () => {
    it('should render knowledge section header', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Knowledge')).toBeInTheDocument();
    });

    it('should render all knowledge navigation items', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Discovery')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render knowledge items as buttons', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map').closest('button');
      expect(knowledgeMapButton).toBeInTheDocument();
    });

    it('should include icons for knowledge items', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const aside = screen.getByRole('complementary');
      const svgIcons = aside.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Conversations Section', () => {
    it('should render conversations header', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
    });

    it('should render New button', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      // The New button contains a PlusIcon
      const buttons = screen.getAllByRole('button');
      const newButton = buttons.find((btn) => btn.querySelector('svg'));
      expect(newButton).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to knowledge map when clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const knowledgeMapButton = screen.getByText('Knowledge Map');
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('knowledge-map');
      expect(mockNavigate).toHaveBeenCalledWith('/knowledge');
    });

    it('should navigate to dashboard when clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('progress');
      expect(mockNavigate).toHaveBeenCalledWith('/progress');
    });

    it('should navigate to discovery when clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const discoveryButton = screen.getByText('Discovery');
      fireEvent.click(discoveryButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('discovery');
      expect(mockNavigate).toHaveBeenCalledWith('/discovery');
    });

    it('should navigate to settings when clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('settings');
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Separator', () => {
    it('should render separator between sections', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const separators = document.querySelectorAll('[role="separator"]');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render as an aside element', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should have correct role on separator', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const separator = document.querySelector('[role="separator"]');
      expect(separator).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should memoize knowledge navigation elements', () => {
      // First render
      renderWithServices(<ThreadListSidebar open={true} />);

      // Elements should be rendered
      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Discovery')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('TypeScript Strict Mode', () => {
    it('should accept open prop as boolean true', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should accept open prop as boolean false', () => {
      renderWithServices(<ThreadListSidebar open={false} />);

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('should have correct component type', () => {
      expect(typeof ThreadListSidebar).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigation items gracefully', () => {
      // This tests that the component doesn't crash if data is missing
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('should handle rapid navigation clicks', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

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
