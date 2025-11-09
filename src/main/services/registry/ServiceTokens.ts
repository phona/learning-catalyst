import { ServiceToken } from './ServiceToken';
import type { IConfigService } from '../config/interfaces';

// Forward declarations for service interfaces
interface IAgentManager {
  createAgent(config: unknown): Promise<unknown>;
  getAgent(id: string): Promise<unknown>;
  listAgents(): Promise<unknown[]>;
}

interface IDatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface ICatalystServiceMain {
  sendChat(request: unknown): Promise<unknown>;
  getAvailableAgents(): Promise<unknown[]>;
}

/**
 * Service tokens for main process dependency injection
 * Provides type-safe service identification and registration
 */
export const MAIN_SERVICE_TOKENS = {
  // Configuration services
  CONFIG_STORAGE: ServiceToken.create<IConfigStorage>('ConfigStorage', 'Configuration storage abstraction'),
  CONFIG_SERVICE: ServiceToken.create<IConfigService>('ConfigService', 'Configuration management service'),

  // Core services
  AGENT_MANAGER: ServiceToken.create<IAgentManager>('AgentManager', 'Multi-agent system management'),
  DATABASE_SERVICE: ServiceToken.create<IDatabaseService>('DatabaseService', 'Database connection and operations'),
  CATALYST_SERVICE: ServiceToken.create<ICatalystServiceMain>('CatalystService', 'AI orchestration service'),

  // Utility services
  LOGGER: ServiceToken.create<ILogger>('Logger', 'Application logging service'),
  EVENT_BUS: ServiceToken.create<IEventBus>('EventBus', 'Application event system'),
} as const;

/**
 * Logger service interface
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;
}

/**
 * Event bus service interface
 */
export interface IEventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, listener: (data?: unknown) => void): void;
  off(event: string, listener: (data?: unknown) => void): void;
  once(event: string, listener: (data?: unknown) => void): void;
}

/**
 * Configuration storage interface (imported from interfaces.ts)
 */
export interface IConfigStorage {
  loadConfig(): Promise<unknown>;
  saveConfig(config: unknown): Promise<void>;
  hasConfig(): Promise<boolean>;
}

/**
 * Configuration service interface (basic version for token definition)
 */
export interface IConfigService {
  getConfig(): Promise<unknown>;
  setConfig(config: unknown): Promise<void>;
  getProviderConfig(name: string): Promise<unknown>;
  setProviderConfig(name: string, config: unknown): Promise<void>;
}