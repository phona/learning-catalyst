/**
 * Main Thread Service Logger
 *
 * Provides structured logging for main thread services with context preservation
 * using AsyncLocalStorage for request tracking across async operations.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { ServiceLogger } from './types';

// Define ServiceExecutionContext locally since it's not exported from types
export interface ServiceExecutionContext {
  id?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  operation?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Simple console-based logger implementation for main thread services
 */
export class MainThreadLogger implements ServiceLogger {
  private readonly context: Record<string, any>;

  constructor(
    private readonly level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    private readonly enableConsole: boolean = true,
    private readonly maxLogSize: number = 1000,
    context: Record<string, any> = {},
  ) {
    this.context = { ...context };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): ServiceLogger {
    return new MainThreadLogger(this.level, this.enableConsole, this.maxLogSize, {
      ...this.context,
      ...context,
    });
  }

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: string, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const allMeta = { ...this.context, ...meta };
    const metaString = Object.keys(allMeta).length > 0 ? ` ${JSON.stringify(allMeta)}` : '';

    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  }

  /**
   * Check if the given log level should be logged
   */
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('debug') || !this.enableConsole) return;
    console.debug(this.formatMessage('debug', message, meta));
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('info') || !this.enableConsole) return;
    console.info(this.formatMessage('info', message, meta));
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('warn') || !this.enableConsole) return;
    console.warn(this.formatMessage('warn', message, meta));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    if (!this.shouldLog('error') || !this.enableConsole) return;

    const errorMeta = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          },
        }
      : {};

    const allMeta = { ...meta, ...errorMeta };
    console.error(this.formatMessage('error', message, allMeta));
  }
}

/**
 * AsyncLocalStorage-aware logger that automatically includes execution context
 */
export class ContextAwareLogger implements ServiceLogger {
  constructor(
    private readonly als: AsyncLocalStorage<ServiceExecutionContext>,
    private readonly baseLogger: ServiceLogger,
  ) {}

  /**
   * Get current execution context from AsyncLocalStorage
   */
  private getCurrentContext(): Record<string, any> {
    const context = this.als.getStore();
    if (!context) return {};

    return {
      executionId: context.id,
      sessionId: context.sessionId,
      userId: context.userId,
      requestId: context.requestId,
      operation: context.operation,
      timestamp: context.timestamp,
    };
  }

  /**
   * Create a child logger with current context
   */
  private getLoggerWithContext(): ServiceLogger {
    const context = this.getCurrentContext();
    return this.baseLogger.child(context);
  }

  child(context: Record<string, any>): ServiceLogger {
    const currentContext = this.getCurrentContext();
    const combinedContext = { ...currentContext, ...context };
    return this.baseLogger.child(combinedContext);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.getLoggerWithContext().debug(message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.getLoggerWithContext().info(message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.getLoggerWithContext().warn(message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.getLoggerWithContext().error(message, error, meta);
  }
}

/**
 * Logger factory for creating loggers with proper configuration
 */
export class LoggerFactory {
  private readonly als: AsyncLocalStorage<ServiceExecutionContext>;

  constructor() {
    this.als = new AsyncLocalStorage<ServiceExecutionContext>();
  }

  /**
   * Get AsyncLocalStorage instance for context tracking
   */
  getAsyncLocalStorage(): AsyncLocalStorage<ServiceExecutionContext> {
    return this.als;
  }

  /**
   * Create a base logger
   */
  createLogger(config?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    enableConsole?: boolean;
    maxLogSize?: number;
    context?: Record<string, any>;
  }): ServiceLogger {
    const { level = 'info', enableConsole = true, maxLogSize = 1000, context = {} } = config || {};

    return new MainThreadLogger(level, enableConsole, maxLogSize, context);
  }

  /**
   * Create a context-aware logger
   */
  createContextAwareLogger(baseLogger?: ServiceLogger): ServiceLogger {
    const logger = baseLogger || this.createLogger();
    return new ContextAwareLogger(this.als, logger);
  }

  /**
   * Run a function within an execution context
   */
  async runWithContext<T>(context: ServiceExecutionContext, fn: () => Promise<T>): Promise<T> {
    return this.als.run(context, fn);
  }

  /**
   * Get current execution context
   */
  getCurrentContext(): ServiceExecutionContext | undefined {
    return this.als.getStore();
  }

  /**
   * Create a new execution context
   */
  createContext(
    sessionId: string,
    operation: string,
    metadata: Record<string, any> = {},
  ): ServiceExecutionContext {
    return {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      operation,
      metadata,
    };
  }
}
