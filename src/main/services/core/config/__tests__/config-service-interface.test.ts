import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigService } from '../config-service';
import type { ConfigStorage } from '../storage';
import type { LoggerService } from '../logger/logger-service';

describe('Config Service - Interface Tests', () => {
  let mockStore: ConfigStorage;
  let mockLogger: LoggerService;
  let configService: ReturnType<typeof createConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ConfigStorage
    mockStore = {
      loadConfig: vi.fn().mockResolvedValue({ ai: { providers: {}, model_types: {} } }),
      saveConfig: vi.fn().mockResolvedValue(undefined),
      getConfigPath: vi.fn().mockResolvedValue('/test/path')
    };

    // Mock LoggerService
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis()
    };

    configService = createConfigService({ storage: mockStore, logger: mockLogger });
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
      mockStore.loadConfig.mockResolvedValue(mockConfig);

      const config = await configService.getConfig();

      expect(mockStore.loadConfig).toHaveBeenCalled();
      expect(config).toEqual(mockConfig);
    });

    it('should set config to store', async () => {
      const newConfig = { ai: { providers: { openai: { key: 'test' } } } };

      await configService.setConfig(newConfig);

      expect(mockStore.saveConfig).toHaveBeenCalled();
      const savedConfig = mockStore.saveConfig.mock.calls[0][0];
      expect(savedConfig).toHaveProperty('ai');
      expect(savedConfig.ai).toHaveProperty('providers');
      expect(savedConfig.ai.providers).toHaveProperty('openai');
      expect(savedConfig.ai.providers.openai).toEqual({ key: 'test' });
    });

    it('should get provider config', async () => {
      const mockConfig = {
        ai: {
          providers: {
            openai: { provider_type: 'openai', api_key: 'test-key' }
          }
        }
      };
      mockStore.loadConfig.mockResolvedValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('openai');

      expect(providerConfig).toEqual({ provider_type: 'openai', api_key: 'test-key' });
    });

    it('should return undefined for non-existent provider', async () => {
      const mockConfig = { ai: { providers: {} } };
      mockStore.loadConfig.mockResolvedValue(mockConfig);

      const providerConfig = await configService.getProviderConfig('nonexistent');

      expect(providerConfig).toBeUndefined();
    });

    it('should set provider config', async () => {
      const providerConfig = { provider_type: 'openai', api_key: 'new-key' };
      const mockConfig = { ai: { providers: {} } };
      mockStore.loadConfig.mockResolvedValue(mockConfig);

      await configService.setProviderConfig('openai', providerConfig);

      expect(mockStore.saveConfig).toHaveBeenCalled();
    });
  });

  describe('Configuration Change Events', () => {
    it('should allow subscribing to config changes', async () => {
      const callback = vi.fn();

      const unsubscribe = await configService.onConfigChanged(callback);

      // Should not throw and callback should be registered
      expect(typeof callback).toBe('function');
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle null callbacks gracefully', async () => {
      const unsubscribe = await configService.onConfigChanged(null);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should propagate store get errors', async () => {
      mockStore.loadConfig.mockImplementation(() => {
        throw new Error('Store read error');
      });

      // Should throw the error
      await expect(configService.getConfig()).rejects.toThrow('Store read error');
    });

    it('should propagate store set errors', async () => {
      mockStore.saveConfig.mockImplementation(() => {
        throw new Error('Store write error');
      });

      // Should throw
      await expect(configService.setConfig({})).rejects.toThrow('Store write error');
    });
  });
});