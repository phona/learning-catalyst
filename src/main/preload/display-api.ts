/**
 * Display-Optimized Preload API
 * Clean, intuitive APIs for frontend development with display-optimized data
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  SessionDisplay,
  MessageDisplay,
  AgentDisplay,
  SessionCreateRequest,
  SessionUpdateRequest,
  MessageSendRequest,
  SessionListDisplay,
  MessageListDisplay,
  AgentListDisplay
} from '../../renderer/types';

const displayAPI = {
  // Chat API - Simple and intuitive
  chat: {
    send: async ({ sessionId, message }: MessageSendRequest): Promise<{ success: boolean; messageId?: string; error?: string }> => {
      return await ipcRenderer.invoke('chat:send', { sessionId, message });
    },

    sendStream: ({ sessionId, message }: MessageSendRequest): Promise<AsyncIterable<string>> => {
      return new Promise((resolve) => {
        // Listen for stream-ready message
        const streamReadyHandler = (event: any) => {
          const port = event.ports[0];

          const stream = {
            async *[Symbol.asyncIterator]() {
              const messageHandler = (event: MessageEvent) => {
                const { type, data, error } = event.data;

                switch (type) {
                  case 'chunk':
                    queue.push(data);
                    break;
                  case 'end':
                    done = true;
                    port.close();
                    break;
                  case 'error':
                    throw new Error(error);
                }
              };

              port.onmessage = messageHandler;
              port.start();

              const queue: string[] = [];
              let done = false;

              while (!done) {
                if (queue.length > 0) {
                  yield queue.shift()!;
                } else {
                  await new Promise(r => setTimeout(r, 10));
                }
              }
            }
          };

          resolve(stream);
          ipcRenderer.removeListener('chat:stream-ready', streamReadyHandler);
        };

        ipcRenderer.on('chat:stream-ready', streamReadyHandler);
        ipcRenderer.send('chat:stream', { sessionId, message });

        // Set up error handling
        ipcRenderer.once('chat:stream-error', (_, { error }) => {
          ipcRenderer.removeListener('chat:stream-ready', streamReadyHandler);
          console.error('Stream error:', error);
        });
      });
    },

    getSession: async (sessionId: string): Promise<{ success: boolean; session?: SessionDisplay; messages?: MessageDisplay[]; error?: string }> => {
      return await ipcRenderer.invoke('chat:get-session', sessionId);
    },

    getStatus: async (sessionId: string): Promise<{ success: boolean; isTyping: boolean; agentId?: string | null; error?: string }> => {
      return await ipcRenderer.invoke('chat:get-status', sessionId);
    }
  },

  // Sessions API - Clean session management
  sessions: {
    list: async (options: {
      query?: string;
      limit?: number;
      filter?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}): Promise<{ success: boolean; sessions: SessionDisplay[]; total: number; hasMore: boolean; error?: string }> => {
      return await ipcRenderer.invoke('sessions:list', options);
    },

    create: async (request: SessionCreateRequest): Promise<{ success: boolean; session?: SessionDisplay; error?: string }> => {
      return await ipcRenderer.invoke('sessions:create', request);
    },

    get: async (sessionId: string): Promise<{ success: boolean; session?: SessionDisplay; error?: string }> => {
      return await ipcRenderer.invoke('sessions:get', sessionId);
    },

    update: async (sessionId: string, updates: SessionUpdateRequest): Promise<{ success: boolean; session?: SessionDisplay; error?: string }> => {
      return await ipcRenderer.invoke('sessions:update', sessionId, updates);
    },

    delete: async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      return await ipcRenderer.invoke('sessions:delete', sessionId);
    }
  },

  // Agents API - Simple agent management
  agents: {
    list: async (): Promise<{ success: boolean; agents: AgentDisplay[]; error?: string }> => {
      return await ipcRenderer.invoke('agents:list');
    },

    get: async (agentId: string): Promise<{ success: boolean; agent?: AgentDisplay; error?: string }> => {
      return await ipcRenderer.invoke('agents:get', agentId);
    },

    select: async (sessionId: string, agentId: string): Promise<{ success: boolean; error?: string }> => {
      return await ipcRenderer.invoke('agents:select', { sessionId, agentId });
    },

    getStatus: async (agentId: string): Promise<{ success: boolean; isOnline: boolean; isProcessing: boolean; currentTask?: string; error?: string }> => {
      return await ipcRenderer.invoke('agents:get-status', agentId);
    }
  },

  // Utility API for app-level operations
  app: {
    // Get app information
    getInfo: async (): Promise<{ version: string; platform: string; arch: string }> => {
      return await ipcRenderer.invoke('app:get-info');
    },

    // Show notification
    showNotification: (options: {
      title: string;
      body: string;
      icon?: string;
    }): void => {
      ipcRenderer.send('app:show-notification', options);
    },

    // Open external URL
    openExternal: (url: string): Promise<boolean> => {
      return ipcRenderer.invoke('app:open-external', url);
    },

    // Get system theme
    getSystemTheme: (): Promise<'light' | 'dark'> => {
      return ipcRenderer.invoke('app:get-system-theme');
    }
  },

  // Event listeners for real-time updates
  events: {
    // Listen for session updates
    onSessionUpdated: (callback: (session: SessionDisplay) => void) => {
      ipcRenderer.on('session:updated', (_, session) => callback(session));
    },

    // Listen for new messages
    onMessageReceived: (callback: (sessionId: string, message: MessageDisplay) => void) => {
      ipcRenderer.on('message:received', (_, sessionId, message) => callback(sessionId, message));
    },

    // Listen for agent status changes
    onAgentStatusChanged: (callback: (agentId: string, status: { isOnline: boolean; isProcessing: boolean; currentTask?: string }) => void) => {
      ipcRenderer.on('agent:status-changed', (_, agentId, status) => callback(agentId, status));
    },

    // Listen for typing indicators
    onTypingStarted: (callback: (sessionId: string, agentId: string) => void) => {
      ipcRenderer.on('typing:started', (_, sessionId, agentId) => callback(sessionId, agentId));
    },

    onTypingStopped: (callback: (sessionId: string) => void) => {
      ipcRenderer.on('typing:stopped', (_, sessionId) => callback(sessionId));
    },

    // Remove event listeners
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // Error handling and recovery
  error: {
    // Get last error
    getLastError: (): { code?: string; message?: string; timestamp?: number } | null => {
      return ipcRenderer.sendSync('error:get-last');
    },

    // Clear errors
    clearErrors: (): void => {
      ipcRenderer.send('error:clear');
    },

    // Report error
    reportError: (error: { message: string; stack?: string; context?: any }): void => {
      ipcRenderer.send('error:report', error);
    }
  }
};

// Type definitions for the exposed API
export type ElectronAPI = typeof displayAPI;

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', displayAPI);

// Add TypeScript declarations for global scope
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export default displayAPI;