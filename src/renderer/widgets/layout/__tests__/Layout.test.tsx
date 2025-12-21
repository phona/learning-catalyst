import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Layout } from '@/renderer/widgets/layout';
import { useAppStore } from '@/renderer/stores/useAppStore';

vi.mock('@/renderer/stores/useAppStore', () => {
  const state = {
    sidebar_open: true,
    theme: 'light' as 'light' | 'dark' | 'auto',
    focus_mode: false,
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
  };
  const useAppStore = () => state;
  (useAppStore as any).getState = () => state;
  return { useAppStore };
});

vi.mock('@/renderer/stores/useConfigStore', () => ({
  useConfigStore: () => ({
    config: {
      ai: { defaultProvider: 'openai', defaultModel: 'gpt-4o', modelTypes: { chat: {} } },
      ui: { showTokenUsage: true },
    },
  }),
}));

vi.mock('@/renderer/widgets/layout/Header', () => ({
  Header: () => <div data-testid="header">header</div>,
}));

vi.mock('@/renderer/widgets/layout/ThreadListSidebar', () => ({
  ThreadListSidebar: ({ open }: { open: boolean }) => (
    <div data-testid="sidebar">{open ? 'open' : 'closed'}</div>
  ),
}));

vi.mock('@assistant-ui/react', () => ({
  ThreadListPrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    New: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? children : <button>{children}</button>,
    Items: ({ components }: { components: any }) => <div>Thread items</div>,
  },
  ThreadListItemPrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Title: ({ fallback }: { fallback?: string }) => <span>{fallback}</span>,
    Archive: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? children : <button>{children}</button>,
  },
  AssistantIf: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useThreadListItemRuntime: () => null,
}));

vi.mock('@/renderer/shared/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/renderer/shared/ui/Separator', () => ({
  Separator: () => <hr />,
}));

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
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveTextContent('open');
  });

  it('applies dark class when theme is dark', () => {
    const mockStore = useAppStore();
    mockStore.theme = 'dark';

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('derives theme from system in auto mode', () => {
    const mockStore = useAppStore();
    mockStore.theme = 'auto';
    (window as any).matchMedia = mockMatchMedia(true);

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows status bar when token usage toggle exists', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );
    expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
  });

  it('hides chrome and shows focus indicator in focus mode', () => {
    const mockStore = useAppStore();
    mockStore.focus_mode = true;

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('Focus Mode')).toBeInTheDocument();
  });

  it('exits focus mode via close button', () => {
    const mockStore = useAppStore();
    mockStore.focus_mode = true;
    const toggleSpy = vi.fn();
    mockStore.toggleFocusMode = toggleSpy;

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    // Find the focus mode exit button (the X button in the focus mode indicator)
    const focusModeIndicator = screen.getByText('Focus Mode').closest('div');
    const closeButton = focusModeIndicator?.querySelector('button');

    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(toggleSpy).toHaveBeenCalled();
  });
});
