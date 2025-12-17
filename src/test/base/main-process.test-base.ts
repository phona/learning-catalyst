/**
 * Main Process Test Base Classes
 *
 * Provides reusable base classes and utilities for main process testing
 * with standardized setup, teardown, and common mocking patterns.
 */

import { vi, beforeEach, afterEach, expect, type MockInstance } from 'vitest';
import type { Kysely } from 'kysely';
import type { AsyncLocalStorage } from 'async_hooks';
import type { Database } from '../../main/services/core/database/kysely-schema';

// Interface for mock functions with reset capability
interface MockWithReset {
  mockReset(): void;
}

/**
 * Mock Service Suite for common service dependencies
 */
export interface ServiceMockSuite {
  database: Kysely<Database>;
  logger: any;
  asyncLocalStorage: any;
  config: unknown;
}

/**
 * Performance monitoring for test operations
 */
export class PerformanceMonitor {
  private readonly measurements: Map<string, number[]> = new Map();
  private readonly startTimes: Map<string, number> = new Map();

  start(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  end(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      throw new Error(`Performance monitor for operation "${operation}" was not started`);
    }

    const duration = performance.now() - startTime;
    const measurements = this.measurements.get(operation) || [];
    measurements.push(duration);
    this.measurements.set(operation, measurements);
    this.startTimes.delete(operation);

    return duration;
  }

  getMetrics(): Record<string, { count: number; average: number; min: number; max: number }> {
    const metrics: Record<string, { count: number; average: number; min: number; max: number }> =
      {};

    for (const [operation, times] of this.measurements.entries()) {
      const count = times.length;
      const average = times.reduce((sum, time) => sum + time, 0) / count;
      const min = Math.min(...times);
      const max = Math.max(...times);

      metrics[operation] = { count, average, min, max };
    }

    return metrics;
  }

  expectAverageUnder(operation: string, thresholdMs: number): void {
    const metrics = this.getMetrics()[operation];
    if (!metrics) {
      throw new Error(`No metrics found for operation "${operation}"`);
    }

    expect(metrics.average).toBeLessThan(thresholdMs);
  }

  reset(): void {
    this.measurements.clear();
    this.startTimes.clear();
  }
}

/**
 * Base test class for main process tests
 */
