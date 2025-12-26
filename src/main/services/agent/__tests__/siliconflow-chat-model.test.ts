import { describe, expect, it, vi, afterEach } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import type { AppConfig } from '@/shared/types';
import type { ConfigService } from '@/main/services/core/config/config-service';
import { createProviderFactory } from '../provider-factory';
import { SiliconFlowChatModel } from '../siliconflow-chat-model';

const createChatChunk = (
  content: string,
  options?: {
    usage?: Record<string, unknown>;
    responseMetadata?: Record<string, unknown>;
    additionalKwargs?: Record<string, unknown>;
  },
) =>
  new ChatGenerationChunk({
    text: content,
    message: new AIMessageChunk({
      content,
      usage_metadata: options?.usage,
      response_metadata: options?.responseMetadata,
      additional_kwargs: options?.additionalKwargs,
    }),
  });

const createMockConfigService = (config: Partial<AppConfig>): ConfigService =>
  ({
    getConfig: vi.fn().mockResolvedValue(config),
    setConfig: vi.fn(),
    getProviderConfig: vi.fn(),
    setProviderConfig: vi.fn(),
    onConfigChanged: vi.fn().mockReturnValue(() => undefined),
    get: vi.fn().mockResolvedValue(undefined),
    isSetupComplete: vi.fn().mockResolvedValue(true),
  }) as unknown as ConfigService;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SiliconFlowChatModel', () => {
  it('converts cumulative usage_metadata to per-chunk deltas', async () => {
    const chunks = [
      createChatChunk('a', { usage: { input_tokens: 10, output_tokens: 1, total_tokens: 11 } }),
      createChatChunk('b', { usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } }),
      createChatChunk('c', { usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13 } }),
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

    const out: ChatGenerationChunk[] = [];
    for await (const chunk of (model as any)._streamResponseChunks([], {})) {
      out.push(chunk);
    }

    expect(out).toHaveLength(3);
    expect((out[0].message as AIMessageChunk).usage_metadata).toEqual({
      input_tokens: 10,
      output_tokens: 1,
      total_tokens: 11,
    });
    expect((out[1].message as AIMessageChunk).usage_metadata).toEqual({
      input_tokens: 0,
      output_tokens: 1,
      total_tokens: 1,
    });
    expect((out[2].message as AIMessageChunk).usage_metadata).toEqual({
      input_tokens: 0,
      output_tokens: 1,
      total_tokens: 1,
    });

    let final = out[0].message as AIMessageChunk;
    for (let i = 1; i < out.length; i++) {
      final = final.concat(out[i].message as AIMessageChunk);
    }

    expect(final.usage_metadata).toEqual({
      input_token_details: {},
      input_tokens: 10,
      output_token_details: {},
      output_tokens: 3,
      total_tokens: 13,
    });
  });

  it('avoids duplicate-field warnings when usage fields arrive via generationInfo', async () => {
    const chunks = [
      new ChatGenerationChunk({
        text: 'a',
        generationInfo: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 },
        message: new AIMessageChunk({ content: 'a' }),
      }),
      new ChatGenerationChunk({
        text: 'b',
        generationInfo: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
        message: new AIMessageChunk({ content: 'b' }),
      }),
      new ChatGenerationChunk({
        text: 'c',
        generationInfo: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 },
        message: new AIMessageChunk({ content: 'c' }),
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
    expect(warnSpy).not.toHaveBeenCalled();
    expect(out[0].response_metadata).toEqual({});
    expect(out[1].response_metadata).toEqual({});
    expect(out[2].response_metadata).toEqual({});
  });

  it('avoids duplicate-field merge warnings during AIMessageChunk.concat()', async () => {
    const chunks = [
      createChatChunk('a', {
        responseMetadata: { prompt_tokens: 10, completion_tokens: 1, reasoning_tokens: 0, total_tokens: 11 },
      }),
      createChatChunk('b', {
        responseMetadata: { prompt_tokens: 10, completion_tokens: 2, reasoning_tokens: 0, total_tokens: 12 },
      }),
      createChatChunk('c', {
        responseMetadata: { prompt_tokens: 10, completion_tokens: 3, reasoning_tokens: 1, total_tokens: 14 },
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

    const out: ChatGenerationChunk[] = [];
    for await (const chunk of (model as any)._streamResponseChunks([], {})) {
      out.push(chunk);
    }

    let final = out[0].message as AIMessageChunk;
    for (let i = 1; i < out.length; i++) {
      final = final.concat(out[i].message as AIMessageChunk);
    }

    expect(warnSpy).not.toHaveBeenCalled();
    expect(final.response_metadata).toEqual({});
    expect(final.usage_metadata).toEqual({
      input_token_details: {},
      input_tokens: 10,
      output_token_details: { reasoning: 1 },
      output_tokens: 4,
      total_tokens: 14,
    });
  });

  it('handles streams with no usage_metadata', async () => {
    const chunks = [createChatChunk('a'), createChatChunk('b'), createChatChunk('c')];

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

    const out: ChatGenerationChunk[] = [];
    for await (const chunk of (model as any)._streamResponseChunks([], {})) {
      out.push(chunk);
    }

    expect(out).toHaveLength(3);
    expect((out[0].message as AIMessageChunk).usage_metadata).toBeUndefined();
    expect((out[1].message as AIMessageChunk).usage_metadata).toBeUndefined();
    expect((out[2].message as AIMessageChunk).usage_metadata).toBeUndefined();
  });

  it('handles empty streams', async () => {
    vi.spyOn(ChatOpenAI.prototype as any, '_streamResponseChunks').mockImplementation(
      async function* () {
        // no chunks
      },
    );

    const model = new SiliconFlowChatModel({
      modelName: 'siliconflow-test',
      apiKey: 'test-key',
      configuration: { baseURL: 'https://api.siliconflow.cn/v1' },
    });

    const out: ChatGenerationChunk[] = [];
    for await (const chunk of (model as any)._streamResponseChunks([], {})) {
      out.push(chunk);
    }

    expect(out).toHaveLength(0);
  });
});

describe('Provider factory (SiliconFlow)', () => {
  it('uses SiliconFlowChatModel for siliconflow and keeps other providers unchanged', async () => {
    const config: Partial<AppConfig> = {
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: 'openai-key',
          },
          chatglm: {
            providerType: 'chatglm',
            apiKey: 'chatglm-key',
          },
          deepseek: {
            providerType: 'deepseek',
            apiKey: 'deepseek-key',
          },
          siliconflow: {
            providerType: 'siliconflow',
            apiKey: 'siliconflow-key',
            baseUrl: 'https://api.siliconflow.cn/v1',
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            temperature: 0,
            maxTokens: 256,
          },
        },
      },
    };

    const factory = createProviderFactory(createMockConfigService(config));

    const openAiModel = await factory.getModel('openai');
    expect(openAiModel).not.toBeInstanceOf(SiliconFlowChatModel);

    const chatglmModel = await factory.getModel('chatglm');
    expect(chatglmModel).not.toBeInstanceOf(SiliconFlowChatModel);

    const deepseekModel = await factory.getModel('deepseek');
    expect(deepseekModel).not.toBeInstanceOf(SiliconFlowChatModel);

    const siliconflowModel = await factory.getModel('siliconflow');
    expect(siliconflowModel).toBeInstanceOf(SiliconFlowChatModel);
  });
});
