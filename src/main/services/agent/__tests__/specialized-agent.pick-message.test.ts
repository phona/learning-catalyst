import { describe, expect, it } from 'vitest';
import { AIMessage } from '@langchain/core/messages';
import { pickAssistantMessage, type AgentCandidateMessage } from '../specialized-agent';

describe('pickAssistantMessage', () => {
  it('returns assistant content when only message type is present', () => {
    const messages: AgentCandidateMessage[] = [
      { role: 'user', content: 'hello' },
      { type: 'ai', content: 'hi there' },
    ];
    const result = pickAssistantMessage(messages);

    expect(result).toEqual({ role: 'ai', content: 'hi there' });
  });

  it('extracts text from content blocks including output_text', () => {
    const messages: AgentCandidateMessage[] = [
      {
        type: 'ai',
        content: [
          { type: 'reasoning', text: 'thinking...' },
          { type: 'output_text', text: 'final answer' },
        ],
      },
    ];
    const result = pickAssistantMessage(messages);

    expect(result?.content).toBe('thinking...final answer');
  });

  it('handles LangChain AIMessage instances', () => {
    const ai = new AIMessage('from instance');
    const result = pickAssistantMessage([ai as unknown as AgentCandidateMessage]);

    expect(result?.content).toBe('from instance');
  });

  it('returns null when no assistant messages are present', () => {
    const result = pickAssistantMessage([{ role: 'user', content: 'hi' }]);

    expect(result).toBeNull();
  });
});
