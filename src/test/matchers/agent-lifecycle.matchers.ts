/**
 * Custom Matchers for Agent Lifecycle Testing
 *
 * Provides domain-specific matchers for agent state transitions,
 * performance validation, and lifecycle events.
 */

import { expect } from 'vitest'
import type { AgentConfiguration, AgentState, AgentLifecycleEvent } from '@/main/services/agents/agent-lifecycle-manager'

// Valid state transitions
const VALID_TRANSITIONS: Record<string, AgentState[]> = {
  'inactive': ['active', 'deleted'],
  'active': ['inactive', 'error'],
  'error': ['inactive', 'deleted'],
  'deleted': [] // Terminal state
}

/**
 * Custom matcher for valid agent state transitions
 */
expect.extend({
  toBeValidAgentTransition(received: { from: AgentState; to: AgentState }, expected?: AgentState) {
    const { from, to } = received
    const validTransitions = VALID_TRANSITIONS[from] || []
    const isValid = validTransitions.includes(to)

    const message = () => {
      if (isValid) {
        return `expected ${from} → ${to} not to be a valid transition, but it is valid`
      } else {
        return `expected ${from} → ${to} to be a valid transition, but it is invalid. Valid transitions from ${from}: ${validTransitions.join(', ')}`
      }
    }

    return {
      pass: isValid,
      message,
      actual: { from, to },
      expected: validTransitions
    }
  },

  /**
   * Custom matcher for performance threshold validation
   */
  toMeetPerformanceThreshold(received: { duration: number; operation?: string }, thresholdMs: number) {
    const { duration, operation = 'operation' } = received
    const isWithinThreshold = duration < thresholdMs

    const message = () => {
      if (isWithinThreshold) {
        return `expected ${operation} duration of ${duration}ms to be greater than or equal to ${thresholdMs}ms`
      } else {
        return `expected ${operation} duration of ${duration}ms to be less than ${thresholdMs}ms`
      }
    }

    return {
      pass: isWithinThreshold,
      message,
      actual: duration,
      expected: thresholdMs
    }
  },

  /**
   * Custom matcher for memory usage validation
   */
  toBeWithinMemoryRange(received: number, minMB: number, maxMB: number) {
    const memoryMB = received / (1024 * 1024)
    const isWithinRange = memoryMB >= minMB && memoryMB <= maxMB

    const message = () => {
      if (isWithinRange) {
        return `expected memory usage of ${memoryMB.toFixed(2)}MB not to be within range [${minMB}MB, ${maxMB}MB]`
      } else {
        return `expected memory usage of ${memoryMB.toFixed(2)}MB to be within range [${minMB}MB, ${maxMB}MB]`
      }
    }

    return {
      pass: isWithinRange,
      message,
      actual: memoryMB,
      expected: { min: minMB, max: maxMB }
    }
  },

  /**
   * Custom matcher for agent configuration validation
   */
  toBeValidAgentConfiguration(received: AgentConfiguration) {
    const errors: string[] = []

    // Validate required fields
    if (!received.type || typeof received.type !== 'string') {
      errors.push('Agent type is required and must be a string')
    }

    if (!received.name || typeof received.name !== 'string' || received.name.trim().length === 0) {
      errors.push('Agent name is required and must be a non-empty string')
    }

    if (!received.systemPrompt || typeof received.systemPrompt !== 'string') {
      errors.push('System prompt is required and must be a string')
    }

    // Validate model configuration
    if (!received.modelConfig) {
      errors.push('Model configuration is required')
    } else {
      if (!received.modelConfig.provider) {
        errors.push('Model provider is required')
      }
      if (!received.modelConfig.model) {
        errors.push('Model name is required')
      }
      if (typeof received.modelConfig.temperature !== 'number' ||
          received.modelConfig.temperature < 0 ||
          received.modelConfig.temperature > 2) {
        errors.push('Model temperature must be a number between 0 and 2')
      }
    }

    // Validate arrays
    if (!Array.isArray(received.tools)) {
      errors.push('Tools must be an array')
    }

    if (!Array.isArray(received.capabilities)) {
      errors.push('Capabilities must be an array')
    }

    const isValid = errors.length === 0

    const message = () => {
      if (isValid) {
        return 'expected agent configuration to be invalid, but it is valid'
      } else {
        return `expected agent configuration to be valid, but it has errors:\n${errors.join('\n')}`
      }
    }

    return {
      pass: isValid,
      message,
      actual: received,
      expected: 'valid configuration'
    }
  },

  /**
   * Custom matcher for agent lifecycle event validation
   */
  toBeValidLifecycleEvent(received: AgentLifecycleEvent) {
    const errors: string[] = []

    // Validate required fields
    if (!received.agentId || typeof received.agentId !== 'string') {
      errors.push('Agent ID is required and must be a string')
    }

    if (!received.event || typeof received.event !== 'string') {
      errors.push('Event type is required and must be a string')
    }

    if (!received.timestamp || typeof received.timestamp !== 'number' || received.timestamp <= 0) {
      errors.push('Timestamp is required and must be a positive number')
    }

    // Validate valid event types
    const validEvents = ['created', 'activated', 'deactivated', 'error', 'deleted', 'updated']
    if (received.event && !validEvents.includes(received.event)) {
      errors.push(`Event type must be one of: ${validEvents.join(', ')}`)
    }

    // Validate metadata
    if (received.metadata && typeof received.metadata !== 'object') {
      errors.push('Metadata must be an object if provided')
    }

    const isValid = errors.length === 0

    const message = () => {
      if (isValid) {
        return 'expected lifecycle event to be invalid, but it is valid'
      } else {
        return `expected lifecycle event to be valid, but it has errors:\n${errors.join('\n')}`
      }
    }

    return {
      pass: isValid,
      message,
      actual: received,
      expected: 'valid lifecycle event'
    }
  },

  /**
   * Custom matcher for agent health status validation
   */
  toBeHealthyAgentStatus(received: any) {
    const requiredFields = ['status', 'lastCheck', 'responseTime', 'errorCount']
    const errors: string[] = []

    // Check required fields
    requiredFields.forEach(field => {
      if (!(field in received)) {
        errors.push(`Missing required field: ${field}`)
      }
    })

    // Validate status values
    const validStatuses = ['healthy', 'degraded', 'unhealthy', 'unknown']
    if (received.status && !validStatuses.includes(received.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`)
    }

    // Validate response time
    if (received.responseTime && (typeof received.responseTime !== 'number' || received.responseTime < 0)) {
      errors.push('Response time must be a non-negative number')
    }

    // Validate error count
    if (received.errorCount && (typeof received.errorCount !== 'number' || received.errorCount < 0)) {
      errors.push('Error count must be a non-negative number')
    }

    const isValid = errors.length === 0

    const message = () => {
      if (isValid) {
        return 'expected agent health status to be invalid, but it is valid'
      } else {
        return `expected agent health status to be valid, but it has errors:\n${errors.join('\n')}`
      }
    }

    return {
      pass: isValid,
      message,
      actual: received,
      expected: 'valid health status'
    }
  },

  /**
   * Custom matcher for agent performance metrics validation
   */
  toHaveValidPerformanceMetrics(received: any) {
    const errors: string[] = []

    // Validate required metrics
    const requiredMetrics = ['averageResponseTime', 'totalRequests', 'successRate', 'uptime']
    requiredMetrics.forEach(metric => {
      if (!(metric in received)) {
        errors.push(`Missing required metric: ${metric}`)
      }
    })

    // Validate metric types and ranges
    if (received.averageResponseTime !== undefined) {
      if (typeof received.averageResponseTime !== 'number' || received.averageResponseTime < 0) {
        errors.push('Average response time must be a non-negative number')
      }
    }

    if (received.totalRequests !== undefined) {
      if (typeof received.totalRequests !== 'number' || received.totalRequests < 0 || !Number.isInteger(received.totalRequests)) {
        errors.push('Total requests must be a non-negative integer')
      }
    }

    if (received.successRate !== undefined) {
      if (typeof received.successRate !== 'number' || received.successRate < 0 || received.successRate > 1) {
        errors.push('Success rate must be a number between 0 and 1')
      }
    }

    if (received.uptime !== undefined) {
      if (typeof received.uptime !== 'number' || received.uptime < 0) {
        errors.push('Uptime must be a non-negative number')
      }
    }

    const isValid = errors.length === 0

    const message = () => {
      if (isValid) {
        return 'expected performance metrics to be invalid, but they are valid'
      } else {
        return `expected performance metrics to be valid, but they have errors:\n${errors.join('\n')}`
      }
    }

    return {
      pass: isValid,
      message,
      actual: received,
      expected: 'valid performance metrics'
    }
  }
})

// Export types for use in tests
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidAgentTransition(expected?: string): T
    toMeetPerformanceThreshold(thresholdMs: number): T
    toBeWithinMemoryRange(minMB: number, maxMB: number): T
    toBeValidAgentConfiguration(): T
    toBeValidLifecycleEvent(): T
    toBeHealthyAgentStatus(): T
    toHaveValidPerformanceMetrics(): T
  }
}