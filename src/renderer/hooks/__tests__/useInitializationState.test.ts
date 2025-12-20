import { renderHook, act } from '@testing-library/react';
import { useInitializationState, type SystemError } from '../useInitializationState';

/**
 * Mock electronAPI for testing
 */
const createMockElectronAPI = () => {
  const subscribers = {
    ready: [] as Array<(payload: unknown) => void>,
    error: [] as Array<(error: SystemError) => void>,
  };

  return {
    ready: {
      onReady: (callback: (payload: unknown) => void) => {
        subscribers.ready.push(callback);
        return () => {
          const index = subscribers.ready.indexOf(callback);
          if (index > -1) subscribers.ready.splice(index, 1);
        };
      },
    },
    errors: {
      onError: (callback: (error: SystemError) => void) => {
        subscribers.error.push(callback);
        return () => {
          const index = subscribers.error.indexOf(callback);
          if (index > -1) subscribers.error.splice(index, 1);
        };
      },
    },
    // Helper to trigger events in tests
    _triggerReady: (payload: unknown) => {
      subscribers.ready.forEach((cb) => cb(payload));
    },
    _triggerError: (error: SystemError) => {
      subscribers.error.forEach((cb) => cb(error));
    },
  };
};

describe('useInitializationState', () => {
  beforeEach(() => {
    // Mock window.electronAPI
    global.window = {
      ...global.window,
      electronAPI: createMockElectronAPI(),
    } as any;
  });

  afterEach(() => {
    delete (global.window as any).electronAPI;
  });

  it('should start in setup state', () => {
    const { result } = renderHook(() => useInitializationState());

    expect(result.current.appState).toBe('setup');
    expect(result.current.crashError).toBeNull();
    expect(result.current.configError).toBeNull();
    expect(result.current.readyPayload).toBeNull();
  });

  it('should transition to ready state when ready event is received', () => {
    const { result } = renderHook(() => useInitializationState());

    act(() => {
      global.window.electronAPI!._triggerReady({
        status: 'ready',
        ready: {
          ipcHandlersRegistered: true,
          startMs: Date.now(),
        },
      });
    });

    expect(result.current.appState).toBe('ready');
    expect(result.current.readyPayload).not.toBeNull();
    expect(result.current.crashError).toBeNull();
  });

  it('should transition to crashed state when SYSTEM_ERROR is received', () => {
    const { result } = renderHook(() => useInitializationState());

    const systemError: SystemError = {
      type: 'SYSTEM_ERROR',
      code: 'test.error',
      message: 'Test system error',
      timestamp: Date.now(),
    };

    act(() => {
      global.window.electronAPI!._triggerError(systemError);
    });

    expect(result.current.appState).toBe('crashed');
    expect(result.current.crashError).toEqual(systemError);
    expect(result.current.readyPayload).toBeNull();
  });

  it('should transition to config-error state when CONFIG_ERROR is received', () => {
    const { result } = renderHook(() => useInitializationState());

    const configError: SystemError = {
      type: 'CONFIG_ERROR',
      code: 'config.missing',
      message: 'Configuration is missing',
      timestamp: Date.now(),
    };

    act(() => {
      global.window.electronAPI!._triggerError(configError);
    });

    expect(result.current.appState).toBe('config-error');
    expect(result.current.configError).toEqual(configError);
    expect(result.current.crashError).toBeNull();
  });

  it('should ignore ready event after transitioning to error state', () => {
    const { result } = renderHook(() => useInitializationState());

    const systemError: SystemError = {
      type: 'SYSTEM_ERROR',
      code: 'test.error',
      message: 'Test system error',
      timestamp: Date.now(),
    };

    // Transition to error state
    act(() => {
      global.window.electronAPI!._triggerError(systemError);
    });

    expect(result.current.appState).toBe('crashed');

    // Try to send ready event
    act(() => {
      global.window.electronAPI!._triggerReady({
        status: 'ready',
        ready: { ipcHandlersRegistered: true },
      });
    });

    // Should still be in crashed state
    expect(result.current.appState).toBe('crashed');
    expect(result.current.readyPayload).toBeNull();
  });

  it('should ignore error event after transitioning to ready state', () => {
    const { result } = renderHook(() => useInitializationState());

    // Transition to ready state
    act(() => {
      global.window.electronAPI!._triggerReady({
        status: 'ready',
        ready: { ipcHandlersRegistered: true },
      });
    });

    expect(result.current.appState).toBe('ready');

    // Try to send error event
    const systemError: SystemError = {
      type: 'SYSTEM_ERROR',
      code: 'test.error',
      message: 'Test system error',
      timestamp: Date.now(),
    };

    act(() => {
      global.window.electronAPI!._triggerError(systemError);
    });

    // Should still be in ready state
    expect(result.current.appState).toBe('ready');
    expect(result.current.crashError).toBeNull();
  });

  it('should route unknown error types to crash state', () => {
    const { result } = renderHook(() => useInitializationState());

    const unknownError: SystemError = {
      type: 'NETWORK_ERROR' as any, // Unknown type
      code: 'network.error',
      message: 'Network error',
      timestamp: Date.now(),
    };

    act(() => {
      global.window.electronAPI!._triggerError(unknownError);
    });

    // Should route to crash state (default behavior)
    expect(result.current.appState).toBe('crashed');
    expect(result.current.crashError).toEqual(unknownError);
  });

  it('should provide resetToSetup function for testing', () => {
    const { result } = renderHook(() => useInitializationState());

    // Transition to ready state
    act(() => {
      global.window.electronAPI!._triggerReady({
        status: 'ready',
        ready: { ipcHandlersRegistered: true },
      });
    });

    expect(result.current.appState).toBe('ready');

    // Reset to setup
    act(() => {
      result.current.resetToSetup();
    });

    expect(result.current.appState).toBe('setup');
    expect(result.current.readyPayload).toBeNull();
    expect(result.current.crashError).toBeNull();
  });

  it('should handle missing electronAPI gracefully', () => {
    delete (global.window as any).electronAPI;

    const { result } = renderHook(() => useInitializationState());

    // Should transition to crashed state when API is missing
    expect(result.current.appState).toBe('crashed');
    expect(result.current.crashError).not.toBeNull();
    expect(result.current.crashError?.code).toBe('renderer.electronAPI.missing');
  });

  it('should log warnings when ignoring events due to state', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useInitializationState());

    // Transition to ready
    act(() => {
      global.window.electronAPI!._triggerReady({
        status: 'ready',
        ready: { ipcHandlersRegistered: true },
      });
    });

    expect(result.current.appState).toBe('ready');

    // Try to send another ready event
    act(() => {
      global.window.electronAPI!._triggerReady({
        status: 'ready',
        ready: { ipcHandlersRegistered: true },
      });
    });

    // Should log warning
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring ready event'),
    );

    consoleSpy.mockRestore();
  });

  it('should properly cleanup subscriptions on unmount', () => {
    const mockAPI = createMockElectronAPI();
    global.window = {
      ...global.window,
      electronAPI: mockAPI,
    } as any;

    const unsubscribeReadySpy = vi.spyOn(mockAPI.ready, 'onReady', 'get');
    const unsubscribeErrorSpy = vi.spyOn(mockAPI.errors, 'onError', 'get');

    const { unmount } = renderHook(() => useInitializationState());

    unmount();

    // Subscriptions should have been created
    expect(unsubscribeReadySpy).toHaveBeenCalled();
    expect(unsubscribeErrorSpy).toHaveBeenCalled();
  });
});
