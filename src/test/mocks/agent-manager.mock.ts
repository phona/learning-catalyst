/**
 * Mock Agent Manager for Testing
 *
 * This provides a lightweight mock for testing agent-related functionality
 * without the overhead of the full implementation.
 */

import { vi } from 'vitest';
import type { AgentConfig, AgentExecutionRequest, AgentExecutionChunk } from '@/main/services/agents/types';

// Minimal mock interfaces based on actual usage
export interface MockAgentConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  enabled: boolean;
  capabilities: string[];
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

export interface MockExecutionResult {
  success: boolean;
  executionId: string;
  agentId: string;
  result: {
    type: string;
    content: string;
    metadata?: Record<string, any>;
  };
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    tokensUsed: number;
    model: string;
    provider: string;
  };
}

/**
 * Create a mock agent manager for testing
 */
export function createMockAgentManager() {
  const agents = new Map<string, MockAgentConfig>();
  const executions = new Map<string, any>();

  // Initialize with default test agents
  const defaultAgents: MockAgentConfig[] = [
    {
      id: 'test-learning-agent',
      name: 'Test Learning Agent',
      type: 'learning',
      description: 'Test agent for learning scenarios',
      enabled: true,
      capabilities: ['text-generation', 'concept-explanation'],
      systemPrompt: 'You are a helpful learning assistant.'
    },
    {
      id: 'test-tutoring-agent',
      name: 'Test Tutoring Agent',
      type: 'tutoring',
      description: 'Test agent for tutoring scenarios',
      enabled: true,
      capabilities: ['tutoring', 'feedback'],
      systemPrompt: 'You are a patient tutor.'
    }
  ];

  defaultAgents.forEach(agent => agents.set(agent.id, agent));

  return {
    // Agent registration methods
    registerAgent: vi.fn((config: MockAgentConfig) => {
      agents.set(config.id, config);
    }),

    unregisterAgent: vi.fn((agentId: string) => {
      return agents.delete(agentId);
    }),

    getAgent: vi.fn((agentId: string) => {
      return agents.get(agentId);
    }),

    getRegisteredAgents: vi.fn(() => {
      return Array.from(agents.values());
    }),

    // Agent execution methods
    executeAgent: vi.fn().mockImplementation(async (request: AgentExecutionRequest) => {
      const executionId = `exec_${Date.now()}`;
      const startTime = new Date();

      // Mock execution delay
      await new Promise(resolve => setTimeout(resolve, 10));

      const result: MockExecutionResult = {
        success: true,
        executionId,
        agentId: request.agentId,
        result: {
          type: 'text',
          content: `Mock response from agent ${request.agentId}`,
          metadata: {
            executionTime: 10,
            tokensUsed: 25
          }
        },
        metadata: {
          startTime,
          endTime: new Date(),
          duration: 10,
          tokensUsed: 25,
          model: 'mock-model',
          provider: 'mock-provider'
        }
      };

      executions.set(executionId, result);
      return result;
    }),

    // Execution management methods
    cancelExecution: vi.fn((executionId: string) => {
      return executions.delete(executionId);
    }),

    getExecutionStatus: vi.fn((executionId: string) => {
      const execution = executions.get(executionId);
      return {
        found: !!execution,
        execution
      };
    }),

    getActiveExecutions: vi.fn(() => {
      return Array.from(executions.values());
    }),

    // Statistics and utility methods
    getStats: vi.fn(() => ({
      totalAgents: agents.size,
      enabledAgents: Array.from(agents.values()).filter(a => a.enabled).length,
      activeExecutions: executions.size,
      agentTypes: {
        learning: 1,
        tutoring: 1
      }
    })),

    // Session integration methods (simplified for testing)
    activateAgentForSession: vi.fn(),
    deactivateAgentForSession: vi.fn(),
    getSessionAgents: vi.fn(() => []),
    getAgentSessions: vi.fn(() => []),
    getSessionStatistics: vi.fn(() => ({
      totalAgents: 0,
      activeAgents: 0,
      agentTypes: {},
      totalExecutions: 0
    })),

    // Cleanup
    dispose: vi.fn(() => {
      executions.clear();
    }),

    // Test helpers
    _addTestAgent: vi.fn((agent: MockAgentConfig) => {
      agents.set(agent.id, agent);
    }),

    _clearAgents: vi.fn(() => {
      agents.clear();
    }),

    _clearExecutions: vi.fn(() => {
      executions.clear();
    })
  };
}

/**
 * Create a mock agent configuration for testing
 */
export function createMockAgentConfig(overrides: Partial<MockAgentConfig> = {}): MockAgentConfig {
  return {
    id: 'mock-agent-id',
    name: 'Mock Agent',
    type: 'learning',
    description: 'A mock agent for testing',
    enabled: true,
    capabilities: ['text-generation'],
    systemPrompt: 'You are a mock agent.',
    ...overrides
  };
}

/**
 * Create a mock execution request for testing
 */
export function createMockExecutionRequest(overrides: Partial<AgentExecutionRequest> = {}): AgentExecutionRequest {
  return {
    agentId: 'mock-agent-id',
    input: 'Test input',
    context: {
      id: 'test-execution-id',
      sessionId: 'test-session-id',
      userId: 'test-user',
      timestamp: Date.now(),
      requestId: 'test-request',
      operation: 'test',
      correlationId: 'test-correlation'
    },
    options: {
      maxIterations: 10,
      timeout: 30000,
      stream: false
    },
    ...overrides
  };
}

/**
 * Mock agent manager instance for direct import in tests
 */
export const mockAgentManager = createMockAgentManager();

// Export default for convenience
export default createMockAgentManager;