/**
 * Agent Execution IPC Handlers
 *
 * Enhanced IPC handlers for agent execution with MessageChannelMain streaming.
 * Provides secure communication between renderer and main thread for agent operations.
 */

import { ipcMain, MessagePortMain } from 'electron';
import { getCatalystService } from '../services/catalyst/catalyst-service';
import { AgentExecutionRequest, ServiceExecutionContext } from '../services/types';
import { LoggerFactory } from '../services/logger';
import { ServiceError } from '../services/types';

/**
 * Setup agent execution IPC handlers
 */
export function setupAgentHandlers(): void {
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  /**
   * Execute an agent with streaming support
   */
  ipcMain.handle('agent:execute', async (event, request: AgentExecutionRequest) => {
    logger.info('Received agent execution request', {
      agentId: request.agentId,
      executionId: request.context.id,
      sessionId: request.context.sessionId
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      // Execute agent within proper context
      const result = await catalystService.runWithContext(
        request.context.sessionId,
        'agent:execute',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            throw new ServiceError(
              'Agent manager not available',
              'SERVICE_NOT_AVAILABLE',
              'AgentHandlers'
            );
          }

          return await agentManager.executeAgent(request);
        },
        {
          agentId: request.agentId,
          operation: 'agent:execute',
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Agent execution failed', error as Error, {
        agentId: request.agentId,
        executionId: request.context.id
      });

      throw error;
    }
  });

  /**
   * Execute agent with streaming via MessageChannelMain
   */
  ipcMain.on('agent:execute-stream', async (event, request: AgentExecutionRequest) => {
    logger.info('Received streaming agent execution request', {
      agentId: request.agentId,
      executionId: request.context.id,
      sessionId: request.context.sessionId
    });

    // Create MessageChannelMain for streaming
    const { port1, port2 } = new MessageChannelMain();

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      // Send port back to renderer
      event.sender.postMessage('agent:stream-ready', {
        executionId: request.context.id,
        success: true
      }, [port1]);

      // Start streaming execution
      await catalystService.runWithContext(
        request.context.sessionId,
        'agent:execute-stream',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            throw new ServiceError(
              'Agent manager not available',
              'SERVICE_NOT_AVAILABLE',
              'AgentHandlers'
            );
          }

          // Execute agent and stream results
          const stream = await agentManager.executeAgent(request);

          for await (const chunk of stream) {
            // Check if port is still open
            if (port2.closed) {
              logger.info('Stream port closed, stopping execution', {
                executionId: request.context.id
              });
              break;
            }

            // Send chunk to renderer
            port2.postMessage({
              type: 'agent:chunk',
              executionId: request.context.id,
              chunk
            });

            // Add small delay to prevent overwhelming the renderer
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Send completion message
          if (!port2.closed) {
            port2.postMessage({
              type: 'agent:complete',
              executionId: request.context.id
            });
          }
        },
        {
          agentId: request.agentId,
          operation: 'agent:execute-stream',
          source: 'ipc_handler',
          streaming: true
        }
      );

    } catch (error) {
      logger.error('Streaming agent execution failed', error as Error, {
        agentId: request.agentId,
        executionId: request.context.id
      });

      // Send error to renderer
      try {
        port2.postMessage({
          type: 'agent:error',
          executionId: request.context.id,
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack
          }
        });
      } catch (portError) {
        logger.error('Failed to send error message via port', portError as Error);
      }

      // Close port on error
      try {
        port2.close();
      } catch (closeError) {
        logger.error('Failed to close port on error', closeError as Error);
      }
    }
  });

  /**
   * Cancel agent execution
   */
  ipcMain.handle('agent:cancel', async (event, executionId: string) => {
    logger.info('Received agent cancellation request', { executionId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      const success = await catalystService.runWithContext(
        'system',
        'agent:cancel',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            return false;
          }

          return agentManager.cancelExecution(executionId);
        },
        { executionId, operation: 'agent:cancel' }
      );

      logger.info('Agent cancellation processed', { executionId, success });
      return { success };

    } catch (error) {
      logger.error('Agent cancellation failed', error as Error, { executionId });
      throw error;
    }
  });

  /**
   * Get agent execution status
   */
  ipcMain.handle('agent:status', async (event, executionId: string) => {
    logger.debug('Received agent status request', { executionId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      const status = await catalystService.runWithContext(
        'system',
        'agent:status',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            return { found: false };
          }

          return agentManager.getExecutionStatus(executionId);
        },
        { executionId, operation: 'agent:status' }
      );

      return status;

    } catch (error) {
      logger.error('Agent status check failed', error as Error, { executionId });
      throw error;
    }
  });

  /**
   * Get registered agents
   */
  ipcMain.handle('agent:list', async () => {
    logger.debug('Received agent list request');

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      const agents = await catalystService.runWithContext(
        'system',
        'agent:list',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            return [];
          }

          return agentManager.getRegisteredAgents();
        },
        { operation: 'agent:list' }
      );

      logger.debug(`Returned ${agents.length} registered agents`);
      return agents;

    } catch (error) {
      logger.error('Agent list request failed', error as Error);
      throw error;
    }
  });

  /**
   * Get active agent executions
   */
  ipcMain.handle('agent:executions', async () => {
    logger.debug('Received active executions request');

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      const executions = await catalystService.runWithContext(
        'system',
        'agent:executions',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            return [];
          }

          return agentManager.getActiveExecutions();
        },
        { operation: 'agent:executions' }
      );

      logger.debug(`Returned ${executions.length} active executions`);
      return executions;

    } catch (error) {
      logger.error('Active executions request failed', error as Error);
      throw error;
    }
  });

  /**
   * Register a new agent
   */
  ipcMain.handle('agent:register', async (event, agentConfig) => {
    logger.info('Received agent registration request', {
      agentId: agentConfig.id,
      agentType: agentConfig.type
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      await catalystService.runWithContext(
        'system',
        'agent:register',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            throw new ServiceError(
              'Agent manager not available',
              'SERVICE_NOT_AVAILABLE',
              'AgentHandlers'
            );
          }

          agentManager.registerAgent(agentConfig);
        },
        {
          agentId: agentConfig.id,
          agentType: agentConfig.type,
          operation: 'agent:register'
        }
      );

      logger.info('Agent registered successfully', { agentId: agentConfig.id });
      return { success: true };

    } catch (error) {
      logger.error('Agent registration failed', error as Error, {
        agentId: agentConfig.id
      });
      throw error;
    }
  });

  /**
   * Unregister an agent
   */
  ipcMain.handle('agent:unregister', async (event, agentId: string) => {
    logger.info('Received agent unregistration request', { agentId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'AgentHandlers'
        );
      }

      await catalystService.runWithContext(
        'system',
        'agent:unregister',
        async () => {
          const agentManager = catalystService.getService('agentManager');
          if (!agentManager) {
            throw new ServiceError(
              'Agent manager not available',
              'SERVICE_NOT_AVAILABLE',
              'AgentHandlers'
            );
          }

          agentManager.unregisterAgent(agentId);
        },
        { agentId, operation: 'agent:unregister' }
      );

      logger.info('Agent unregistered successfully', { agentId });
      return { success: true };

    } catch (error) {
      logger.error('Agent unregistration failed', error as Error, { agentId });
      throw error;
    }
  });

  logger.info('✅ Agent handlers registered successfully');
}