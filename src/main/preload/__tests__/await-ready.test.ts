import { describe, it, expect, beforeEach, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  type Listener = (event: unknown, payload: unknown) => void;
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    invoke: vi.fn(),
    emit: (channel: string, payload: any) => {
      const set = listeners.get(channel);
      if (!set) return;
      for (const fn of Array.from(set)) {
        try {
          (fn as any)({}, payload);
        } catch {}
      }
    },
    add: (channel: string, fn: Listener) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel)!.add(fn);
    },
    remove: (channel: string, fn: Listener) => {
      listeners.get(channel)?.delete(fn);
    },
  };
});

vi.mock('electron', () => {
  const exposeInMainWorld = vi.fn((key: string, api: any) => {
    (globalThis as any)[key] = api;
  });
  const on = vi.fn((channel: string, fn: (evt: any, payload: any) => void) => hoisted.add(channel, fn));
  const once = vi.fn((channel: string, fn: (evt: any, payload: any) => void) => {
    const wrapper = (evt: any, payload: any) => {
      try {
        (fn as any)(evt, payload);
      } finally {
        hoisted.remove(channel, wrapper);
      }
    };
    hoisted.add(channel, wrapper);
  });
  const removeListener = vi.fn((channel: string, fn: (evt: any, payload: any) => void) =>
    hoisted.remove(channel, fn),
  );

  return {
    contextBridge: { exposeInMainWorld },
    ipcRenderer: { on, once, removeListener, invoke: (...args: any[]) => hoisted.invoke(...args) },
  };
});

describe('preload awaitReady', () => {
  const READY = 'system:ready';

  beforeEach(async () => {
    vi.resetModules();
    hoisted.listeners.clear();
    hoisted.invoke = vi.fn();
    await import('@/main/preload/index');
  });

  it('resolves immediately when latest snapshot is ready', async () => {
    hoisted.emit(READY, { status: 'ready', ready: { ipcHandlersRegistered: true } });
    const api = (globalThis as any).electronAPI;
    const result = await api.awaitReady({ timeoutMs: 1000 });
    expect(result.status).toBe('ready');
    expect(result.ready.ipcHandlersRegistered).toBe(true);
  });

  it('waits for first ready when initial snapshot is loading', async () => {
    hoisted.emit(READY, { status: 'loading', ready: { ipcHandlersRegistered: false } });
    const api = (globalThis as any).electronAPI;
    const p = api.awaitReady({ timeoutMs: 1000 });
    setTimeout(() => {
      hoisted.emit(READY, { status: 'ready', ready: { ipcHandlersRegistered: true } });
    }, 10);
    const result = await p;
    expect(result.status).toBe('ready');
    expect(result.ready.ipcHandlersRegistered).toBe(true);
  });

  it('rejects on timeout when ready never arrives', async () => {
    const api = (globalThis as any).electronAPI;
    await expect(api.awaitReady({ timeoutMs: 20 })).rejects.toThrow('Ready timeout');
  });

  it('ignores loading snapshots after ready has been seen', async () => {
    const api = (globalThis as any).electronAPI;
    hoisted.emit(READY, { status: 'ready', ready: { ipcHandlersRegistered: true } });
    // A stray loading snapshot should not downgrade readiness
    hoisted.emit(READY, { status: 'loading', ready: { ipcHandlersRegistered: false } });
    const result = await api.awaitReady({ timeoutMs: 100 });
    expect(result.status).toBe('ready');
    expect(result.ready.ipcHandlersRegistered).toBe(true);
  });

  it('delivers config change events even for late subscribers', async () => {
    const api = (globalThis as any).electronAPI;
    const payload = { changedKeys: ['ai.providers'], config: { ai: { providers: {} } }, timestamp: 123 };
    hoisted.emit('settings:config:changed', payload);
    const result = await api.awaitConfigChange({ timeoutMs: 100 });
    expect(result).toEqual(payload);
  });

  it('hydrates from system:get-latest-ready when no events fired', async () => {
    const api = (globalThis as any).electronAPI;
    const readySnapshot = { status: 'ready', ready: { ipcHandlersRegistered: true } };
    hoisted.invoke.mockResolvedValueOnce(readySnapshot);
    const result = await api.awaitReady({ timeoutMs: 50 });
    expect(result).toEqual(readySnapshot);
    expect(hoisted.invoke).toHaveBeenCalledWith('system:get-latest-ready');
  });
});
