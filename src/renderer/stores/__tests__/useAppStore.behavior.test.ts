import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Always load the real store (setup.ts provides a mock for component tests)
let useAppStore: typeof import('@/renderer/stores/useAppStore').useAppStore;

describe('useAppStore behavior', () => {
  beforeEach(async () => {
    vi.resetModules();
    // Ensure Vitest ignores the global mock defined in the renderer setup
    vi.doUnmock('@/renderer/stores/useAppStore');

    ({ useAppStore } = await vi.importActual('@/renderer/stores/useAppStore'));

    // reset store to a clean baseline while preserving actions
    useAppStore.setState((state) => ({
      ...state,
      sidebar_open: true,
      settings_panel_open: false,
      theme: 'dark',
      current_view: 'chat',
      focus_mode: false,
      loading: false,
      error_message: undefined,
      success_message: undefined,
    }));

    await (useAppStore.persist as any)?.clearStorage?.();
  });

  it('toggles focus mode', () => {
    const state = useAppStore.getState();
    expect(state.focus_mode).toBe(false);
    act(() => state.toggleFocusMode());
    expect(useAppStore.getState().focus_mode).toBe(true);
  });

  it('applies theme to document root', () => {
    const root = document.documentElement;
    root.classList.remove('dark');
    act(() => useAppStore.getState().setTheme('dark'));
    expect(root.classList.contains('dark')).toBe(true);
    act(() => useAppStore.getState().setTheme('light'));
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('sets and clears messages', () => {
    const state = useAppStore.getState();
    act(() => state.setError('oops'));
    expect(useAppStore.getState().error_message).toBe('oops');
    act(() => state.setSuccess('ok'));
    expect(useAppStore.getState().success_message).toBe('ok');
    act(() => state.clearMessages());
    expect(useAppStore.getState().error_message).toBeUndefined();
    expect(useAppStore.getState().success_message).toBeUndefined();
  });

  it('updates view and sidebar flags', () => {
    const state = useAppStore.getState();
    act(() => state.setCurrentView('settings'));
    act(() => state.setSidebarOpen(false));
    act(() => state.setSettingsPanelOpen(true));
    expect(useAppStore.getState().current_view).toBe('settings');
    expect(useAppStore.getState().sidebar_open).toBe(false);
    expect(useAppStore.getState().settings_panel_open).toBe(true);
  });
});
