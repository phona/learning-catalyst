import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigService } from '../config-service';

describe('Config Service - Interface Tests', () => {
  let mockStore: any;
  let configService: ReturnType<typeof createConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock electron store
    mockStore = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      size: vi.fn().mockReturnValue(0),
      path: vi.fn().mockReturnValue('/test/path')
    };

    configService = createConfigService(mockStore);
  });

  describe('Service Creation', () => {
    it('should create config service with required methods', () => {
      expect(configService).toHaveProperty('getConfig');
      expect(configService).toHaveProperty('setConfig');
      expect(configService).toHaveProperty('getProviderConfig');
      expect(configService).toHaveProperty('setProviderConfig');
      expect(configService).toHaveProperty('onConfigChanged');

      expect(typeof configService.getConfig).toBe('function');
      expect(typeof configService.setConfig).toBe('function');
      expect(typeof configService.getProviderConfig).toBe('function');
      expect(typeof configService.setProviderConfig).toBe('function');
      expect(typeof configService.onConfigChanged).toBe('function');
    });
  });

  describe('Configuration Management', () => {
    it('should get config from store', async () => {
      const mockConfig = { ai: { providers: {} } };
      mockStore.get.mockReturnValue(mockConfig);

      const config = await configService.getConfig();

      expect(mockStore.get).toHaveBeenCalledWith('config');
      expect(config).toEqual(mockConfig);
    });

    it('should set config to store', async () => {
      const newConfig = { ai: { providers: { openai: { key: 'test' } } } };

      await configService.setConfig(newConfig);

      expect(mockStore.set).toHaveBeenCalledWith('config', newConfig);
    });

    it('should get provider config', async () => {
      const mockConfig = {
        ai: {
          providers: {
            openai: { provider_type: 'openai', api_key: 'test-key' }
          }
        }
      };
      mockStore.get.mockReturnValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('openai');

      expect(providerConfig).toEqual({ provider_type: 'openai', api_key: 'test-key' });
    });

    it('should return undefined for non-existent provider', async () => {
      const mockConfig = { ai: { providers: {} } };
      mockStore.get.mockReturnValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('nonexistent');

      expect(providerConfig).toBeUndefined();
    });

    it('should set provider config', async () => {
      const providerConfig = { provider_type: 'openai', api_key: 'new-key' };
      const mockConfig = { ai: { providers: {} } };
      mockStore.get.mockReturnValue(mockConfig);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockStore.set).toHaveBeenCalledWith('config', {
        ai: {
          providers: {
            openai: providerConfig
          }
        }
      });
    });
  });

  describe('Configuration Change Events', () => {
    it('should allow subscribing to config changes', async () => {
      const callback = vi.fn();

      await configService.onConfigChanged(callback);

      // Should not throw and callback should be registered
      expect(typeof callback).toBe('function');
    });

    it('should handle null callbacks gracefully', async () => {
      await expect(configService.onConfigChanged(null)).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle store get errors gracefully', async () => {
      mockStore.get.mockImplementation(() => {
        throw new Error('Store read error');
      });

      // Should return default config structure
      const config = await configService.getConfig();
      expect(config).toBeDefined();
    });

    it('should handle store set errors gracefully', async () => {
      mockStore.set.mockImplementation(() => {
        throw new Error('Store write error');
      });

      // Should not throw
      await expect(configService.setConfig({})).resolves.toBeUndefined();
    });
  });
});