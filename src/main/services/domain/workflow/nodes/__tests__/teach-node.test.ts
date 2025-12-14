import { describe, it, expect, vi, beforeEach } from 'vitest';
import { teachNode } from '../teach';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';

// Mock the interrupt function from LangGraph since it requires a graph execution context
vi.mock('@langchain/langgraph', async () => {
  const actual = await vi.importActual('@langchain/langgraph');
  return {
    ...actual,
    interrupt: vi.fn().mockResolvedValue({
      type: 'user',
      content: 'I understand the concept',
    }),
  };
});

describe('teach node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls learning agent to deliver lesson content', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Let me teach you about React components',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = teachNode({ agentManager: mockAgentManager });

    const result = await node({
      messages: [new AIMessage('Previous message')],
      topic: 'React',
    } as any);

    expect(mockAgentManager.runAgent).toHaveBeenCalledWith({
      agentType: 'learning',
      conversationId: 'workflow',
      messages: [new AIMessage('Previous message')],
      topic: 'React',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toBe('Let me teach you about React components');
  });

  it('handles agent response correctly', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Today we\'ll learn about JavaScript closures. A closure is...',
        model: 'gpt-4',
        provider: 'openai',
        agentType: 'learning',
      }),
    };

    const node = teachNode({ agentManager: mockAgentManager });

    const result = await node({
      messages: [],
      topic: 'JavaScript',
    } as any);

    expect(result.messages[0].content).toBe('Today we\'ll learn about JavaScript closures. A closure is...');
  });

  it('passes through state messages and topic', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Teaching content',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = teachNode({ agentManager: mockAgentManager });

    const inputMessages = [
      new AIMessage('Message 1'),
      new AIMessage('Message 2'),
    ];

    const result = await node({
      messages: inputMessages,
      topic: 'TypeScript',
    } as any);

    expect(mockAgentManager.runAgent).toHaveBeenCalledWith({
      agentType: 'learning',
      conversationId: 'workflow',
      messages: inputMessages,
      topic: 'TypeScript',
    });
  });

  it('handles agent errors gracefully', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockRejectedValue(new Error('Agent unavailable')),
    };

    const node = teachNode({ agentManager: mockAgentManager });

    await expect(node({
      messages: [],
      topic: 'React',
    } as any)).rejects.toThrow('Agent unavailable');
  });

  it('uses learning agent type for teaching', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Learning content',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = teachNode({ agentManager: mockAgentManager });

    await node({
      messages: [],
      topic: 'React',
    } as any);

    expect(mockAgentManager.runAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: 'learning',
      })
    );
  });

  it('creates conversational learning experience', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'What would you like to know about React? Let\'s explore together!',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = teachNode({ agentManager: mockAgentManager });

    const result = await node({
      messages: [new AIMessage('I want to learn React')],
      topic: 'React',
    } as any);

    expect(result.messages[0].content).toContain('React');
  });
});
