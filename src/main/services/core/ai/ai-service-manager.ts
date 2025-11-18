import type { ILogger } from '../../types';
import type { AppConfig } from '@/shared/types/config';
import type { ModelConfig, ModelProvider } from '@/main/services/ai/ai-types';
import { AiService, createAIService } from '@/main/services/ai/ai-service';
import type { ConfigService } from '@/main/services/core/config/config-service';

type AiServiceManagerDeps = {
  loggerService: ILogger;
  configService: ConfigService;
};

export type AiServiceManager = AiService & {
  waitForReady: () => Promise<void>;
  onConfigReloaded: (listener: () => void) => () => void;
};

export const createAiServiceManager = ({
  loggerService,
  configService
}: AiServiceManagerDeps): AiServiceManager => {
  console.log('[AI Service Manager] Starting initialization...');
  let aiService: AiService | null = null;
  let ready: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const rebuild = async (config?: AppConfig): Promise<void> => {
    const resolvedConfig = config ?? (await configService.getConfig());
    aiService = createAIService({ loggerService, config: resolvedConfig });
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        loggerService.error('AI service config listener threw', error as Error);
      }
    });
  };

  const ensureService = async (): Promise<AiService> => {
    await ready;
    if (!aiService) {
      throw new Error('AI service not initialized');
    }
    return aiService;
  };

  ready = (async () => {
    try {
      await rebuild();
    } catch (error) {
      loggerService.error('Failed to initialize AI service during rebuild', error as Error);
      throw error;
    }
  })();
  configService.onConfigChanged((config) => {
    ready = (async () => {
      try {
        await rebuild(config);
      } catch (error) {
        loggerService.error('Failed to rebuild AI service on config change', error as Error);
        throw error;
      }
    })();
  });

  return {
    chatCompletion: async (params) => {
      const service = await ensureService();
      return service.chatCompletion(params);
    },
    getModelPreset: (presetId) => {
      if (!aiService) {
        throw new Error('AI service not initialized');
      }
      return aiService.getModelPreset(presetId);
    },
    getProviders: () => {
      if (!aiService) {
        throw new Error('AI service not initialized');
      }
      return aiService.getProviders();
    },
    getAvailableModels: async () => {
      const service = await ensureService();
      return service.getAvailableModels();
    },
    waitForReady: () => ready,
    onConfigReloaded: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
};
