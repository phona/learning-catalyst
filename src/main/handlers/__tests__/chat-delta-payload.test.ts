import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HumanMessage } from 'langchain';
import { isCommand } from '@langchain/langgraph';

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

describe('chat:start-stream delta payload (Bucket 2)', () => {
  const ipcMain = createMockIpcMain();

  beforeEach(() => {
    vi.clearAllMocks();
    ipcMain._events.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls workflowGraph.stream with only the new user message', async () => {
    const conversationId = 'thread_delta_payload_1';

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
        // No interrupt pending
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
        newUserMessage: 'Hello',
      },
    );

    expect(mockWorkflowGraph.stream).toHaveBeenCalledTimes(1);
    const [input, options] = mockWorkflowGraph.stream.mock.calls[0];

    expect(isCommand(input)).toBe(false);
    expect(input).toHaveProperty('messages');
    expect((input as any).messages).toHaveLength(1);
    expect((input as any).messages[0]).toBeInstanceOf(HumanMessage);
    expect((input as any).messages[0].content).toBe('Hello');

    expect(options?.configurable?.thread_id).toBe(conversationId);
  });
});

