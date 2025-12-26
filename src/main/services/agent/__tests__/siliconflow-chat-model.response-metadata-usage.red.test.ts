import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { SiliconFlowChatModel } from '../siliconflow-chat-model';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * RED tests (TDD):
 * These describe the desired behavior: SiliconFlow streaming must not emit LangChain
 * "field[...] already exists ... unsupported type" warnings even when usage is repeated
 * in `message.response_metadata.usage` (OpenAI-compatible shape).
 *
 * They are expected to FAIL until SiliconFlowChatModel strips `response_metadata.usage`
 * (and token-details numeric fields like cached_tokens/audio_tokens) from streamed chunks.
 */
describe('SiliconFlowChatModel (RED) - response_metadata.usage warnings', () => {
  it('does not warn when cumulative usage is repeated under response_metadata.usage', async () => {
    const chunks = [
      new ChatGenerationChunk({
        text: 'a',
        message: new AIMessageChunk({
          content: 'a',
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 1,
              total_tokens: 11,
              prompt_tokens_details: { cached_tokens: 0 },
            },
          },
        }),
      }),
      new ChatGenerationChunk({
        text: 'b',
        message: new AIMessageChunk({
          content: 'b',
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 2,
              total_tokens: 12,
              prompt_tokens_details: { cached_tokens: 1 },
            },
          },
        }),
      }),
      new ChatGenerationChunk({
        text: 'c',
        message: new AIMessageChunk({
          content: 'c',
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 3,
              total_tokens: 13,
              prompt_tokens_details: { cached_tokens: 2 },
            },
          },
        }),
      }),
    ];

    vi.spyOn(ChatOpenAI.prototype as any, '_streamResponseChunks').mockImplementation(
      async function* () {
        for (const chunk of chunks) yield chunk;
      },
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const model = new SiliconFlowChatModel({
      modelName: 'siliconflow-test',
      apiKey: 'test-key',
      configuration: { baseURL: 'https://api.siliconflow.cn/v1' },
    });

    // Using model.stream() hits LangChain's internal aggregation path where warnings show up.
    const out: AIMessageChunk[] = [];
    const stream = await model.stream([] as any);
    for await (const chunk of stream as any) {
      out.push(chunk as AIMessageChunk);
    }

    expect(out).toHaveLength(3);

    // Desired behavior: no warnings during normal streaming.
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('strips response_metadata.usage so AIMessageChunk.concat cannot warn later', async () => {
    const chunks = [
      new ChatGenerationChunk({
        text: 'a',
        message: new AIMessageChunk({
          content: 'a',
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 1,
              total_tokens: 11,
              prompt_tokens_details: { cached_tokens: 0 },
            },
          },
        }),
      }),
      new ChatGenerationChunk({
        text: 'b',
        message: new AIMessageChunk({
          content: 'b',
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 2,
              total_tokens: 12,
              prompt_tokens_details: { cached_tokens: 1 },
            },
          },
        }),
      }),
    ];

    vi.spyOn(ChatOpenAI.prototype as any, '_streamResponseChunks').mockImplementation(
      async function* () {
        for (const chunk of chunks) yield chunk;
      },
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const model = new SiliconFlowChatModel({
      modelName: 'siliconflow-test',
      apiKey: 'test-key',
      configuration: { baseURL: 'https://api.siliconflow.cn/v1' },
    });

    const out: AIMessageChunk[] = [];
    const stream = await model.stream([] as any);
    for await (const chunk of stream as any) {
      out.push(chunk as AIMessageChunk);
    }

    expect(out).toHaveLength(2);

    // Desired behavior: usage is removed entirely (or becomes empty) to prevent merges warning.
    expect(out[0].response_metadata).toEqual(expect.not.objectContaining({ usage: expect.anything() }));
    expect(out[1].response_metadata).toEqual(expect.not.objectContaining({ usage: expect.anything() }));

    // And concat must not warn either.
    out[0].concat(out[1]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

