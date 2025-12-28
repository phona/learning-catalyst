import type { ReasoningCarrier } from './assistant-message';
import { getMessageReasoning } from './assistant-message';
export { getMessageReasoning } from './assistant-message';

type ReasoningOptions = {
  reasoning?: string;
  message?: ReasoningCarrier;
};

export function withReasoning<T extends Record<string, unknown>>(
  payload: T,
  reasoning?: string
): T & { reasoning?: string } {
  if (typeof reasoning !== 'string' || reasoning.length === 0) {
    return payload;
  }
  return { ...payload, reasoning };
}

export function buildInterruptPayload<T extends Record<string, unknown>>(
  payload: T,
  options?: ReasoningOptions
): T & { reasoning?: string } {
  const hasExplicitReasoning = typeof options?.reasoning === 'string';
  const messageReasoning = options?.message ? getMessageReasoning(options.message) : undefined;
  const reasoning = hasExplicitReasoning ? options?.reasoning : messageReasoning;
  return withReasoning(payload, reasoning);
}
