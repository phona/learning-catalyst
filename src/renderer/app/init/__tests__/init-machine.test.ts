import { describe, it, expect } from 'vitest';
import { initReducer, initialInitState, mapIPCErrorToInitEvent, type InitState } from '../init-machine';

const fatalPayload = {
  type: 'SYSTEM_ERROR' as const,
  code: 'system.failed',
  message: 'Fatal crash',
};

const configPayload = {
  type: 'CONFIG_ERROR' as const,
  code: 'provider.config.missing_api_key',
  message: 'API key missing',
};

const nonFatalPayload = {
  type: 'NETWORK_ERROR' as const,
  code: 'net.timeout',
  message: 'Network timeout',
};

const readyState: InitState = {
  status: 'ready',
  statusMessage: null,
  loadingError: null,
  crash: null,
};

describe('initReducer', () => {
  it('moves to crash on system_error', () => {
    const next = initReducer(initialInitState, { type: 'system_error', payload: fatalPayload });
    expect(next.status).toBe('crash');
    expect(next.crash?.code).toBe('system.failed');
  });

  it('moves to setup on config_needs_setup', () => {
    const next = initReducer(initialInitState, { type: 'config_needs_setup', message: 'needs setup' });
    expect(next.status).toBe('setup');
    expect(next.statusMessage).toBe('needs setup');
  });

  it('captures loading error on nonfatal_error while loading', () => {
    const next = initReducer(initialInitState, { type: 'nonfatal_error', message: 'warn' });
    expect(next.loadingError).toBe('warn');
    expect(next.status).toBe('loading');
  });

  it('ignores non-system events after ready', () => {
    const next = initReducer(readyState, { type: 'config_needs_setup', message: 'late setup' });
    expect(next.status).toBe('ready');
    expect(next.statusMessage).toBeNull();
  });
});

describe('mapIPCErrorToInitEvent', () => {
  it('classifies SYSTEM_ERROR as system_error event', () => {
    const evt = mapIPCErrorToInitEvent(fatalPayload);
    expect(evt.type).toBe('system_error');
  });

  it('classifies CONFIG_ERROR as config_needs_setup', () => {
    const evt = mapIPCErrorToInitEvent(configPayload);
    expect(evt.type).toBe('config_needs_setup');
  });

  it('classifies other errors as nonfatal_error', () => {
    const evt = mapIPCErrorToInitEvent(nonFatalPayload);
    expect(evt.type).toBe('nonfatal_error');
  });
});

