/**
 * Catalyst IPC Handlers
 *
 * Minimal bridge for catalyst domain documented in electron API guide.
 */

import { ipcMain, MessageChannelMain } from 'electron';
import type { ILogger } from '../services/types';
import type {
  AgentExecutionRequest,
  AgentExecutionStatus,
  ActiveExecution,
  CatalystRequest,
  AgentRegistrationRequest,
  AgentExecutionResult,
} from '@/shared/types/electron-api/catalyst-api';
import type { StreamChunk, APIResponse } from '@/shared/types/electron-api';

type CatalystDeps = {
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
};

const ok = <T>(data: T, metadata?: APIResponse<T>['metadata']): APIResponse<T> => ({
  success: true,
  data,
  metadata,
});

export const setupCatalystHandlers = (
  ipcMainInstance: typeof ipcMain,
  deps: CatalystDeps,
): void => {
  const logger = deps.loggerService.child({ handler: 'catalyst' });

  const mockAgent = {
    id: 'agent_learning',
    type: 'learning',
    name: 'Learning Agent',
    description: 'Helps with study tasks',
    capabilities: ['chat'],
    isAvailable: true,
    category: 'core',
    stats: { sessionsCount: 0, avgRating: 0 },
  };

  ipcMainInstance.handle(
    'catalyst:execute-agent',
    async (_event, params: AgentExecutionRequest) => {
      logger.info('execute-agent', params);
      const payload: AgentExecutionResult = { executionId: `exec_${Date.now()}`, success: true };
      return ok(payload);
    },
  );

  ipcMainInstance.handle(
    'catalyst:execute-agent-stream',
    async (event, params: AgentExecutionRequest) => {
      logger.info('execute-agent-stream', params);
      const channel = new MessageChannelMain();
      event.sender.postMessage('catalyst:stream-ready', null, [channel.port1]);
      channel.port2.start();
      const chunks: StreamChunk[] = [
        { type: 'thinking', content: 'thinking...', timestamp: Date.now() },
        { type: 'content', content: 'streamed content', timestamp: Date.now() },
        { type: 'complete', content: '', timestamp: Date.now() },
      ];
      for (const chunk of chunks) {
        channel.port2.postMessage({ type: 'catalyst:chunk', chunk });
      }
      channel.port2.postMessage({ type: 'catalyst:complete' });
      channel.port2.close();
      const payload: AgentExecutionResult = { executionId: `exec_${Date.now()}`, success: true };
      return ok(payload);
    },
  );

  ipcMainInstance.handle('catalyst:cancel-agent', async (_event, executionId: string) => {
    logger.info('cancel-agent', { executionId });
    return ok({ cancelled: true });
  });

  ipcMainInstance.handle('catalyst:get-agent-status', async (_event, executionId: string) => {
    logger.info('get-agent-status', { executionId });
    const execution: AgentExecutionStatus['execution'] = {
      id: executionId,
      status: 'completed',
      agentId: mockAgent.id,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
    };
    return ok({ found: true, execution });
  });

  ipcMainInstance.handle('catalyst:list-agents', async () => {
    logger.info('list-agents');
    const agents = [mockAgent];
    return ok(agents);
  });

  ipcMainInstance.handle('catalyst:get-active-executions', async () => {
    logger.info('get-active-executions');
    const executions: ActiveExecution[] = [];
    return ok(executions);
  });

  ipcMainInstance.handle(
    'catalyst:register-agent',
    async (_event, agentConfig: AgentRegistrationRequest) => {
      logger.info('register-agent', agentConfig);
      const agentId = agentConfig?.id ?? `agent_${Date.now()}`;
      return ok({ agentId });
    },
  );

  ipcMainInstance.handle('catalyst:unregister-agent', async (_event, agentId: string) => {
    logger.info('unregister-agent', { agentId });
    return ok({ unregistered: agentId });
  });

  ipcMainInstance.handle('catalyst:send-chat', async (_event, params: CatalystRequest) => {
    logger.info('send-chat', params);
    const payload = { messageId: `msg_${Date.now()}`, response: 'Catalyst chat response' };
    return ok(payload);
  });

  ipcMainInstance.handle('catalyst:send-chat-stream', async (event, params: CatalystRequest) => {
    logger.info('send-chat-stream', params);
    const channel = new MessageChannelMain();
    event.sender.postMessage('catalyst:chat-stream-ready', null, [channel.port1]);
    channel.port2.start();
    const chunks: StreamChunk[] = [
      { type: 'thinking', content: 'thinking...', timestamp: Date.now() },
      { type: 'content', content: 'chat streamed content', timestamp: Date.now() },
      { type: 'complete', content: '', timestamp: Date.now() },
    ];
    for (const chunk of chunks) {
      channel.port2.postMessage({ type: 'catalyst:chunk', chunk });
    }
    channel.port2.postMessage({ type: 'catalyst:complete' });
    channel.port2.close();
    const payload = { messageId: `msg_${Date.now()}` };
    return ok(payload);
  });

  ipcMainInstance.handle('catalyst:get-session', async (_event, params: CatalystRequest) => {
    logger.info('get-session', params);
    const session = { sessionId: params?.sessionId ?? 'unknown', status: 'active' };
    return ok(session);
  });

  ipcMainInstance.handle('catalyst:cancel-execution', async (_event, params: CatalystRequest) => {
    logger.info('cancel-execution', params);
    return ok({ cancelled: true });
  });

  logger.info('Catalyst handlers registered');
};
