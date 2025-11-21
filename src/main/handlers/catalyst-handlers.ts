/**
 * Catalyst IPC Handlers
 *
 * Minimal bridge for catalyst domain documented in electron API guide.
 * Provides mock-but-typed responses to keep renderer contract stable.
 */

import { ipcMain, MessageChannelMain } from 'electron';
import type { ILogger } from '../services/types';
import type { StreamChunk } from '@/shared/types/electron-api';

type CatalystDeps = {
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
};

export const setupCatalystHandlers = (ipcMainInstance: typeof ipcMain, deps: CatalystDeps): void => {
  const logger = deps.loggerService.child({ handler: 'catalyst' });

  const mockAgent = {
    id: 'agent_learning',
    type: 'learning',
    name: 'Learning Agent',
    description: 'Helps with study tasks',
    capabilities: ['chat'],
    isAvailable: true,
    category: 'core',
    stats: { sessionsCount: 0, avgRating: 0 }
  };

  ipcMainInstance.handle('catalyst:execute-agent', async (_event, params) => {
    logger.info('execute-agent', params);
    return { success: true, executionId: `exec_${Date.now()}`, response: 'Executed agent' };
  });

  ipcMainInstance.handle('catalyst:execute-agent-stream', async (event, params) => {
    logger.info('execute-agent-stream', params);
    const channel = new MessageChannelMain();
    event.sender.postMessage('catalyst:stream-ready', null, [channel.port1]);
    channel.port2.start();
    const chunks: StreamChunk[] = [
      { type: 'thinking', content: 'thinking...', timestamp: Date.now() },
      { type: 'content', content: 'streamed content', timestamp: Date.now() },
      { type: 'complete', content: '', timestamp: Date.now() }
    ];
    for (const chunk of chunks) {
      channel.port2.postMessage({ type: 'catalyst:chunk', chunk });
    }
    channel.port2.postMessage({ type: 'catalyst:complete' });
    channel.port2.close();
    return { success: true, executionId: `exec_${Date.now()}` };
  });

  ipcMainInstance.handle('catalyst:cancel-agent', async (_event, executionId: string) => {
    logger.info('cancel-agent', { executionId });
    return { success: true };
  });

  ipcMainInstance.handle('catalyst:get-agent-status', async (_event, executionId: string) => {
    logger.info('get-agent-status', { executionId });
    return {
      success: true,
      found: true,
      execution: { id: executionId, status: 'completed', agentId: mockAgent.id, startTime: Date.now() - 1000, endTime: Date.now() }
    };
  });

  ipcMainInstance.handle('catalyst:list-agents', async () => {
    logger.info('list-agents');
    return { success: true, agents: mockAgent ? [mockAgent] : [] };
  });

  ipcMainInstance.handle('catalyst:get-active-executions', async () => {
    logger.info('get-active-executions');
    return { success: true, executions: [] };
  });

  ipcMainInstance.handle('catalyst:register-agent', async (_event, agentConfig) => {
    logger.info('register-agent', agentConfig);
    return { success: true, agentId: agentConfig?.id ?? `agent_${Date.now()}` };
  });

  ipcMainInstance.handle('catalyst:unregister-agent', async (_event, agentId: string) => {
    logger.info('unregister-agent', { agentId });
    return { success: true };
  });

  ipcMainInstance.handle('catalyst:send-chat', async (_event, params) => {
    logger.info('send-chat', params);
    return { success: true, messageId: `msg_${Date.now()}`, response: 'Catalyst chat response' };
  });

  ipcMainInstance.handle('catalyst:send-chat-stream', async (event, params) => {
    logger.info('send-chat-stream', params);
    const channel = new MessageChannelMain();
    event.sender.postMessage('catalyst:chat-stream-ready', null, [channel.port1]);
    channel.port2.start();
    const chunks: StreamChunk[] = [
      { type: 'thinking', content: 'thinking...', timestamp: Date.now() },
      { type: 'content', content: 'chat streamed content', timestamp: Date.now() },
      { type: 'complete', content: '', timestamp: Date.now() }
    ];
    for (const chunk of chunks) {
      channel.port2.postMessage({ type: 'catalyst:chunk', chunk });
    }
    channel.port2.postMessage({ type: 'catalyst:complete' });
    channel.port2.close();
    return { success: true, messageId: `msg_${Date.now()}` };
  });

  ipcMainInstance.handle('catalyst:get-session', async (_event, params) => {
    logger.info('get-session', params);
    return { success: true, data: { sessionId: params?.sessionId ?? 'unknown', status: 'active' } };
  });

  ipcMainInstance.handle('catalyst:cancel-execution', async (_event, params) => {
    logger.info('cancel-execution', params);
    return { success: true };
  });

  logger.info('Catalyst handlers registered');
};
