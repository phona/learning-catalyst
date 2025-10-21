import type { AIProvider, ProviderConfig } from '@/types/ai';
import { OpenAIProvider } from './providers/openai';
import { ChatGLMProvider } from './providers/chatglm';
import { DeepSeekProvider } from './providers/deepseek';
import { SiliconFlowProvider } from './providers/siliconflow';

/**
 * Factory class for creating AI provider instances
 * Converted from Python ModelFactory
 */
export class AIProviderFactory {
  private static providers = new Map<string, () => AIProvider>();

  static {
    // Register built-in providers
    this.registerProvider('openai', () => new OpenAIProvider());
    this.registerProvider('chatglm', () => new ChatGLMProvider());
    this.registerProvider('deepseek', () => new DeepSeekProvider());
    this.registerProvider('siliconflow', () => new SiliconFlowProvider());
  }

  /**
   * Register a new provider class
   */
  static registerProvider(name: string, factory: () => AIProvider): void {
    this.providers.set(name.toLowerCase(), factory);
  }

  /**
   * Create a provider instance
   */
  static async createProvider(
    name: string,
    config: ProviderConfig
  ): Promise<AIProvider> {
    const providerName = name.toLowerCase();
    const factory = this.providers.get(providerName);

    if (!factory) {
      throw new Error(`Provider '${name}' is not registered`);
    }

    const provider = factory();
    await provider.initialize(config);
    return provider;
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  static isProviderRegistered(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }

  /**
   * Get provider without initialization (for config validation)
   */
  static getProviderInstance(name: string): AIProvider | null {
    const providerName = name.toLowerCase();
    const factory = this.providers.get(providerName);

    if (!factory) {
      return null;
    }

    return factory();
  }

  /**
   * Validate provider configuration
   */
  static async validateProviderConfig(
    name: string,
    config: ProviderConfig
  ): Promise<boolean> {
    try {
      const provider = this.getProviderInstance(name);
      if (!provider) {
        return false;
      }

      return await provider.validateConfig(config);
    } catch (error) {
      console.error(`Failed to validate config for provider ${name}:`, error);
      return false;
    }
  }

  /**
   * Get default configuration for a provider
   */
  static getDefaultConfig(name: string): Partial<ProviderConfig> {
    const providerName = name.toLowerCase();

    switch (providerName) {
      case 'openai':
        return {
          name: 'openai',
          base_url: 'https://api.openai.com/v1',
          timeout: 30000,
          max_retries: 3,
        };

      case 'chatglm':
        return {
          name: 'chatglm',
          base_url: 'https://open.bigmodel.cn/api/paas/v4',
          timeout: 60000,
          max_retries: 3,
        };

      case 'deepseek':
        return {
          name: 'deepseek',
          base_url: 'https://api.deepseek.com/v1',
          timeout: 30000,
          max_retries: 3,
        };

      case 'siliconflow':
        return {
          name: 'siliconflow',
          base_url: 'https://api.siliconflow.cn/v1',
          timeout: 30000,
          max_retries: 3,
        };

      default:
        return {
          name: providerName,
          timeout: 30000,
          max_retries: 3,
        };
    }
  }
}