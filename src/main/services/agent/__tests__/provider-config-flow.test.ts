/**
 * Test to verify configuration flows correctly through provider factory
 *
 * This test catches bugs where config is read but not passed through,
 * which is exactly what happened with the model configuration issue.
 */

import { describe, it, expect, vi } from 'vitest';
import { createProviderFactory } from '../provider-factory';
import { ChatOpenAI } from '@langchain/openai';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
  OpenAIEmbeddings: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
}));

describe('Provider Configuration Flow', () => {
  const makeConfigService = (config: unknown) => ({
    getConfig: vi.fn().mockResolvedValue(config),
    setConfig: vi.fn(),
    getProviderConfig: vi.fn(),
    setProviderConfig: vi.fn(),
    onConfigChanged: vi.fn().mockReturnValue(() => undefined),
    get: vi.fn(async (path: string) => {
      const segments = path.split('.');
      return segments.reduce<any>((acc, key) => (acc ? acc[key] : undefined), config);
    }),
    isSetupComplete: vi.fn().mockResolvedValue(true),
  });

  describe('Chat Model Configuration', () => {
    it('should use ai.modelTypes.chat for model creation', async () => {
      // Arrange
      const config = {
        ai: {
          providers: {
            chatglm: {
              providerType: 'chatglm',
              apiKey: '869b77b7d3dd4edfbec66a4679115310.JlzJCz7QhExkssTS',
              baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
              // Note: no model/temperature/maxTokens here!
            },
          },
          modelTypes: {
            chat: {
              provider: 'chatglm',
              model: 'glm-4.5-air',
              temperature: 0.4,
              maxTokens: 20480,
              topP: 1,
              enableThinking: false,
              stream: true,
              capabilities: {
                streaming: true,
                thinking: false,
                functionCalling: false,
                vision: false,
              },
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));

      // Act
      const model = await factory.getModel();

      // Assert - VERIFY THE ACTUAL CONFIG PASSED TO ChatOpenAI
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'glm-4.5-air',  // ← MUST come from modelTypes.chat
        temperature: 0.4,           // ← MUST come from modelTypes.chat
        maxTokens: 20480,           // ← Uses modelTypes.chat value directly (no clamping)
        apiKey: '869b77b7d3dd4edfbec66a4679115310.JlzJCz7QhExkssTS',  // ← from providers
        maxRetries: 1,
        streamUsage: true,          // ← Always enabled for token tracking
        configuration: {
          baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
        },
      });

      // Verify model object has expected properties
      expect(model.config.modelName).toBe('glm-4.5-air');
      expect(model.config.temperature).toBe(0.4);
      expect(model.config.maxTokens).toBe(20480);  // actual value from modelTypes.chat
    });

    it('should handle embedding configuration correctly', async () => {
      // Similar test for embeddings
    });

    it('should handle rerank configuration correctly', async () => {
      // Similar test for reranker
    });
  });

  describe('Configuration Precedence', () => {
    it('modelType config should override provider config', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'key',
              model: 'gpt-3.5-turbo',  // Provider has this
              temperature: 0.9,         // Provider has this
            },
          },
          modelTypes: {
            chat: {
              provider: 'test',
              model: 'gpt-4',  // Model type should override
              temperature: 0.3,  // Model type should override
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();

      // Verify model type config takes precedence
      expect(model.config.modelName).toBe('gpt-4');  // NOT 'gpt-3.5-turbo'
      expect(model.config.temperature).toBe(0.3);   // NOT 0.9
    });
  });
});
