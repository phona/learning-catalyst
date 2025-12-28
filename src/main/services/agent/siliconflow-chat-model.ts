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
  constructor(fields?: ConstructorParameters<typeof ChatOpenAI>[0]) {
    // LangChain drops `delta.reasoning_content` during streaming conversion. We temporarily
    // include the raw response payload so we can extract reasoning and then remove it to
    // avoid retaining large payloads in long-lived state.
    super({ ...(fields ?? {}), __includeRawResponse: true } as any);
  }

  override async invoke(...args: Parameters<ChatOpenAI['invoke']>) {
    const response = await super.invoke(...args);
    attachReasoningFromRawResponse(response);
    return response;
  }

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
      const generationInfo = chunk.generationInfo as Record<string, unknown> | undefined;

      if (AIMessageChunk.isInstance(message)) {
        const cumulative = extractCumulativeUsage(message) ?? normalizeUsageDict(generationInfo);
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
          lastTotalTokens =
            cumulative.totalTokens !== undefined ? currentTotalTokens : lastTotalTokens + totalDelta;
          lastReasoningTokens = currentReasoningTokens;
        }
      }

      stripUsageLikeFields(message.response_metadata);
      stripUsageLikeFields(message.additional_kwargs);
      stripUsageLikeFields(generationInfo);
      attachReasoningFromRawResponse(message);

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

function stripRawResponse(message: unknown) {
  if (!message || typeof message !== 'object') return;

  const dict = message as Record<string, unknown>;
  const additionalKwargs = dict.additional_kwargs;
  if (additionalKwargs && typeof additionalKwargs === 'object' && !Array.isArray(additionalKwargs)) {
    delete (additionalKwargs as Record<string, unknown>).__raw_response;
  }

  const lcKwargs = (dict as any).lc_kwargs as Record<string, unknown> | undefined;
  const lcAdditional = lcKwargs?.additional_kwargs;
  if (lcAdditional && typeof lcAdditional === 'object' && !Array.isArray(lcAdditional)) {
    delete (lcAdditional as Record<string, unknown>).__raw_response;
  }
}

function attachReasoningFromRawResponse(message: unknown) {
  if (!message || typeof message !== 'object') return;

  const dict = message as Record<string, unknown>;
  const additionalKwargs = dict.additional_kwargs;
  if (!additionalKwargs || typeof additionalKwargs !== 'object' || Array.isArray(additionalKwargs)) return;

  const additional = additionalKwargs as Record<string, unknown>;
  const rawResponse = additional.__raw_response;
  const reasoning = extractReasoningFromRawResponse(rawResponse);

  // Memory guardrail: never keep the raw payload on the message/chunk.
  stripRawResponse(message);

  if (reasoning !== undefined) {
    additional.reasoning_content = reasoning;
  }
}

function extractReasoningFromRawResponse(rawResponse: unknown): string | undefined {
  if (!rawResponse || typeof rawResponse !== 'object') return undefined;

  const raw = rawResponse as Record<string, unknown>;
  const choices = raw.choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;

  const first = choices[0] as Record<string, unknown> | undefined;
  if (!first || typeof first !== 'object') return undefined;

  const delta = first.delta;
  const message = first.message;

  return (
    pickString(delta, 'reasoning_content') ??
    pickString(delta, 'reasoning') ??
    pickString(message, 'reasoning_content') ??
    pickString(message, 'reasoning')
  );
}

function extractCumulativeUsage(message: AIMessageChunk): CumulativeUsage | undefined {
  const usageMetadata = message.usage_metadata as Record<string, unknown> | undefined;
  const responseMetadata = message.response_metadata as Record<string, unknown> | undefined;
  const additionalKwargs = message.additional_kwargs as Record<string, unknown> | undefined;

  const maybeFromUsageMetadata = normalizeUsageDict(usageMetadata);
  if (maybeFromUsageMetadata) return maybeFromUsageMetadata;

  const responseUsage = responseMetadata?.usage;
  if (responseUsage && typeof responseUsage === 'object' && !Array.isArray(responseUsage)) {
    const maybeFromResponseMetadataUsage = normalizeUsageDict(
      responseUsage as Record<string, unknown>,
    );
    if (maybeFromResponseMetadataUsage) return maybeFromResponseMetadataUsage;
  }

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

function pickString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const dict = value as Record<string, unknown>;
  const maybe = dict[key];
  return typeof maybe === 'string' ? maybe : undefined;
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
  // Official SiliconFlow usage payload (often cumulative per chunk).
  // We remove this whole object to prevent LangChain's concat/merge from seeing duplicate numbers.
  'usage',

  // Token usage counters that frequently repeat across streamed chunks.
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
