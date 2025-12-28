import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessageChunk, ChatMessageChunk } from '@langchain/core/messages';
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
  it('does not warn when repeated usage fields come from generationInfo on non-AI chunks', async () => {
    const chunks = [
      new ChatGenerationChunk({
        text: 'a',
        message: new ChatMessageChunk({
          content: 'a',
          role: 'assistant',
          response_metadata: { model_provider: 'siliconflow' },
          additional_kwargs: {},
        }),
        generationInfo: { completion_tokens: 1, total_tokens: 11 },
      }),
      new ChatGenerationChunk({
        text: 'b',
        message: new ChatMessageChunk({
          content: 'b',
          role: 'assistant',
          response_metadata: { model_provider: 'siliconflow' },
          additional_kwargs: {},
        }),
        generationInfo: { completion_tokens: 2, total_tokens: 12 },
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

    const out: ChatMessageChunk[] = [];
    const stream = await model.stream([] as any);
    for await (const chunk of stream as any) {
      out.push(chunk as ChatMessageChunk);
    }

    expect(out).toHaveLength(2);
    expect(ChatMessageChunk.isInstance(out[0])).toBe(true);
    expect(ChatMessageChunk.isInstance(out[1])).toBe(true);

    // Desired behavior: usage-like numeric fields are stripped before LangChain merges,
    // so concat cannot warn.
    expect(out[0].response_metadata).toEqual(
      expect.not.objectContaining({ completion_tokens: expect.anything(), total_tokens: expect.anything() }),
    );
    expect(out[1].response_metadata).toEqual(
      expect.not.objectContaining({ completion_tokens: expect.anything(), total_tokens: expect.anything() }),
    );

    out[0].concat(out[1]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

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

  it('extracts delta.reasoning_content from __raw_response and keeps it LangChain-friendly (string)', async () => {
    const chunks = [
      new ChatGenerationChunk({
        text: '',
        message: new AIMessageChunk({
          content: '',
          additional_kwargs: {
            __raw_response: {
              id: 'test-id',
              object: 'chat.completion.chunk',
              created: 0,
              model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
              choices: [{ index: 0, delta: { content: null, reasoning_content: '', role: 'assistant' } }],
              usage: { prompt_tokens: 83, completion_tokens: 0, total_tokens: 83 },
            },
          },
          response_metadata: {
            model_provider: 'openai',
            usage: { prompt_tokens: 83, completion_tokens: 0, total_tokens: 83 },
          },
        }),
      }),
      new ChatGenerationChunk({
        text: '',
        message: new AIMessageChunk({
          content: '',
          additional_kwargs: {
            __raw_response: {
              id: 'test-id',
              object: 'chat.completion.chunk',
              created: 0,
              model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
              choices: [{ index: 0, delta: { content: null, reasoning_content: '\n', role: 'assistant' } }],
              usage: { prompt_tokens: 83, completion_tokens: 1, total_tokens: 84 },
            },
          },
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 83,
              completion_tokens: 1,
              total_tokens: 84,
              completion_tokens_details: { reasoning_tokens: 1 },
            },
          },
        }),
      }),
      new ChatGenerationChunk({
        text: '',
        message: new AIMessageChunk({
          content: '',
          additional_kwargs: {
            __raw_response: {
              id: 'test-id',
              object: 'chat.completion.chunk',
              created: 0,
              model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
              choices: [{ index: 0, delta: { content: null, reasoning_content: 'Okay', role: 'assistant' } }],
              usage: { prompt_tokens: 83, completion_tokens: 2, total_tokens: 85 },
            },
          },
          response_metadata: {
            model_provider: 'openai',
            usage: {
              prompt_tokens: 83,
              completion_tokens: 2,
              total_tokens: 85,
              completion_tokens_details: { reasoning_tokens: 2 },
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

    expect(out).toHaveLength(3);

    // Each chunk carries only the delta. Accumulation is done by the consumer (or via concat).
    const r0 = (out[0].additional_kwargs as any).reasoning_content;
    const r1 = (out[1].additional_kwargs as any).reasoning_content;
    const r2 = (out[2].additional_kwargs as any).reasoning_content;
    expect([r0, r1, r2]).toEqual(['', '\n', 'Okay']);

    // Raw payload is removed to avoid retaining large SSE chunks in memory.
    expect(out[0].additional_kwargs).toEqual(expect.not.objectContaining({ __raw_response: expect.anything() }));
    expect(out[1].additional_kwargs).toEqual(expect.not.objectContaining({ __raw_response: expect.anything() }));
    expect(out[2].additional_kwargs).toEqual(expect.not.objectContaining({ __raw_response: expect.anything() }));

    // Usage keys are stripped so LangChain merge/concat cannot warn on repeated numbers.
    expect(out[0].response_metadata).toEqual(expect.not.objectContaining({ usage: expect.anything() }));
    expect(out[1].response_metadata).toEqual(expect.not.objectContaining({ usage: expect.anything() }));
    expect(out[2].response_metadata).toEqual(expect.not.objectContaining({ usage: expect.anything() }));

    const combined = out[0].concat(out[1]).concat(out[2]);
    expect((combined.additional_kwargs as any).reasoning_content).toBe('\nOkay');

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('extracts delta.reasoning_content into additional_kwargs for non-AI chunks (ChatMessageChunk)', async () => {
    const chunks = [
      new ChatGenerationChunk({
        text: '',
        message: new ChatMessageChunk({
          content: '',
          role: 'assistant',
          response_metadata: { model_provider: 'openai' },
          additional_kwargs: {
            __raw_response: {
              choices: [{ index: 0, delta: { content: null, reasoning_content: 'R1', role: 'assistant' } }],
            },
          },
        }),
      }),
      new ChatGenerationChunk({
        text: '',
        message: new ChatMessageChunk({
          content: '',
          role: 'assistant',
          response_metadata: { model_provider: 'openai' },
          additional_kwargs: {
            __raw_response: {
              choices: [{ index: 0, delta: { content: null, reasoning_content: 'R2', role: 'assistant' } }],
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

    const model = new SiliconFlowChatModel({
      modelName: 'siliconflow-test',
      apiKey: 'test-key',
      configuration: { baseURL: 'https://api.siliconflow.cn/v1' },
    });

    const out: ChatMessageChunk[] = [];
    const stream = await model.stream([] as any);
    for await (const chunk of stream as any) {
      out.push(chunk as ChatMessageChunk);
    }

    expect(out).toHaveLength(2);
    expect((out[0].additional_kwargs as any).reasoning_content).toBe('R1');
    expect((out[1].additional_kwargs as any).reasoning_content).toBe('R2');
    expect(out[0].additional_kwargs).toEqual(expect.not.objectContaining({ __raw_response: expect.anything() }));
    expect(out[1].additional_kwargs).toEqual(expect.not.objectContaining({ __raw_response: expect.anything() }));
  });
});
