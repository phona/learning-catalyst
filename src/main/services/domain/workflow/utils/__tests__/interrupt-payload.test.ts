import { describe, it, expect } from 'vitest';
import { buildInterruptPayload, getMessageReasoning, withReasoning } from '../interrupt-payload';

describe('interrupt payload helpers', () => {
  describe('getMessageReasoning', () => {
    it('returns undefined when message is missing', () => {
      expect(getMessageReasoning(undefined)).toBeUndefined();
    });

    it('returns reasoning from additional_kwargs.reasoning', () => {
      const message = { additional_kwargs: { reasoning: 'R1' } };
      expect(getMessageReasoning(message)).toBe('R1');
    });

    it('returns reasoning_content when reasoning is missing', () => {
      const message = { additional_kwargs: { reasoning_content: 'R2' } };
      expect(getMessageReasoning(message)).toBe('R2');
    });

    it('ignores non-string reasoning values', () => {
      const message = { additional_kwargs: { reasoning: 123, reasoning_content: true } };
      expect(getMessageReasoning(message)).toBeUndefined();
    });
  });

  describe('withReasoning', () => {
    it('adds reasoning when provided', () => {
      const payload = withReasoning({ prompt: 'P' }, 'R');
      expect(payload).toEqual({ prompt: 'P', reasoning: 'R' });
    });

    it('does not add reasoning when empty', () => {
      const payload = withReasoning({ prompt: 'P' }, '');
      expect(payload).toEqual({ prompt: 'P' });
    });
  });

  describe('buildInterruptPayload', () => {
    it('prefers explicit reasoning over message reasoning', () => {
      const message = { additional_kwargs: { reasoning_content: 'FromMessage' } };
      const payload = buildInterruptPayload({ prompt: 'P' }, { reasoning: 'Explicit', message });
      expect(payload).toEqual({ prompt: 'P', reasoning: 'Explicit' });
    });

    it('uses message reasoning when explicit reasoning is not provided', () => {
      const message = { additional_kwargs: { reasoning_content: 'FromMessage' } };
      const payload = buildInterruptPayload({ prompt: 'P' }, { message });
      expect(payload).toEqual({ prompt: 'P', reasoning: 'FromMessage' });
    });

    it('does not fall back when explicit reasoning is an empty string', () => {
      const message = { additional_kwargs: { reasoning_content: 'FromMessage' } };
      const payload = buildInterruptPayload({ prompt: 'P' }, { reasoning: '', message });
      expect(payload).toEqual({ prompt: 'P' });
    });
  });
});
