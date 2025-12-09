import { describe, it, expect, vi, beforeEach } from 'vitest';
import { remediateNode } from '../remediate';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';

describe('remediate node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls learning agent to re-teach concept', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Let me re-explain this concept with a different approach',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = remediateNode({ agentManager: mockAgentManager });

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
    expect(result.messages[0].content).toBe('Let me re-explain this concept with a different approach');
  });

  it('handles agent response correctly', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'I see you\'re struggling with this. Let\'s try a simpler explanation using an analogy.',
        model: 'gpt-4',
        provider: 'openai',
        agentType: 'learning',
      }),
    };

    const node = remediateNode({ agentManager: mockAgentManager });

    const result = await node({
      messages: [],
      topic: 'JavaScript',
    } as any);

    expect(result.messages[0].content).toBe('I see you\'re struggling with this. Let\'s try a simpler explanation using an analogy.');
  });

  it('passes through state messages and topic', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Remediation content',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = remediateNode({ agentManager: mockAgentManager });

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

    const node = remediateNode({ agentManager: mockAgentManager });

    await expect(node({
      messages: [],
      topic: 'React',
    } as any)).rejects.toThrow('Agent unavailable');
  });

  it('uses learning agent type (not tutoring)', async () => {
    const mockAgentManager = {
      runAgent: vi.fn().mockResolvedValue({
        content: 'Learning content',
        model: 'mock',
        provider: 'mock',
        agentType: 'learning',
      }),
    };

    const node = remediateNode({ agentManager: mockAgentManager });

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
});
