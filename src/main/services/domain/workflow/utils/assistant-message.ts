import { AIMessage } from '@langchain/core/messages';

export type ReasoningCarrier = { additional_kwargs?: Record<string, unknown> } | null | undefined;

export function getMessageReasoning(message: ReasoningCarrier): string | undefined {
  if (!message || typeof message !== 'object') return undefined;

  const additional = (message as { additional_kwargs?: Record<string, unknown> }).additional_kwargs;
  if (!additional || typeof additional !== 'object') return undefined;

  const direct = (additional as { reasoning?: unknown }).reasoning;
  if (typeof direct === 'string') return direct;

  const content = (additional as { reasoning_content?: unknown }).reasoning_content;
  return typeof content === 'string' ? content : undefined;
}

export function createAssistantMessageWithReasoning(
  content: string,
  reasoning?: string
): AIMessage {
  if (typeof reasoning === 'string' && reasoning.length > 0) {
    return new AIMessage({
      content,
      additional_kwargs: { reasoning_content: reasoning },
    });
  }

  return new AIMessage(content);
}
