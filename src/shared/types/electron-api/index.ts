/**
 * Electron API Interfaces
 *
 * This module provides modular, focused interfaces for Electron IPC operations.
 * Each interface represents a specific functional area of the Electron API.
 *
 * The main ElectronAPI interface extends all individual interfaces to maintain
 * backward compatibility while providing better type safety and modularity.
 */

// Import individual API interfaces
import type { FileAPI } from './file-api'
import type { DialogAPI } from './dialog-api'
import type { AppAPI } from './app-api'
import type { ConfigAPI } from './config-api'
import type { DatabaseAPI } from './database-api'
import type { WorkspaceAPI } from './workspace-api'
import type { SessionAPI } from './session-api'
import type { QdrantAPI } from './qdrant-api'
import type { KnowledgeAPI } from './knowledge-api'
import type { EventsAPI } from './events-api'
import type { AgentAPI } from './agent-api'
import type { CatalystAPI } from './catalyst-api'

// Re-export individual API interfaces
export type { FileAPI, DialogAPI, AppAPI, ConfigAPI, DatabaseAPI, WorkspaceAPI, SessionAPI, QdrantAPI, KnowledgeAPI, EventsAPI, AgentAPI, CatalystAPI }

/**
 * Main ElectronAPI interface
 *
 * This composite interface extends all individual API interfaces to provide
 * a unified interface that maintains backward compatibility with existing code.
 *
 * Services can either:
 * 1. Use the full ElectronAPI interface (backward compatible)
 * 2. Import and use specific interfaces for better type safety
 */
export interface ElectronAPI extends
  FileAPI,
  DialogAPI,
  AppAPI,
  ConfigAPI,
  DatabaseAPI,
  WorkspaceAPI,
  SessionAPI,
  QdrantAPI,
  KnowledgeAPI,
  EventsAPI,
  AgentAPI,
  CatalystAPI {}

/**
 * Type helpers for dependency injection and testing
 */

/**
 * Create a partial ElectronAPI for testing or mocking
 */
export type PartialElectronAPI<T extends keyof ElectronAPI> = Pick<ElectronAPI, T>

/**
 * Helper type for creating API mocks
 */
export type ElectronAPIMock = Partial<ElectronAPI>

/**
 * Utility type for extracting specific API functionality
 */
export type ExtractAPI<T> = T extends keyof ElectronAPI
  ? Pick<ElectronAPI, T>
  : never