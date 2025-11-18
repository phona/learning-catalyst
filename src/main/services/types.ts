/**
 * Service-related type definitions
 */

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown, ...args: unknown[]): void;
  child(context: Record<string, unknown>): ILogger;
}

export interface IEventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, listener: (data?: unknown) => void): void;
  off(event: string, listener: (data?: unknown) => void): void;
  once(event: string, listener: (data?: unknown) => void): void;
}

export class ServiceError extends Error {
  public readonly code: string;
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, service: string, originalError?: Error) {
    super(message);
    this.code = code;
    this.service = service;
    this.originalError = originalError;
    
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * Service Dependencies Interface
 */
export interface ServiceDependencies {
  logger: ILogger;
  eventBus?: IEventBus;
}
