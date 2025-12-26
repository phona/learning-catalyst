import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ChatService } from '@/renderer/services/chat/chat-service';

let capturedAdapters: unknown;

type HistoryAdapterLike = {
  withFormat: (formatAdapter: {
    format: string;
    decode: (storage: unknown) => unknown;
  }) => { load: () => Promise<unknown> };
};

vi.mock('@assistant-ui/react', () => ({
  RuntimeAdapterProvider: ({ adapters, children }: { adapters: unknown; children: React.ReactNode }) => {
    capturedAdapters = adapters;
    return <>{children}</>;
  },
  useAssistantApi: () => ({
    threadListItem: () => ({
      getState: () => ({ id: 'thread-123', remoteId: 'session-123' }),
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
      <ThreadHistoryProvider chatService={chatService as unknown as ChatService}>
        <div />
      </ThreadHistoryProvider>,
    );

    const adapters = capturedAdapters as { history?: unknown };
    expect(adapters?.history).toBeTruthy();

    const formatAdapter = {
      format: 'ai-sdk/v5',
      decode: vi.fn((storage: unknown) => storage),
    };

    const history = adapters.history as unknown;
    const result = await (history as HistoryAdapterLike).withFormat(formatAdapter).load();
    const typedResult = result as { headId?: unknown; messages?: unknown[] };

    expect(chatService.getMessages).toHaveBeenCalledWith('thread-123');
    expect(formatAdapter.decode).toHaveBeenCalledTimes(2);
    expect(typedResult.headId).toBe('m2');
    expect(typedResult.messages).toHaveLength(2);
  });
});
