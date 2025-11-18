/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/**
 * App Component Tests - Simplified Version
 *
 * Tests for the main App component focusing on:
 * - Basic rendering without crashes
 * - Router setup
 * - Service container integration
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Create a simple mock for electronAPI to avoid initialization errors
const mockElectronAPI = {
  analytics: {
    getDashboard: vi.fn().mockResolvedValue({ success: true, data: {} }),
    getProgressChart: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getAchievements: vi.fn().mockResolvedValue({ success: true, data: [] }),
    trackSession: vi.fn().mockResolvedValue({ success: true, data: 'session-id' }),
  },
  sessions: {
    getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getStatistics: vi.fn().mockResolvedValue({ success: true, data: {} }),
    list: vi.fn().mockResolvedValue({ success: true, data: [] }),
    saveSessionWithMessages: vi.fn().mockResolvedValue({ success: true, data: 'session-id' }),
  },
  chat: {
    send: vi.fn().mockResolvedValue({ success: true, data: { id: 'msg-1', content: 'response' } }),
    sendStream: vi.fn(),
  },
  settings: {
    getConfig: vi.fn().mockResolvedValue({ success: true, data: {} }),
    updateConfig: vi.fn().mockResolvedValue({ success: true }),
  },
};

// Set up the electronAPI globally before tests
beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
  });

  // Reset mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up
  vi.resetAllMocks();
});

describe('App Component - Basic Functionality', () => {
  it('should render without crashing', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // The app should at least render the main layout without errors
    // Look for common elements that should be present in the app
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('should handle different routes properly', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Allow initial render
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // Test navigating to different routes by rerendering with different initial entries
    rerender(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    rerender(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('should handle missing electronAPI gracefully', async () => {
    // Temporarily remove electronAPI to simulate browser environment
    Object.defineProperty(window, 'electronAPI', {
      value: undefined,
      writable: true,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Should not crash even without electronAPI
    // In browser mode, app might show different UI or error message
    await waitFor(() => {
      // App should render some content even if in browser mode
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});