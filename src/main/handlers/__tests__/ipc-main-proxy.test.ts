/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIpcProxy } from '../ipc-main-proxy';

const handlerMap = new Map<string, (...args: unknown[]) => any>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => any) => {
      handlerMap.set(channel, handler);
    },
    on: vi.fn(),
  },
}));

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => logger),
};

describe('ipc-main-proxy argument forwarding', () => {
  beforeEach(() => {
    handlerMap.clear();
    vi.clearAllMocks();
  });

  it('forwards two arguments to handler', async () => {
    const ipc = createIpcProxy(logger as any);
    const received: Array<[string, string]> = [];

    ipc.handle('sessions:update-title', async (_event, sessionId: string, title: string) => {
      received.push([sessionId, title]);
      return 'ok';
    });

    const handler = handlerMap.get('sessions:update-title');
    expect(handler).toBeDefined();

    const response = await handler?.({} as any, 'session-123', 'AI Title');

    expect(received).toEqual([['session-123', 'AI Title']]);
    expect(response).toMatchObject({ success: true, data: 'ok' });
    expect(typeof response?.timestamp).toBe('string');
  });

  it('preserves argument order for three arguments', async () => {
    const ipc = createIpcProxy(logger as any);
    let captured: unknown[] = [];

    ipc.handle('triple:args', async (_event, a: number, b: number, c: number) => {
      captured = [a, b, c];
      return a + b + c;
    });

    const handler = handlerMap.get('triple:args');
    expect(handler).toBeDefined();

    const response = await handler?.({} as any, 1, 2, 3);

    expect(captured).toEqual([1, 2, 3]);
    expect(response).toMatchObject({ success: true, data: 6 });
    expect(typeof response?.timestamp).toBe('string');
  });

  it('returns structured error envelope on handler failure', async () => {
    const ipc = createIpcProxy(logger as any);

    ipc.handle('boom:channel', async () => {
      throw new Error('boom');
    });

    const handler = handlerMap.get('boom:channel');
    expect(handler).toBeDefined();

    const response = await handler?.({} as any);

    expect(response).toMatchObject({
      success: false,
      code: 'Error',
      error: {
        code: 'Error',
        message: 'boom',
      },
    });
    expect(typeof response?.timestamp).toBe('string');
  });
});
