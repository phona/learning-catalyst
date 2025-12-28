import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { setupChatHandlers } from '../chat-handlers';
import * as workflowModule from '../../services/domain/workflow';

const createMockIpcMain = () => {
  const listeners = new Map<string, (event: any, ...args: any[]) => any>();

  return {
    handle: vi.fn((channel: string, handler: (event: any, ...args: any[]) => void) => {
      listeners.set(channel, handler);
    }),
    on: vi.fn((channel: string, handler: (event: any, ...args: any[]) => void) => {
      listeners.set(channel, handler);
    }),
    _events: listeners,
  };
};

describe('chat:cancel-stream', () => {
  const ipcMain = createMockIpcMain();

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain._events.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits abort and does not emit finish for the cancelled stream', async () => {
    const streamId = 'stream_cancel_1';
    const never = new Promise<void>(() => {});

    const workflowStream = (async function* () {
      yield ['custom', { type: 'text-start', id: 'msg-1' }] as [string, unknown];
      await never;
      yield ['custom', { type: 'text-delta', id: 'msg-1', delta: 'after-cancel' }] as [string, unknown];
    })();

    const mockWorkflowGraph = {
      stream: vi.fn().mockResolvedValue(workflowStream),
    };

    vi.spyOn(workflowModule, 'createWorkflowGraph').mockReturnValue(mockWorkflowGraph as any);

    const services = {
      chatService: {
        generateTitle: vi.fn(),
        getMessages: vi.fn(),
      },
      loggerService: {
        child: vi.fn(() => ({
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
          child: vi.fn(),
        })),
      },
      checkpointSaver: {
        getTuple: vi.fn().mockResolvedValue(undefined),
      },
      configService: {
        getConfig: vi.fn().mockResolvedValue(undefined),
      },
      providerFactory: {},
      knowledgeService: {},
      practiceService: {},
      learningService: {},
    };

    setupChatHandlers(ipcMain as any, services as any);

    const startHandler = ipcMain._events.get('chat:start-stream');
    const cancelHandler = ipcMain._events.get('chat:cancel-stream');
    expect(startHandler).toBeDefined();
    expect(cancelHandler).toBeDefined();

    const replyPort = {
      postMessage: vi.fn(),
      close: vi.fn(),
    };

    const startPromise = startHandler(
      { ports: [replyPort] },
      { streamId, conversationId: 'thread_cancel', newUserMessage: 'hello' },
    );

    // Let the first chunk flow.
    await new Promise((resolve) => setTimeout(resolve, 0));

    cancelHandler({}, { streamId });

    const result = await Promise.race([
      startPromise.then(() => 'done'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 50)),
    ]);

    expect(result).toBe('done');

    const abortChunk = 'data: {"type":"abort"}\n\n';
    const finishChunk = 'data: {"type":"finish"}\n\n';

    const posted = replyPort.postMessage.mock.calls.map(([msg]) => msg);
    expect(posted).toContain(abortChunk);
    expect(posted).not.toContain(finishChunk);
    expect(replyPort.close).toHaveBeenCalledTimes(1);
  });
});

