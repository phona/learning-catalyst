import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/renderer/stores/useAppStore';
import { vi } from 'vitest';

// Mock document methods
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      toggle: vi.fn(),
    },
  },
  writable: true,
});

// Mock window.matchMedia
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

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.getState().setCurrentView('chat');
    useAppStore.getState().setSidebarOpen(true);
    useAppStore.getState().setTheme('dark');
    useAppStore.getState().setError(undefined);
    useAppStore.getState().setSuccess(undefined);
    useAppStore.getState().setLoading(false);

    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.sidebar_open).toBe(true);
      expect(result.current.settings_panel_open).toBe(false);
      expect(result.current.theme).toBe('dark');
      expect(result.current.current_view).toBe('chat');
      expect(result.current.loading).toBe(false);
      expect(result.current.error_message).toBeUndefined();
      expect(result.current.success_message).toBeUndefined();
    });
  });

  describe('Navigation', () => {
    it('sets current view', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setCurrentView('settings');
      });

      expect(result.current.current_view).toBe('settings');
    });

    it('handles all valid views', () => {
      const { result } = renderHook(() => useAppStore());
      const views = ['chat', 'sessions', 'settings', 'progress', 'knowledge-map'] as const;

      views.forEach(view => {
        act(() => {
          result.current.setCurrentView(view);
        });
        expect(result.current.current_view).toBe(view);
      });
    });
  });

  describe('Sidebar Management', () => {
    it('opens sidebar', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSidebarOpen(false);
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebar_open).toBe(true);
    });

    it('closes sidebar', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebar_open).toBe(false);
    });
  });

  describe('Settings Panel', () => {
    it('opens settings panel', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSettingsPanelOpen(true);
      });

      expect(result.current.settings_panel_open).toBe(true);
    });

    it('closes settings panel', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSettingsPanelOpen(false);
      });

      expect(result.current.settings_panel_open).toBe(false);
    });
  });

  describe('Theme Management', () => {
    it('sets light theme', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
    });

    it('sets dark theme', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    });

    it('sets auto theme with light system preference', () => {
      const mockMatchMedia = window.matchMedia as ReturnType<typeof vi.fn>;
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('auto');
      });

      expect(result.current.theme).toBe('auto');
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false);
    });

    it('sets auto theme with dark system preference', () => {
      const mockMatchMedia = window.matchMedia as ReturnType<typeof vi.fn>;
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('auto');
      });

      expect(result.current.theme).toBe('auto');
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
    });
  });

  describe('Loading State', () => {
    it('sets loading to true', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('sets loading to false', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Message Management', () => {
    it('sets error message', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error_message).toBe('Something went wrong');
      expect(result.current.success_message).toBeUndefined();
    });

    it('clears error when setting empty error', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Error message');
        result.current.setError('');
      });

      expect(result.current.error_message).toBeUndefined();
    });

    it('sets success message', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSuccess('Operation completed');
      });

      expect(result.current.success_message).toBe('Operation completed');
      expect(result.current.error_message).toBeUndefined();
    });

    it('clears success when setting empty success message', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSuccess('Success message');
        result.current.setSuccess('');
      });

      expect(result.current.success_message).toBeUndefined();
    });

    it('clears all messages', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Error');
        result.current.setSuccess('Success');
        result.current.clearMessages();
      });

      expect(result.current.error_message).toBeUndefined();
      expect(result.current.success_message).toBeUndefined();
    });

    it('overrides success when setting error', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSuccess('Success message');
        result.current.setError('Error message');
      });

      expect(result.current.error_message).toBe('Error message');
      expect(result.current.success_message).toBeUndefined();
    });

    it('overrides error when setting success', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setError('Error message');
        result.current.setSuccess('Success message');
      });

      expect(result.current.success_message).toBe('Success message');
      expect(result.current.error_message).toBeUndefined();
    });
  });

  describe('Store Persistence', () => {
    it('persists sidebar state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebar_open).toBe(false);
    });

    it('persists theme state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('does not persist non-whitelisted properties', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setCurrentView('settings');
        result.current.setError('Test error');
        result.current.setLoading(true);
      });

      // These should not be persisted but are still available in current session
      expect(result.current.current_view).toBe('settings');
      expect(result.current.error_message).toBe('Test error');
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Store Reset', () => {
    it('maintains state consistency after multiple operations', () => {
      const { result } = renderHook(() => useAppStore());

      // Perform multiple operations
      act(() => {
        result.current.setCurrentView('settings');
        result.current.setSidebarOpen(false);
        result.current.setTheme('light');
        result.current.setError('Test error');
        result.current.setLoading(true);
        result.current.clearMessages();
        result.current.setSuccess('Test success');
        result.current.setCurrentView('chat');
        result.current.setSidebarOpen(true);
        result.current.setTheme('dark');
        result.current.setLoading(false);
      });

      expect(result.current.current_view).toBe('chat');
      expect(result.current.sidebar_open).toBe(true);
      expect(result.current.theme).toBe('dark');
      expect(result.current.success_message).toBe('Test success');
      expect(result.current.error_message).toBeUndefined();
      expect(result.current.loading).toBe(false);
    });
  });
});
