/**
 * High-Level Catalyst Service - Renderer Process
 *
 * Simple, high-level API that abstracts away the complexity of the multi-agent
 * architecture running in the main process. Provides a clean interface for the UI
 * layer while all heavy processing happens in the main thread.
 */

import { EventEmitter } from 'events';

/**
 * Chat message interface for the UI layer
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  tokens_used?: number;
  thinking_content?: string;
  metadata?: Record<string, any>;
}

/**
 * Streaming response chunk from the main process
 */
export interface StreamingChunk {
  type: 'start' | 'progress' | 'data' | 'thinking' | 'tool-call' | 'error' | 'complete';
  content: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Chat execution options
 */
export interface ChatOptions {
  agentId?: string;
  sessionId?: string;
  stream?: boolean;
  timeout?: number;
  context?: Record<string, any>;
}

/**
 * Chat execution result
 */
export interface ChatResult {
  success: boolean;
  messageId?: string;
  error?: string;
  executionId?: string;
}

/**
 * Session information for the UI
 */
export interface SessionInfo {
  id: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  message_count: number;
  primary_agent_id?: string;
  agent_mode?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent information for the UI
 */
export interface AgentInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  enabled: boolean;
  capabilities: string[];
  model_config?: {
    provider: string;
    model: string;
  };
}

/**
 * High-Level Catalyst Service
 *
 * This service provides a simple interface for the UI layer while all the
 * complex multi-agent processing happens in the main process via IPC.
 */
export class CatalystService extends EventEmitter {
  private executionIdCounter = 0;
  private activeStreams = new Map<string, { port: MessagePort; sessionId: string }>();

  constructor() {
    super();
    this.setupIPCListeners();
  }

  /**
   * Send a chat message and get response
   */
  async sendChat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
    try {
      const executionId = this.generateExecutionId();

      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Prepare request
      const request = {
        agentId: options.agentId || 'default',
        input: message,
        context: {
          id: executionId,
          sessionId: options.sessionId || 'default',
          userId: 'user',
          timestamp: Date.now(),
          correlationId: executionId
        },
        options: {
          stream: false,
          timeout: options.timeout || 30000,
          ...options
        }
      };

      // Send to main process
      const result = await window.electronAPI.catalyst.executeAgent(request);

      return {
        success: true,
        messageId: result.messageId,
        executionId
      };

    } catch (error) {
      console.error('Chat execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send a chat message with streaming response
   */
  async sendChatStream(
    message: string,
    options: ChatOptions = {},
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<ChatResult> {
    return new Promise((resolve, reject) => {
      try {
        const executionId = this.generateExecutionId();

        // Check if electronAPI is available
        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }

        // Set up streaming listener
        const handleStreamMessage = (event: any) => {
          if (event.data.executionId === executionId) {
            switch (event.data.type) {
              case 'agent:stream-ready':
                if (event.data.success) {
                  // Stream is ready, setup port listener
                  this.setupPortListener(executionId, onChunk, resolve, reject);
                } else {
                  reject(new Error(event.data.error || 'Stream setup failed'));
                }
                break;
            }
          }
        };

        // Listen for stream ready event
        window.addEventListener('message', handleStreamMessage);

        // Prepare streaming request
        const request = {
          agentId: options.agentId || 'default',
          input: message,
          context: {
            id: executionId,
            sessionId: options.sessionId || 'default',
            userId: 'user',
            timestamp: Date.now(),
            correlationId: executionId
          },
          options: {
            stream: true,
            timeout: options.timeout || 30000,
            ...options
          }
        };

        // Send streaming request to main process
        window.electronAPI.catalyst.executeAgentStream(request);

      } catch (error) {
        console.error('Stream chat execution failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Cancel an active execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.catalyst.cancelAgent(executionId);

      // Clean up stream if exists
      const streamInfo = this.activeStreams.get(executionId);
      if (streamInfo) {
        streamInfo.port.close();
        this.activeStreams.delete(executionId);
      }

      return result.success;

    } catch (error) {
      console.error('Failed to cancel execution:', error);
      return false;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      return await window.electronAPI.catalyst.getAgentStatus(executionId);

    } catch (error) {
      console.error('Failed to get execution status:', error);
      return { found: false };
    }
  }

  /**
   * Get available agents
   */
  async getAvailableAgents(): Promise<AgentInfo[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const agents = await window.electronAPI.catalyst.listAgents();

      // Transform to UI-friendly format
      return agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        description: agent.description || `Agent of type ${agent.type}`,
        enabled: agent.enabled,
        capabilities: agent.capabilities || [],
        model_config: {
          provider: agent.modelConfig?.provider?.name || 'unknown',
          model: agent.modelConfig?.modelId || 'unknown'
        }
      }));

    } catch (error) {
      console.error('Failed to get available agents:', error);
      return [];
    }
  }

  /**
   * Get active executions
   */
  async getActiveExecutions(): Promise<any[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      return await window.electronAPI.catalyst.getActiveExecutions();

    } catch (error) {
      console.error('Failed to get active executions:', error);
      return [];
    }
  }

