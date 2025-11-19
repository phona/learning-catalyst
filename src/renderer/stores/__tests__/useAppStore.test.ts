import { useAppStore } from '../useAppStore';

describe('useAppStore Basic Tests', () => {
  beforeEach(() => {
    // Reset store state
    try {
      const state = useAppStore.getState();
      state.setCurrentView('chat');
      state.setSidebarOpen(true);
      state.setTheme('dark');
      state.setError(undefined);
      state.setSuccess(undefined);
      state.setLoading(false);
      state.setSettingsPanelOpen(false);
    } catch (error) {
      // Ignore errors during reset
    }
  });

  it('should exist and have basic methods', () => {
    expect(useAppStore).toBeDefined();
    expect(typeof useAppStore.getState).toBe('function');
    expect(typeof useAppStore.getState().setCurrentView).toBe('function');
    expect(typeof useAppStore.getState().setSidebarOpen).toBe('function');
  });

  it('should have initial state', () => {
    const state = useAppStore.getState();
    expect(state).toBeDefined();
    expect(state.current_view).toBe('chat');
    expect(state.sidebar_open).toBe(true);
    expect(state.theme).toBe('dark');
  });

  it('should allow calling setCurrentView', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setCurrentView('settings');
    }).not.toThrow();
  });

  it('should allow calling setSidebarOpen', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setSidebarOpen(false);
    }).not.toThrow();
  });

  it('should allow calling setTheme', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setTheme('light');
    }).not.toThrow();
  });

  it('should allow calling setLoading', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setLoading(true);
    }).not.toThrow();
  });

  it('should allow calling setError', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setError('Test error');
    }).not.toThrow();
  });

  it('should allow calling setSuccess', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setSuccess('Test success');
    }).not.toThrow();
  });

  it('should allow calling clearMessages', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.clearMessages();
    }).not.toThrow();
  });

  it('should allow calling setSettingsPanelOpen', () => {
    const state = useAppStore.getState();
    expect(() => {
      state.setSettingsPanelOpen(true);
    }).not.toThrow();
  });
});
