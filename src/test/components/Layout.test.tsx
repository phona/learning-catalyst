import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAppStore } from '@/stores/useAppStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { vi } from 'vitest';

// Mock the stores
vi.mock('@/stores/useAppStore');
vi.mock('@/stores/useConfigStore');

// Mock the child components
vi.mock('@/components/Layout/Sidebar', () => ({
  Sidebar: ({ open }: { open: boolean }) => (
    <div data-testid="sidebar" data-open={open}>
      Sidebar
    </div>
  ),
}));

vi.mock('@/components/Layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

const mockUseAppStore = useAppStore as ReturnType<typeof vi.mocked><typeof useAppStore>;
const mockUseConfigStore = useConfigStore as ReturnType<typeof vi.mocked><typeof useConfigStore>;

describe('Layout', () => {
  beforeEach(() => {
    mockUseAppStore.mockReturnValue({
      sidebar_open: true,
      theme: 'light',
      setCurrentView: vi.fn(),
      setSidebarOpen: vi.fn(),
      setSettingsPanelOpen: vi.fn(),
      setTheme: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });

    mockUseConfigStore.mockReturnValue({
      config: {
        ai: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
        },
        ui: {
          show_token_usage: false,
        },
      },
      setConfig: vi.fn(),
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Layout />
      </MemoryRouter>
    );
  };

  it('renders header and sidebar', () => {
    renderLayout();

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
  });

  it('renders main content area with Outlet', () => {
    renderLayout();

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex-1', 'flex', 'flex-col', 'overflow-hidden');
  });

  it('passes sidebar state correctly', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      sidebar_open: false,
    });

    renderLayout();

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-open', 'false');
  });

  it('applies correct theme classes', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      theme: 'dark',
    });

    renderLayout();

    const container = document.querySelector('.h-screen');
    expect(container).toHaveClass('bg-gray-900');
  });

  it('shows status bar when token usage is enabled', () => {
    mockUseConfigStore.mockReturnValue({
      ...mockUseConfigStore(),
      config: {
        ai: {
          default_provider: 'chatglm',
          default_model: 'chatglm-pro',
        },
        ui: {
          show_token_usage: true,
        },
      },
    });

    renderLayout();

    expect(screen.getByText(/Provider: chatglm/)).toBeInTheDocument();
    expect(screen.getByText(/Model: chatglm-pro/)).toBeInTheDocument();
    expect(screen.getByText(/Theme: dark/)).toBeInTheDocument();
  });

  it('hides status bar when token usage is disabled', () => {
    renderLayout();

    expect(screen.queryByText(/Provider:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Theme:/)).not.toBeInTheDocument();
  });

  it('applies auto theme based on system preference', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      theme: 'auto',
    });

    // Mock system dark theme
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderLayout();

    const root = document.documentElement;
    expect(root).toHaveClass('dark');
  });

  it('adds event listener for system theme changes in auto mode', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      theme: 'auto',
    });

    const addEventListenerSpy = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { unmount } = renderLayout();

    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));

    // Cleanup should remove event listener
    unmount();
    // Note: We can't easily test removeEventListener here without more complex mocking
  });

  it('does not add event listener when theme is not auto', () => {
    mockUseAppStore.mockReturnValue({
      ...mockUseAppStore(),
      theme: 'light',
    });

    const addEventListenerSpy = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderLayout();

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('has proper layout structure', () => {
    renderLayout();

    const container = document.querySelector('.h-screen');
    expect(container).toHaveClass('flex', 'flex-col');

    const mainContent = document.querySelector('.flex.flex-1.overflow-hidden');
    expect(mainContent).toBeInTheDocument();

    const contentArea = document.querySelector('.flex-1.overflow-auto.custom-scrollbar');
    expect(contentArea).toBeInTheDocument();
  });

  it('handles missing config gracefully', () => {
    mockUseConfigStore.mockReturnValue({
      config: null,
      setConfig: vi.fn(),
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      resetConfig: vi.fn(),
    });

    expect(() => renderLayout()).not.toThrow();
  });
});