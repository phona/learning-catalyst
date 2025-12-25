import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

let capturedAdapters: any;

vi.mock('@assistant-ui/react', () => ({
  RuntimeAdapterProvider: ({ adapters, children }: any) => {
    capturedAdapters = adapters;
    return <>{children}</>;
  },
  useAssistantApi: () => ({
    threadListItem: () => ({
      getState: () => ({ remoteId: 'session-123' }),
    }),
  }),
  ThreadMessage: {},
}));

import { ThreadHistoryProvider } from '../useThreadListAdapter';

describe('Thread history hydration', () => {
  beforeEach(() => {
    capturedAdapters = undefined;
  });

  it('loads messages via chat:get-messages and returns ai-sdk/v5 repository', async () => {
    const chatService = {
      getMessages: vi.fn().mockResolvedValue([
        { id: 'm1', role: 'user', content: 'Hi', timestamp: new Date().toISOString() },
        { id: 'm2', role: 'assistant', content: 'Hello', timestamp: new Date().toISOString() },
      ]),
    };

    render(
      <ThreadHistoryProvider chatService={chatService as any}>
        <div />
      </ThreadHistoryProvider>,
    );

    expect(capturedAdapters?.history).toBeTruthy();

    const formatAdapter = {
      format: 'ai-sdk/v5',
      decode: vi.fn((storage: any) => storage),
    };

    const result = await capturedAdapters.history.withFormat(formatAdapter).load();

    expect(chatService.getMessages).toHaveBeenCalledWith('session-123');
    expect(formatAdapter.decode).toHaveBeenCalledTimes(2);
    expect(result.headId).toBe('m2');
    expect(result.messages).toHaveLength(2);
  });
});

