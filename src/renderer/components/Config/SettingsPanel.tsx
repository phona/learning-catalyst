import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cog6ToothIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import { settingsToasts, utilityToasts } from '@/renderer/utils/toast';
import { useDebouncedSave } from '@/renderer/hooks/useDebouncedSave';
import { SettingsErrorBoundary } from '@/renderer/components/UI/SettingsErrorBoundary';
import { ComponentErrorBoundary } from '@/renderer/components/UI/ComponentErrorBoundary';
import { Accordion, Input } from '@/renderer/components/UI';
import { AIProviderSettings } from './AIProviderSettings';
import { UISettings } from './UISettings';
import { ResponseSettings } from './ResponseSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { ModelType } from '@/shared/types/ai';
import type {
  AppConfig,
  ModelCapabilities,
  ModelTypeConfig,
  ProviderConfig,
  ProviderType,
  SelectedChatModel,
  SelectedModel,
} from '@/shared/types/config';
import { useService } from '@/renderer/services/services-provider';

const MODEL_TYPES: ModelType[] = [ModelType.CHAT, ModelType.EMBEDDING, ModelType.RERANK];

const DEFAULT_PROVIDER_TYPES: ProviderType[] = [
  'openai',
  'chatglm',
  'deepseek',
  'siliconflow',
  'openai-compatible',
];

const resolveProviderTypes = (
  providers?: Record<string, ProviderConfig>,
): ProviderType[] => {
  const providerSet = new Set<ProviderType>(DEFAULT_PROVIDER_TYPES);
  Object.values(providers ?? {}).forEach((provider) => {
    providerSet.add(provider.provider_type);
    if (provider.type) {
      providerSet.add(provider.type);
    }
  });
  return Array.from(providerSet);
};

const buildModelTypeConfig = (
  modelType: ModelType,
  selectedModel?: SelectedModel,
  providers?: Record<string, ProviderConfig>,
): ModelTypeConfig => {
  const chatModel = modelType === ModelType.CHAT ? (selectedModel as SelectedChatModel | undefined) : undefined;
  const baseCapabilities: ModelCapabilities = {
    streaming: modelType === ModelType.CHAT ? !!chatModel?.stream : false,
    thinking: modelType === ModelType.CHAT ? !!chatModel?.enable_thinking : false,
    function_calling: chatModel?.capabilities?.function_calling ?? false,
    vision: chatModel?.capabilities?.vision ?? false,
  };

  const capabilities = chatModel?.capabilities
    ? { ...baseCapabilities, ...chatModel.capabilities }
    : baseCapabilities;

  return {
    default_provider: chatModel?.default_provider ?? selectedModel?.provider ?? '',
    default_model: chatModel?.default_model ?? selectedModel?.model ?? '',
    available_providers: resolveProviderTypes(providers),
    settings: {
      temperature: chatModel?.temperature,
      max_tokens: chatModel?.max_tokens,
      top_p: chatModel?.top_p,
      frequency_penalty: chatModel?.frequency_penalty,
      presence_penalty: chatModel?.presence_penalty,
    },
    capabilities,
  };
};

const mapModelTypeConfigToSelectedModel = (
  modelType: ModelType,
  modelConfig: ModelTypeConfig,
): SelectedModel | SelectedChatModel => {
  const base: SelectedModel = {
    provider: modelConfig.default_provider,
    model: modelConfig.default_model,
  };

  if (modelType === ModelType.CHAT) {
    const chatConfig: SelectedChatModel = {
      ...base,
      default_provider: modelConfig.default_provider,
      default_model: modelConfig.default_model,
      capabilities: modelConfig.capabilities,
      enable_thinking: modelConfig.capabilities?.thinking,
      stream: modelConfig.capabilities?.streaming,
    };

    if (modelConfig.settings) {
      chatConfig.temperature = modelConfig.settings.temperature;
      chatConfig.max_tokens = modelConfig.settings.max_tokens;
      chatConfig.top_p = modelConfig.settings.top_p;
      chatConfig.frequency_penalty = modelConfig.settings.frequency_penalty;
      chatConfig.presence_penalty = modelConfig.settings.presence_penalty;
    }

    return chatConfig;
  }

  return base;
};

