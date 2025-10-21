import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for the renderer process
export interface ElectronAPI {
  // File operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  existsFile: (path: string) => Promise<boolean>;

  // Dialog operations
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;

  // App operations
  getAppVersion: () => Promise<string>;
  getApp: () => Promise<Electron.App>;
  quit: () => void;

  // Configuration
  getConfig: () => Promise<any>;
  setConfig: (config: any) => Promise<void>;
  resetConfig: () => Promise<any>;

  // Database operations
  dbSetPath: (path: string, isuri?: boolean, autocommit?: boolean) => Promise<any>;
  dbExecuteQuery: (query: string, params?: any[]) => Promise<any>;
  dbFetchOne: (query: string, params?: any[]) => Promise<any>;
  dbFetchMany: (query: string, size: number, params?: any[]) => Promise<any>;
  dbFetchAll: (query: string, params?: any[]) => Promise<any>;
  dbExecuteMany: (query: string, values: any[]) => Promise<any>;
  dbExecuteScript: (scriptPath: string) => Promise<any>;

  // Workspace operations
  getWorkspacePath: () => Promise<string>;
  resolveWorkspacePath: (relativePath: string) => Promise<string>;
  readWorkspaceFile: (relativePath: string) => Promise<string>;
  writeWorkspaceFile: (relativePath: string, content: string) => Promise<void>;
  workspaceFileExists: (relativePath: string) => Promise<boolean>;
  showWorkspaceDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;

  // Session operations
  getUserDataPath: () => Promise<string>;
  getDocumentsPath: () => Promise<string>;
  getAppPath: () => Promise<string>;

  // Qdrant operations
  qdrantStart: () => Promise<{ success: boolean; error?: string }>;
  qdrantStop: () => Promise<{ success: boolean; error?: string }>;
  qdrantStatus: () => Promise<{ success: boolean; status?: any; error?: string }>;
  qdrantCollections: () => Promise<{ success: boolean; collections?: any[]; error?: string }>;
  qdrantCreateCollection: (name: string, vectorSize: number, distance?: string) => Promise<{ success: boolean; error?: string }>;
  qdrantDeleteCollection: (name: string) => Promise<{ success: boolean; error?: string }>;

  // Knowledge operations
  knowledgeAdd: (item: any, embedding?: number[], provider?: any) => Promise<{ success: boolean; error?: string }>;
  knowledgeSearch: (query: string, provider: any, limit?: number, filters?: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
  knowledgeGet: (id: string) => Promise<{ success: boolean; item?: any; error?: string }>;
  knowledgeUpdate: (id: string, updates: any, provider: any) => Promise<{ success: boolean; error?: string }>;
  knowledgeDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  knowledgeStoreContext: (sessionId: string, messages: any[], provider: any) => Promise<{ success: boolean; error?: string }>;
  knowledgeGetContext: (sessionId: string, query: string, provider: any, limit?: number) => Promise<{ success: boolean; context?: string[]; error?: string }>;
  knowledgeStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  knowledgeClear: () => Promise<{ success: boolean; error?: string }>;

  // Events
  onMenuAction: (callback: (action: string, data?: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // File operations
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  existsFile: (path: string) => ipcRenderer.invoke('fs:existsFile', path),

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
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

