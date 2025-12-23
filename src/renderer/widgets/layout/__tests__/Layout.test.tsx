import React from 'react';
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Layout } from '@/renderer/widgets/layout';
import { renderWithServices, screen } from '@/test/utils/renderWithServices';

const mockMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe('Layout', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    (window as any).matchMedia = mockMatchMedia(false);
  });

  it('renders header and sidebar when not in focus mode', () => {
    renderWithServices(<Layout />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveTextContent('open');
  });

  it('applies dark class when theme is dark', () => {
    renderWithServices(<Layout />, {
      preloadedConfig: {
        ui: { theme: 'dark' },
        ai: {},
        learning: {},
        privacy: {}
      } as any
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('derives theme from system in auto mode', () => {
    (window as any).matchMedia = mockMatchMedia(true);

    renderWithServices(<Layout />, {
      preloadedConfig: {
        ui: { theme: 'auto' },
        ai: {},
        learning: {},
        privacy: {}
      } as any
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows status bar when token usage toggle exists', () => {
    renderWithServices(<Layout />, {
      preloadedConfig: {
        ui: { showTokenUsage: true },
        ai: {},
        learning: {},
        privacy: {}
      } as any
    });
    expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
  });

  it('hides chrome and shows focus indicator in focus mode', () => {
    renderWithServices(<Layout />, {
      preloadedConfig: {
        ui: { theme: 'light' },
        ai: {},
        learning: {},
        privacy: {}
      } as any,
      serviceOverrides: {
        appStore: {
          state: {
            sidebar_open: false,
            theme: 'light' as 'light' | 'dark' | 'auto',
            focus_mode: true,
            toggleFocusMode: vi.fn(),
            setCurrentView: vi.fn(),
            setSidebarOpen: vi.fn(),
            setSettingsPanelOpen: vi.fn(),
            setTheme: vi.fn(),
            setFocusMode: vi.fn(),
            setLoading: vi.fn(),
            setError: vi.fn(),
            setSuccess: vi.fn(),
            clearMessages: vi.fn(),
            settings_panel_open: false,
            current_view: 'chat' as const,
            loading: false,
            error_message: undefined,
            success_message: undefined,
          }
        }
      }
    });

    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('Focus Mode')).toBeInTheDocument();
  });

  it('exits focus mode via close button', () => {
    const toggleSpy = vi.fn();

    renderWithServices(<Layout />, {
      serviceOverrides: {
        appStore: {
          state: {
            sidebar_open: false,
            theme: 'light' as 'light' | 'dark' | 'auto',
            focus_mode: true,
            toggleFocusMode: toggleSpy,
            setCurrentView: vi.fn(),
            setSidebarOpen: vi.fn(),
            setSettingsPanelOpen: vi.fn(),
            setTheme: vi.fn(),
            setFocusMode: vi.fn(),
            setLoading: vi.fn(),
            setError: vi.fn(),
            setSuccess: vi.fn(),
            clearMessages: vi.fn(),
            settings_panel_open: false,
            current_view: 'chat' as const,
            loading: false,
            error_message: undefined,
            success_message: undefined,
          }
        }
      }
    });

    // Find the focus mode exit button (the X button in the focus mode indicator)
    const focusModeIndicator = screen.getByText('Focus Mode').closest('div');
    const closeButton = focusModeIndicator?.querySelector('button');

    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(toggleSpy).toHaveBeenCalled();
  });
});
