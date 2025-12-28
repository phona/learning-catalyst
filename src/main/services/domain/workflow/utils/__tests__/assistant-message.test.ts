import { describe, it, expect } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { createAssistantMessageWithReasoning } from '../assistant-message';

describe('createAssistantMessageWithReasoning', () => {
  it('returns an AIMessage with content only when reasoning is missing', () => {
    const message = createAssistantMessageWithReasoning('Hello');
    expect(AIMessage.isInstance(message)).toBe(true);
    expect(String(message.content)).toBe('Hello');
    expect(message.additional_kwargs?.reasoning_content).toBeUndefined();
  });

  it('attaches reasoning_content when reasoning is provided', () => {
    const message = createAssistantMessageWithReasoning('Answer', 'Because...');
    expect(AIMessage.isInstance(message)).toBe(true);
    expect(String(message.content)).toBe('Answer');
    expect(message.additional_kwargs?.reasoning_content).toBe('Because...');
  });

  it('does not attach reasoning_content when reasoning is empty', () => {
    const message = createAssistantMessageWithReasoning('Answer', '');
    expect(message.additional_kwargs?.reasoning_content).toBeUndefined();
  });
});
