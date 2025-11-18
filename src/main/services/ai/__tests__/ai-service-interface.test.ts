import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAIService } from '../ai-service';
import type { AppConfig } from '@/shared/types/config';

// Mock the provider modules
vi.mock('../providers/openai-provider', () => ({
  createOpenAIService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn()
  }))
}));

vi.mock('../providers/chatglm-provider', () => ({
  createChatGLMService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn()
  }))
}));

vi.mock('../providers/deepseek-provider', () => ({
  createDeepSeekService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn()
  }))
}));

vi.mock('../providers/local-model-provider', () => ({
  createLocalModelService: vi.fn(() => ({
    chatCompletion: vi.fn(),
    getModels: vi.fn(() => []),
    getEmbeddings: vi.fn()
  }))
}));

describe('AI Service - Interface Tests', () => {
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
        warn: vi.fn()
      }))
    } as any;

    mockConfig = {
      ai: {
        providers: {
          openai: {
            provider_type: 'openai',
            api_key: 'test-openai-key',
            model: 'gpt-4o'
          }
        },
        model_types: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 4096
          }
        }
      }
    } as unknown as AppConfig;

    aiService = createAIService({
      loggerService: mockLoggerService,
      config: mockConfig
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
      expect(typeof aiService.getProviders).toBe('function');
      expect(typeof aiService.getAvailableModels).toBe('function');
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
        maxTokens: 4096
      });
    });

    it('should return chat reply preset', () => {
      const preset = aiService.getModelPreset('chat.reply');

      expect(preset).toMatchObject({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-openai-key',
        temperature: 0.7,
        maxTokens: 4096
      });
    });

    it('should fall back to default preset for unknown preset ID', () => {
      const preset = aiService.getModelPreset('unknown.preset');

      expect(preset).toMatchObject({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-openai-key',
        temperature: 0.7,
        maxTokens: 4096
      });
    });
  });

  describe('Available Models', () => {
    it('should return available models with correct structure', () => {
      const models = aiService.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('maxTokens');
        expect(model).toHaveProperty('description');
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.provider).toBe('string');
        expect(typeof model.maxTokens).toBe('number');
        expect(typeof model.description).toBe('string');
      });
    });

    it('should include expected predefined models', () => {
      const models = aiService.getAvailableModels();
      const modelIds = models.map(m => m.id);

      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('gpt-4-turbo');
      expect(modelIds).toContain('chatglm-pro');
      expect(modelIds).toContain('deepseek-coder');
      expect(modelIds).toContain('llama-3.1-70b');
    });
  });

  describe('Provider Initialization', () => {
    it('should initialize provider services', () => {
      const providers = aiService.getProviders();

      expect(providers).toHaveProperty('openai');
      expect(providers).toHaveProperty('chatglm');
      expect(providers).toHaveProperty('deepseek');
      expect(providers).toHaveProperty('local');
      expect(providers).toHaveProperty('ollama');
    });
  });

  describe('Logging', () => {
    it('should create child logger for service', () => {
      expect(mockLoggerService.child).toHaveBeenCalledWith({ service: 'ai' });
    });
  });
});