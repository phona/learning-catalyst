import { contextBridge, ipcRenderer } from 'electron';

// Import the modular ElectronAPI interface
import type { ElectronAPI } from '../../src/types/electron-api';
import type { DirectoryFilterConfig } from '../../src/types/filesystem';
import type {
  AgentExecutionRequestAPI,
  AgentExecutionResponse,
  AgentStatus,
  AgentExecutionStatus,
  AgentConfig
} from '../../src/types/electron-api/agent-api';
import type {
  SessionCreateRequest,
  SessionUpdateRequest,
  SessionGetRequest,
  SessionListRequest,
  SessionDeleteRequest,
  AgentSessionRequest
} from '../../src/types/electron-api/session-api';

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  existsFile: (path: string) => ipcRenderer.invoke('fs:existsFile', path),
  readDirectory: (dirPath: string, recursive?: boolean, maxDepth?: number, filterConfig?: DirectoryFilterConfig) =>
    ipcRenderer.invoke('fs:readDirectory', dirPath, recursive, maxDepth, filterConfig),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('fs:getFileInfo', filePath),

  // Dialog operations
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // App operations
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getApp: () => ipcRenderer.invoke('app:getApp'),
  quit: () => ipcRenderer.invoke('app:quit'),

  // Configuration
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  resetConfig: () => ipcRenderer.invoke('config:reset'),

  // Database operations
  dbSetPath: (path, isuri, autocommit) => ipcRenderer.invoke('db:setPath', path, isuri, autocommit),
  dbExecuteQuery: (query, params) => ipcRenderer.invoke('db:executeQuery', query, params),
  dbFetchOne: (query, params) => ipcRenderer.invoke('db:fetchOne', query, params),
  dbFetchMany: (query, size, params) => ipcRenderer.invoke('db:fetchMany', query, size, params),
  dbFetchAll: (query, params) => ipcRenderer.invoke('db:fetchAll', query, params),
  dbExecuteMany: (query, values) => ipcRenderer.invoke('db:executeMany', query, values),
  dbExecuteScript: (script) => ipcRenderer.invoke('db:executeScript', script),

  // Workspace operations
  getWorkspacePath: () => ipcRenderer.invoke('workspace:getPath'),
  getDatabasePath: () => ipcRenderer.invoke('workspace:getDatabasePath'),
  resolveWorkspacePath: (relativePath: string) => ipcRenderer.invoke('workspace:resolvePath', relativePath),
  readWorkspaceFile: (relativePath: string) => ipcRenderer.invoke('workspace:readFile', relativePath),
  writeWorkspaceFile: (relativePath: string, content: string) => ipcRenderer.invoke('workspace:writeFile', relativePath, content),
  workspaceFileExists: (relativePath: string) => ipcRenderer.invoke('workspace:existsFile', relativePath),
  showWorkspaceDialog: (options) => ipcRenderer.invoke('workspace:openDialog', options),

  // Session operations
  getUserDataPath: () => ipcRenderer.invoke('session:getUserDataPath'),
  getDocumentsPath: () => ipcRenderer.invoke('session:getDocumentsPath'),
  getAppPath: () => ipcRenderer.invoke('session:getAppPath'),

  // Qdrant operations
  qdrantStart: () => ipcRenderer.invoke('qdrant:start'),
  qdrantStop: () => ipcRenderer.invoke('qdrant:stop'),
  qdrantStatus: () => ipcRenderer.invoke('qdrant:status'),
  qdrantCollections: () => ipcRenderer.invoke('qdrant:collections'),
  qdrantCreateCollection: (name: string, vectorSize: number, distance?: string) =>
    ipcRenderer.invoke('qdrant:createCollection', { name, vectorSize, distance }),
  qdrantDeleteCollection: (name: string) =>
    ipcRenderer.invoke('qdrant:deleteCollection', { name }),

  // Knowledge operations
  knowledgeAdd: (item: any, embedding?: number[], provider?: any) =>
    ipcRenderer.invoke('knowledge:add', { item, embedding, provider }),
  knowledgeSearch: (query: string, provider: any, limit?: number, filters?: any) =>
    ipcRenderer.invoke('knowledge:search', { query, provider, limit, filters }),
  knowledgeGet: (id: string) => ipcRenderer.invoke('knowledge:get', { id }),
  knowledgeUpdate: (id: string, updates: any, provider: any) =>
    ipcRenderer.invoke('knowledge:update', { id, updates, provider }),
  knowledgeDelete: (id: string) => ipcRenderer.invoke('knowledge:delete', { id }),
  knowledgeStoreContext: (sessionId: string, messages: any[], provider: any) =>
    ipcRenderer.invoke('knowledge:storeContext', { sessionId, messages, provider }),
  knowledgeGetContext: (sessionId: string, query: string, provider: any, limit?: number) =>
    ipcRenderer.invoke('knowledge:getContext', { sessionId, query, provider, limit }),
  knowledgeStats: () => ipcRenderer.invoke('knowledge:stats'),
  knowledgeClear: () => ipcRenderer.invoke('knowledge:clear'),

  // Events
  onMenuAction: (callback) => ipcRenderer.on('menu:action', (_, action, data) => callback(action, data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Agent operations
  executeAgent: async (request: AgentExecutionRequestAPI): Promise<AgentExecutionResponse> => {
    // Convert request to internal format
    const internalRequest = {
      agentId: request.agentId,
      input: request.input,
      context: {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: request.sessionId,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        operation: 'agent:execute',
        metadata: {}
      },
      options: request.options
    };

    return await ipcRenderer.invoke('agent:execute', internalRequest);
  },

  executeAgentStream: async (request: AgentExecutionRequestAPI) => {
    // Return a streaming execution interface
    return new Promise((resolve, reject) => {
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up listener for stream-ready message
      const setupStream = (event: any, data: any) => {
        if (data.executionId === executionId) {
          ipcRenderer.removeListener('agent:stream-ready', setupStream);

          if (data.success) {
            // Create streaming interface
            const streamingExecution = {
              executionId,
              port: null as MessagePort | null,

              async start() {
                return new Promise<void>((resolveStart, rejectStart) => {
                  if (this.port) {
                    resolveStart();
                    return;
                  }

                  // Wait for port to be available
                  const portListener = (event: any, data: any) => {
                    if (data.type === 'agent:chunk' && data.executionId === executionId) {
                      this.port = event.ports[0];
                      ipcRenderer.removeListener('message', portListener);
                      resolveStart();
                    }
                  };

                  ipcRenderer.on('message', portListener);

                  // Set timeout for port availability
                  setTimeout(() => {
                    ipcRenderer.removeListener('message', portListener);
                    rejectStart(new Error('Timeout waiting for stream port'));
                  }, 5000);
                });
              },

              async cancel() {
                await ipcRenderer.invoke('agent:cancel', executionId);
              },

              onChunk(callback: (chunk: any) => void) {
                const listener = (event: any, data: any) => {
                  if (data.type === 'agent:chunk' && data.executionId === executionId) {
                    callback(data.chunk);
                  }
                };
                ipcRenderer.on('message', listener);

                // Return cleanup function
                return () => ipcRenderer.removeListener('message', listener);
              },

              onComplete(callback: () => void) {
                const listener = (event: any, data: any) => {
                  if (data.type === 'agent:complete' && data.executionId === executionId) {
                    callback();
                  }
                };
                ipcRenderer.on('message', listener);

                // Return cleanup function
                return () => ipcRenderer.removeListener('message', listener);
              },

              onError(callback: (error: Error) => void) {
                const listener = (event: any, data: any) => {
                  if (data.type === 'agent:error' && data.executionId === executionId) {
                    callback(new Error(data.error.message));
                  }
                };
                ipcRenderer.on('message', listener);

                // Return cleanup function
                return () => ipcRenderer.removeListener('message', listener);
              }
            };

            resolve(streamingExecution);
          } else {
            reject(new Error('Failed to initialize stream'));
          }
        }
      };

      ipcRenderer.on('agent:stream-ready', setupStream);

      // Set timeout for stream initialization
      setTimeout(() => {
        ipcRenderer.removeListener('agent:stream-ready', setupStream);
        reject(new Error('Timeout waiting for stream initialization'));
      }, 5000);

      // Send stream request
      const internalRequest = {
        agentId: request.agentId,
        input: request.input,
        context: {
          id: executionId,
          sessionId: request.sessionId,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operation: 'agent:execute-stream',
          metadata: { streaming: true }
        },
        options: request.options
      };

      ipcRenderer.send('agent:execute-stream', internalRequest);
    });
  },

  getAgents: async (): Promise<AgentStatus[]> => {
    const agents = await ipcRenderer.invoke('agent:list');
    return agents.map((agent: any) => ({
      agentId: agent.id,
      name: agent.name,
      type: agent.type,
      enabled: agent.enabled,
      registered: true
    }));
  },

  getAgent: async (agentId: string): Promise<AgentStatus | null> => {
    try {
      const agents = await ipcRenderer.invoke('agent:list');
      const agent = agents.find((a: any) => a.id === agentId);
      if (!agent) return null;

      return {
        agentId: agent.id,
        name: agent.name,
        type: agent.type,
        enabled: agent.enabled,
        registered: true
      };
    } catch (error) {
      return null;
    }
  },

  registerAgent: async (config: AgentConfig): Promise<{ success: boolean }> => {
    return await ipcRenderer.invoke('agent:register', config);
  },

  unregisterAgent: async (agentId: string): Promise<{ success: boolean }> => {
    return await ipcRenderer.invoke('agent:unregister', agentId);
  },

  cancelExecution: async (executionId: string): Promise<{ success: boolean }> => {
    return await ipcRenderer.invoke('agent:cancel', executionId);
  },

  getExecutionStatus: async (executionId: string): Promise<AgentExecutionStatus> => {
    const status = await ipcRenderer.invoke('agent:status', executionId);
    if (!status.found) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return {
      executionId,
      agentId: status.execution?.agentId || 'unknown',
      status: status.execution?.iteration >= 0 ? 'running' : 'completed',
      startTime: status.execution?.startTime || Date.now(),
      progress: {
        current: status.execution?.iteration || 0,
        total: status.execution?.maxIterations || 50,
        message: 'Processing...'
      }
    };
  },

  getActiveExecutions: async (): Promise<AgentExecutionStatus[]> => {
    const executions = await ipcRenderer.invoke('agent:executions');
    return executions.map((exec: any) => ({
      executionId: exec.id,
      agentId: exec.agentId,
      status: 'running',
      startTime: exec.startTime,
      progress: {
        current: exec.iteration,
        total: exec.maxIterations,
        message: 'Processing...'
      }
    }));
  },

  // Session management operations
  session: {
    create: async (request: SessionCreateRequest) => {
      return await ipcRenderer.invoke('session:create', request);
    },

    get: async (request: SessionGetRequest) => {
      return await ipcRenderer.invoke('session:get', request);
    },

    update: async (request: SessionUpdateRequest) => {
      return await ipcRenderer.invoke('session:update', request);
    },

    delete: async (request: SessionDeleteRequest) => {
      return await ipcRenderer.invoke('session:delete', request);
    },

    list: async (request: SessionListRequest) => {
      return await ipcRenderer.invoke('session:list', request);
    },

    associateAgent: async (request: AgentSessionRequest) => {
      return await ipcRenderer.invoke('session:associate-agent', request);
    },

    removeAgent: async (sessionId: string, agentId: string) => {
      return await ipcRenderer.invoke('session:remove-agent', { sessionId, agentId });
    },

    getAgents: async (sessionId: string) => {
      return await ipcRenderer.invoke('session:get-agents', sessionId);
    }
  },

  // Catalyst operations - high-level agent execution API
  catalyst: {
    executeAgent: async (request: any) => {
      return await ipcRenderer.invoke('agent:execute', request);
    },

    executeAgentStream: async (request: any) => {
      // For streaming, we need to set up listeners before invoking
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stream setup timeout'));
        }, 5000);

        // Send the stream request
        ipcRenderer.send('agent:execute-stream', request);

        // Listen for the stream-ready response
        const streamReadyListener = (_: any, data: any) => {
          clearTimeout(timeout);
          ipcRenderer.removeListener('agent:stream-ready', streamReadyListener);
          resolve(data);
        };

        ipcRenderer.on('agent:stream-ready', streamReadyListener);
      });
    },

    cancelAgent: async (executionId: string) => {
      return await ipcRenderer.invoke('agent:cancel', executionId);
    },

    getAgentStatus: async (executionId: string) => {
      return await ipcRenderer.invoke('agent:status', executionId);
    },

    listAgents: async () => {
      return await ipcRenderer.invoke('agent:list');
    },

    registerAgent: async (agentConfig: any) => {
      return await ipcRenderer.invoke('agent:register', agentConfig);
    },

    unregisterAgent: async (agentId: string) => {
      return await ipcRenderer.invoke('agent:unregister', agentId);
    },

    getActiveExecutions: async () => {
      return await ipcRenderer.invoke('agent:executions');
    }
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

