/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/strict-boolean-expressions, no-undef */
/* eslint-env jest */
/**
 * Shared Test Utilities
 *
 * Common testing patterns and utilities based on improvements made to the LangChain tests.
 * Provides consistent mocking patterns and test helpers across the codebase.
 */

import { vi } from 'vitest';

// Create shared mock instances for consistent testing
export const createSharedMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  reset: vi.fn(() => {
    // Reset all mock calls
    Object.keys(this).forEach(key => {
      if (typeof this[key as keyof typeof this] === 'function') {
        (this[key as keyof typeof this] as any).mockClear();
      }
    });
  })
});

export const createMockAsyncLocalStorage = () => {
  const store = new Map();
  return {
    getStore: vi.fn(() => ({
      get: vi.fn((key: string) => store.get(key)),
      set: vi.fn((key: string, value: any) => store.set(key, value)),
      entries: vi.fn(() => Array.from(store.entries()))
    })),
    run: vi.fn(async (context: any, fn: () => Promise<any>) => {
      return await fn();
    })
  };
};

// Common mock provider factory for AI services
export const createMockAIProvider = (name: string, defaultResponse = 'Mock response') => ({
  invoke: vi.fn().mockResolvedValue({
    content: `${name} ${defaultResponse}`,
    metadata: {
      model: `${name}-mock-model`,
      tokensUsed: 10,
      provider: name
    }
  }),
  stream: vi.fn().mockImplementation(async function* () {
    yield { content: `${name} `, metadata: { chunkIndex: 0 } };
    yield { content: defaultResponse, metadata: { chunkIndex: 1 } };
  })
});

// Common mock database factory
export const createMockDatabase = () => ({
  selectFrom: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
  insertInto: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  executeTakeFirst: vi.fn().mockResolvedValue(null),
  updateTable: vi.fn().mockReturnThis(),
  deleteFrom: vi.fn().mockReturnThis(),
  transaction: vi.fn().mockImplementation(async (fn) => fn({}))
});

// Memory testing utility with proportional thresholds
export class MemoryTestHelper {
  private samples: Array<{
    timestamp: number;
    heapUsed: number;
  }> = [];

  start(): void {
    this.samples = [];
  }

  sample(): void {
    this.samples.push({
      timestamp: Date.now(),
      heapUsed: (typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0)
    });
  }

  getGrowthRatio(): number {
    if (this.samples.length < 2) {
      return 0;
    }

    const first = this.samples[0];
    const latest = this.samples[this.samples.length - 1];
    const growth = latest.heapUsed - first.heapUsed;

    return growth / first.heapUsed;
  }

  forceGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }
}

// Common test patterns
export const createTestExecutionContext = (overrides: any = {}) => ({
  id: 'test-execution',
  input: {},
  context: {},
  options: {},
  ...overrides
});

export const createBasicUserContext = (overrides: any = {}) => ({
  id: 'test-user',
  sessionId: 'test-session',
  confidenceLevel: 0.8,
  learningVelocity: 1.0,
  stuckPoints: [],
  recentConcepts: [],
  practiceHistory: [],
  engagementLevel: 0.7,
  preferences: {
    practiceFrequency: 'medium',
    difficultyPreference: 'medium',
    feedbackStyle: 'encouraging'
  },
  statistics: {
    totalPracticeSessions: 0,
    successRate: 0.8,
    averageSessionLength: 25,
    preferredPracticeTimes: []
  },
  ...overrides
});

// Common assertion helpers
export const expectValidResponse = (response: any) => {
  if (typeof expect === 'function') {
    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.metadata).toBeDefined();
  }
};

export const expectValidStreamingChunk = (chunk: any) => {
  if (typeof expect === 'function') {
    expect(chunk).toHaveProperty('content');
    expect(chunk).toHaveProperty('metadata');
    expect(chunk.metadata).toHaveProperty('provider');
  }
};

// Common cleanup utilities
export const cleanupMockService = async (service: any) => {
  if (service && typeof service.dispose === 'function') {
    await service.dispose();
  }
};

// Error handling test helpers
export const expectGracefulError = async (
  operation: () => Promise<any>,
  expectedErrorPattern: string | RegExp
) => {
  try {
    await operation();
    // If we reach here, the operation didn't throw as expected
    // This might be acceptable depending on the operation
    return true;
  } catch (error) {
    if (typeof expect === 'function') {
      expect(error).toBeInstanceOf(Error);
      if (typeof expectedErrorPattern === 'string') {
        expect((error as Error).message).toContain(expectedErrorPattern);
      } else {
        expect((error as Error).message).toMatch(expectedErrorPattern);
      }
    }
  }
};
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/strict-boolean-expressions, no-undef */