  /**
   * Register a new agent
   */
  async registerAgent(agentConfig: any): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.catalyst.registerAgent(agentConfig);
      return result.success;

    } catch (error) {
      console.error('Failed to register agent:', error);
      return false;
    }
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.catalyst.unregisterAgent(agentId);
      return result.success;

    } catch (error) {
      console.error('Failed to unregister agent:', error);
      return false;
    }
  }

  // ==========================================
  // Session Management Methods
  // ==========================================

  /**
   * Create a new session
   */
  async createSession(
    title: string,
    options: {
      description?: string;
      agentConfig?: {
        primaryAgentId?: string;
        agentMode?: 'single' | 'orchestration' | 'collaborative';
        autoHandoff?: boolean;
      };
    } = {}
  ): Promise<string | null> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.session.create({
        title,
        description: options.description,
        agentConfig: options.agentConfig,
        metadata: {}
      });

      return result.sessionId;

    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      return await window.electronAPI.session.get(sessionId);

    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit = 10): Promise<SessionInfo[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.session.list({ limit });

      // Transform to UI-friendly format
      return result.sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        description: session.description,
        created_at: new Date(session.created_at),
        updated_at: new Date(session.updated_at),
        message_count: session.statistics?.total_messages || 0,
        primary_agent_id: session.metadata?.primary_agent_id,
        agent_mode: session.metadata?.agent_mode,
        metadata: session.metadata
      }));

    } catch (error) {
      console.error('Failed to get recent sessions:', error);
      return [];
    }
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    updates: {
      title?: string;
      description?: string;
      agentConfig?: {
        primaryAgentId?: string;
        agentMode?: string;
        addAgents?: string[];
        removeAgents?: string[];
      };
    }
  ): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.session.update({
        sessionId,
        ...updates
      });

      return result.success;

    } catch (error) {
      console.error('Failed to update session:', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.session.delete(sessionId);
      return result.success;

    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Associate agent with session
   */
  async associateAgentWithSession(
    sessionId: string,
    agentId: string,
    role: 'primary' | 'secondary' | 'orchestrator' | 'tool' = 'secondary'
  ): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.session.associateAgent({
        sessionId,
        agentId,
        role
      });

      return result.success;

    } catch (error) {
      console.error('Failed to associate agent with session:', error);
      return false;
    }
  }

  /**
   * Remove agent from session
   */
  async removeAgentFromSession(sessionId: string, agentId: string): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.session.removeAgent(sessionId, agentId);
      return result.success;

    } catch (error) {
      console.error('Failed to remove agent from session:', error);
      return false;
    }
  }

  /**
   * Get agents associated with a session
   */
  async getSessionAgents(sessionId: string): Promise<any[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      return await window.electronAPI.session.getAgents(sessionId);

    } catch (error) {
      console.error('Failed to get session agents:', error);
      return [];
    }
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${++this.executionIdCounter}`;
  }

  /**
   * Setup IPC listeners
   */
  private setupIPCListeners(): void {
    // Listen for agent events from main process
    if (window.electronAPI?.onAgentEvent) {
      window.electronAPI.onAgentEvent((event: any) => {
        this.emit('agentEvent', event);
      });
    }
  }

  /**
   * Setup MessageChannel port listener for streaming
   */
  private setupPortListener(
    executionId: string,
    onChunk: (chunk: StreamingChunk) => void,
    resolve: (value: ChatResult) => void,
    reject: (error: Error) => void
  ): void {
    const handlePortMessage = (event: MessageEvent) => {
      if (event.data.executionId !== executionId) {
        return;
      }

      const chunk: StreamingChunk = {
        type: event.data.type,
        content: event.data.chunk,
        timestamp: Date.now(),
        metadata: event.data.metadata
      };

      onChunk(chunk);

      // Handle completion
      if (chunk.type === 'complete') {
        resolve({
          success: true,
          executionId
        });
        this.cleanupStream(executionId);
      } else if (chunk.type === 'error') {
        reject(new Error(chunk.content.error || 'Unknown error'));
        this.cleanupStream(executionId);
      }
    };

    // Get the port from the event
    window.addEventListener('message', (event: any) => {
      if (event.data.type === 'agent:chunk' &&
          event.data.executionId === executionId &&
          event.data.ports?.[0]) {

        const port = event.data.ports[0];
        this.activeStreams.set(executionId, {
          port,
          sessionId: 'default'
        });

        port.addEventListener('message', handlePortMessage);
        port.start();
      }
    });
  }

  /**
   * Cleanup stream resources
   */
  private cleanupStream(executionId: string): void {
    const streamInfo = this.activeStreams.get(executionId);
    if (streamInfo) {
      try {
        streamInfo.port.close();
      } catch (error) {
        console.warn('Failed to close stream port:', error);
      }
      this.activeStreams.delete(executionId);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Clean up all active streams
    for (const [executionId, streamInfo] of this.activeStreams) {
      try {
        streamInfo.port.close();
      } catch (error) {
        console.warn(`Failed to close stream ${executionId}:`, error);
      }
    }
    this.activeStreams.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.log('Catalyst service cleaned up');
  }
}

// Export singleton instance
export const catalystService = new CatalystService();