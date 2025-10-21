/**
 * Global type declarations for Electron API
 * This file provides TypeScript definitions for the electronAPI object
 * that is exposed to the renderer process via the preload script
 */

export interface DatabaseConfig {
  filePath?: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  pageSize?: number;
  cacheSize?: number;
  tempStore?: 'default' | 'file' | 'memory';
}

export interface DatabaseStats {
  pages: any;
  tables: any[];
  connected: boolean;
}

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};