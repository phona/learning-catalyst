import { AIProviderFactory } from './ai/factory';
import type { ModelList, ProviderConfig } from '@/types/ai';
import type { ModelTypeConfig } from '@/types/config';

/**
 * Model Fetching Service
 * Handles fetching available models from provider APIs
 */
export class ModelFetchingService {
  private static instance: ModelFetchingService;
  private cache: Map<string, { models: ModelList; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 50; // Limit cache size to prevent memory leaks

  static getInstance(): ModelFetchingService {
    if (!ModelFetchingService.instance) {
      ModelFetchingService.instance = new ModelFetchingService();
    }
    return ModelFetchingService.instance;
  }

  /**
   * Fetch available models from a provider API
   */
  async fetchModels(providerName: string, config: ModelTypeConfig): Promise<ModelList> {
    const cacheKey = this.getCacheKey(providerName, config);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.models;
    }

    try {
      // Get API key for the provider
      const apiKey = config.api_keys?.[providerName as keyof typeof config.api_keys];
      if (!apiKey) {
        throw new Error(`API key is required for provider ${providerName}`);
      }

      // Create provider configuration
      const providerConfig: ProviderConfig = {
        name: providerName,
        api_key: apiKey,
        base_url: config.custom_provider_url,
        timeout: 10000, // 10 second timeout for model fetching
        max_retries: 2
      };

      // Create provider instance and fetch models
      const provider = await AIProviderFactory.createProvider(providerName, providerConfig);
      const models = await provider.listModels();

      // Clean up cache before adding new entry
      this.cleanupCache();

      // Cache the results
      this.cache.set(cacheKey, {
        models,
        timestamp: Date.now()
      });

      return models;
    } catch (error) {
      console.error(`Failed to fetch models from ${providerName}:`, error);
      throw new Error(`Failed to fetch models from ${providerName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if an API key is valid for a provider
   */
  async isApiKeyValid(providerName: string, apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const providerConfig: ProviderConfig = {
        name: providerName,
        api_key: apiKey,
        base_url: baseUrl,
        timeout: 5000,
        max_retries: 1
      };

      const provider = await AIProviderFactory.createProvider(providerName, providerConfig);

      // Try to fetch models as a validation check
      await provider.listModels();
      return true;
    } catch (error) {
      console.error(`API key validation failed for ${providerName}:`, error);
      return false;
    }
  }

  /**
   * Get cached models if available
   */
  getCachedModels(providerName: string, config: ModelTypeConfig): ModelList | null {
    const cacheKey = this.getCacheKey(providerName, config);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.models;
    }

    return null;
  }

  /**
   * Clear cache for a specific provider
   */
  clearCache(providerName?: string): void {
    if (providerName) {
      // Clear cache for specific provider
      for (const [key] of this.cache) {
        if (key.startsWith(`${providerName}-`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Clean up expired cache entries and enforce size limit
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Remove expired entries
    for (const [key, value] of this.cache) {
      if (now - value.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }

    // If still over size limit, remove oldest entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const entriesToRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Generate cache key based on provider and configuration
   */
  private getCacheKey(providerName: string, config: ModelTypeConfig): string {
    // Use provider name and API key hash (first 8 chars) as cache key
    const apiKey = config.api_keys?.[providerName as keyof typeof config.api_keys] || '';
    const apiKeyHash = apiKey.length > 0 ? apiKey.substring(0, 8) : 'no-key';
    const baseUrl = config.custom_provider_url || 'default';
    return `${providerName}-${apiKeyHash}-${baseUrl}`;
  }
}

export const modelFetchingService = ModelFetchingService.getInstance();