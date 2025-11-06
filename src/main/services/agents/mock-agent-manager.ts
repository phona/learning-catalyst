/**
 * Mock Agent Manager for Testing
 */

import { vi } from 'vitest';
import type { AgentExecutionRequest, AgentExecutionResult } from '../types';

export interface MockProviderInfo {
  type: string;
  name: string;
  model: string;
  isAvailable: boolean;
  capabilities: string[];
}

export interface MockAgentConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  capabilities: string[];
  modelConfig: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

/**
 * Mock Agent Manager for testing purposes
 */
export class MockAgentManager {
  private agents = new Map<string, MockAgentConfig>();
  private currentProvider: MockProviderInfo | null = null;

  constructor() {
    // Initialize with some default agents for testing
    this.initializeDefaultAgents();
  }

  /**
   * Execute an agent
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    // Mock execution
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      executionId: request.context.id,
      agentId: request.agentId,
      result: {
        type: 'text',
        content: `Mock response from agent ${request.agentId} for request ${request.context.id}`,
        metadata: {
          executionTime: 100,
          tokensUsed: 50,
          model: 'mock-model',
        },
      },
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        tokensUsed: 50,
        model: 'mock-model',
        provider: 'mock-provider',
      },
    };
  }

  /**
   * Get provider information
   */
  async getProviderInfo(): Promise<MockProviderInfo | null> {
    return this.currentProvider;
  }

  /**
   * Set provider information
   */
  setProviderInfo(provider: MockProviderInfo): void {
    this.currentProvider = provider;
  }

  /**
   * Get registered agents
   */
  getRegisteredAgents(): MockAgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgentById(agentId: string): MockAgentConfig | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Register an agent
   */
  registerAgent(config: MockAgentConfig): void {
    this.agents.set(config.id, config);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * Activate an agent
   */
  activateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isActive = true;
      return true;
    }
    return false;
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.isActive = false;
      return true;
    }
    return false;
  }

  /**
   * Get active agents
   */
  getActiveAgents(): MockAgentConfig[] {
    return Array.from(this.agents.values()).filter(agent => agent.isActive);
  }

  /**
   * Cancel execution (mock)
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    return true; // Mock successful cancellation
  }

  /**
   * Get execution status (mock)
   */
  getExecutionStatus(executionId: string): { found: boolean; status?: string } {
    return { found: false }; // Mock that execution is not found
  }

  /**
   * Get active executions (mock)
   */
  getActiveExecutions(): any[] {
    return []; // Mock no active executions
  }

  /**
   * Initialize default test agents
   */
  private initializeDefaultAgents(): void {
    const defaultAgents: MockAgentConfig[] = [
      {
        id: 'learning-agent',
        name: 'Learning Agent',
        type: 'learning',
        description: 'Agent for educational content and learning',
        isActive: true,
        capabilities: ['text-generation', 'concept-explanation', 'assessment'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
        },
      },
      {
        id: 'tutoring-agent',
        name: 'Tutoring Agent',
        type: 'tutoring',
        description: 'Agent for personalized tutoring',
        isActive: true,
        capabilities: ['text-generation', 'personalized-feedback', 'progress-tracking'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 1500,
        },
      },
      {
        id: 'assessment-agent',
        name: 'Assessment Agent',
        type: 'assessment',
        description: 'Agent for creating and evaluating assessments',
        isActive: false,
        capabilities: ['assessment-generation', 'evaluation', 'analytics'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          maxTokens: 800,
        },
      },
    ];

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    // Set default provider
    this.currentProvider = {
      type: 'openai',
      name: 'OpenAI',
      model: 'gpt-3.5-turbo',
      isAvailable: true,
      capabilities: ['text-generation', 'function-calling'],
    };
  }
}

// Create a mock instance for use in tests
export const createMockAgentManager = () => new MockAgentManager();

// Mock AgentManager for dependency injection
export const mockAgentManager = {
  executeAgent: vi.fn().mockImplementation(async (request: AgentExecutionRequest) => {
    return {
      success: true,
      executionId: request.context.id,
      agentId: request.agentId,
      result: {
        type: 'text',
        content: `Mock response from agent ${request.agentId}`,
      },
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        tokensUsed: 50,
      },
    };
  }),
  getProviderInfo: vi.fn().mockResolvedValue({
    type: 'openai',
    name: 'OpenAI',
    model: 'gpt-3.5-turbo',
    isAvailable: true,
    capabilities: ['text-generation'],
  }),
  getRegisteredAgents: vi.fn().mockReturnValue([]),
  getAgentById: vi.fn().mockReturnValue(undefined),
  registerAgent: vi.fn(),
  unregisterAgent: vi.fn().mockReturnValue(true),
  activateAgent: vi.fn().mockReturnValue(true),
  deactivateAgent: vi.fn().mockReturnValue(true),
  getActiveAgents: vi.fn().mockReturnValue([]),
  cancelExecution: vi.fn().mockResolvedValue(true),
  getExecutionStatus: vi.fn().mockReturnValue({ found: false }),
  getActiveExecutions: vi.fn().mockReturnValue([]),
};