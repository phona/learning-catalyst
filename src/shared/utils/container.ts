/**
 * Pure Service Interfaces
 *
 * Pure TypeScript interfaces that can be used across processes.
 * No implementation details or process-specific imports.
 */

// Export only pure interfaces and types that are safe for shared use
export type {
  ServiceMethodError
} from './type-utils';

// Pure interface for renderer service discovery
export interface RendererServiceInterface {
  // This will be implemented by renderer services
  name: string;
  version: string;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

// Generic service interface for cross-process communication
export interface ProcessService<T = any> {
  name: string;
  execute(method: string, params?: any): Promise<T>;
  isAvailable(): boolean;
}

// Pure dependency injection interface
export interface ServiceDependency<T> {
  name: string;
  factory: () => T;
  singleton?: boolean;
}

// Service configuration interface
export interface ServiceConfig {
  enableService: boolean;
  timeout?: number;
  retryCount?: number;
  maxMemoryMB?: number;
}