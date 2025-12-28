import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore (app/appStore)', () => {
  beforeEach(() => {
    // reset key state fields manually
    useAppStore.setState((state) => ({
      ...state,
      currentView: 'chat',
      current_view: 'chat',
      navigationHistory: ['chat'],
      canGoBack: false,
      canGoForward: false,
      sidebar_open: true,
      settings_panel_open: false,
      theme: 'auto',
      preferences: { ...state.preferences, theme: 'auto', language: 'en', notifications: true, autoSave: true, telemetry: false },
      activeModal: null,
      modalProps: {},
      notifications: [],
      loading: false,
      error_message: undefined,
      success_message: undefined,
    }));
  });

  it('initializes with default view and preferences', () => {
    const state = useAppStore.getState();
    expect(state.currentView).toBe('chat');
    expect(state.current_view).toBe('chat');
    expect(state.preferences.theme).toBe('auto');
    expect(state.canGoBack).toBe(false);
  });

  it('sets view and keeps aliases in sync', () => {
    useAppStore.getState().setCurrentView('sessions');
    const state = useAppStore.getState();
    expect(state.currentView).toBe('sessions');
    expect(state.current_view).toBe('sessions');
  });

  it('navigates and updates history flags', () => {
    const store = useAppStore.getState();
    store.navigateTo('settings');
    let state = useAppStore.getState();
    expect(state.navigationHistory.at(-1)).toBe('settings');
    expect(state.canGoBack).toBe(false);

    store.navigateTo('sessions');
    state = useAppStore.getState();
    expect(state.navigationHistory.at(-1)).toBe('sessions');
    expect(state.canGoBack).toBe(false);

    store.goBack();
    state = useAppStore.getState();
    // no-op when history has a single entry
    expect(state.currentView).toBe('sessions');
    expect(state.canGoForward).toBe(false);

    // When history has multiple entries we can go back
    useAppStore.setState({
      currentView: 'settings',
      current_view: 'settings',
      navigationHistory: ['chat', 'settings'],
      canGoBack: true,
      canGoForward: false,
    });
    store.goBack();
    state = useAppStore.getState();
    expect(state.currentView).toBe('chat');
    expect(state.canGoForward).toBe(true);
    expect(state.canGoBack).toBe(false);
  });

  it('opens and closes modal', () => {
    const store = useAppStore.getState();
    store.openModal('demo', { foo: 'bar' });
    expect(useAppStore.getState().activeModal).toBe('demo');
    expect(useAppStore.getState().modalProps.foo).toBe('bar');
    store.closeModal();
    expect(useAppStore.getState().activeModal).toBeNull();
  });

  it('updates preferences and theme', () => {
    const store = useAppStore.getState();
    store.updatePreferences({ language: 'fr', notifications: false });
    expect(useAppStore.getState().preferences.language).toBe('fr');
    store.setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');
  });

  it('adds and removes notifications (with auto-dismiss)', () => {
    vi.useFakeTimers();
    const store = useAppStore.getState();
    store.addNotification({ type: 'info', title: 'Hello', duration: 10 });
    const id = useAppStore.getState().notifications[0].id;
    expect(useAppStore.getState().notifications).toHaveLength(1);
    vi.runAllTimers();
    expect(useAppStore.getState().notifications.find((n) => n.id === id)).toBeUndefined();
    vi.useRealTimers();
  });

  it('reacts to online/offline events', () => {
    expect(useAppStore.getState().isOnline).toBe(true);
    window.dispatchEvent(new Event('offline'));
    expect(useAppStore.getState().isOnline).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(useAppStore.getState().isOnline).toBe(true);
  });
});
