import { describe, expect, it } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePracticeSuggestions } from '../usePracticeSuggestions';

vi.mock('@/renderer/services/services-provider', () => {
  let service: any = null;
  let chat: any = null;
  return {
    useSessionService: () => service,
    useChatService: () => chat,
    __setPracticeService: (impl: any) => {
      service = impl;
      chat = impl; // practice suggestions rely on chat service too
    },
  };
});

import * as serviceProvider from '@/renderer/services/services-provider';
const __setPracticeService = (serviceProvider as any).__setPracticeService as (
  impl: any,
) => void;

describe('usePracticeSuggestions', () => {
  it('exposes loading state and results', async () => {
    __setPracticeService({
      checkPracticeOpportunity: async () => ({
        hasOpportunity: true,
        opportunity: { id: 'p1', title: 'Do algebra' },
      }),
    });

    const { result } = renderHook(() => usePracticeSuggestions());

    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].isLoading).toBe(false);
    expect(result.current[0].currentSuggestion?.title).toBe('Do algebra');
  });

  it('handles errors and can retry', async () => {
    let fail = true;
    __setPracticeService({
      checkPracticeOpportunity: async () => {
        if (fail) throw new Error('network');
        return { hasOpportunity: false };
      },
    });

    const { result } = renderHook(() => usePracticeSuggestions());
    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });
    expect(result.current[0].error).toMatch(/network/);

    fail = false;
    await act(async () => {
      await result.current[1].checkForPracticeOpportunity('c1', 'hello');
    });

    expect(result.current[0].error).toBeNull();
    expect(result.current[0].currentSuggestion).toBeNull();
  });
});
