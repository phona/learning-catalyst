/**
 * Main Process Test Setup
 *
 * Global setup for main process tests including mock initialization,
 * performance monitoring, and test environment configuration.
 */

import { vi } from 'vitest'

// Global test utilities
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeValidAgentTransition(expected: string): T
      toMeetPerformanceThreshold(thresholdMs: number): T
      toBeWithinMemoryRange(minMB: number, maxMB: number): T
    }
  }
}

// Mock console methods to reduce noise in tests
Object.defineProperty(console, 'log', {
  value: vi.fn(() => {}),
  writable: true
})

Object.defineProperty(console, 'warn', {
  value: vi.fn(() => {}),
  writable: true
})

Object.defineProperty(console, 'error', {
  value: vi.fn(() => {}),
  writable: true
})

// Set test environment
process.env.NODE_ENV = 'test'
process.env.VITEST = 'true'

// Global cleanup
afterEach(() => {
  vi.clearAllMocks()
})