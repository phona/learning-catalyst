/**
 * Session Management IPC Handlers with Agent Integration
 *
 * Enhanced session handlers that integrate with the multi-agent architecture
 * and provide agent-aware session operations through IPC communication.
 */

import { ipcMain } from 'electron';
import { getCatalystService } from '../services/catalyst/catalyst-service';
import { LoggerFactory } from '../services/logger';
import { ServiceError } from '../services/types';

/**
 * Session creation request with agent configuration
 */
export interface SessionCreateRequest {
  title: string;
  description?: string;
  agentConfig?: {
    primaryAgentId?: string;
    agentMode?: 'single' | 'orchestration' | 'collaborative';
    autoHandoff?: boolean;
    maxConcurrentAgents?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Session update request for agent-aware operations
 */
export interface SessionUpdateRequest {
  sessionId: string;
  title?: string;
  description?: string;
  agentConfig?: {
    primaryAgentId?: string;
    agentMode?: 'single' | 'orchestration' | 'collaborative';
    addAgents?: string[];
    removeAgents?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Agent session association request
 */
export interface AgentSessionRequest {
  sessionId: string;
  agentId: string;
  role?: 'primary' | 'secondary' | 'orchestrator' | 'tool';
  metadata?: Record<string, any>;
}

/**
 * Setup session management IPC handlers with agent integration
 */
export function setupSessionHandlers(): void {
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  /**
   * Create a new session with agent configuration
   */
  ipcMain.handle('session:create', async (event, request: SessionCreateRequest) => {
    logger.info('Received session creation request', {
      title: request.title,
      agentConfig: request.agentConfig
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'session:create',
        async () => {
          const sessionService = catalystService.getService('sessionService');
          const agentManager = catalystService.getService('agentManager');

          if (!sessionService) {
            throw new ServiceError(
              'Session service not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          // Create session with extended metadata for agent support
          const sessionId = await sessionService.createSession({
            title: request.title,
            description: request.description,
            metadata: {
              ...request.metadata,
              primary_agent_id: request.agentConfig?.primaryAgentId,
              agent_mode: request.agentConfig?.agentMode || 'single',
              auto_handoff: request.agentConfig?.autoHandoff || false,
              max_concurrent_agents: request.agentConfig?.maxConcurrentAgents || 1,
              agent_config: request.agentConfig
            },
            context: {
              system_prompt: undefined,
              notes: undefined,
              learning_objectives: []
            },
            checkpoints: [],
            statistics: {
              total_messages: 0,
              user_messages: 0,
              assistant_messages: 0,
              total_tokens_used: 0,
              total_thinking_tokens: 0,
              session_duration: 0,
              average_response_time: 0,
              concepts_learned: 0,
              checkpoints_created: 0,
              productivity_score: 0,
              engagement_score: 0
            }
          });

          // If primary agent is specified, activate it for the session
          if (request.agentConfig?.primaryAgentId && agentManager) {
            try {
              await agentManager.activateAgentForSession(
                request.agentConfig.primaryAgentId,
                sessionId
              );

              logger.info('Primary agent activated for session', {
                sessionId,
                agentId: request.agentConfig.primaryAgentId
              });
            } catch (agentError) {
              logger.warn('Failed to activate primary agent for session', {
                sessionId,
                agentId: request.agentConfig.primaryAgentId,
                error: agentError
              });
              // Don't fail session creation if agent activation fails
            }
          }

          return { sessionId };
        },
        {
          title: request.title,
          operation: 'session:create',
          source: 'ipc_handler'
        }
      );

      logger.info('Session created successfully', { sessionId: result.sessionId });
      return result;

    } catch (error) {
      logger.error('Session creation failed', error as Error, {
        title: request.title
      });
      throw error;
    }
  });

  /**
   * Update session with agent configuration changes
   */
  ipcMain.handle('session:update', async (event, request: SessionUpdateRequest) => {
    logger.info('Received session update request', {
      sessionId: request.sessionId,
      agentConfig: request.agentConfig
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        request.sessionId,
        'session:update',
        async () => {
          const sessionService = catalystService.getService('sessionService');
          const agentManager = catalystService.getService('agentManager');

          if (!sessionService) {
            throw new ServiceError(
              'Session service not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          // Update session metadata for agent configuration
          const session = await sessionService.getSessionById(request.sessionId);
          if (!session) {
            throw new ServiceError(
              'Session not found',
              'SESSION_NOT_FOUND',
              'SessionHandlers'
            );
          }

          // Update session metadata with agent configuration
          const updatedMetadata = {
            ...session.metadata,
            ...request.metadata,
            ...(request.agentConfig && {
              primary_agent_id: request.agentConfig.primaryAgentId,
              agent_mode: request.agentConfig.agentMode,
              agent_config: request.agentConfig
            })
          };

          // Handle agent associations if agent manager is available
          if (agentManager && request.agentConfig) {
            // Remove agents if specified
            if (request.agentConfig.removeAgents?.length) {
              for (const agentId of request.agentConfig.removeAgents) {
                await agentManager.deactivateAgentForSession(agentId, request.sessionId);
              }
            }

            // Add agents if specified
            if (request.agentConfig.addAgents?.length) {
              for (const agentId of request.agentConfig.addAgents) {
                await agentManager.activateAgentForSession(agentId, request.sessionId);
              }
            }

            // Update primary agent if changed
            if (request.agentConfig.primaryAgentId &&
                request.agentConfig.primaryAgentId !== session.metadata.primary_agent_id) {
              await agentManager.activateAgentForSession(
                request.agentConfig.primaryAgentId,
                request.sessionId,
                'primary'
              );
            }
          }

          // Update session title if provided
          if (request.title) {
            await sessionService.updateSessionTitle(request.sessionId, request.title);
          }

          return { success: true, sessionId: request.sessionId };
        },
        {
          sessionId: request.sessionId,
          operation: 'session:update',
          source: 'ipc_handler'
        }
      );

      logger.info('Session updated successfully', { sessionId: result.sessionId });
      return result;

    } catch (error) {
      logger.error('Session update failed', error as Error, {
        sessionId: request.sessionId
      });
      throw error;
    }
  });

  /**
   * Get session with agent associations
   */
  ipcMain.handle('session:get', async (event, sessionId: string) => {
    logger.debug('Received session get request', { sessionId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const session = await catalystService.runWithContext(
        sessionId,
        'session:get',
        async () => {
          const sessionService = catalystService.getService('sessionService');
          const agentManager = catalystService.getService('agentManager');

          if (!sessionService) {
            throw new ServiceError(
              'Session service not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          const sessionData = await sessionService.getSessionById(sessionId);
          if (!sessionData) {
            return null;
          }

          // Add agent associations if agent manager is available
          let agentAssociations = [];
          if (agentManager) {
            agentAssociations = await agentManager.getSessionAgents(sessionId);
          }

          return {
            ...sessionData,
            agents: agentAssociations
          };
        },
        { sessionId, operation: 'session:get' }
      );

      return session;

    } catch (error) {
      logger.error('Session get failed', error as Error, { sessionId });
      throw error;
    }
  });

  /**
   * List sessions with optional agent filtering
   */
  ipcMain.handle('session:list', async (event, options?: {
    limit?: number;
    offset?: number;
    agentId?: string;
    agentMode?: string;
  }) => {
    logger.debug('Received session list request', { options });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'session:list',
        async () => {
          const sessionService = catalystService.getService('sessionService');
          const agentManager = catalystService.getService('agentManager');

          if (!sessionService) {
            throw new ServiceError(
              'Session service not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          let sessions = await sessionService.getRecentSessions(options?.limit || 10);

          // Filter by agent if specified
          if (options?.agentId && agentManager) {
            const agentSessions = await agentManager.getAgentSessions(options.agentId);
            const agentSessionIds = new Set(agentSessions.map(s => s.sessionId));
            sessions = sessions.filter(session => agentSessionIds.has(session.id));
          }

          // Add agent associations to each session
          if (agentManager) {
            for (const session of sessions) {
              const agentAssociations = await agentManager.getSessionAgents(session.id);
              (session as any).agents = agentAssociations;
            }
          }

          return {
            sessions,
            total: sessions.length,
            hasMore: false // Simplified for now
          };
        },
        { operation: 'session:list', options }
      );

      logger.debug(`Returned ${result.sessions.length} sessions`);
      return result;

    } catch (error) {
      logger.error('Session list failed', error as Error);
      throw error;
    }
  });

  /**
   * Associate an agent with a session
   */
  ipcMain.handle('session:associate-agent', async (event, request: AgentSessionRequest) => {
    logger.info('Received agent association request', {
      sessionId: request.sessionId,
      agentId: request.agentId,
      role: request.role
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        request.sessionId,
        'session:associate-agent',
        async () => {
          const agentManager = catalystService.getService('agentManager');

          if (!agentManager) {
            throw new ServiceError(
              'Agent manager not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          await agentManager.activateAgentForSession(
            request.agentId,
            request.sessionId,
            request.role || 'secondary'
          );

          return {
            success: true,
            sessionId: request.sessionId,
            agentId: request.agentId
          };
        },
        {
          sessionId: request.sessionId,
          agentId: request.agentId,
          operation: 'session:associate-agent'
        }
      );

      logger.info('Agent associated with session successfully', {
        sessionId: request.sessionId,
        agentId: request.agentId
      });
      return result;

    } catch (error) {
      logger.error('Agent association failed', error as Error, {
        sessionId: request.sessionId,
        agentId: request.agentId
      });
      throw error;
    }
  });

  /**
   * Remove agent association from session
   */
  ipcMain.handle('session:remove-agent', async (event, sessionId: string, agentId: string) => {
    logger.info('Received agent removal request', { sessionId, agentId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        sessionId,
        'session:remove-agent',
        async () => {
          const agentManager = catalystService.getService('agentManager');

          if (!agentManager) {
            throw new ServiceError(
              'Agent manager not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          await agentManager.deactivateAgentForSession(agentId, sessionId);

          return {
            success: true,
            sessionId,
            agentId
          };
        },
        {
          sessionId,
          agentId,
          operation: 'session:remove-agent'
        }
      );

      logger.info('Agent removed from session successfully', { sessionId, agentId });
      return result;

    } catch (error) {
      logger.error('Agent removal failed', error as Error, { sessionId, agentId });
      throw error;
    }
  });

  /**
   * Get agents associated with a session
   */
  ipcMain.handle('session:get-agents', async (event, sessionId: string) => {
    logger.debug('Received session agents request', { sessionId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const agents = await catalystService.runWithContext(
        sessionId,
        'session:get-agents',
        async () => {
          const agentManager = catalystService.getService('agentManager');

          if (!agentManager) {
            return [];
          }

          return agentManager.getSessionAgents(sessionId);
        },
        { sessionId, operation: 'session:get-agents' }
      );

      logger.debug(`Returned ${agents.length} agents for session ${sessionId}`);
      return agents;

    } catch (error) {
      logger.error('Session agents request failed', error as Error, { sessionId });
      throw error;
    }
  });

  /**
   * Delete a session and clean up agent associations
   */
  ipcMain.handle('session:delete', async (event, sessionId: string) => {
    logger.info('Received session delete request', { sessionId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'SessionHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        sessionId,
        'session:delete',
        async () => {
          const sessionService = catalystService.getService('sessionService');
          const agentManager = catalystService.getService('agentManager');

          if (!sessionService) {
            throw new ServiceError(
              'Session service not available',
              'SERVICE_NOT_AVAILABLE',
              'SessionHandlers'
            );
          }

          // Clean up agent associations first
          if (agentManager) {
            const sessionAgents = await agentManager.getSessionAgents(sessionId);
            for (const agentAssociation of sessionAgents) {
              await agentManager.deactivateAgentForSession(
                agentAssociation.agentId,
                sessionId
              );
            }
          }

          // Delete the session
          const success = await sessionService.deleteSession(sessionId);

          return { success, sessionId };
        },
        { sessionId, operation: 'session:delete' }
      );

      logger.info('Session deleted successfully', { sessionId });
      return result;

    } catch (error) {
      logger.error('Session deletion failed', error as Error, { sessionId });
      throw error;
    }
  });

  logger.info('✅ Session handlers with agent integration registered successfully');
}