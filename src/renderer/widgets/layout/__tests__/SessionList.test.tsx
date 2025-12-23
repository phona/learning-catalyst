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
import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ThreadListSidebar } from '../ThreadListSidebar';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('ThreadListSidebar', () => {
  const mockSetCurrentView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sidebar when open is true', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should not render sidebar when open is false', () => {
      renderWithServices(<ThreadListSidebar open={false} />);

      expect(screen.queryByTestId('thread-list-root')).not.toBeInTheDocument();
    });

    it('should render knowledge section with navigation items', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Discovery')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render conversations section', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByTestId('new-thread-button')).toBeInTheDocument();
    });

    it('should render separator between sections', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('separator')).toBeInTheDocument();
    });
  });

  describe('Knowledge Navigation', () => {
    it('should navigate to knowledge map when Knowledge Map is clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />, {
        serviceOverrides: {
          appStore: {
            state: {
              setCurrentView: mockSetCurrentView,
            }
          }
        }
      });

      const knowledgeMapButton = screen.getByText('Knowledge Map');
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('knowledge-map');
    });

    it('should navigate to progress when Dashboard is clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />, {
        serviceOverrides: {
          appStore: {
            state: {
              setCurrentView: mockSetCurrentView,
            }
          }
        }
      });

      const dashboardButton = screen.getByText('Dashboard');
      fireEvent.click(dashboardButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('progress');
    });

    it('should navigate to discovery when Discovery is clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />, {
        serviceOverrides: {
          appStore: {
            state: {
              setCurrentView: mockSetCurrentView,
            }
          }
        }
      });

      const discoveryButton = screen.getByText('Discovery');
      fireEvent.click(discoveryButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('discovery');
    });

    it('should navigate to settings when Settings is clicked', () => {
      renderWithServices(<ThreadListSidebar open={true} />, {
        serviceOverrides: {
          appStore: {
            state: {
              setCurrentView: mockSetCurrentView,
            }
          }
        }
      });

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(mockSetCurrentView).toHaveBeenCalledWith('settings');
    });
  });

  describe('Assistant UI Integration', () => {
    it('should render ThreadListPrimitive.Root with correct structure', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
    });

    it('should render ThreadListPrimitive.New for new conversations', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('new-thread-button')).toBeInTheDocument();
    });

    it('should render ThreadListPrimitive.Items container', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      expect(screen.getByTestId('thread-items')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render as an aside element', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      const sidebar = screen.getByTestId('thread-list-root').closest('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('w-64', 'bg-white', 'dark:bg-gray-800');
    });

    it('should have proper CSS classes for styling', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

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
      renderWithServices(<ThreadListSidebar open={true} />, {
        serviceOverrides: {
          appStore: {
            state: {
              setCurrentView: mockSetCurrentView,
            }
          }
        }
      });

      const knowledgeMapButton = screen.getByText('Knowledge Map');

      // Click multiple times rapidly
      fireEvent.click(knowledgeMapButton);
      fireEvent.click(knowledgeMapButton);
      fireEvent.click(knowledgeMapButton);

      expect(mockSetCurrentView).toHaveBeenCalledTimes(3);
    });

    it('should handle empty knowledge navigation gracefully', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      // Component should still render the basic structure
      expect(screen.getByTestId('thread-list-root')).toBeInTheDocument();
      expect(screen.getByText('Knowledge')).toBeInTheDocument();
    });
  });

  describe('TypeScript Compliance', () => {
    it('should accept open prop as boolean', () => {
      expect(() => {
        renderWithServices(<ThreadListSidebar open={true} />);
        renderWithServices(<ThreadListSidebar open={false} />);
      }).not.toThrow();
    });

    it('should have correct component type', () => {
      expect(typeof ThreadListSidebar).toBe('function');
    });
  });

  describe('Accessibility', () => {
    it('should render semantic HTML structure', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      // Should render as an aside element
      const sidebar = screen.getByTestId('thread-list-root').closest('aside');
      expect(sidebar?.tagName).toBe('ASIDE');
    });

    it('should include proper button roles', () => {
      renderWithServices(<ThreadListSidebar open={true} />);

      // Navigation buttons should have proper button elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
