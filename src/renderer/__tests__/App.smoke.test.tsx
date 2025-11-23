/**
 * App Component Tests - Simplified Version
 *
 * Tests for the main App component focusing on:
 * - Basic rendering without crashes
 * - Router setup
 * - Service container integration
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import { renderWithServices } from '@/test/utils/renderWithServices';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

vi.mock('../stores/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    setCurrentSession: vi.fn(),
    setCurrentView: vi.fn(),
    setTheme: vi.fn(),
    setError: vi.fn(),
    setSuccess: vi.fn(),
    sidebar_open: true,
    settings_panel_open: false,
    theme: 'dark',
    current_view: 'chat',
    focus_mode: false,
    loading: false,
    error_message: undefined,
    success_message: undefined,
  })),
}));

vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(() => ({
    currentSession: null,
    setCurrentSession: vi.fn(),
    setAutoScroll: vi.fn(),
    setSelectedProvider: vi.fn(),
    setSelectedModel: vi.fn(),
  })),
}));

const workspaceConfig = {
  ai: {
    model_types: {
      chat: {
        provider: 'openai',
        model: 'gpt-4o',
      },
    },
    providers: {
      openai: {
        provider_type: 'openai',
        api_key: 'test-key',
      },
    },
  },
};

const originalElectronAPI = (window as typeof window & { electronAPI?: unknown }).electronAPI;

const buildElectronAPI = () => {
  const client = createMockElectronAPIClient();
  client.settings.getConfig = vi.fn().mockResolvedValue(workspaceConfig);
  return client;
};

const renderApp = (routerProps?: React.ComponentProps<typeof MemoryRouter>) =>
  renderWithServices(<App />, { routerProps });

beforeEach(() => {
  (window as typeof window & { electronAPI?: unknown }).electronAPI = buildElectronAPI();
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalElectronAPI !== undefined) {
    (window as typeof window & { electronAPI?: unknown }).electronAPI = originalElectronAPI;
  } else {
    const windowWithAPI = window as typeof window & { electronAPI?: unknown };
    if (windowWithAPI.electronAPI) {
      delete (windowWithAPI as any).electronAPI;
    }
  }
});

describe('App Component - Basic Functionality', () => {
  it('should render without crashing', async () => {
    renderApp({ initialEntries: ['/'] });

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('should handle different routes properly', async () => {
    const routes = ['/', '/chat', '/settings'];

    for (const route of routes) {
      renderApp({ initialEntries: [route] });

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      cleanup();
    }
  });

  it('should handle missing electronAPI gracefully', async () => {
    (window as any).electronAPI = undefined;
    renderApp({ initialEntries: ['/'] });

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
