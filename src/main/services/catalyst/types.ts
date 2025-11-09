/**
 * Catalyst Service Types
 *
 * Type definitions for the Catalyst service and related components.
 */

export interface ServiceError extends Error {
  code: string;
  service?: string;
  context?: Record<string, unknown>;
  originalError?: Error;
}

export interface ServiceExecutionContext {
  id: string;
  sessionId?: string;
  userId: string;
  timestamp: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: Record<string, ServiceHealthInfo>;
}

export interface ServiceHealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  error?: string;
  metrics: Record<string, unknown>;
}

export interface ServiceConfig {
  database: {
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
  };
  agents: {
    maxConcurrent: number;
    defaultTimeout: number;
  };
  tools: {
    enabled: boolean;
    timeout: number;
  };
}

export interface CatalystServiceDependencies {
  database: Database;
  toolExecutor: ToolExecutorService;
  agentManager: AgentManagerMain;
  sessionService: SessionService;
  config: ServiceConfigManager;
  loggerFactory: LoggerFactory;
  logger: Logger;
  als: AsyncLocalStorage<ServiceExecutionContext>;
  registry: MainThreadServiceRegistry;
}

// Import placeholder interfaces - these would be properly imported from their respective modules
interface Database {
  fetchOne(query: string, ...args: unknown[]): Promise<unknown>;
  // Add other database methods as needed
}

interface ToolExecutorService {
  getStats(): Record<string, unknown>;
  dispose(): void;
}

interface AgentManagerMain {
  getStats(): Record<string, unknown>;
  dispose(): void;
}

interface SessionService {
  // Add session service methods as needed
}

interface ServiceConfigManager {
  getDatabaseConfig(): ServiceConfig['database'];
  getConfig(): ServiceConfig;
}

interface LoggerFactory {
  getInstance(): LoggerFactory;
  getAsyncLocalStorage(): AsyncLocalStorage<ServiceExecutionContext>;
  createContextAwareLogger(): Logger;
  createContext(sessionId: string, operation: string, metadata: Record<string, unknown>): ServiceExecutionContext;
  runWithContext<T>(context: ServiceExecutionContext, fn: () => Promise<T>): Promise<T>;
}

interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

interface MainThreadServiceRegistry {
  register<T>(name: string, service: T): void;
  get<T>(name: string): T | undefined;
  getStats(): { totalServices: number };
  dispose(): Promise<void>;
}

export interface ServiceStats {
  totalServices: number;
  activeServices: number;
  services: Record<string, unknown>;
}