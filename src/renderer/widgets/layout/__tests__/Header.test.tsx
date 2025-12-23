import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Header } from '@/renderer/widgets/layout/Header';
import { renderWithServices } from '@/test/utils/renderWithServices';

const appStoreState = {
  sidebar_open: true,
  theme: 'light' as 'light' | 'dark' | 'auto',
  focus_mode: false,
  setSidebarOpen: vi.fn(),
  setSettingsPanelOpen: vi.fn(),
  setTheme: vi.fn(),
  toggleFocusMode: vi.fn(),
};

const chatStoreState = {
  currentSession: {
    id: 's1',
    title: 'Session 1',
    metadata: { title: 'Session 1' },
  },
  updateCurrentSessionTitle: vi.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appStoreState.theme = 'light';
    appStoreState.focus_mode = false;
  });

  it('toggles sidebar via menu button', () => {
    renderWithServices(<Header />, {
      serviceOverrides: {
        appStore: {
          state: {
            ...appStoreState,
            subscribe: () => () => {},
          },
        },
        chatStore: {
          state: {
            ...chatStoreState,
            subscribe: () => () => {},
          },
        },
      },
    });
    const btn = screen.getByTitle('Toggle sidebar');
    fireEvent.click(btn);
    expect(appStoreState.setSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('cycles theme when theme button clicked', () => {
    renderWithServices(<Header />, {
      serviceOverrides: {
        appStore: {
          state: {
            ...appStoreState,
            subscribe: () => () => {},
          },
        },
        chatStore: {
          state: {
            ...chatStoreState,
            subscribe: () => () => {},
          },
        },
      },
    });
    fireEvent.click(screen.getByTitle(/Theme:/i));
    expect(appStoreState.setTheme).toHaveBeenCalledWith('dark');
  });

  it('toggles focus mode on F11', () => {
    renderWithServices(<Header />, {
      serviceOverrides: {
        appStore: {
          state: {
            ...appStoreState,
            subscribe: () => () => {},
          },
        },
        chatStore: {
          state: {
            ...chatStoreState,
            subscribe: () => () => {},
          },
        },
      },
    });
    fireEvent.keyDown(document, { key: 'F11' });
    expect(appStoreState.toggleFocusMode).toHaveBeenCalled();
  });

  it('enters edit mode and saves session title', async () => {
    renderWithServices(<Header />, {
      serviceOverrides: {
        appStore: {
          state: {
            ...appStoreState,
            subscribe: () => () => {},
          },
        },
        chatStore: {
          state: {
            ...chatStoreState,
            subscribe: () => () => {},
          },
        },
      },
    });
    fireEvent.click(screen.getByText('Session 1'));

    const input = screen.getByPlaceholderText('Session title');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(chatStoreState.updateCurrentSessionTitle).toHaveBeenCalledWith('Renamed');
  });

  it('opens settings panel', () => {
    renderWithServices(<Header />, {
      serviceOverrides: {
        appStore: {
          state: {
            ...appStoreState,
            subscribe: () => () => {},
          },
        },
        chatStore: {
          state: {
            ...chatStoreState,
            subscribe: () => () => {},
          },
        },
      },
    });
    fireEvent.click(screen.getByTitle('Settings'));
    expect(appStoreState.setSettingsPanelOpen).toHaveBeenCalledWith(true);
  });
});
