import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAIService } from '../ai-service';
import type { AppConfig } from '@/shared/types/config';

// Mock the provider modules
vi.mock('../providers/openai-provider', () => ({
  createOpenAIService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn(),
  })),
}));

vi.mock('../providers/chatglm-provider', () => ({
  createChatGLMService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn(),
  })),
}));

vi.mock('../providers/deepseek-provider', () => ({
  createDeepSeekService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn(),
  })),
}));

vi.mock('../providers/local-model-provider', () => ({
  createLocalModelService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn(),
  })),
}));

describe('AI Service - Basic Tests', () => {
  let mockLoggerService: any;
  let mockConfig: AppConfig;
  let aiService: ReturnType<typeof createAIService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLoggerService = {
      child: vi.fn(() => ({
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      })),
    } as any;

    mockConfig = {
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: 'test-openai-key',
            model: 'gpt-4o',
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 4096,
          },
        },
      },
    } as unknown as AppConfig;

    aiService = createAIService({
      loggerService: mockLoggerService,
      config: mockConfig,
    });
  });

  describe('Service Creation', () => {
    it('should create AI service with required methods', () => {
      expect(aiService).toHaveProperty('chatCompletion');
      expect(aiService).toHaveProperty('getModelPreset');
      expect(aiService).toHaveProperty('getProviders');
      expect(aiService).toHaveProperty('getAvailableModels');

      expect(typeof aiService.chatCompletion).toBe('function');
      expect(typeof aiService.getModelPreset).toBe('function');
    });

    it('should initialize all provider services', () => {
      const providers = aiService.getProviders();

      expect(providers).toHaveProperty('openai');
      expect(providers).toHaveProperty('chatglm');
      expect(providers).toHaveProperty('deepseek');
      expect(providers).toHaveProperty('local');
      expect(providers).toHaveProperty('ollama');
    });

    it('should return available models with correct structure', () => {
      const models = aiService.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      models.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('maxTokens');
        expect(model).toHaveProperty('description');
      });
    });
  });

  describe('Model Presets', () => {
    it('should return default preset when requested', () => {
      const preset = aiService.getModelPreset('default');

      expect(preset).toMatchObject({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-openai-key',
        temperature: 0.7,
        maxTokens: 4096,
      });
    });

    it('should return content analysis preset', () => {
      const preset = aiService.getModelPreset('content.analysis');

      expect(preset).toMatchObject({
        provider: 'local',
        model: 'llama-3.1-70b',
        temperature: 0.2,
        maxTokens: 10240,
      });
    });

    it('should return knowledge extraction preset', () => {
      const preset = aiService.getModelPreset('knowledge.extraction');

      expect(preset).toMatchObject({
        provider: 'local',
        model: 'llama-3.1-70b',
        temperature: 0.15,
        maxTokens: 10240,
      });
    });

    it('should return learning plan preset', () => {
      const preset = aiService.getModelPreset('learning.plan');

      expect(preset).toMatchObject({
        provider: 'local',
        model: 'llama-3.1-70b',
        temperature: 0.35,
        maxTokens: 10240,
      });
    });

    it('should return chat reply preset', () => {
      const preset = aiService.getModelPreset('chat.reply');

      expect(preset).toMatchObject({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-openai-key',
        temperature: 0.7,
        maxTokens: 4096,
      });
    });

    it('should fall back to default preset for unknown preset ID', () => {
      const preset = aiService.getModelPreset('unknown.preset');

      expect(preset).toMatchObject({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-openai-key',
        temperature: 0.7,
        maxTokens: 4096,
      });
    });
  });

  describe('Available Models', () => {
    it('should include all predefined models', () => {
      const models = aiService.getAvailableModels();
      const modelIds = models.map((m) => m.id);

      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('gpt-4-turbo');
      expect(modelIds).toContain('chatglm-pro');
      expect(modelIds).toContain('deepseek-coder');
      expect(modelIds).toContain('llama-3.1-70b');
      expect(modelIds).toContain('mistral-nemo');
    });

    it('should have proper metadata for each model', () => {
      const models = aiService.getAvailableModels();

      models.forEach((model) => {
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.provider).toBe('string');
        expect(typeof model.maxTokens).toBe('number');
        expect(typeof model.description).toBe('string');
        expect(model.maxTokens).toBeGreaterThan(0);
      });
    });
  });

  describe('Provider API Key Resolution', () => {
    it('should resolve API key for providerType configuration', () => {
      const configWithProviderType = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'resolved-key',
            },
          },
          modelTypes: {},
        },
      } as unknown as AppConfig;

      const service = createAIService({
        loggerService: mockLoggerService,
        config: configWithProviderType,
      });

      const preset = service.getModelPreset('default');
      expect(preset.apiKey).toBe('resolved-key');
    });

    it('should use local-dev fallback when no API key found', () => {
      const configWithoutKey = {
        ai: {
          providers: {
            unknown: {
              providerType: 'unknown',
            },
          },
          modelTypes: {
            chat: {
              provider: 'unknown',
              model: 'unknown-model',
            },
          },
        },
      } as unknown as AppConfig;

      const service = createAIService({
        loggerService: mockLoggerService,
        config: configWithoutKey,
      });

      const preset = service.getModelPreset('default');
      expect(preset.apiKey).toBe('local-dev');
    });
  });

  describe('Model Configuration Defaults', () => {
    it('should use sensible defaults when config is missing', () => {
      const minimalConfig = { ai: { providers: {}, modelTypes: {} } } as unknown as AppConfig;

      const service = createAIService({
        loggerService: mockLoggerService,
        config: minimalConfig,
      });

      const defaultPreset = service.getModelPreset('default');
      expect(defaultPreset).toMatchObject({
        provider: 'openai',
        model: 'llama-3.1-70b',
        apiKey: 'local-dev',
        temperature: 0.3,
        maxTokens: 10240,
      });
    });
  });

  describe('Logging', () => {
    it('should create child logger for service', () => {
      expect(mockLoggerService.child).toHaveBeenCalledWith({ service: 'ai' });
    });

    it('should use child logger for debug operations', () => {
      const mockChildLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      };
      mockLoggerService.child = vi.fn().mockReturnValue(mockChildLogger);

      const service = createAIService({
        loggerService: mockLoggerService,
        config: mockConfig,
      });

      service.getModelPreset('chat.reply');

      expect(mockChildLogger.debug).toHaveBeenCalled();
    });
  });
});
