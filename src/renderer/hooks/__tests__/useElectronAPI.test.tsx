/**
 * Tests for useElectronAPI hook
 *
 * Verifies:
 * - Auto-unwrapping of APIResponse
 * - Error handling with toast notifications
 * - Silent mode suppresses toasts
 * - IPCError structure
 * - Context injection for testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import {
  useElectronAPI,
  ElectronAPIProvider,
  IPCError,
  type UnwrappedElectronAPI,
} from '../useElectronAPI';
import type { APIResponse } from '@/shared/types/electron-api/base';

// Mock toast
vi.mock('@/renderer/utils/toast', () => ({
  showError: vi.fn(),
}));

import { showError } from '@/renderer/utils/toast';

describe('useElectronAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ElectronAPIProvider', () => {
    it('throws when useElectronAPI called outside provider', () => {
      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useElectronAPI());
      }).toThrow('useElectronAPI must be used within ElectronAPIProvider');

      consoleSpy.mockRestore();
    });

    it('provides injected mock API', () => {
      const mockApi = {
        sessions: {
          list: vi.fn().mockResolvedValue({ sessions: [], total: 0, hasMore: false }),
        },
      } as unknown as UnwrappedElectronAPI;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ElectronAPIProvider api={mockApi}>{children}</ElectronAPIProvider>
      );

      const { result } = renderHook(() => useElectronAPI(), { wrapper });
      expect(result.current).toBe(mockApi);
    });
  });

  describe('IPCError', () => {
    it('creates error with code, message, and details', () => {
      const error = new IPCError('NOT_FOUND', 'Session not found', { id: '123' });

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Session not found');
      expect(error.details).toEqual({ id: '123' });
      expect(error.name).toBe('IPCError');
      expect(error instanceof Error).toBe(true);
    });

    it('creates error without details', () => {
      const error = new IPCError('SERVER_ERROR', 'Internal error');

      expect(error.code).toBe('SERVER_ERROR');
      expect(error.message).toBe('Internal error');
      expect(error.details).toBeUndefined();
    });
  });

  describe('auto-unwrap behavior', () => {
    // These tests verify the proxy behavior with a mock electron API
    // In real usage, window.electronAPI returns APIResponse<T>
    // The proxy unwraps it to T

    it('unwraps successful APIResponse', async () => {
      const mockSessionData = { sessions: [{ id: '1', title: 'Test' }], total: 1, hasMore: false };

      // Simulate the real electronAPI which returns APIResponse
      const mockElectronAPI = {
        sessions: {
          list: vi.fn().mockResolvedValue({
            success: true,
            data: mockSessionData,
          }),
        },
      };

      // Mock window.electronAPI
      const originalElectronAPI = (window as unknown as { electronAPI: unknown }).electronAPI;
      (window as unknown as { electronAPI: unknown }).electronAPI = mockElectronAPI;

      // Import fresh to get the proxy with our mock
      const { createElectronAPIClient } = await import('@/renderer/services/api/electron-api-client');

      // Create the provider with default (proxied) API
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ElectronAPIProvider>{children}</ElectronAPIProvider>
      );

      const { result } = renderHook(() => useElectronAPI(), { wrapper });

      // The proxy should unwrap the response
      const data = await result.current.sessions.list();
      expect(data).toEqual(mockSessionData);

      // Restore
      (window as unknown as { electronAPI: unknown }).electronAPI = originalElectronAPI;
    });

    it('shows toast and throws IPCError on failure', async () => {
      const mockElectronAPI = {
        sessions: {
          get: vi.fn().mockResolvedValue({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Session not found',
              details: { sessionId: 'abc' },
            },
          }),
        },
      };

      const originalElectronAPI = (window as unknown as { electronAPI: unknown }).electronAPI;
      (window as unknown as { electronAPI: unknown }).electronAPI = mockElectronAPI;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ElectronAPIProvider>{children}</ElectronAPIProvider>
      );

      const { result } = renderHook(() => useElectronAPI(), { wrapper });

      await expect(result.current.sessions.get('abc')).rejects.toThrow(IPCError);

      try {
        await result.current.sessions.get('abc');
      } catch (e) {
        expect(e).toBeInstanceOf(IPCError);
        const error = e as IPCError;
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Session not found');
        expect(showError).toHaveBeenCalledWith('Session not found');
      }

      (window as unknown as { electronAPI: unknown }).electronAPI = originalElectronAPI;
    });

    it('suppresses toast with silent option', async () => {
      const mockElectronAPI = {
        sessions: {
          get: vi.fn().mockResolvedValue({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Session not found',
            },
          }),
        },
      };

      const originalElectronAPI = (window as unknown as { electronAPI: unknown }).electronAPI;
      (window as unknown as { electronAPI: unknown }).electronAPI = mockElectronAPI;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ElectronAPIProvider>{children}</ElectronAPIProvider>
      );

      const { result } = renderHook(() => useElectronAPI(), { wrapper });

      // Call with silent option
      await expect(result.current.sessions.get('abc', { silent: true })).rejects.toThrow(IPCError);

      // Toast should NOT be called when silent: true
      expect(showError).not.toHaveBeenCalled();

      (window as unknown as { electronAPI: unknown }).electronAPI = originalElectronAPI;
    });
  });

  describe('nested namespace proxying', () => {
    it('proxies nested objects like api.sessions, api.chat', async () => {
      const mockElectronAPI = {
        sessions: {
          list: vi.fn().mockResolvedValue({ success: true, data: [] }),
          get: vi.fn().mockResolvedValue({ success: true, data: null }),
        },
        chat: {
          generateTitle: vi.fn().mockResolvedValue({ success: true, data: 'Test Title' }),
        },
      };

      const originalElectronAPI = (window as unknown as { electronAPI: unknown }).electronAPI;
      (window as unknown as { electronAPI: unknown }).electronAPI = mockElectronAPI;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ElectronAPIProvider>{children}</ElectronAPIProvider>
      );

      const { result } = renderHook(() => useElectronAPI(), { wrapper });

      // Verify nested namespaces work
      await result.current.sessions.list();
      expect(mockElectronAPI.sessions.list).toHaveBeenCalled();

      await result.current.chat.generateTitle('Hello');
      expect(mockElectronAPI.chat.generateTitle).toHaveBeenCalledWith('Hello');

      (window as unknown as { electronAPI: unknown }).electronAPI = originalElectronAPI;
    });
  });
});
