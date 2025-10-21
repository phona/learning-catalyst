import { AIProviderFactory } from '@/services/ai/factory';
import type { AIProvider, ProviderConfig } from '@/types/ai';
import { vi } from 'vitest';

// Mock provider classes
class MockProvider implements AIProvider {
  name = 'mock';
  initialized = false;

  async initialize(config: ProviderConfig): Promise<void> {
    this.initialized = true;
  }

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    return !!config.api_key;
  }

  async sendMessage(message: string, options?: any): Promise<any> {
    return { content: 'Mock response' };
  }

  async *streamResponse(message: string, options?: any): AsyncGenerator<any, void, unknown> {
    yield { content: 'Mock stream' };
  }

  getModels(): Promise<string[]> {
    return Promise.resolve(['mock-model']);
  }

  getProviderInfo() {
    return { name: this.name, version: '1.0.0' };
  }
}

describe('AIProviderFactory', () => {
  beforeEach(() => {
    // Reset the factory state before each test
    // Note: This requires access to private static property, which might need to be exposed for testing
    // For now, we'll work with the assumption that the factory is properly reset between tests
  });

  describe('Provider Registration', () => {
    it('has built-in providers registered', () => {
      const providers = AIProviderFactory.getAvailableProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('chatglm');
      expect(providers).toContain('deepseek');
      expect(providers).toContain('siliconflow');
    });

    it('registers custom provider', () => {
      const initialCount = AIProviderFactory.getAvailableProviders().length;

      AIProviderFactory.registerProvider('custom', () => new MockProvider());

      const providers = AIProviderFactory.getAvailableProviders();
      expect(providers).toContain('custom');
      expect(providers.length).toBe(initialCount + 1);
    });

    it('registers provider case-insensitively', () => {
      AIProviderFactory.registerProvider('TestProvider', () => new MockProvider());

      expect(AIProviderFactory.isProviderRegistered('testprovider')).toBe(true);
      expect(AIProviderFactory.isProviderRegistered('TestProvider')).toBe(true);
      expect(AIProviderFactory.isProviderRegistered('TESTPROVIDER')).toBe(true);
    });
  });

  describe('Provider Creation', () => {
    const mockConfig: ProviderConfig = {
      name: 'mock',
      api_key: 'test-key',
      base_url: 'https://api.mock.com',
      timeout: 30000,
      max_retries: 3,
    };

    beforeEach(() => {
      AIProviderFactory.registerProvider('test', () => new MockProvider());
    });

    it('creates provider instance successfully', async () => {
      const provider = await AIProviderFactory.createProvider('test', mockConfig);

      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.name).toBe('mock');
      expect((provider as MockProvider).initialized).toBe(true);
    });

    it('throws error for unregistered provider', async () => {
      await expect(
        AIProviderFactory.createProvider('nonexistent', mockConfig)
      ).rejects.toThrow("Provider 'nonexistent' is not registered");
    });

    it('handles provider initialization errors', async () => {
      class FailingProvider extends MockProvider {
        async initialize(config: ProviderConfig): Promise<void> {
          throw new Error('Initialization failed');
        }
      }

      AIProviderFactory.registerProvider('failing', () => new FailingProvider());

      await expect(
        AIProviderFactory.createProvider('failing', mockConfig)
      ).rejects.toThrow('Initialization failed');
    });

    it('creates provider with case-insensitive name', async () => {
      const provider1 = await AIProviderFactory.createProvider('test', mockConfig);
      const provider2 = await AIProviderFactory.createProvider('TEST', mockConfig);

      expect(provider1).toBeInstanceOf(MockProvider);
      expect(provider2).toBeInstanceOf(MockProvider);
    });
  });

  describe('Provider Information', () => {
    beforeEach(() => {
      AIProviderFactory.registerProvider('test', () => new MockProvider());
    });

    it('gets available providers list', () => {
      const providers = AIProviderFactory.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('checks if provider is registered', () => {
      expect(AIProviderFactory.isProviderRegistered('test')).toBe(true);
      expect(AIProviderFactory.isProviderRegistered('nonexistent')).toBe(false);
    });

    it('gets provider instance without initialization', () => {
      const provider = AIProviderFactory.getProviderInstance('test');

      expect(provider).toBeInstanceOf(MockProvider);
      expect((provider as MockProvider).initialized).toBe(false);
    });

    it('returns null for non-registered provider instance', () => {
      const provider = AIProviderFactory.getProviderInstance('nonexistent');
      expect(provider).toBeNull();
    });
  });

  describe('Configuration Validation', () => {
    const validConfig: ProviderConfig = {
      name: 'test',
      api_key: 'valid-key',
    };

    const invalidConfig: ProviderConfig = {
      name: 'test',
      api_key: '',
    };

    beforeEach(() => {
      AIProviderFactory.registerProvider('validation-test', () => new MockProvider());
    });

    it('validates provider configuration successfully', async () => {
      const isValid = await AIProviderFactory.validateProviderConfig('validation-test', validConfig);
      expect(isValid).toBe(true);
    });

    it('fails validation for invalid configuration', async () => {
      const isValid = await AIProviderFactory.validateProviderConfig('validation-test', invalidConfig);
      expect(isValid).toBe(false);
    });

    it('fails validation for non-registered provider', async () => {
      const isValid = await AIProviderFactory.validateProviderConfig('nonexistent', validConfig);
      expect(isValid).toBe(false);
    });

    it('handles validation errors gracefully', async () => {
      class ErrorProvider extends MockProvider {
        async validateConfig(config: ProviderConfig): Promise<boolean> {
          throw new Error('Validation error');
        }
      }

      AIProviderFactory.registerProvider('error-provider', () => new ErrorProvider());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      const isValid = await AIProviderFactory.validateProviderConfig('error-provider', validConfig);

      expect(isValid).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to validate config for provider error-provider:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Default Configuration', () => {
    it('returns default config for OpenAI', () => {
      const config = AIProviderFactory.getDefaultConfig('openai');

      expect(config.name).toBe('openai');
      expect(config.base_url).toBe('https://api.openai.com/v1');
      expect(config.timeout).toBe(30000);
      expect(config.max_retries).toBe(3);
    });

    it('returns default config for ChatGLM', () => {
      const config = AIProviderFactory.getDefaultConfig('chatglm');

      expect(config.name).toBe('chatglm');
      expect(config.base_url).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(config.timeout).toBe(60000);
      expect(config.max_retries).toBe(3);
    });

    it('returns default config for DeepSeek', () => {
      const config = AIProviderFactory.getDefaultConfig('deepseek');

      expect(config.name).toBe('deepseek');
      expect(config.base_url).toBe('https://api.deepseek.com/v1');
      expect(config.timeout).toBe(30000);
      expect(config.max_retries).toBe(3);
    });

    it('returns default config for SiliconFlow', () => {
      const config = AIProviderFactory.getDefaultConfig('siliconflow');

      expect(config.name).toBe('siliconflow');
      expect(config.base_url).toBe('https://api.siliconflow.cn/v1');
      expect(config.timeout).toBe(30000);
      expect(config.max_retries).toBe(3);
    });

    it('returns generic default config for unknown provider', () => {
      const config = AIProviderFactory.getDefaultConfig('unknown');

      expect(config.name).toBe('unknown');
      expect(config.timeout).toBe(30000);
      expect(config.max_retries).toBe(3);
      expect(config.base_url).toBeUndefined();
    });

    it('handles case-insensitive provider names for default config', () => {
      const config1 = AIProviderFactory.getDefaultConfig('OPENAI');
      const config2 = AIProviderFactory.getDefaultConfig('openai');

      expect(config1.name).toBe('openai');
      expect(config2.name).toBe('openai');
      expect(config1.base_url).toBe(config2.base_url);
    });
  });

  describe('Provider Factory Edge Cases', () => {
    it('handles multiple registrations of same provider', () => {
      AIProviderFactory.registerProvider('duplicate', () => new MockProvider());
      AIProviderFactory.registerProvider('duplicate', () => new MockProvider());

      const providers = AIProviderFactory.getAvailableProviders();
      const duplicateCount = providers.filter(p => p === 'duplicate').length;

      expect(duplicateCount).toBe(1); // Should overwrite, not duplicate
    });

    it('maintains provider registry isolation', async () => {
      AIProviderFactory.registerProvider('isolated1', () => new MockProvider());

      const config: ProviderConfig = { name: 'test', api_key: 'key' };
      const provider1 = await AIProviderFactory.createProvider('isolated1', config);

      expect(provider1).toBeInstanceOf(MockProvider);

      // Register another provider and ensure it doesn't affect the first
      AIProviderFactory.registerProvider('isolated2', () => new MockProvider());
      const provider2 = await AIProviderFactory.createProvider('isolated1', config);

      expect(provider2).toBeInstanceOf(MockProvider);
      expect(AIProviderFactory.isProviderRegistered('isolated2')).toBe(true);
    });

    it('handles provider factory functions that throw', () => {
      AIProviderFactory.registerProvider('throwing', () => {
        throw new Error('Factory error');
      });

      expect(() => AIProviderFactory.getProviderInstance('throwing')).toThrow('Factory error');
    });
  });
});