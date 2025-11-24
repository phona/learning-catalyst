import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Layout } from '@/renderer/components/Layout';
import { useAppStore } from '@/renderer/stores/useAppStore';

vi.mock('@/renderer/stores/useAppStore', () => {
  const state = {
    sidebar_open: true,
    theme: 'light' as 'light' | 'dark' | 'auto',
    focus_mode: false,
    toggleFocusMode: vi.fn(),
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

vi.mock('@/renderer/components/Layout/Header', () => ({
  Header: () => <div data-testid="header">header</div>,
}));

vi.mock('@/renderer/components/Layout/Sidebar', () => ({
  Sidebar: ({ open }: { open: boolean }) => (
    <div data-testid="sidebar">{open ? 'open' : 'closed'}</div>
  ),
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

  it('renders header, sidebar and outlet when not in focus mode', () => {
    render(
      <Layout>
        <div data-testid="content">content</div>
      </Layout>,
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveTextContent('open');
  });

  it('applies dark class when theme is dark', () => {
    useAppStore().theme = 'dark';

    render(<Layout />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('derives theme from system in auto mode', () => {
    useAppStore().theme = 'auto';
    (window as any).matchMedia = mockMatchMedia(true);

    render(<Layout />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows status bar when token usage toggle exists', () => {
    render(<Layout />);
    expect(screen.getByText(/Provider:/i)).toBeInTheDocument();
  });

  it('hides chrome and shows focus indicator in focus mode', () => {
    useAppStore().focus_mode = true;

    render(<Layout />);

    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('Focus Mode')).toBeInTheDocument();
  });

  it('exits focus mode via close button', () => {
    useAppStore().focus_mode = true;
    const toggleSpy = useAppStore().toggleFocusMode as any;

    render(<Layout />);
    fireEvent.click(screen.getByRole('button'));

    expect(toggleSpy).toHaveBeenCalled();
  });
});