export abstract class MainProcessTestBase {
  protected mockServices: ServiceMockSuite;
  protected performanceMonitor: PerformanceMonitor;
  protected originalEnv: NodeJS.ProcessEnv;
  protected mockInstances: MockInstance[] = [];

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.originalEnv = { ...process.env };
    this.mockServices = this.createMockServices();
  }

  /**
   * Setup method called before each test
   */
  protected setupTest(): void {
    vi.clearAllMocks();
    this.performanceMonitor.reset();
    this.setupStandardMocks();
    this.mockInstances.forEach((mock) => mock.mockClear());
  }

  /**
   * Cleanup method called after each test
   */
  protected cleanupTest(): void {
    vi.restoreAllMocks();
    this.restoreEnvironment();
    this.performanceMonitor.reset();
  }

  /**
   * Create standard mock services
   */
  protected createMockServices(): ServiceMockSuite {
    return {
      database: this.createMockDatabase(),
      logger: this.createMockLogger(),
      asyncLocalStorage: this.createMockAsyncLocalStorage(),
      config: this.createMockConfig(),
    };
  }

  /**
   * Create comprehensive database mock
   */
  protected createMockDatabase(): Kysely<Database> {
    const mockDb = {
      selectFrom: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
      executeTakeFirst: vi.fn().mockResolvedValue(null),
      executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null),
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      returningAll: vi.fn().mockReturnThis(),
      updateTable: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      deleteFrom: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockReturnValue({
        execute: vi.fn().mockImplementation(async (fn) => {
          return fn(mockDb);
        }),
      }),
      connected: true,
      _simulateConnectionFailure: () => {
        mockDb.connected = false;
        mockDb.execute.mockRejectedValue(new Error('Database connection failed'));
      },
      _resetMocks: () => {
        Object.values(mockDb).forEach((value) => {
          if (typeof value === 'function' && isMockWithReset(value)) {
            value.mockReset();
          }
        });
        mockDb.connected = true;
      },
    } as any;

    return mockDb;
  }

  /**
   * Create mock logger with comprehensive tracking
   */
  protected createMockLogger(): any {
    const logger = {
      info: vi.fn().mockReturnValue(undefined),
      error: vi.fn().mockReturnValue(undefined),
      warn: vi.fn().mockReturnValue(undefined),
      debug: vi.fn().mockReturnValue(undefined),
      trace: vi.fn().mockReturnValue(undefined),
      child: vi.fn().mockReturnThis(),
      getLogEntries: () => ({
        info: logger.info.mock.calls,
        error: logger.error.mock.calls,
        warn: logger.warn.mock.calls,
        debug: logger.debug.mock.calls,
        trace: logger.trace.mock.calls,
      }),
      reset: () => {
        Object.values(logger).forEach((value) => {
          if (typeof value === 'function' && isMockWithReset(value)) {
            value.mockReset();
          }
        });
      },
    };

    return logger;
  }

  /**
   * Create mock AsyncLocalStorage
   */
  protected createMockAsyncLocalStorage(): any {
    const store = new Map();
    const mockAls = {
      getStore: vi.fn().mockReturnValue(store),
      run: vi.fn().mockImplementation((store, callback) => {
        return callback();
      }),
      enterWith: vi.fn(),
      exit: vi.fn(),
      disable: vi.fn(),
      get: vi.fn().mockImplementation((key) => store.get(key)),
      set: vi.fn().mockImplementation((key, value) => store.set(key, value)),
    };

    return mockAls;
  }

  /**
   * Create mock configuration service
   */
  protected createMockConfig(): any {
    return {
      get: vi.fn().mockReturnValue('mock-value'),
      set: vi.fn(),
      getConfig: vi.fn().mockReturnValue({
        database: { path: ':memory:' },
        services: { timeout: 30000 },
        logging: { level: 'info' },
      }),
      getDatabaseConfig: vi.fn().mockReturnValue({
        path: ':memory:',
        maxConnections: 10,
      }),
    };
  }

  /**
   * Setup standard mocks for common operations
   */
  protected setupStandardMocks(): void {
    // Mock console methods to reduce noise during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process.env for test isolation
    process.env.NODE_ENV = 'test';
  }

  /**
   * Restore environment variables
   */
  protected restoreEnvironment(): void {
    process.env = this.originalEnv;
  }

  /**
   * Helper to create mock function with performance tracking
   */
  protected createTrackedMock<T extends (...args: unknown[]) => any>(
    name: string,
    implementation?: T,
  ): T & MockInstance {
    const mock = vi.fn().mockImplementation(implementation || (() => {}));

    const trackedMock = vi.fn().mockImplementation(async (...args: Parameters<T>) => {
      this.performanceMonitor.start(name);
      try {
        const result = await mock(...args);
        this.performanceMonitor.end(name);
        return result;
      } catch (error) {
        this.performanceMonitor.end(name);
        throw error;
      }
    }) as unknown as T & MockInstance;

    this.mockInstances.push(trackedMock);
    return trackedMock;
  }

  /**
   * Wait for async operations to complete
   */
  protected async waitForAsyncOperations(timeoutMs = 100): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  /**
   * Assert performance expectations
   */
  protected expectPerformance(operation: string, thresholdMs: number): void {
    this.performanceMonitor.expectAverageUnder(operation, thresholdMs);
  }
}

/**
 * Base class for AI service tests
 */
export abstract class AIServiceTestBase extends MainProcessTestBase {
  protected mockLangChainProviders: Map<string, any>;

  constructor() {
    super();
    this.mockLangChainProviders = new Map();
    this.setupLangChainMocks();
  }

  /**
   * Setup LangChain provider mocks
   */
  private setupLangChainMocks(): void {
    const providers = ['openai', 'anthropic', 'chatglm'];

    providers.forEach((provider) => {
      this.mockLangChainProviders.set(provider, {
        config: {
          modelName: provider === 'openai' ? 'gpt-3.5-turbo' : `${provider}-model`,
          temperature: 0.7,
          maxTokens: 2000,
        },
        invoke: vi.fn().mockResolvedValue({
          content: `Mock ${provider} response`,
          metadata: { model: `${provider}-model` },
        }),
        stream: vi.fn().mockImplementation(function* () {
          yield { content: `Mock `, metadata: {} };
          yield { content: `${provider} `, metadata: {} };
          yield { content: `response`, metadata: {} };
        }),
      });
    });
  }

  /**
   * Get mock provider for testing
   */
  protected getMockProvider(provider: string): any {
    return this.mockLangChainProviders.get(provider);
  }

  /**
   * Setup AI service specific mocks
   */
  protected setupAIServiceMocks(): void {
    super.setupTest();

    // Mock LangChain imports
    vi.mock('@langchain/openai', () => ({
      ChatOpenAI: vi.fn().mockImplementation(() => this.getMockProvider('openai')),
    }));

    vi.mock('@langchain/anthropic', () => ({
      ChatAnthropic: vi.fn().mockImplementation(() => this.getMockProvider('anthropic')),
    }));
  }
}

// Type guard function to check if object has mockReset method
function isMockWithReset(value: unknown): value is MockWithReset {
  return (
    typeof value === 'function' &&
    value !== null &&
    'mockReset' in value &&
    typeof (value as Record<string, unknown>).mockReset === 'function'
  );
}
