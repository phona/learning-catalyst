import { describe, it, expect, vi } from 'vitest';
import { completeNode } from '../complete';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

describe('complete node', () => {
  it('returns completion summary message', async () => {
    const node = completeNode();

    const result = await node({
      messages: [],
      topic: 'React',
      mastery: 95,
    }, createMockConfig());

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toBeDefined();
    expect(result.messages[0].content.length).toBeGreaterThan(0);
  });

  it('handles various state inputs', async () => {
    const node = completeNode();

    const result1 = await node({
      messages: [new AIMessage('Previous message')],
      topic: 'TypeScript',
      mastery: 98,
    }, createMockConfig());

    expect(result1.messages).toHaveLength(1);
    expect(result1.messages[0].content).toBeDefined();

    const result2 = await node({
      messages: [],
      topic: '',
      mastery: 90,
    }, createMockConfig());

    expect(result2.messages).toHaveLength(1);
    expect(result2.messages[0].content).toBeDefined();
  });

  it('returns message with celebration content', async () => {
    const node = completeNode();

    const result = await node({
      messages: [],
      topic: 'React',
      mastery: 92,
    }, createMockConfig());

    const message = result.messages[0];
    expect(message).toBeInstanceOf(AIMessage);
    // Should contain celebration/completion message
    expect(message.content).toMatch(/completion|congratulations|achievement|complete|master/i);
  });
});
