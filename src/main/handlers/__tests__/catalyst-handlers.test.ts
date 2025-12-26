import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupCatalystHandlers } from '../catalyst-handlers';
import { ipcMain } from 'electron';

const handlerMap = new Map<string, (...args: any[]) => any>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => any) => {
      handlerMap.set(channel, handler);
    },
  },
}));

const invokeResult = { messages: [{ _getType: () => 'ai', content: 'Hello!' }] };
const invoke = vi.fn().mockResolvedValue(invokeResult);

vi.mock('@/main/services/domain/workflow', () => ({
  createWorkflowGraph: () => ({ invoke }),
}));

vi.mock('@/main/services/domain/workflow/pending-interrupt', () => ({
  hasPendingInterrupt: () => false,
}));

const getHandler = (channel: string) => {
  const handler = handlerMap.get(channel);
  if (!handler) throw new Error(`Missing handler: ${channel}`);
  return handler;
};

describe('catalyst handlers', () => {
  beforeEach(() => {
    handlerMap.clear();
    vi.clearAllMocks();

    setupCatalystHandlers(ipcMain, {
      loggerService: { child: () => ({ warn: vi.fn(), info: vi.fn() }) } as any,
      checkpointSaver: { getTuple: vi.fn().mockResolvedValue(undefined) } as any,
      configService: { getConfig: vi.fn().mockResolvedValue({ ai: { modelTypes: { chat: {} } } }) } as any,
      providerFactory: {} as any,
      knowledgeService: {} as any,
      practiceService: {} as any,
      learningService: { getSession: vi.fn().mockResolvedValue({ id: 's1' }) } as any,
    });
  });

  it('returns a validation error for empty messages', async () => {
    const handler = getHandler('catalyst:send-chat');
    await expect(handler(null, { message: '   ', sessionId: 's1' })).rejects.toThrow(
      'Message cannot be empty',
    );
  });

  it('invokes the workflow and returns the latest assistant text', async () => {
    const handler = getHandler('catalyst:send-chat');
    const result = await handler(null, { message: 'Hi', sessionId: 's1' });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, response: 'Hello!' });
  });
});
