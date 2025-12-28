import { describe, it, expect, vi } from 'vitest';
import { createThreadListAdapter } from '@/renderer/hooks/useThreadListAdapter.helpers';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

describe('REGRESSION (expected red today): thread list must not hang forever on stalled IPC', () => {
  it('adapter.list should fail fast when sessions list stalls', async () => {
    const sessionService = {
      listSessions: vi.fn().mockImplementation(() => new Promise(() => {})),
    } as any;

    const adapter = createThreadListAdapter({ sessionService, chatService: {} as any });

    // Expected behavior after the fix: list returns quickly with an empty list (or a safe fallback).
    // Current behavior: this hangs (causing "stuck loading" on refresh).
    await expect(withTimeout(adapter.list(), 50)).resolves.toEqual({ threads: [] });
  });

  it('adapter.unarchive should not block switching to history threads when IPC stalls', async () => {
    const sessionService = {
      updateSession: vi.fn().mockImplementation(() => new Promise(() => {})),
    } as any;

    const adapter = createThreadListAdapter({ sessionService, chatService: {} as any });

    // Expected behavior after the fix: unarchive returns quickly (fire-and-forget).
    // Current behavior: awaits IPC forever, so switching to an archived thread can hang.
    await expect(withTimeout(adapter.unarchive('session-1'), 50)).resolves.toBeUndefined();
  });
});

