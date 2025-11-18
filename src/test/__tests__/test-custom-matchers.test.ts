/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable no-undef */

/**
 * Test Custom Matchers
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Import custom matchers
import '../matchers/agent-lifecycle.matchers'

describe('Custom Matchers', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('toBeValidAgentTransition', () => {
    it('should validate valid state transitions', () => {
      const validTransitions = [
        { from: 'inactive', to: 'active' },
        { from: 'active', to: 'inactive' },
        { from: 'active', to: 'error' },
        { from: 'error', to: 'inactive' },
        { from: 'inactive', to: 'deleted' }
      ]

      validTransitions.forEach(transition => {
        expect(transition).toBeValidAgentTransition()
      })
    })

    it('should reject invalid state transitions', () => {
      const invalidTransitions = [
        { from: 'active', to: 'active' }, // Same state
        { from: 'inactive', to: 'error' }, // Invalid transition
        { from: 'error', to: 'active' }, // Requires recovery first
        { from: 'deleted', to: 'active' } // Terminal state
      ]

      invalidTransitions.forEach(transition => {
        expect(() => {
          expect(transition).toBeValidAgentTransition()
        }).toThrow()
      })
    })
  })

  describe('toMeetPerformanceThreshold', () => {
    it('should pass when operation is within threshold', () => {
      const fastOperation = { duration: 50, operation: 'test' }
      expect(fastOperation).toMeetPerformanceThreshold(100)
    })

    it('should fail when operation exceeds threshold', () => {
      const slowOperation = { duration: 200, operation: 'test' }
      expect(() => {
        expect(slowOperation).toMeetPerformanceThreshold(100)
      }).toThrow()
    })
  })

  describe('toBeWithinMemoryRange', () => {
    it('should pass when memory usage is within range', () => {
      const normalMemory = 50 * 1024 * 1024 // 50MB
      expect(normalMemory).toBeWithinMemoryRange(10, 100) // 10-100MB range
    })

    it('should fail when memory usage exceeds range', () => {
      const highMemory = 200 * 1024 * 1024 // 200MB
      expect(() => {
        expect(highMemory).toBeWithinMemoryRange(10, 100) // 10-100MB range
      }).toThrow()
    })

    it('should fail when memory usage is below range', () => {
      const lowMemory = 5 * 1024 * 1024 // 5MB
      expect(() => {
        expect(lowMemory).toBeWithinMemoryRange(10, 100) // 10-100MB range
      }).toThrow()
    })
  })

  describe('toBeValidAgentConfiguration', () => {
    it('should validate correct agent configuration', () => {
      const validConfig = {
        type: 'learning',
        name: 'Test Agent',
        description: 'A test agent',
        systemPrompt: 'You are a helpful assistant.',
        tools: ['tool1', 'tool2'],
        capabilities: ['capability1'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        }
      }

      expect(validConfig).toBeValidAgentConfiguration()
    })

    it('should reject invalid agent configuration', () => {
      const invalidConfigs = [
        { name: '', type: 'learning' }, // Empty name
        { name: 'Test', type: 'learning', systemPrompt: '' }, // Empty system prompt
        { name: 'Test', type: 'learning', modelConfig: { provider: '', model: 'gpt-4' } }, // Empty provider
        { name: 'Test', type: 'learning', modelConfig: { provider: 'openai', model: '', temperature: 0.7 } }, // Empty model
        { name: 'Test', type: 'learning', modelConfig: { provider: 'openai', model: 'gpt-4', temperature: 3.0 } } // Invalid temperature
      ]

      invalidConfigs.forEach(config => {
        expect(() => {
          expect(config).toBeValidAgentConfiguration()
        }).toThrow()
      })
    })
  })

  describe('toBeValidLifecycleEvent', () => {
    it('should validate correct lifecycle event', () => {
      const validEvent = {
        agentId: 'agent-123',
        event: 'activated',
        timestamp: Date.now(),
        metadata: {
          reason: 'user_request',
          duration: 1500
        }
      }

      expect(validEvent).toBeValidLifecycleEvent()
    })

    it('should reject invalid lifecycle events', () => {
      const invalidEvents = [
        { event: 'activated', timestamp: Date.now() }, // Missing agentId
        { agentId: 'agent-123', timestamp: Date.now() }, // Missing event
        { agentId: 'agent-123', event: 'activated' }, // Missing timestamp
        { agentId: 'agent-123', event: 'invalid_event', timestamp: Date.now() }, // Invalid event type
        { agentId: 'agent-123', event: 'activated', timestamp: -1 } // Invalid timestamp
      ]

      invalidEvents.forEach(event => {
        expect(() => {
          expect(event).toBeValidLifecycleEvent()
        }).toThrow()
      })
    })
  })

  describe('toBeHealthyAgentStatus', () => {
    it('should validate healthy agent status', () => {
      const healthyStatus = {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 150,
        errorCount: 0,
        uptime: 3600000
      }

      expect(healthyStatus).toBeHealthyAgentStatus()
    })

    it('should reject unhealthy agent status', () => {
      const invalidStatuses = [
        { lastCheck: Date.now(), responseTime: 150, errorCount: 0 }, // Missing status
        { status: 'invalid_status', lastCheck: Date.now(), responseTime: 150, errorCount: 0 }, // Invalid status
        { status: 'healthy', lastCheck: Date.now(), responseTime: -100, errorCount: 0 }, // Negative response time
        { status: 'healthy', lastCheck: Date.now(), responseTime: 150, errorCount: -1 } // Negative error count
      ]

      invalidStatuses.forEach(status => {
        expect(() => {
          expect(status).toBeHealthyAgentStatus()
        }).toThrow()
      })
    })
  })

  describe('toHaveValidPerformanceMetrics', () => {
    it('should validate correct performance metrics', () => {
      const validMetrics = {
        averageResponseTime: 250,
        totalRequests: 1000,
        successRate: 0.95,
        uptime: 86400000 // 24 hours in ms
      }

      expect(validMetrics).toHaveValidPerformanceMetrics()
    })

    it('should reject invalid performance metrics', () => {
      const invalidMetrics = [
        { totalRequests: 1000, successRate: 0.95, uptime: 86400000 }, // Missing averageResponseTime
        { averageResponseTime: 250, successRate: 0.95, uptime: 86400000 }, // Missing totalRequests
        { averageResponseTime: 250, totalRequests: 1000, uptime: 86400000 }, // Missing successRate
        { averageResponseTime: -100, totalRequests: 1000, successRate: 0.95, uptime: 86400000 }, // Negative response time
        { averageResponseTime: 250, totalRequests: -1, successRate: 0.95, uptime: 86400000 }, // Negative requests
        { averageResponseTime: 250, totalRequests: 1000, successRate: 1.5, uptime: 86400000 }, // Success rate > 1
        { averageResponseTime: 250, totalRequests: 1000, successRate: -0.1, uptime: 86400000 } // Negative success rate
      ]

      invalidMetrics.forEach(metrics => {
        expect(() => {
          expect(metrics).toHaveValidPerformanceMetrics()
        }).toThrow()
      })
    })
  })
})