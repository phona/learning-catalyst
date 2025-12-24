import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGlobalStatistics } from '../useGlobalStatistics';

// Minimal shim for the provider hook used inside useGlobalStatistics
vi.mock('@/renderer/services/services-provider', () => {
  let service: any = null;
  return {
    useSessionService: () => service,
    __setService: (impl: any) => {
      service = impl;
    },
  };
});
import * as serviceProvider from '@/renderer/services/services-provider';
const __setService = (serviceProvider as any).__setService as (impl: any) => void;

describe('useGlobalStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces initialization error when service missing', async () => {
    __setService(null);
    const { result } = renderHook(() => useGlobalStatistics());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/initializing/i);
  });

  it('fetches statistics via session service and caches', async () => {
    const getGlobalStatistics = vi.fn().mockResolvedValue({
      totalMessages: 10,
      totalSessions: 2,
      totalUserMessages: 6,
      totalAssistantMessages: 4,
      averageMessagesPerSession: 5,
      totalTokensUsed: 123,
    });
    __setService({ getGlobalStatistics });

    const { result, rerender } = renderHook(() => useGlobalStatistics(true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.statistics?.totalMessages).toBe(10);
    expect(getGlobalStatistics).toHaveBeenCalledTimes(1);

    // Rerender should hit cache and not call again
    rerender();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getGlobalStatistics).toHaveBeenCalledTimes(1);
  });

  it('retry clears error and re-fetches', async () => {
    const getGlobalStatistics = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ totalMessages: 1, totalSessions: 1 });
    __setService({ getGlobalStatistics });

    const { result } = renderHook(() => useGlobalStatistics());

    await waitFor(() => result.current.error !== null);
    expect(getGlobalStatistics).toHaveBeenCalledTimes(1);
    expect(result.current.error).toMatch(/boom/);

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => expect(getGlobalStatistics).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.statistics?.totalMessages).toBe(1));
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
