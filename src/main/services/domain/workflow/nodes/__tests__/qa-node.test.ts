import { describe, it, expect, vi } from 'vitest';
import { qaNode } from '../qa';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

vi.mock('../prompts', () => ({
  PROMPTS: {
    QA_CHECKPOINT: 'Any questions before we practice?',
  },
}));

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

describe('qa node', () => {
  it('returns Q&A checkpoint prompt message', async () => {
    const node = qaNode();

    const result = await node({
      messages: [],
      topic: 'React',
    }, createMockConfig());

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toBe('Any questions before we practice?');
  });

  it('handles various state inputs', async () => {
    const node = qaNode();

    const result1 = await node({
      messages: [new AIMessage('Previous message')],
      topic: 'TypeScript',
      mastery: 0.8,
    }, createMockConfig());

    expect(result1.messages).toHaveLength(1);
    expect(result1.messages[0].content).toBe('Any questions before we practice?');

    const result2 = await node({
      messages: [],
      topic: '',
      mastery: 0.0,
    }, createMockConfig());

    expect(result2.messages).toHaveLength(1);
    expect(result2.messages[0].content).toBe('Any questions before we practice?');
  });

  it('returns only the checkpoint message', async () => {
    const node = qaNode();

    const result = await node({
      messages: [new AIMessage('Previous content')],
      topic: 'JavaScript',
      mastery: 0.5,
      practicePrompt: 'Practice question',
    }, createMockConfig());

    // Should only return the new message, not echo back the state
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Any questions before we practice?');
  });
});
