import type {
  CatalystRequest,
  CatalystResponse,
  AgentDisplay,
  ActiveExecution,
  StreamChunk
} from '@/shared/types/electron-api';
import { ICatalystIPCClient } from './ICatalystIPCClient';

/**
 * Mock implementation of Catalyst IPC client for testing
 * Simulates main process responses without actual IPC communication
 */
export class MockCatalystIPCClient implements ICatalystIPCClient {
  private delay: number;
  private mockAgents: AgentDisplay[];
  private mockExecutions: ActiveExecution[];

  constructor(delay = 100) {
    this.delay = delay;
    this.mockAgents = [
      {
        id: 'learning-agent',
        name: 'Learning Assistant',
        description: 'Specialized in personalized learning and concept explanation',
        type: 'learning',
        capabilities: ['concept-explanation', 'learning-path', 'assessment'],
        enabled: true
      },
      {
        id: 'tutoring-agent',
        name: 'Tutoring Assistant',
        description: 'Interactive guidance and real-time feedback',
        type: 'tutoring',
        capabilities: ['interactive-guidance', 'real-time-feedback', 'socratic-method'],
        enabled: true
      }
    ];
    this.mockExecutions = [];
  }

  async sendChat(request: CatalystRequest): Promise<CatalystResponse> {
    await this.simulateDelay();

    return {
      success: true,
      data: {
        messageId: `msg-${Date.now()}`,
        response: `Mock response to: ${request.message}`,
        agentId: request.agentId || 'learning-agent'
      }
    };
  }

  async sendChatStream(request: CatalystRequest): Promise<CatalystResponse> {
    await this.simulateDelay();

    // Simulate streaming response
    if (request.onChunk) {
      const chunks = [
        { type: 'thinking' as const, content: 'Analyzing your question...', timestamp: Date.now() },
        { type: 'content' as const, content: 'Mock response part 1', timestamp: Date.now() + 50 },
        { type: 'content' as const, content: 'Mock response part 2', timestamp: Date.now() + 100 },
        { type: 'complete' as const, content: '', timestamp: Date.now() + 150 }
      ];

      chunks.forEach(chunk => {
        request.onChunk!(chunk);
      });
    }

    return {
      success: true,
      data: {
        messageId: `stream-msg-${Date.now()}`,
        response: 'Mock streaming response completed',
        agentId: request.agentId || 'learning-agent'
      }
    };
  }

  async getAvailableAgents(request: CatalystRequest): Promise<CatalystResponse> {
    await this.simulateDelay();

    return {
      success: true,
      data: {
        agents: this.mockAgents
      }
    };
  }

  async getSession(request: CatalystRequest): Promise<CatalystResponse> {
    await this.simulateDelay();

    if (!request.sessionId) {
      return {
        success: false,
        error: 'Session ID is required'
      };
    }

    return {
      success: true,
      data: {
        session: {
          id: request.sessionId,
          messages: [
            {
              id: 'msg-1',
              type: 'user',
              content: 'Hello',
              timestamp: Date.now() - 60000
            },
            {
              id: 'msg-2',
              type: 'assistant',
              content: 'Hello! How can I help you today?',
              timestamp: Date.now() - 55000
            }
          ],
          createdAt: Date.now() - 120000,
          updatedAt: Date.now()
        }
      }
    };
  }

  async cancelExecution(request: CatalystRequest): Promise<CatalystResponse> {
    await this.simulateDelay();

    if (!request.executionId) {
      return {
        success: false,
        error: 'Execution ID is required'
      };
    }

    // Remove from mock executions
    const executionIndex = this.mockExecutions.findIndex(
      exec => exec.id === request.executionId
    );

    if (executionIndex !== -1) {
      this.mockExecutions.splice(executionIndex, 1);
      return {
        success: true,
        data: {
          message: 'Execution cancelled successfully'
        }
      };
    } else {
      return {
        success: false,
        error: 'Execution not found'
      };
    }
  }

  /**
   * Set mock agents for testing
   */
  setMockAgents(agents: AgentDisplay[]): void {
    this.mockAgents = agents;
  }

  /**
   * Add mock execution for testing
   */
  addMockExecution(execution: ActiveExecution): void {
    this.mockExecutions.push(execution);
  }

  /**
   * Clear mock executions
   */
  clearMockExecutions(): void {
    this.mockExecutions = [];
  }

  /**
   * Simulate network delay for realistic testing
   */
  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }
}