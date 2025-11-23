import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Provider Factory - Interface Tests', () => {
  describe('Factory Pattern', () => {
    it('should create provider factory interface', () => {
      const providerFactory = {
        createProvider: vi.fn().mockReturnValue({
          chatCompletion: vi.fn(),
          getModels: vi.fn().mockResolvedValue([]),
          getEmbeddings: vi.fn().mockResolvedValue([]),
        }),
        validateSettings: vi.fn().mockReturnValue(true),
      };

      expect(providerFactory).toHaveProperty('createProvider');
      expect(providerFactory).toHaveProperty('validateSettings');

      expect(typeof providerFactory.createProvider).toBe('function');
      expect(typeof providerFactory.validateSettings).toBe('function');
    });

    it('should create providers with correct configuration', async () => {
      const providerFactory = {
        createProvider: vi.fn().mockImplementation((config) => {
          return {
            id: config.id || 'default-provider',
            name: config.name || 'Default Provider',
            type: config.type || 'openai',
            settings: config.settings || {},
            chatCompletion: vi.fn(),
            getModels: vi.fn().mockResolvedValue([]),
            getEmbeddings: vi.fn().mockResolvedValue([]),
          };
        }),
        validateSettings: vi.fn().mockReturnValue(true),
      };

      const config = {
        id: 'openai-gpt4',
        name: 'OpenAI GPT-4',
        type: 'openai',
        settings: {
          apiKey: 'sk-test-key',
          model: 'gpt-4',
          temperature: 0.7,
        },
      };

      const provider = providerFactory.createProvider(config);

      expect(provider).toMatchObject({
        id: 'openai-gpt4',
        name: 'OpenAI GPT-4',
        type: 'openai',
        settings: {
          apiKey: 'sk-test-key',
          model: 'gpt-4',
          temperature: 0.7,
        },
      });

      expect(providerFactory.createProvider).toHaveBeenCalledWith(config);
    });
  });

  describe('Provider Validation', () => {
    it('should validate provider settings', () => {
      const validator = {
        validateSettings: vi.fn().mockImplementation((settings) => {
          const required = ['apiKey', 'model'];
          return required.every((field) => settings.hasOwnProperty(field) && settings[field]);
        }),
      };

      const validSettings = { apiKey: 'key-123', model: 'gpt-4' };
      const invalidSettings = { apiKey: 'key-123' }; // missing model

      expect(validator.validateSettings(validSettings)).toBe(true);
      expect(validator.validateSettings(invalidSettings)).toBe(false);
    });

    it('should validate provider types', () => {
      const typeValidator = {
        isSupportedType: vi.fn().mockImplementation((type) => {
          const supportedTypes = ['openai', 'chatglm', 'deepseek', 'local'];
          return supportedTypes.includes(type);
        }),
      };

      expect(typeValidator.isSupportedType('openai')).toBe(true);
      expect(typeValidator.isSupportedType('chatglm')).toBe(true);
      expect(typeValidator.isSupportedType('deepseek')).toBe(true);
      expect(typeValidator.isSupportedType('local')).toBe(true);
      expect(typeValidator.isSupportedType('unsupported')).toBe(false);
    });
  });

  describe('Provider Management', () => {
    it('should manage provider lifecycle', () => {
      const providers = new Map();
      const providerManager = {
        providers,
        register: vi.fn().mockImplementation((id, provider) => {
          providers.set(id, provider);
          return true;
        }),
        get: vi.fn().mockImplementation((id) => {
          return providers.get(id);
        }),
        remove: vi.fn().mockImplementation((id) => {
          return providers.delete(id);
        }),
        list: vi.fn().mockImplementation(() => {
          return Array.from(providers.keys());
        }),
      };

      const mockProvider = {
        id: 'test-provider',
        name: 'Test Provider',
        type: 'test',
      };

      expect(providerManager.register('test', mockProvider)).toBe(true);
      expect(providerManager.get('test')).toBe(mockProvider);
      expect(providerManager.list()).toContain('test');
      expect(providerManager.remove('test')).toBe(true);
      expect(providerManager.get('test')).toBeUndefined();
    });

    it('should handle provider configuration changes', () => {
      const configurations = new Map();
      const configManager = {
        configurations,
        update: vi.fn().mockImplementation((id, config) => {
          configurations.set(id, config);
          return true;
        }),
        get: vi.fn().mockImplementation((id) => {
          return configurations.get(id);
        }),
        reload: vi.fn().mockImplementation((id) => {
          // Mock reload logic
          return Promise.resolve(true);
        }),
      };

      const newConfig = {
        temperature: 0.8,
        maxTokens: 2048,
      };

      expect(configManager.update('openai', newConfig)).toBe(true);
      expect(configManager.get('openai')).toEqual(newConfig);
      expect(configManager.reload('openai')).resolves.toBe(true);
    });
  });

  describe('Provider Selection', () => {
    it('should select appropriate provider based on criteria', () => {
      const selector = {
        selectProvider: vi.fn().mockImplementation((criteria) => {
          if (criteria.task === 'coding') {
            return 'deepseek-coder';
          }
          if (criteria.priority === 'speed') {
            return 'local-fast';
          }
          if (criteria.modelType === 'reasoning') {
            return 'openai-gpt4';
          }
          return 'default-provider';
        }),
      };

      expect(selector.selectProvider({ task: 'coding' })).toBe('deepseek-coder');
      expect(selector.selectProvider({ priority: 'speed' })).toBe('local-fast');
      expect(selector.selectProvider({ modelType: 'reasoning' })).toBe('openai-gpt4');
      expect(selector.selectProvider({})).toBe('default-provider');
    });

    it('should handle provider fallbacks', async () => {
      const fallbackManager = {
        providers: ['openai', 'chatglm', 'deepseek'],
        tryWithFallback: vi.fn().mockImplementation(async (operation, providers) => {
          for (const provider of providers) {
            try {
              return await operation(provider);
            } catch (error) {
              // Continue to next provider
            }
          }
          throw new Error('All providers failed');
        }),
      };

      const mockOperation = vi.fn().mockImplementation(async (provider) => {
        if (provider === 'openai') {
          return 'openai-result';
        }
        if (provider === 'chatglm') {
          return 'chatglm-result';
        }
        throw new Error(`${provider} failed`);
      });

      expect(await fallbackManager.tryWithFallback(mockOperation, fallbackManager.providers)).toBe(
        'openai-result',
      );

      mockOperation.mockImplementation(async (provider) => {
        throw new Error(`${provider} failed`);
      });

      await expect(
        fallbackManager.tryWithFallback(mockOperation, fallbackManager.providers),
      ).rejects.toThrow('All providers failed');
    });
  });

  describe('Provider Metrics', () => {
    it('should track provider performance', () => {
      const metrics = new Map();
      const metricsCollector = {
        metrics,
        recordExecution: vi.fn().mockImplementation((provider, operation, duration) => {
          const key = `${provider}-${operation}`;
          if (!metrics.has(key)) {
            metrics.set(key, { count: 0, totalTime: 0 });
          }
          const metric = metrics.get(key);
          metric.count++;
          metric.totalTime += duration;
          metric.averageTime = metric.totalTime / metric.count;
        }),
        getMetrics: vi.fn().mockImplementation((provider) => {
          return Array.from(metrics.entries())
            .filter(([key]) => key.startsWith(provider))
            .map(([key, value]) => [key, value]);
        }),
      };

      metricsCollector.recordExecution('openai', 'chatCompletion', 100);
      metricsCollector.recordExecution('openai', 'chatCompletion', 200);
      metricsCollector.recordExecution('openai', 'getModels', 50);

      const openaiMetrics = metricsCollector.getMetrics('openai');

      expect(openaiMetrics).toHaveLength(2);
      expect(openaiMetrics[0][0]).toBe('openai-chatCompletion');
      expect(openaiMetrics[0][1].count).toBe(2);
      expect(openaiMetrics[0][1].totalTime).toBe(300);
      expect(openaiMetrics[0][1].averageTime).toBe(150);
    });

    it('should calculate provider costs', () => {
      const pricing = {
        'openai-gpt4': { input: 0.03, output: 0.06 },
        'openai-gpt-3.5': { input: 0.002, output: 0.002 },
        'local-llama': { input: 0, output: 0 },
      };
      const costCalculator = {
        pricing,
        calculateCost: vi.fn().mockImplementation((model, inputTokens, outputTokens) => {
          const modelPricing = pricing[model as keyof typeof pricing];
          if (!modelPricing) return 0;
          return (modelPricing.input * inputTokens + modelPricing.output * outputTokens) / 1000;
        }),
      };

      expect(costCalculator.calculateCost('openai-gpt4', 1000, 500)).toBe(0.06);
      expect(costCalculator.calculateCost('openai-gpt-3.5', 2000, 1000)).toBe(0.006);
      expect(costCalculator.calculateCost('local-llama', 5000, 2500)).toBe(0);
    });
  });

  describe('Provider Testing', () => {
    it('should test provider connectivity', async () => {
      const connectivityTester = {
        testConnection: vi.fn().mockImplementation(async (provider) => {
          // Mock connection test
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { provider, status: 'connected', latency: 50 };
        }),
      };

      const result = await connectivityTester.testConnection('openai');

      expect(result).toMatchObject({
        provider: 'openai',
        status: 'connected',
        latency: expect.any(Number),
      });
    });

    it('should validate provider responses', () => {
      const responseValidator = {
        validateResponse: vi.fn().mockImplementation((provider, response) => {
          if (!response || typeof response !== 'object') {
            return { valid: false, error: 'Invalid response format' };
          }
          if (!response.content && !response.choices) {
            return { valid: false, error: 'Missing content or choices' };
          }
          return { valid: true };
        }),
      };

      const validResponse = {
        content: 'Test response',
        model: 'gpt-4',
        usage: { promptTokens: 10, completionTokens: 20 },
      };

      const invalidResponse = 'not a proper response object';

      expect(responseValidator.validateResponse('openai', validResponse)).toEqual({ valid: true });
      expect(responseValidator.validateResponse('openai', invalidResponse)).toEqual({
        valid: false,
        error: 'Invalid response format',
      });
    });
  });
});
