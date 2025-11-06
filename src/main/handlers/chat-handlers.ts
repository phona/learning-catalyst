/**
 * Chat & Conversation IPC Handlers
 *
 * IPC handlers for chat functionality, conversation management,
 * and real-time messaging between renderer and main thread.
 */

import { ipcMain, MessageChannelMain } from 'electron';
import { getCatalystService } from '../services/catalyst/catalyst-service';
import { LoggerFactory } from '../services/logger';
import { ServiceError } from '../services/types';

/**
 * Setup chat and conversation IPC handlers
 */
export function setupChatHandlers(): void {
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  /**
   * Start a new conversation
   */
  ipcMain.handle('chat:startConversation', async (event, params) => {
    logger.info('Starting new conversation', params);

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'ChatHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        params.sessionId || 'system',
        'chat:startConversation',
        async () => {
          // Mock conversation creation for now
          const conversation = {
            id: `conversation_${Date.now()}`,
            title: params.title || 'New Conversation',
            agentType: params.agentType || 'learning',
            topic: params.topic,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            messages: [],
            metadata: params.preferences || {}
          };

          return {
            success: true,
            conversation
          };
        },
        {
          operation: 'chat:startConversation',
          agentType: params.agentType,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to start conversation', error as Error, params);
      throw error;
    }
  });

  /**
   * Send a message in a conversation
   */
  ipcMain.handle('chat:sendMessage', async (event, params) => {
    logger.info('Sending message', { conversationId: params.conversationId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'ChatHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        params.sessionId || 'system',
        'chat:sendMessage',
        async () => {
          // Mock message creation
          const message = {
            id: `msg_${Date.now()}`,
            conversationId: params.conversationId,
            role: 'user',
            content: params.message,
            timestamp: new Date().toISOString(),
            attachments: params.attachments || [],
            metadata: {}
          };

          // Mock AI response
          const aiResponse = {
            id: `msg_${Date.now() + 1}`,
            conversationId: params.conversationId,
            role: 'assistant',
            content: `I understand you said: "${params.message}". This is a mock AI response.`,
            timestamp: new Date().toISOString(),
            metadata: {
              model: 'mock-gpt',
              tokensUsed: 50,
              responseTime: 200
            }
          };

          return {
            success: true,
            message: aiResponse
          };
        },
        {
          operation: 'chat:sendMessage',
          conversationId: params.conversationId,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to send message', error as Error, { conversationId: params.conversationId });
      throw error;
    }
  });

  /**
   * Get conversation history
   */
  ipcMain.handle('chat:getConversation', async (event, conversationId) => {
    logger.info('Getting conversation', { conversationId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'ChatHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'chat:getConversation',
        async () => {
          // Mock conversation retrieval
          const conversation = {
            id: conversationId,
            title: 'Mock Conversation',
            agentType: 'learning',
            topic: 'General',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            messages: [
              {
                id: 'msg_1',
                role: 'user',
                content: 'Hello, this is a test message',
                timestamp: new Date().toISOString(),
                metadata: {}
              },
              {
                id: 'msg_2',
                role: 'assistant',
                content: 'Hello! This is a mock response.',
                timestamp: new Date().toISOString(),
                metadata: { model: 'mock-gpt' }
              }
            ],
            metadata: {}
          };

          return {
            success: true,
            conversation
          };
        },
        {
          operation: 'chat:getConversation',
          conversationId,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to get conversation', error as Error, { conversationId });
      throw error;
    }
  });

  /**
   * List all conversations
   */
  ipcMain.handle('chat:listConversations', async () => {
    logger.info('Listing conversations');

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'ChatHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'chat:listConversations',
        async () => {
          // Mock conversation list
          const conversations = [
            {
              id: 'conv_1',
              title: 'React Learning Session',
              agentType: 'learning',
              topic: 'React',
              lastMessage: 'How do hooks work?',
              timestamp: new Date().toISOString(),
              messageCount: 5,
              metadata: { pinned: false }
            },
            {
              id: 'conv_2',
              title: 'TypeScript Questions',
              agentType: 'tutoring',
              topic: 'TypeScript',
              lastMessage: 'What are generics?',
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              messageCount: 3,
              metadata: { pinned: true }
            }
          ];

          return {
            success: true,
            conversations
          };
        },
        {
          operation: 'chat:listConversations',
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to list conversations', error as Error);
      throw error;
    }
  });

  /**
   * Delete a conversation
   */
  ipcMain.handle('chat:deleteConversation', async (event, conversationId) => {
    logger.info('Deleting conversation', { conversationId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'ChatHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'chat:deleteConversation',
        async () => {
          // Mock deletion
          return {
            success: true,
            deleted: true
          };
        },
        {
          operation: 'chat:deleteConversation',
          conversationId,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to delete conversation', error as Error, { conversationId });
      throw error;
    }
  });

  /**
   * Stream chat response via MessageChannelMain
   */
  ipcMain.on('chat:streamMessage', async (event, params) => {
    logger.info('Starting message stream', { conversationId: params.conversationId });

    const { port1, port2 } = new MessageChannelMain();

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'ChatHandlers'
        );
      }

      // Send port back to renderer
      event.sender.postMessage('chat:stream-ready', {
        success: true,
        conversationId: params.conversationId
      }, [port1]);

      // Start streaming
      await catalystService.runWithContext(
        params.sessionId || 'system',
        'chat:streamMessage',
        async () => {
          const mockResponse = `This is a mock streaming response to: "${params.message}".`;
          const words = mockResponse.split(' ');

          for (let i = 0; i < words.length; i++) {
            try {
              port2.postMessage({
                type: 'chat:chunk',
                conversationId: params.conversationId,
                chunk: words[i] + (i < words.length - 1 ? ' ' : ''),
                isComplete: i === words.length - 1
              });
            } catch (error) {
              logger.info('Stream port closed');
              break;
            }

            // Simulate streaming delay
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Send completion message
          try {
            port2.postMessage({
              type: 'chat:complete',
              conversationId: params.conversationId
            });
          } catch (error) {
            logger.debug('Could not send completion message');
          }
        },
        {
          operation: 'chat:streamMessage',
          conversationId: params.conversationId,
          source: 'ipc_handler',
          streaming: true
        }
      );

    } catch (error) {
      logger.error('Stream failed', error as Error, { conversationId: params.conversationId });

      try {
        port2.postMessage({
          type: 'chat:error',
          conversationId: params.conversationId,
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack
          }
        });
      } catch (portError) {
        logger.error('Failed to send error via port', portError as Error);
      }

      try {
        port2.close();
      } catch (closeError) {
        logger.error('Failed to close port', closeError as Error);
      }
    }
  });

  logger.info('✅ Chat handlers registered successfully');
}