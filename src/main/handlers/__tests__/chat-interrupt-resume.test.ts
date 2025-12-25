import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command, INTERRUPT, isCommand } from '@langchain/langgraph';

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

describe('chat:start-stream interrupt resume', () => {
  const ipcMain = createMockIpcMain();

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain._events.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resumes pending interrupts using Command({ resume })', async () => {
    const conversationId = 'thread_interrupt_resume_1';
    const checkpointId = 'checkpoint_123';

    const emptyWorkflowStream = (async function* () {})();
    const mockWorkflowGraph = {
      stream: vi.fn().mockResolvedValue(emptyWorkflowStream),
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
        getTuple: vi.fn().mockResolvedValue({
          config: { configurable: { thread_id: conversationId, checkpoint_id: checkpointId } },
          checkpoint: {
            v: 4,
            id: checkpointId,
            ts: new Date().toISOString(),
            channel_values: {
              [INTERRUPT]: [{ value: { type: 'teach_response' }, checkpoint_id: checkpointId }],
            },
            channel_versions: {},
            versions_seen: {},
          },
          metadata: { source: 'loop', step: 1, parents: {} },
        }),
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

    const handler = ipcMain._events.get('chat:start-stream');
    expect(handler).toBeDefined();

    const replyPort = {
      postMessage: vi.fn(),
      close: vi.fn(),
    };

    await handler(
      { ports: [replyPort] },
      {
        conversationId,
        newUserMessage: 'yes',
      },
    );

    expect(mockWorkflowGraph.stream).toHaveBeenCalledTimes(1);
    const [input, options] = mockWorkflowGraph.stream.mock.calls[0];

    expect(isCommand(input)).toBe(true);
    expect((input as Command).resume).toBe('yes');

    expect(options?.configurable?.thread_id).toBe(conversationId);
    expect(options?.configurable?.checkpoint_id).toBe(checkpointId);
  });

  it('does not start a new topic-parse run for short replies when interrupt is pending', async () => {
    const conversationId = 'thread_interrupt_resume_2';
    const checkpointId = 'checkpoint_456';

    const emptyWorkflowStream = (async function* () {})();
    const mockWorkflowGraph = {
      stream: vi.fn().mockImplementation(async (input: unknown) => {
        if (!isCommand(input)) {
          throw new Error('I could not find learning materials for "yes"');
        }
        return emptyWorkflowStream;
      }),
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
        getTuple: vi.fn().mockResolvedValue({
          config: { configurable: { thread_id: conversationId, checkpoint_id: checkpointId } },
          checkpoint: {
            v: 4,
            id: checkpointId,
            ts: new Date().toISOString(),
            channel_values: {
              [INTERRUPT]: [{ value: { type: 'teach_response' }, checkpoint_id: checkpointId }],
            },
            channel_versions: {},
            versions_seen: {},
          },
          metadata: { source: 'loop', step: 1, parents: {} },
        }),
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

    const handler = ipcMain._events.get('chat:start-stream');
    expect(handler).toBeDefined();

    const replyPort = {
      postMessage: vi.fn(),
      close: vi.fn(),
    };

    await handler(
      { ports: [replyPort] },
      {
        conversationId,
        newUserMessage: 'yes',
      },
    );

    expect(replyPort.postMessage).not.toHaveBeenCalledWith(
      expect.stringContaining('could not find learning materials'),
    );
  });
});
