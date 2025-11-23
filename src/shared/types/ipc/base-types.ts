/**
 * Base IPC Types for Type-Safe Communication
 *
 * Provides foundational types for IPC communication between main and renderer processes.
 * Ensures type safety and consistency across all IPC operations.
 */

/**
 * Generic IPC request with type safety and metadata
 */
export interface IPCRequest<T = any> {
  id: string;
  method: string;
  params: T;
  timestamp: number;
  requestId?: string;
  timeout?: number;
}

/**
 * Generic IPC response with comprehensive error handling
 */
export interface IPCResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: ServiceError;
  timestamp: number;
  processingTime?: number;
  metadata?: ResponseMetadata;
}

/**
 * Response metadata for debugging and monitoring
 */
export interface ResponseMetadata {
  timestamp: string;
  processingTime: number;
  requestId: string;
  service?: string;
  version?: string;
  environment?: 'development' | 'production' | 'test';
}

/**
 * Standardized service error structure
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  stack?: string; // Only in development
  timestamp?: string;
  requestId?: string;
}

/**
 * Type-safe IPC handler function signature
 */
export type IPCHandler<TParams = any, TResult = any> = (
  request: IPCRequest<TParams>,
) => Promise<IPCResponse<TResult>>;

/**
 * IPC handler configuration options
 */
export interface IPCHandlerOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  logging?: boolean;
  validation?: ValidationOptions;
}

/**
 * Request validation options
 */
export interface ValidationOptions {
  validateParams?: boolean;
  sanitizeParams?: boolean;
  maxRequestSize?: number;
  allowedMethods?: string[];
}

/**
 * Batch IPC request for multiple operations
 */
export interface BatchIPCRequest<T = any> {
  requests: Array<{
    id: string;
    method: string;
    params: T;
  }>;
  executeInParallel?: boolean;
  failFast?: boolean;
}

/**
 * Batch IPC response
 */
export interface BatchIPCResponse<T = any> {
  responses: Array<IPCResponse<T>>;
  errors: ServiceError[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalProcessingTime: number;
  };
}

/**
 * Streaming IPC request for real-time data
 */
export interface StreamingIPCRequest<T = any> extends IPCRequest<T> {
  stream?: boolean;
  streamOptions?: StreamOptions;
}

/**
 * Streaming options for real-time communication
 */
export interface StreamOptions {
  chunkSize?: number;
  timeout?: number;
  heartbeat?: boolean;
  heartbeatInterval?: number;
  compression?: boolean;
}

/**
 * IPC event for push-based communication
 */
export interface IPCEvent<T = any> {
  id: string;
  event: string;
  data: T;
  timestamp: number;
  source: string;
  target?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * IPC channel configuration
 */
export interface IPCChannelConfig {
  name: string;
  handlers: Map<string, IPCHandler>;
  middleware?: IPCMiddleware[];
  options?: IPCChannelOptions;
}

/**
 * IPC channel options
 */
export interface IPCChannelOptions {
  timeout?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  maxConcurrentRequests?: number;
  rateLimit?: RateLimitOptions;
}

/**
 * Rate limiting options
 */
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * IPC middleware for cross-cutting concerns
 */
export interface IPCMiddleware {
  name: string;
  before?: (request: IPCRequest) => Promise<IPCRequest>;
  after?: (response: IPCResponse) => Promise<IPCResponse>;
  onError?: (error: Error, request: IPCRequest) => Promise<IPCResponse>;
}

/**
 * Service health check response
 */
export interface ServiceHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  uptime: number;
  version: string;
  details?: {
    memoryUsage?: number;
    cpuUsage?: number;
    activeConnections?: number;
    errorRate?: number;
  };
}

/**
 * Type-safe service registry interface
 */
export interface IPCServiceRegistry {
  register<TParams, TResult>(
    method: string,
    handler: IPCHandler<TParams, TResult>,
    options?: IPCHandlerOptions,
  ): void;

  unregister(method: string): void;

  has(method: string): boolean;

  get<TParams, TResult>(method: string): IPCHandler<TParams, TResult> | undefined;

  list(): string[];

  getStats(): RegistryStats;
}

/**
 * Service registry statistics
 */
export interface RegistryStats {
  totalHandlers: number;
  registeredHandlers: string[];
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastActivity: string;
}

// Utility types for better type inference
export type ExtractParams<T> = T extends IPCHandler<infer P, any> ? P : never;
export type ExtractResult<T> = T extends IPCHandler<any, infer R> ? R : never;
export type ExtractMethod<T> = T extends IPCHandler<any, any> ? string : never;

/**
 * Type-safe event emitter for IPC events
 */
export interface IPCEventEmitter<TEvents extends Record<string, any>> {
  on<TKey extends keyof TEvents>(event: TKey, listener: (data: TEvents[TKey]) => void): void;

  off<TKey extends keyof TEvents>(event: TKey, listener: (data: TEvents[TKey]) => void): void;

  emit<TKey extends keyof TEvents>(event: TKey, data: TEvents[TKey]): void;

  once<TKey extends keyof TEvents>(event: TKey, listener: (data: TEvents[TKey]) => void): void;
}

/**
 * Request context for tracing and debugging
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced IPC request with context
 */
export interface ContextualIPCRequest<T = any> extends IPCRequest<T> {
  context: RequestContext;
}

/**
 * Type guard for checking IPC responses
 */
export function isSuccessResponse<T>(
  response: IPCResponse<T>,
): response is IPCResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard for checking error responses
 */
export function isErrorResponse<T>(
  response: IPCResponse<T>,
): response is IPCResponse<T> & { success: false; error: ServiceError } {
  return response.success === false && response.error !== undefined;
}

/**
 * Create a standard success response
 */
export function createSuccessResponse<T>(
  id: string,
  data: T,
  metadata?: Partial<ResponseMetadata>,
): IPCResponse<T> {
  return {
    id,
    success: true,
    data,
    timestamp: Date.now(),
    metadata: {
      timestamp: new Date().toISOString(),
      processingTime: 0,
      requestId: id,
      ...metadata,
    },
  };
}

/**
 * Create a standard error response
 */
export function createErrorResponse<T>(
  id: string,
  error: ServiceError,
  metadata?: Partial<ResponseMetadata>,
): IPCResponse<T> {
  return {
    id,
    success: false,
    error,
    timestamp: Date.now(),
    metadata: {
      timestamp: new Date().toISOString(),
      processingTime: 0,
      requestId: id,
      ...metadata,
    },
  };
}

/**
 * Create a service error
 */
export function createServiceError(code: string, message: string, details?: any): ServiceError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}
