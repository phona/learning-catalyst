/**
 * Display-Optimized IPC Handlers
 * Transforms complex business data into UI-optimized formats for clean frontend development
 */

import { ipcMain, MessageChannelMain } from 'electron';
import { SessionService } from '../services/sessions/SessionService';
import { AgentOrchestrator } from '../services/agents/AgentOrchestrator';
import { KnowledgeGraphService } from '../services/database/knowledge-service';
import { DatabaseService } from '../services/database/DatabaseService';
import type {
  SessionDisplay,
  MessageDisplay,
  AgentDisplay,
  SessionCreateRequest,
  SessionUpdateRequest,
  MessageSendRequest
} from '../../renderer/types';

// Initialize services (these would be properly injected in a real app)
const dbService = new DatabaseService();
const knowledgeService = new KnowledgeGraphService(dbService);
const configService = null; // Would be initialized properly
const sessionService = new SessionService(dbService, knowledgeService, configService);
const agentOrchestrator = new AgentOrchestrator(
  null, // AgentManager
  null, // ToolExecutor
  knowledgeService,
  null  // LangChainService
);

export function setupDisplayHandlers() {
  console.log('[DisplayHandlers] Setting up display-optimized IPC handlers...');

  // Chat operations (Display-optimized)
  ipcMain.handle('chat:send', async (_, { sessionId, message }: MessageSendRequest) => {
    try {
      console.log(`[DisplayHandlers] chat:send - sessionId: ${sessionId}, message: ${message.content.substring(0, 50)}...`);

      // Add user message
      const userMessage = await sessionService.addMessage(sessionId, {
        content: message.content,
        role: 'user'
      });

      // Trigger agent response
      const agentResponse = await agentOrchestrator.executeAgent({
        agentId: 'learning-agent', // Would be determined from session
        input: message.content,
        sessionId,
        context: {
          previousMessages: [], // Would load from session
          userPreferences: {
            responseStyle: 'conversational',
            difficultyLevel: 'intermediate',
            language: 'en',
            enableFollowUpQuestions: true,
            enableExamples: true,
            enableAnalogies: true
          }
        }
      });

      // Add assistant message
      const assistantMessage = await sessionService.addMessage(sessionId, {
        content: agentResponse.response,
        role: 'assistant',
        agentInfo: {
          type: 'learning',
          avatar: '🎓',
          color: '#3B82F6'
        }
      });

      return {
        success: true,
        messageId: assistantMessage.id,
        responseId: agentResponse.agentId
      };
    } catch (error) {
      console.error('[DisplayHandlers] chat:send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Streaming chat (Display-optimized)
  ipcMain.handle('chat:stream', async (event, { sessionId, message }: MessageSendRequest) => {
    try {
      console.log(`[DisplayHandlers] chat:stream - sessionId: ${sessionId}`);

      const { port1, port2 } = new MessageChannelMain();

      // Start streaming in background
      agentOrchestrator.executeAgentStream({
        agentId: 'learning-agent',
        input: message.content,
        sessionId,
        context: {
          previousMessages: [],
          userPreferences: {
            responseStyle: 'conversational',
            difficultyLevel: 'intermediate',
            language: 'en',
            enableFollowUpQuestions: true,
            enableExamples: true,
            enableAnalogies: true
          }
        },
        onChunk: (chunk) => {
          port1.postMessage({ type: 'chunk', data: chunk });
        },
        onComplete: async (fullResponse) => {
          // Save complete message
          await sessionService.addMessage(sessionId, {
            content: fullResponse,
            role: 'assistant',
            agentInfo: {
              type: 'learning',
              avatar: '🎓',
              color: '#3B82F6'
            }
          });

          port1.postMessage({ type: 'end' });
          port1.close();
        },
        onError: (error) => {
          console.error('[DisplayHandlers] Stream error:', error);
          port1.postMessage({ type: 'error', error: error.message });
          port1.close();
        }
      });

      // Send port to renderer
      event.senderFrame.postMessage('chat:stream-ready', [], [port2]);

    } catch (error) {
      console.error('[DisplayHandlers] chat:stream setup error:', error);
      event.sender.send('chat:stream-error', { error: error.message });
    }
  });

  // Get session messages (Display-optimized)
  ipcMain.handle('chat:get-session', async (_, sessionId: string) => {
    try {
      console.log(`[DisplayHandlers] chat:get-session - sessionId: ${sessionId}`);

      // Get session and messages (transformed to display format)
      const session = await sessionService.getSession(sessionId);
      const messages = await getSessionMessages(sessionId);

      return {
        success: true,
        session,
        messages
      };
    } catch (error) {
      console.error('[DisplayHandlers] chat:get-session error:', error);
      return {
        success: false,
        error: error.message,
        messages: []
      };
    }
  });

  // Get chat status (Display-optimized)
  ipcMain.handle('chat:get-status', async (_, sessionId: string) => {
    try {
      // Check if any agent is currently processing this session
      const isTyping = await checkAgentTypingStatus(sessionId);

      return {
        success: true,
        isTyping,
        agentId: isTyping ? 'learning-agent' : null
      };
    } catch (error) {
      console.error('[DisplayHandlers] chat:get-status error:', error);
      return {
        success: false,
        error: error.message,
        isTyping: false
      };
    }
  });

  // Session operations (Display-optimized)
  ipcMain.handle('sessions:list', async (_, { query, limit = 20, filter, sortBy = 'updatedAt', sortOrder = 'desc' }) => {
    try {
      console.log(`[DisplayHandlers] sessions:list - query: ${query}, limit: ${limit}`);

      const result = await sessionService.listSessions({
        query,
        limit,
        filter,
        sortBy,
        sortOrder
      });

      return {
        success: true,
        sessions: result.sessions, // Already display-optimized
        total: result.total,
        hasMore: result.hasMore
      };
    } catch (error) {
      console.error('[DisplayHandlers] sessions:list error:', error);
      return {
        success: false,
        error: error.message,
        sessions: [],
        total: 0,
        hasMore: false
      };
    }
  });

  // Create session (Display-optimized)
  ipcMain.handle('sessions:create', async (_, request: SessionCreateRequest) => {
    try {
      console.log(`[DisplayHandlers] sessions:create - title: ${request.title}`);

      const session = await sessionService.createSession({
        title: request.title,
        description: request.description,
        agentType: request.agentType,
        difficulty: request.difficulty,
        tags: request.tags,
        learningObjectives: request.learningObjectives
      });

      return {
        success: true,
        session // Already display-optimized
      };
    } catch (error) {
      console.error('[DisplayHandlers] sessions:create error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get session (Display-optimized)
  ipcMain.handle('sessions:get', async (_, sessionId: string) => {
    try {
      console.log(`[DisplayHandlers] sessions:get - sessionId: ${sessionId}`);

      const session = await sessionService.getSession(sessionId);

      return {
        success: true,
        session // Already display-optimized
      };
    } catch (error) {
      console.error('[DisplayHandlers] sessions:get error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Update session (Display-optimized)
  ipcMain.handle('sessions:update', async (_, sessionId: string, updates: SessionUpdateRequest) => {
    try {
      console.log(`[DisplayHandlers] sessions:update - sessionId: ${sessionId}`);

      const session = await sessionService.updateSession(sessionId, updates);

      return {
        success: true,
        session // Already display-optimized
      };
    } catch (error) {
      console.error('[DisplayHandlers] sessions:update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Delete session
  ipcMain.handle('sessions:delete', async (_, sessionId: string) => {
    try {
      console.log(`[DisplayHandlers] sessions:delete - sessionId: ${sessionId}`);

      await sessionService.deleteSession(sessionId);

      return { success: true };
    } catch (error) {
      console.error('[DisplayHandlers] sessions:delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Agent operations (Display-optimized)
  ipcMain.handle('agents:list', async () => {
    try {
      console.log(`[DisplayHandlers] agents:list`);

      const agents = await agentOrchestrator.getAvailableAgents();

      return {
        success: true,
        agents // Already display-optimized
      };
    } catch (error) {
      console.error('[DisplayHandlers] agents:list error:', error);
      return {
        success: false,
        error: error.message,
        agents: []
      };
    }
  });

  // Get agent (Display-optimized)
  ipcMain.handle('agents:get', async (_, agentId: string) => {
    try {
      console.log(`[DisplayHandlers] agents:get - agentId: ${agentId}`);

      const agent = await agentOrchestrator.getAgent(agentId);

      return {
        success: true,
        agent // Already display-optimized
      };
    } catch (error) {
      console.error('[DisplayHandlers] agents:get error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Select agent for session
  ipcMain.handle('agents:select', async (_, { sessionId, agentId }) => {
    try {
      console.log(`[DisplayHandlers] agents:select - sessionId: ${sessionId}, agentId: ${agentId}`);

      // Update session's agent type
      await sessionService.updateSession(sessionId, { agentType: agentId });

      return { success: true };
    } catch (error) {
      console.error('[DisplayHandlers] agents:select error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get agent status (Display-optimized)
  ipcMain.handle('agents:get-status', async (_, agentId: string) => {
    try {
      console.log(`[DisplayHandlers] agents:get-status - agentId: ${agentId}`);

      // Check agent availability and current activity
      const isOnline = await checkAgentOnlineStatus(agentId);
      const isProcessing = await checkAgentProcessingStatus(agentId);
      const currentTask = isProcessing ? await getAgentCurrentTask(agentId) : undefined;

      return {
        success: true,
        isOnline,
        isProcessing,
        currentTask
      };
    } catch (error) {
      console.error('[DisplayHandlers] agents:get-status error:', error);
      return {
        success: false,
        error: error.message,
        isOnline: false,
        isProcessing: false
      };
    }
  });

  console.log('[DisplayHandlers] Display-optimized IPC handlers registered successfully');
}

// Helper functions
async function getSessionMessages(sessionId: string): Promise<MessageDisplay[]> {
  // This would load messages from the database and transform them to display format
  // For now, return empty array
  return [];
}

async function checkAgentTypingStatus(sessionId: string): Promise<boolean> {
  // Check if any agent is currently processing this session
  // This would integrate with the agent orchestrator
  return false;
}

async function checkAgentOnlineStatus(agentId: string): Promise<boolean> {
  // Check if agent is online and available
  return true;
}

async function checkAgentProcessingStatus(agentId: string): Promise<boolean> {
  // Check if agent is currently processing a request
  return false;
}

async function getAgentCurrentTask(agentId: string): Promise<string | undefined> {
  // Get current task being processed by agent
  return undefined;
}