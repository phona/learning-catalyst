import { describe, it, expect, vi, beforeEach } from 'vitest';
import { breakerNode } from '../breaker';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

// Mock config writer for chunk emitter (DI pattern - only mock writer, use real chunk-emitter)
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(), // Mock writer function only
} as any);

describe('breaker node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls tutoring agent with correct parameters', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Take a break and try again later',
        model: 'mock',
        provider: 'mock',
        agentType: 'tutoring',
      }),
    };

    const node = breakerNode({ agentManager: mockAgentManager });

    const result = await node({
      messages: [new AIMessage('Previous message')],
      topic: 'React',
      failCount: 4,
    } as any, createMockConfig());

    expect(mockAgentManager.runAgent).toHaveBeenCalledWith({
      agentType: 'tutoring',
      conversationId: 'workflow',
      messages: [new AIMessage('Previous message')],
      topic: 'React',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toBe('Take a break and try again later');
  });

  it('handles agent response correctly', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'You\'ve been working hard. Consider taking a break!',
        model: 'gpt-4',
        provider: 'openai',
        agentType: 'tutoring',
      }),
    };

    const node = breakerNode({ agentManager: mockAgentManager });

    const result = await node({
      messages: [],
      topic: 'JavaScript',
      failCount: 5,
    } as any, createMockConfig());

    expect(result.messages[0].content).toBe('You\'ve been working hard. Consider taking a break!');
  });

  it('passes through state messages and topic', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Support message',
        model: 'mock',
        provider: 'mock',
        agentType: 'tutoring',
      }),
    };

    const node = breakerNode({ agentManager: mockAgentManager });

    const inputMessages = [
      new AIMessage('Message 1'),
      new AIMessage('Message 2'),
    ];

    const result = await node({
      messages: inputMessages,
      topic: 'TypeScript',
      failCount: 3,
    } as any, createMockConfig());

    expect(mockAgentManager.runAgent).toHaveBeenCalledWith({
      agentType: 'tutoring',
      conversationId: 'workflow',
      messages: inputMessages,
      topic: 'TypeScript',
    });
  });

  it('handles agent errors gracefully', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockRejectedValue(new Error('Agent unavailable')),
    };

    const node = breakerNode({ agentManager: mockAgentManager });

    await expect(node({
      messages: [],
      topic: 'React',
      failCount: 4,
    } as any, createMockConfig())).rejects.toThrow('Agent unavailable');
  });
});
