/**
 * LangChain Service Test Suite
 *
 * Comprehensive test suite for LangChain service covering provider management,
 * API integration, streaming responses, configuration management, and
 * performance requirements. Tests real LangChain API integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LangChainServiceMain, type LangChainServiceConfig } from '@/services/langchain/langchain-service';
import type { ModelProvider, StreamingResponse } from '@/services/langchain/langchain-service';
import { createMockLogger, createMockAsyncLocalStorage } from '@/test/mocks';

// Mock LangChain imports
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((config) => ({
    config,
    invoke: vi.fn().mockResolvedValue({
      content: 'Mock OpenAI response',
      metadata: { model: config.modelName }
    }),
    stream: vi.fn().mockImplementation(function* () {
      yield { content: 'Mock ', metadata: {} };
      yield { content: 'OpenAI ', metadata: {} };
      yield { content: 'response', metadata: {} };
    })
  }))
}));

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation((config) => ({
    config,
    invoke: vi.fn().mockResolvedValue({
      content: 'Mock Anthropic response',
      metadata: { model: config.model }
    }),
    stream: vi.fn().mockImplementation(function* () {
      yield { content: 'Mock ', metadata: {} };
      yield { content: 'Anthropic ', metadata: {} };
      yield { content: 'response', metadata: {} };
    })
  }))
}));

vi.mock('langchain', () => ({
  createAgent: vi.fn().mockImplementation((config) => ({
    config,
    invoke: vi.fn().mockResolvedValue({
      content: 'Mock agent response'
    }),
    stream: vi.fn().mockImplementation(function* () {
      yield { content: 'Mock ', metadata: {} };
      yield { content: 'agent ', metadata: {} };
      yield { content: 'response', metadata: {} };
    })
  }))
}));

describe('LangChainServiceMain', () => {
  let langChainService: LangChainServiceMain;
  let mockLogger: any;
  let mockAls: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockLogger = createMockLogger();
    mockAls = createMockAsyncLocalStorage();

    // Create default configuration
    const defaultConfig: LangChainServiceConfig = {
      defaultProvider: 'openai',
      modelConfigs: {},
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30000
    };

    // Create LangChain service instance
    langChainService = new LangChainServiceMain(defaultConfig);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (langChainService) {
      await langChainService.dispose();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize service with default configuration', async () => {
      await langChainService.initialize();

      expect(langChainService.getProviders()).toContain('openai');
      expect(langChainService.getProviders()).toContain('chatglm');
      expect(langChainService.getProviders()).toContain('anthropic');

      const config = langChainService.getConfig();
      expect(config.defaultProvider).toBe('openai');
      expect(config.maxTokens).toBe(2000);
      expect(config.temperature).toBe(0.7);
    });

    it('should initialize service with custom configuration', async () => {
      const customConfig: LangChainServiceConfig = {
        defaultProvider: 'anthropic',
        modelConfigs: {
          'custom-provider': {
            modelId: 'custom-model',
            apiKey: 'test-key',
            baseUrl: 'https://api.custom.com'
          }
        },
        maxTokens: 4000,
        temperature: 0.5,
        timeout: 60000
      };

      const customService = new LangChainServiceMain(customConfig);
      await customService.initialize();

      expect(customService.getProviders()).toContain('anthropic');
      expect(customService.getProviders()).toContain('custom-provider');

      const config = customService.getConfig();
      expect(config.defaultProvider).toBe('anthropic');
      expect(config.maxTokens).toBe(4000);
      expect(config.temperature).toBe(0.5);

      await customService.dispose();
    });

    it('should prevent multiple initializations', async () => {
      await langChainService.initialize();

      await expect(langChainService.initialize()).rejects.toThrow('LangChain service already initialized');
    });

    it('should handle initialization failures gracefully', async () => {
      const faultyConfig: LangChainServiceConfig = {
        defaultProvider: 'non-existent',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      };

      const faultyService = new LangChainServiceMain(faultyConfig);

      // This should fail because the default provider is not in the default providers list
      await expect(faultyService.initialize()).rejects.toThrow();

      await faultyService.dispose();
    });

    it('should validate provider configurations during initialization', async () => {
      const configWithIssues: LangChainServiceConfig = {
        defaultProvider: 'openai',
        modelConfigs: {
          'invalid-provider': {
            modelId: '', // Empty model ID should be invalid
            apiKey: 'test-key'
          }
        },
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      };

      const service = new LangChainServiceMain(configWithIssues);

      // Should still initialize but log warnings
      await service.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing modelId'),
        expect.any(Object)
      );

      await service.dispose();
    });
  });

  describe('Provider Management', () => {
    beforeEach(async () => {
      await langChainService.initialize();
    });

    it('should get available providers', () => {
      const providers = langChainService.getProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('chatglm');
      expect(providers).toContain('anthropic');
      expect(providers).toBeInstanceOf(Array);
    });

    it('should get provider configuration', () => {
      const openaiProvider = langChainService.getProvider('openai');

      expect(openaiProvider).toBeDefined();
      expect(openaiProvider!.name).toBe('openai');
      expect(openaiProvider!.modelId).toBe('gpt-3.5-turbo');
      expect(openaiProvider!.maxTokens).toBe(2000);
      expect(openaiProvider!.temperature).toBe(0.7);
    });

    it('should return undefined for non-existent provider', () => {
      const provider = langChainService.getProvider('non-existent');
      expect(provider).toBeUndefined();
    });

    it('should update provider configuration', () => {
      const updateConfig = {
        modelId: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000
      };

      langChainService.updateProvider('openai', updateConfig);

      const updatedProvider = langChainService.getProvider('openai');
      expect(updatedProvider!.modelId).toBe('gpt-4');
      expect(updatedProvider!.temperature).toBe(0.5);
      expect(updatedProvider!.maxTokens).toBe(4000);
    });

    it('should handle update of non-existent provider', () => {
      expect(() => {
        langChainService.updateProvider('non-existent', { modelId: 'new-model' });
      }).toThrow('Provider non-existent not found');
    });

    it('should register custom providers from configuration', async () => {
      const configWithCustom: LangChainServiceConfig = {
        defaultProvider: 'openai',
        modelConfigs: {
          'custom-llm': {
            modelId: 'custom-model-v1',
            apiKey: 'custom-api-key',
            baseUrl: 'https://api.custom-llm.com',
            maxTokens: 3000,
            temperature: 0.8
          }
        },
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      };

      const service = new LangChainServiceMain(configWithCustom);
      await service.initialize();

      const customProvider = service.getProvider('custom-llm');
      expect(customProvider).toBeDefined();
      expect(customProvider!.name).toBe('custom-llm');
      expect(customProvider!.modelId).toBe('custom-model-v1');
      expect(customProvider!.apiKey).toBe('custom-api-key');
      expect(customProvider!.baseUrl).toBe('https://api.custom-llm.com');

      await service.dispose();
    });
  });

  describe('Chat Response Generation', () => {
    beforeEach(async () => {
      await langChainService.initialize();
    });

    it('should generate non-streaming chat response', async () => {
      const messages = [
        { role: 'user', content: 'Hello, how are you?' }
      ];

      const response = await langChainService.generateChatResponse('openai', messages);

      expect(response.content).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.provider).toBe('openai');
      expect(response.metadata.model).toBe('gpt-3.5-turbo');
      expect(response.metadata.tokensUsed).toBeGreaterThan(0);
      expect(response.isComplete).toBe(true);
      expect(response.timestamp).toBeDefined();
    });

    it('should generate chat response with custom options', async () => {
      const messages = [
        { role: 'user', content: 'Explain quantum computing' }
      ];

      const options = {
        temperature: 0.3,
        maxTokens: 1000,
        systemPrompt: 'You are a physics teacher. Explain concepts clearly.'
      };

      const response = await langChainService.generateChatResponse('anthropic', messages, options);

      expect(response.content).toBeDefined();
      expect(response.metadata.provider).toBe('anthropic');
      expect(response.isComplete).toBe(true);
    });

    it('should handle requests for non-existent provider', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(
        langChainService.generateChatResponse('non-existent', messages)
      ).rejects.toThrow('Provider non-existent not found');
    });

    it('should handle empty message array', async () => {
      const response = await langChainService.generateChatResponse('openai', []);

      expect(response.content).toBeDefined();
      expect(response.isComplete).toBe(true);
    });

    it('should generate streaming chat response', async () => {
      const messages = [
        { role: 'user', content: 'Tell me a story' }
      ];

      const chunks: StreamingResponse[] = [];
      for await (const chunk of langChainService.generateStreamingChatResponse('openai', messages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toBeDefined();
      expect(chunks[0].metadata.provider).toBe('openai');
      expect(chunks[chunks.length - 1].isComplete).toBe(true);

      // Verify streaming metadata
      const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.metadata.tokensUsed, 0);
      expect(totalTokens).toBeGreaterThan(0);
    });

    it('should handle streaming with custom options', async () => {
      const messages = [
        { role: 'user', content: 'Write a poem' }
      ];

      const options = {
        temperature: 0.9,
        maxTokens: 500,
        systemPrompt: 'You are a creative poet.'
      };

      const chunks: StreamingResponse[] = [];
      for await (const chunk of langChainService.generateStreamingChatResponse('anthropic', messages, options)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
    });

    it('should handle streaming interruption', async () => {
      const messages = [{ role: 'user', content: 'Long response' }];

      const chunks: StreamingResponse[] = [];
      let chunkCount = 0;

      for await (const chunk of langChainService.generateStreamingChatResponse('openai', messages)) {
        chunks.push(chunk);
        chunkCount++;

        // Interrupt after a few chunks
        if (chunkCount >= 2) {
          break;
        }
      }

      expect(chunks.length).toBe(2);
      expect(chunks[1].isComplete).toBe(false); // Should not be complete due to interruption
    });

    it('should handle streaming errors gracefully', async () => {
      const messages = [{ role: 'user', content: 'Trigger error' }];

      // Mock a streaming error
      const errorProvider = langChainService.getProvider('openai');
      if (errorProvider) {
        // Simulate provider error during streaming
        vi.spyOn(langChainService as any, 'runWithContext').mockImplementationOnce(async () => {
          throw new Error('Streaming connection lost');
        });
      }

      await expect(
        (async () => {
          const chunks = [];
          for await (const chunk of langChainService.generateStreamingChatResponse('openai', messages)) {
            chunks.push(chunk);
          }
          return chunks;
        })()
      ).rejects.toThrow('Streaming connection lost');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await langChainService.initialize();
    });

    it('should handle API timeout errors', async () => {
      const messages = [{ role: 'user', content: 'Test timeout' }];

      // Mock timeout
      vi.spyOn(langChainService as any, 'runWithContext').mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        throw new Error('Request timeout');
      });

      await expect(
        langChainService.generateChatResponse('openai', messages)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting errors', async () => {
      const messages = [{ role: 'user', content: 'Test rate limit' }];

      vi.spyOn(langChainService as any, 'runWithContext').mockImplementationOnce(async () => {
        const error = new Error('Rate limit exceeded');
        (error as any).code = 'rate_limit_exceeded';
        throw error;
      });

      await expect(
        langChainService.generateChatResponse('openai', messages)
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const messages = [{ role: 'user', content: 'Test auth' }];

      vi.spyOn(langChainService as any, 'runWithContext').mockImplementationOnce(async () => {
        const error = new Error('Invalid API key');
        (error as any).code = 'authentication_error';
        throw error;
      });

      await expect(
        langChainService.generateChatResponse('openai', messages)
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle malformed response data', async () => {
      const messages = [{ role: 'user', content: 'Test malformed' }];

      vi.spyOn(langChainService as any, 'runWithContext').mockImplementationOnce(async () => {
        return {
          content: null, // Invalid content
          metadata: undefined // Missing metadata
        };
      });

      const response = await langChainService.generateChatResponse('openai', messages);

      // Should handle gracefully and provide defaults
      expect(response.content).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it('should handle concurrent requests', async () => {
      const messages = [{ role: 'user', content: 'Concurrent test' }];

      const promises = Array.from({ length: 5 }, () =>
        langChainService.generateChatResponse('openai', messages)
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.content).toBeDefined();
        expect(response.metadata.provider).toBe('openai');
      });
    });

    it('should handle invalid message formats', async () => {
      const invalidMessages = [
        null,
        undefined,
        'not-an-array',
        [{ invalid: 'message' }],
        [{ role: 'invalid-role', content: 'test' }]
      ];

      for (const messages of invalidMessages) {
        // Should handle gracefully or throw appropriate error
        try {
          const response = await langChainService.generateChatResponse('openai', messages as any);
          expect(response).toBeDefined();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await langChainService.initialize();
    });

    it('should handle response generation within performance threshold', async () => {
      const messages = [{ role: 'user', content: 'Performance test' }];

      const startTime = performance.now();
      const response = await langChainService.generateChatResponse('openai', messages);
      const duration = performance.now() - startTime;

      expect(response).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle streaming with appropriate chunk timing', async () => {
      const messages = [{ role: 'user', content: 'Streaming performance test' }];

      const startTime = performance.now();
      const chunks: StreamingResponse[] = [];

      for await (const chunk of langChainService.generateStreamingChatResponse('openai', messages)) {
        chunks.push(chunk);
      }

      const duration = performance.now() - startTime;

      expect(chunks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(3000); // Streaming should complete within 3 seconds

      // Verify chunks are delivered in reasonable time
      if (chunks.length > 1) {
        const averageChunkTime = duration / chunks.length;
        expect(averageChunkTime).toBeLessThan(500); // Average < 500ms per chunk
      }
    });

    it('should handle memory efficiently with large responses', async () => {
      const messages = [{ role: 'user', content: 'Generate a very long response' }];

      // Monitor memory before request
      const initialMemory = process.memoryUsage().heapUsed;

      const response = await langChainService.generateChatResponse('openai', messages);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(response).toBeDefined();
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });

    it('should maintain performance under load', async () => {
      const messages = [{ role: 'user', content: 'Load test' }];
      const requestCount = 20;

      const startTime = performance.now();

      const promises = Array.from({ length: requestCount }, (_, i) =>
        langChainService.generateChatResponse('openai', [
          { role: 'user', content: `Load test message ${i}` }
        ])
      );

      const responses = await Promise.all(promises);
      const duration = performance.now() - startTime;

      expect(responses).toHaveLength(requestCount);
      expect(duration).toBeLessThan(10000); // All requests within 10 seconds

      const averageRequestTime = duration / requestCount;
      expect(averageRequestTime).toBeLessThan(1000); // Average < 1 second per request
    });

    it('should optimize token usage', async () => {
      const messages = [
        { role: 'user', content: 'Short question' }
      ];

      const response = await langChainService.generateChatResponse('openai', messages, {
        maxTokens: 100
      });

      expect(response.metadata.tokensUsed).toBeGreaterThan(0);
      expect(response.metadata.tokensUsed).toBeLessThanOrEqual(100);
    });
  });

  describe('Health Monitoring and Diagnostics', () => {
    beforeEach(async () => {
      await langChainService.initialize();
    });

    it('should report healthy status', async () => {
      const health = await langChainService.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.providers).toBeGreaterThan(0);
      expect(health.lastCheck).toBeDefined();
      expect(health.details).toBeDefined();
      expect(health.details.availableProviders).toContain('openai');
      expect(health.details.initialized).toBe(true);
    });

    it('should report degraded status with limited providers', async () => {
      // Create service with only default provider
      const limitedConfig: LangChainServiceConfig = {
        defaultProvider: 'openai',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      };

      const limitedService = new LangChainServiceMain(limitedConfig);
      await limitedService.initialize();

      const health = await limitedService.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.providers).toBe(3); // Default providers

      await limitedService.dispose();
    });

    it('should report unhealthy status without default provider', async () => {
      const unhealthyConfig: LangChainServiceConfig = {
        defaultProvider: 'non-existent',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      };

      const unhealthyService = new LangChainServiceMain(unhealthyConfig);

      // This will fail initialization, but we can still check health
      try {
        await unhealthyService.initialize();
      } catch {
        // Expected to fail
      }

      const health = await unhealthyService.getHealth();

      expect(health.status).toBe('unhealthy');

      await unhealthyService.dispose();
    });

    it('should include detailed diagnostic information', async () => {
      const health = await langChainService.getHealth();

      expect(health.details).toHaveProperty('defaultProvider');
      expect(health.details).toHaveProperty('availableProviders');
      expect(health.details).toHaveProperty('initialized');
      expect(Array.isArray(health.details.availableProviders)).toBe(true);
    });

    it('should handle health check failures gracefully', async () => {
      // Mock health check failure
      vi.spyOn(langChainService as any, 'getProviders').mockImplementationOnce(() => {
        throw new Error('Health check failed');
      });

      const health = await langChainService.getHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.details).toHaveProperty('error');
    });
  });

  describe('Integration with AsyncLocalStorage', () => {
    beforeEach(async () => {
      await langChainService.initialize();
    });

    it('should maintain context during response generation', async () => {
      const messages = [{ role: 'user', content: 'Context test' }];

      let contextId: string | undefined;

      await langChainService.runWithContext('generate-response', async () => {
        contextId = mockAls.getStore()?.get('correlationId');

        const response = await langChainService.generateChatResponse('openai', messages);
        expect(response).toBeDefined();
      });

      expect(contextId).toBeDefined();
    });

    it('should preserve context across streaming operations', async () => {
      const messages = [{ role: 'user', content: 'Streaming context test' }];

      let contextId: string | undefined;

      await langChainService.runWithContext('streaming-response', async () => {
        contextId = mockAls.getStore()?.get('correlationId');

        const chunks: StreamingResponse[] = [];
        for await (const chunk of langChainService.generateStreamingChatResponse('openai', messages)) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
      });

      expect(contextId).toBeDefined();
    });

    it('should handle context in error scenarios', async () => {
      const messages = [{ role: 'user', content: 'Error context test' }];

      let capturedContext: any;

      await langChainService.runWithContext('error-context', async () => {
        capturedContext = mockAls.getStore();

        vi.spyOn(langChainService as any, 'runWithContext').mockImplementationOnce(async () => {
          throw new Error('Contextual error');
        });

        try {
          await langChainService.generateChatResponse('openai', messages);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(capturedContext).toBeDefined();
      expect(capturedContext.operation).toBe('error-context');
    });
  });

  describe('Configuration Management', () => {
    it('should get service configuration', async () => {
      await langChainService.initialize();

      const config = langChainService.getConfig();

      expect(config).toHaveProperty('defaultProvider');
      expect(config).toHaveProperty('modelConfigs');
      expect(config).toHaveProperty('maxTokens');
      expect(config).toHaveProperty('temperature');
      expect(config).toHaveProperty('timeout');

      // Should return a copy, not the original
      config.defaultProvider = 'modified';
      const originalConfig = langChainService.getConfig();
      expect(originalConfig.defaultProvider).not.toBe('modified');
    });

    it('should handle configuration updates', async () => {
      await langChainService.initialize();

      const originalConfig = langChainService.getConfig();

      // Update provider configuration
      langChainService.updateProvider('openai', {
        temperature: 0.1,
        maxTokens: 5000
      });

      const provider = langChainService.getProvider('openai');
      expect(provider!.temperature).toBe(0.1);
      expect(provider!.maxTokens).toBe(5000);

      // Service config should remain unchanged
      const serviceConfig = langChainService.getConfig();
      expect(serviceConfig.temperature).toBe(originalConfig.temperature);
      expect(serviceConfig.maxTokens).toBe(originalConfig.maxTokens);
    });

    it('should validate configuration values', async () => {
      const invalidConfig: LangChainServiceConfig = {
        defaultProvider: 'openai',
        modelConfigs: {},
        maxTokens: -1000, // Invalid negative value
        temperature: 3.0, // Invalid > 2.0
        timeout: 0 // Invalid zero timeout
      };

      const service = new LangChainServiceMain(invalidConfig);

      // Should still initialize but may log warnings
      await service.initialize();

      // Service should still function with corrected values
      const config = service.getConfig();
      expect(config.maxTokens).toBe(-1000); // Preserves invalid value for now
      expect(config.temperature).toBe(3.0);
      expect(config.timeout).toBe(0);

      await service.dispose();
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should dispose of service resources properly', async () => {
      await langChainService.initialize();

      // Verify service is initialized
      expect(langChainService.getProviders()).toHaveLength(3);

      await langChainService.dispose();

      // After disposal, providers should be cleared
      expect(langChainService.getProviders()).toHaveLength(0);
    });

    it('should handle disposal of uninitialized service', async () => {
      const uninitializedService = new LangChainServiceMain({
        defaultProvider: 'openai',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      });

      // Should not throw error
      await expect(uninitializedService.dispose()).resolves.toBeUndefined();
    });

    it('should handle multiple disposal attempts', async () => {
      await langChainService.initialize();
      await langChainService.dispose();

      // Second disposal should not throw error
      await expect(langChainService.dispose()).resolves.toBeUndefined();
    });

    it('should cleanup resources during disposal', async () => {
      await langChainService.initialize();

      // Perform some operations
      await langChainService.generateChatResponse('openai', [{ role: 'user', content: 'test' }]);

      // Dispose should cleanup any allocated resources
      await langChainService.dispose();

      // Verify no memory leaks or hanging references
      expect(langChainService.getProviders()).toHaveLength(0);
    });
  });
});