export const SettingsPanel: React.FC = () => {
  const { config, setConfig } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['ai-models', 'interface']);

  // Local state for configuration
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [modelTypeConfigs, setModelTypeConfigs] = useState<Record<ModelType, ModelTypeConfig>>(() =>
    MODEL_TYPES.reduce<Record<ModelType, ModelTypeConfig>>((acc, type) => {
      acc[type] = buildModelTypeConfig(type);
      return acc;
    }, {} as Record<ModelType, ModelTypeConfig>),
  );
  const configService = useService('configService');

  // Debounced save functionality
  const {
    save: debouncedSaveConfig,
    cancel: cancelDebouncedSave,
    isSaving,
    saveStatus,
  } = useDebouncedSave<AppConfig>({
    delay: 1000,
    onSave: async (configToSave) => {
      await configService!.saveConfig(configToSave);
      setConfig(configToSave);
    },
    onSuccess: () => {
      // Visual feedback is shown in the header - no toast needed
    },
    onError: (error) => {
      settingsToasts.providerError('Settings', error.message);
    },
  });

  useEffect(() => {
    if (!config) return;

    const providerPool = config.ai.providers ?? {};
    const normalizedModelTypes = MODEL_TYPES.reduce<Record<ModelType, ModelTypeConfig>>(
      (acc, modelType) => {
        acc[modelType] = buildModelTypeConfig(
          modelType,
          config.ai.model_types?.[modelType],
          providerPool,
        );
        return acc;
      },
      {} as Record<ModelType, ModelTypeConfig>,
    );

    setLocalConfig({ ...config });
    setModelTypeConfigs(normalizedModelTypes);
  }, [config]);

  const handleSaveConfig = async () => {
    if (!localConfig) return;

    // Cancel any pending debounced saves to prevent double saving
    cancelDebouncedSave();

    // Immediate save without debouncing
    try {
      await configService!.saveConfig(localConfig);
      setConfig(localConfig);
      // Visual feedback is shown in the header - no toast needed
    } catch (error) {
      console.error('Failed to save configuration:', error);
      settingsToasts.providerError(
        'Settings',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const handleModelTypeConfigChange = (modelType: ModelType, updates: Partial<ModelTypeConfig>) => {
    const currentConfig = modelTypeConfigs[modelType];
    if (!currentConfig) return;

    const mergedConfig: ModelTypeConfig = {
      ...currentConfig,
      ...updates,
      settings: {
        ...currentConfig.settings,
        ...updates.settings,
      },
      capabilities: {
        ...currentConfig.capabilities,
        ...updates.capabilities,
      },
    };

    setModelTypeConfigs((prev) => ({
      ...prev,
      [modelType]: mergedConfig,
    }));

    if (!localConfig) return;

    const existingModelTypes = localConfig.ai.model_types ?? {};
    const selectedModel = mapModelTypeConfigToSelectedModel(modelType, mergedConfig);
    const updatedModelTypes = {
      ...existingModelTypes,
      [modelType]: selectedModel,
    };

    let aiConfigUpdates = { ...localConfig.ai };
    if (modelType === ModelType.CHAT) {
      aiConfigUpdates = {
        ...aiConfigUpdates,
        default_provider: mergedConfig.default_provider || aiConfigUpdates.default_provider,
        default_model: mergedConfig.default_model || aiConfigUpdates.default_model,
      };
    }

    const updatedConfig: AppConfig = {
      ...localConfig,
      ai: {
        ...aiConfigUpdates,
        model_types: updatedModelTypes,
      },
    };
    setLocalConfig(updatedConfig);

    // Auto-save to global config store with debouncing
    debouncedSaveConfig(updatedConfig);

    // Trigger model reload for chat type changes
    if (modelType === ModelType.CHAT) {
      configService!.updateModelTypeConfig(ModelType.CHAT, mergedConfig).catch(console.error);
    }
  };

  const providerConfigs = useMemo(() => localConfig?.ai?.providers ?? {}, [localConfig]);

  const modelAssignments = useMemo<
    Record<
      ModelType,
      {
        provider_config_id: string;
        model_id: string;
      }
    >
  >(
    () => ({
      [ModelType.CHAT]: {
        provider_config_id: localConfig?.ai?.model_types?.chat?.provider || '',
        model_id: localConfig?.ai?.model_types?.chat?.model || '',
      },
      [ModelType.EMBEDDING]: {
        provider_config_id: localConfig?.ai?.model_types?.embedding?.provider || '',
        model_id: localConfig?.ai?.model_types?.embedding?.model || '',
      },
      [ModelType.RERANK]: {
        provider_config_id: localConfig?.ai?.model_types?.rerank?.provider || '',
        model_id: localConfig?.ai?.model_types?.rerank?.model || '',
      },
    }),
    [localConfig],
  );

  const handleProviderConfigChange = (providerId: string, providerConfig: ProviderConfig) => {
    if (!localConfig) return;
    const updatedConfig: AppConfig = {
      ...localConfig,
      ai: {
        ...localConfig.ai,
        providers: {
          ...(localConfig.ai?.providers ?? {}),
          [providerId]: providerConfig,
        },
      },
    };
    setLocalConfig(updatedConfig);
    debouncedSaveConfig(updatedConfig);
  };

  const handleModelAssignmentChange = (modelType: ModelType, providerId: string, modelId: string) => {
    if (!localConfig) return;

    const existingModelTypes = localConfig.ai.model_types ?? {};
    const previousModelConfig =
      existingModelTypes[modelType as keyof typeof existingModelTypes] ?? {};

    const updatedModelTypes = {
      ...existingModelTypes,
      [modelType]: {
        ...previousModelConfig,
        provider: providerId,
        model: modelId,
      },
    };

    const updatedConfig: AppConfig = {
      ...localConfig,
      ai: {
        ...localConfig.ai,
        model_types: updatedModelTypes,
      },
    };

    setLocalConfig(updatedConfig);
    debouncedSaveConfig(updatedConfig);

    setModelTypeConfigs((prev) => ({
      ...prev,
      [modelType]: {
        ...prev[modelType],
        default_provider: providerId,
        default_model: modelId,
      },
    }));
  };

  const handleConfigChange = useCallback(
    (updates: Partial<AppConfig>) => {
      if (!localConfig) return;

      const updatedConfig = {
        ...localConfig,
        ...updates,
      };

      setLocalConfig(updatedConfig);
      debouncedSaveConfig(updatedConfig);
    },
    [localConfig, debouncedSaveConfig],
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const filterContent = (content: string) => {
    if (!searchQuery) return true;
    return content.toLowerCase().includes(searchQuery.toLowerCase());
  };

  if (!localConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SettingsErrorBoundary onSaveError={(error) => console.error('Settings save error:', error)}>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Cog6ToothIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Preferences
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {saveStatus === 'success' && (
                <span className="flex items-center space-x-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center space-x-1 text-sm text-red-600 dark:text-red-400">
                  <XCircleIcon className="w-4 h-4" />
                  <span>Save failed</span>
                </span>
              )}
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="max-w-md">
            <Input
              type="text"
              placeholder="Search preferences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              className="text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Accordion multiple className="space-y-4">
              {/* AI Models Section */}
              <Accordion.Item
                id="ai-models"
                title="AI Models"
                description="Configure AI providers, models, and response settings"
                defaultExpanded={true}
              >
                <div className="space-y-6">
                  <ComponentErrorBoundary componentName="AI Provider Settings">
                    <AIProviderSettings
                      providerConfigs={providerConfigs}
                      modelAssignments={modelAssignments}
                      onProviderConfigChange={handleProviderConfigChange}
                      onModelAssignmentChange={handleModelAssignmentChange}
                    />
                  </ComponentErrorBoundary>
                  <ComponentErrorBoundary componentName="Response Settings">
                    <ResponseSettings config={localConfig} onConfigChange={handleConfigChange} />
                  </ComponentErrorBoundary>
                </div>
              </Accordion.Item>

              {/* Interface Section */}
              <Accordion.Item
                id="interface"
                title="Interface"
                description="Customize the appearance and behavior of the application"
                defaultExpanded={true}
              >
                <ComponentErrorBoundary componentName="UI Settings">
                  <UISettings config={localConfig} onConfigChange={handleConfigChange} />
                </ComponentErrorBoundary>
              </Accordion.Item>

              {/* Advanced Section */}
              <Accordion.Item
                id="advanced"
                title="Advanced"
                description="Advanced configuration options and experimental features"
              >
                <ComponentErrorBoundary componentName="Advanced Settings">
                  <AdvancedSettings config={localConfig} onConfigChange={handleConfigChange} />
                </ComponentErrorBoundary>
              </Accordion.Item>
            </Accordion>
          </div>
        </div>
      </div>
    </SettingsErrorBoundary>
  );
};
export default SettingsPanel;
