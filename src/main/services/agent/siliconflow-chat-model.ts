import { ChatOpenAI } from '@langchain/openai';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessageChunk } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { ChatGenerationChunk } from '@langchain/core/outputs';

/**
 * SiliconFlow sends cumulative token usage fields in *every* streaming SSE chunk.
 *
 * In LangChain JS:
 * - `usage_metadata` is merged by summing token counts (so cumulative counts overcount)
 * - `response_metadata` is merged with `_mergeDicts` (duplicate numeric fields warn+stick)
 *
 * This model converts SiliconFlow's cumulative counts to per-chunk deltas (so sums are
 * correct) and strips repeated usage keys from response/additional metadata (so merges
 * don't warn).
 */
export class SiliconFlowChatModel extends ChatOpenAI {
  // Note: This is a protected method in LangChain; we override to rewrite streamed chunks.
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    let lastInputTokens = 0;
    let lastOutputTokens = 0;
    let lastTotalTokens = 0;
    let lastReasoningTokens = 0;

    for await (const chunk of super._streamResponseChunks(messages, options, runManager)) {
      const message = chunk.message;
      if (AIMessageChunk.isInstance(message)) {
        const cumulative = extractCumulativeUsage(message);
        if (cumulative) {
          const currentInputTokens = cumulative.inputTokens ?? lastInputTokens;
          const currentOutputTokens = cumulative.outputTokens ?? lastOutputTokens;
          const currentTotalTokens = cumulative.totalTokens ?? lastTotalTokens;
          const currentReasoningTokens = cumulative.reasoningTokens ?? lastReasoningTokens;

          const inputDelta = currentInputTokens - lastInputTokens;
          const outputDelta = currentOutputTokens - lastOutputTokens;

          const totalDelta =
            cumulative.totalTokens !== undefined
              ? currentTotalTokens - lastTotalTokens
              : inputDelta + outputDelta;

          const reasoningDelta =
            cumulative.reasoningTokens !== undefined
              ? currentReasoningTokens - lastReasoningTokens
              : undefined;

          message.usage_metadata = {
            input_tokens: inputDelta,
            output_tokens: outputDelta,
            total_tokens: totalDelta,
            ...(reasoningDelta !== undefined
              ? { output_token_details: { reasoning: reasoningDelta } }
              : {}),
          };

          lastInputTokens = currentInputTokens;
          lastOutputTokens = currentOutputTokens;
          lastTotalTokens = cumulative.totalTokens !== undefined ? currentTotalTokens : lastTotalTokens + totalDelta;
          lastReasoningTokens = currentReasoningTokens;
        }

        stripUsageLikeFields(message.response_metadata);
        stripUsageLikeFields(message.additional_kwargs);
      }

      yield chunk;
    }
  }
}

type CumulativeUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
};

function extractCumulativeUsage(message: AIMessageChunk): CumulativeUsage | undefined {
  const usageMetadata = message.usage_metadata as Record<string, unknown> | undefined;
  const responseMetadata = message.response_metadata as Record<string, unknown> | undefined;
  const additionalKwargs = message.additional_kwargs as Record<string, unknown> | undefined;

  const maybeFromUsageMetadata = normalizeUsageDict(usageMetadata);
  if (maybeFromUsageMetadata) return maybeFromUsageMetadata;

  const maybeFromResponseMetadata = normalizeUsageDict(responseMetadata);
  if (maybeFromResponseMetadata) return maybeFromResponseMetadata;

  return normalizeUsageDict(additionalKwargs);
}

function normalizeUsageDict(dict?: Record<string, unknown>): CumulativeUsage | undefined {
  if (!dict) return undefined;

  const inputTokens =
    pickNumber(dict, 'input_tokens') ??
    pickNumber(dict, 'prompt_tokens') ??
    pickNumber(dict, 'promptTokens');

  const completionTokens =
    pickNumber(dict, 'output_tokens') ??
    pickNumber(dict, 'completion_tokens') ??
    pickNumber(dict, 'completionTokens');

  const reasoningTokens =
    pickNumber(dict, 'reasoning_tokens') ?? pickNumber(dict, 'reasoningTokens');

  const totalTokens =
    pickNumber(dict, 'total_tokens') ??
    pickNumber(dict, 'totalTokens') ??
    (inputTokens !== undefined || completionTokens !== undefined || reasoningTokens !== undefined
      ? (inputTokens ?? 0) + (completionTokens ?? 0) + (reasoningTokens ?? 0)
      : undefined);

  const outputTokens =
    totalTokens !== undefined && inputTokens !== undefined
      ? totalTokens - inputTokens
      : completionTokens !== undefined || reasoningTokens !== undefined
        ? (completionTokens ?? 0) + (reasoningTokens ?? 0)
        : undefined;

  const hasAny =
    inputTokens !== undefined ||
    completionTokens !== undefined ||
    reasoningTokens !== undefined ||
    totalTokens !== undefined;

  return hasAny
    ? {
        inputTokens,
        outputTokens,
        totalTokens,
        reasoningTokens,
      }
    : undefined;
}

function pickNumber(dict: Record<string, unknown>, key: string): number | undefined {
  const value = dict[key];
  return typeof value === 'number' ? value : undefined;
}

function stripUsageLikeFields(value: unknown) {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) stripUsageLikeFields(item);
    return;
  }

  const dict = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(dict)) {
    if (USAGE_LIKE_KEYS.has(key)) {
      delete dict[key];
      continue;
    }
    stripUsageLikeFields(child);
  }
}

const USAGE_LIKE_KEYS = new Set([
  'completionTokens',
  'completion_tokens',
  'inputTokens',
  'input_tokens',
  'outputTokens',
  'output_tokens',
  'promptTokens',
  'prompt_tokens',
  'reasoningTokens',
  'reasoning_tokens',
  'totalTokens',
  'total_tokens',
]);
