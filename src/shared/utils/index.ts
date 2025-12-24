/**
 * Shared Utilities Index
 *
 * Centralized exports for all shared utilities across the Learning Catalyst application.
 * Provides a clean import interface for performance optimization, type safety,
 * and common patterns used throughout the application.
 */

// Performance Optimization Utilities
export {
  LRUCache,
  PromiseCache,
  PerformanceMonitor,
  WeakReference,
  MemoryPool,
  Debounced,
  Throttled,
  memoizeAsync,
  EventBatcher,
  OptimizedScrollHandler,
} from './performance-utils';

// Performance Monitoring
export {
  createAppPerformanceMonitor,
  appPerformanceMonitor,
  type PerformanceTrend,
  type PerformanceBottleneck,
  type MemoryStats,
} from './performance-monitor';


// Test Utilities (Time & ID generation for DI)
export {
  createTimeService,
  createFixedTimeService,
  createIncrementalTimeService,
  type TimeService,
} from './time-service';

export {
  createIdGenerator,
  createSequentialIdGenerator,
  createFixedIdGenerator,
  createArrayIdGenerator,
  type IDGenerator,
} from './id-generator';

// Type Utilities
export {
  createServiceClient,
  ServiceMethodError,
  createTypeGuard,
  createUnionGuard,
  createIntersectionGuard,
  brand,
  isBranded,
  createTimeoutPromise,
  withTimeout,
  retryAsync,
  createTypedEventEmitter,
  createTypeSafeCache,
  createPerformanceMonitor,
  type ExtractPromiseType,
  type ExtractArrayElement,
  type ServiceMethod,
  type ServiceReturn,
  type ServiceParams,
  type DeepPartial,
  type DeepRequired,
  type Branded,
  type ID,
  type Email,
  type URL,
  type Timestamp,
  type Percentage,
  type TypedEventEmitter,
  type CacheEntry,
  type TypeSafeCache,
  type PerformanceMetrics,
} from './type-utils';

// IPC Types
export type {
  IPCRequest,
  IPCResponse,
  ServiceError,
  IPCHandler,
  BatchIPCRequest,
  BatchIPCResponse,
  StreamingIPCRequest,
  IPCEvent,
  RequestContext,
  ContextualIPCRequest,
  ResponseMetadata,
  IPCServiceRegistry,
  RegistryStats,
  IPCEventEmitter,
  IPCChannelConfig,
  IPCChannelOptions,
  RateLimitOptions,
  IPCMiddleware,
  ServiceHealthCheck,
  ValidationOptions,
  IPCHandlerOptions,
  StreamOptions,
} from '../types/ipc/base-types';

// IPC Utility Functions
export {
  isSuccessResponse,
  isErrorResponse,
  createSuccessResponse,
  createErrorResponse,
  createServiceError,
} from '../types/ipc/base-types';

// Deprecated knowledge-graph utilities removed
