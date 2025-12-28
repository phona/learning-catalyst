import { describe, it, expect } from 'vitest';
import { extractContentParts, resolveMessageContent } from '../message-content';

describe('message-content helpers', () => {
  it('extracts text from plain string content', () => {
    const extracted = extractContentParts('Hello');
    const resolved = resolveMessageContent('Hello', extracted);

    expect(extracted).toEqual({ text: 'Hello' });
    expect(resolved).toBe('Hello');
  });

  it('extracts text and reasoning blocks and resolves to text', () => {
    const blocks = [
      { type: 'reasoning', reasoning: 'Think.' },
      { type: 'text', text: 'Answer.' },
    ];
    const extracted = extractContentParts(blocks);
    const resolved = resolveMessageContent(blocks, extracted);

    expect(extracted).toEqual({ text: 'Answer.', reasoning: 'Think.' });
    expect(resolved).toBe('Answer.');
  });

  it('keeps content empty when only reasoning blocks exist', () => {
    const blocks = [{ type: 'reasoning', reasoning: 'Hidden.' }];
    const extracted = extractContentParts(blocks);
    const resolved = resolveMessageContent(blocks, extracted);

    expect(extracted).toEqual({ reasoning: 'Hidden.' });
    expect(resolved).toBe('');
  });

  it('extracts nested content blocks', () => {
    const nested = { content: [{ type: 'text', text: 'Nested.' }] };
    const extracted = extractContentParts(nested);
    const resolved = resolveMessageContent(nested, extracted);

    expect(extracted).toEqual({ text: 'Nested.' });
    expect(resolved).toBe('Nested.');
  });

  it('falls back to JSON when content has no known blocks', () => {
    const raw = { type: 'image', url: 'https://example.com/image.png' };
    const extracted = extractContentParts(raw);
    const resolved = resolveMessageContent(raw, extracted);

    expect(extracted).toEqual({});
    expect(resolved).toBe('{"type":"image","url":"https://example.com/image.png"}');
  });
});
