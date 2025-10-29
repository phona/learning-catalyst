/**
 * Global type declarations for Electron API
 *
 * This file provides TypeScript definitions for the electronAPI object
 * that is exposed to the renderer process via the preload script.
 *
 * The ElectronAPI interface is now composed of modular, focused interfaces
 * that can be imported individually for better type safety and maintainability.
 */

// Database configuration types (kept here as they're globally relevant)
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

// Import the modular ElectronAPI interface
import type { ElectronAPI } from './electron-api'

// Export the modular ElectronAPI interface
export type { ElectronAPI } from './electron-api'

// Also export individual interfaces for convenience
export type {
  FileAPI,
  DialogAPI,
  AppAPI,
  ConfigAPI,
  DatabaseAPI,
  WorkspaceAPI,
  SessionAPI,
  QdrantAPI,
  KnowledgeAPI,
  EventsAPI
} from './electron-api'

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};