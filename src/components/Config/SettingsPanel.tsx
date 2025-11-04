import React, { useState, useEffect, useCallback } from 'react';
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
import { useConfigStore } from '@/stores/useConfigStore';
import { settingsToasts, utilityToasts } from '@/utils/toast';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { SettingsErrorBoundary } from '@/components/UI/SettingsErrorBoundary';
import { ComponentErrorBoundary } from '@/components/UI/ComponentErrorBoundary';
import { Accordion, Input } from '@/components/UI';
import { AIProviderSettings } from './AIProviderSettings';
import { UISettings } from './UISettings';
import { ResponseSettings } from './ResponseSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { ModelType } from '@/types/ai';
import type {
  AppConfig,
  ModelTypeConfig,
} from '@/types/config';
import type { ModelList } from '@/types/ai';
import { useService } from '@/hooks/useAppServices';

export const SettingsPanel: React.FC = () => {
  const { config, setConfig } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['ai-models', 'interface']);

  // Remote models state
  const [remoteModels, setRemoteModels] = useState<Record<string, ModelList>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});

  // Local state for configuration
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [modelTypeConfigs, setModelTypeConfigs] = useState<Record<string, ModelTypeConfig>>({});
  const configService = useService('configService')

  // Debounced save functionality
  const { save: debouncedSaveConfig, isSaving, saveStatus } = useDebouncedSave<AppConfig>({
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
    if (config) {
      // Ensure openai-compatible provider is available in all model types
      const updatedModelTypes = { ...config.ai.model_types };
      let hasUpdates = false;

      Object.keys(updatedModelTypes).forEach(modelType => {
        if (!updatedModelTypes[modelType as keyof typeof updatedModelTypes].available_providers.includes('openai-compatible')) {
          updatedModelTypes[modelType as keyof typeof updatedModelTypes] = {
            ...updatedModelTypes[modelType as keyof typeof updatedModelTypes],
            available_providers: [...updatedModelTypes[modelType as keyof typeof updatedModelTypes].available_providers, 'openai-compatible']
          };
          hasUpdates = true;
        }
      });

      setLocalConfig({ ...config });
      setModelTypeConfigs(updatedModelTypes);

      // Auto-save if we added the openai-compatible provider to existing config
      if (hasUpdates) {
        const updatedConfig = {
          ...config,
          ai: {
            ...config.ai,
            model_types: updatedModelTypes as any
          }
        };
        configService!.saveConfig(updatedConfig).catch(console.error);
      }
    }
  }, [config]);

  const handleSaveConfig = async () => {
    if (!localConfig) return;

    // Immediate save without debouncing
    try {
      await configService!.saveConfig(localConfig);
      setConfig(localConfig);
      // Visual feedback is shown in the header - no toast needed
    } catch (error) {
      console.error('Failed to save configuration:', error);
      settingsToasts.providerError('Settings', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleModelTypeConfigChange = (modelType: string, updates: Partial<ModelTypeConfig>) => {
    let finalUpdates = { ...updates };

    // Handle api_keys structure correctly
    const currentConfig = modelTypeConfigs[modelType];

    // If provider is being changed, clear the model and custom fields if switching away from openai-compatible
    if (updates.default_provider && updates.default_provider !== currentConfig?.default_provider) {
      finalUpdates.default_model = '';
      if (updates.default_provider !== 'openai-compatible') {
        finalUpdates.custom_provider_url = undefined;
      }
      // Removed auto-fetch - only manual refresh button will trigger fetching
    }
    if (updates.api_keys) {
      finalUpdates.api_keys = {
        ...currentConfig?.api_keys,
        ...updates.api_keys
      };
      // Removed auto-fetch - only manual refresh button will trigger fetching
    }

    const updatedModelTypes = {
      ...modelTypeConfigs,
      [modelType]: {
        ...currentConfig,
        ...finalUpdates,
      },
    };
    setModelTypeConfigs(updatedModelTypes);

    if (localConfig) {
      const modelTypeConfig = updatedModelTypes[modelType];

      // Synchronize global AI config when chat model type is changed
      let aiConfigUpdates = { ...localConfig.ai };
      if (modelType === 'chat') {
        aiConfigUpdates = {
          ...aiConfigUpdates,
          default_provider: modelTypeConfig?.default_provider || aiConfigUpdates.default_provider,
          default_model: modelTypeConfig?.default_model || aiConfigUpdates.default_model,
        };
      }

      const updatedConfig = {
        ...localConfig,
        ai: {
          ...aiConfigUpdates,
          model_types: updatedModelTypes as any,
        },
      };
      setLocalConfig(updatedConfig);

      // Auto-save to global config store with debouncing
      debouncedSaveConfig(updatedConfig);

      // Trigger model reload for chat type changes
      if (modelType === 'chat' && modelTypeConfig) {
        configService!.updateModelTypeConfig(ModelType.CHAT, modelTypeConfig).catch(console.error);
      }
    }
  };

  /**
   * Fetch models from provider API
   */
  const fetchModelsFromProvider = useCallback(async (modelType: string) => {
    const config = modelTypeConfigs[modelType];
    if (!config || !config.default_provider) return;

    // Validate API key exists and is non-empty
    const apiKey = config.api_keys?.[config.default_provider as keyof typeof config.api_keys];
    if (!apiKey || apiKey.trim() === '') {
      utilityToasts.error(`Please enter an API key for ${config.default_provider} before fetching models`);
      return;
    }

    const cacheKey = `${config.default_provider}-${modelType}`;

    setFetchingModels(prev => ({ ...prev, [cacheKey]: true }));
    setFetchErrors(prev => ({ ...prev, [cacheKey]: '' }));

    try {
      const models = await configService!.getAvailableModels(config.default_provider, modelType as 'chat' | 'embedding' | 'rerank');
      setRemoteModels(prev => ({ ...prev, [cacheKey]: { [modelType]: models } }));
      utilityToasts.success(`Fetched ${models?.length || 0} models from ${config.default_provider}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch models';
      setFetchErrors(prev => ({ ...prev, [cacheKey]: errorMessage }));

      // Show toast instead of alert
      utilityToasts.error(`Failed to fetch models from ${config.default_provider}: ${errorMessage}`);
      console.error(`Failed to fetch models for ${config.default_provider}:`, error);
    } finally {
      setFetchingModels(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [modelTypeConfigs]);

  const handleConfigChange = useCallback((updates: Partial<AppConfig>) => {
    if (!localConfig) return;

    const updatedConfig = {
      ...localConfig,
      ...updates,
    };

    setLocalConfig(updatedConfig);
    debouncedSaveConfig(updatedConfig);
  }, [localConfig, debouncedSaveConfig]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
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
                      modelTypeConfigs={modelTypeConfigs}
                      onModelTypeConfigChange={handleModelTypeConfigChange}
                      remoteModels={remoteModels}
                      fetchingModels={fetchingModels}
                      fetchErrors={fetchErrors}
                      onFetchModels={fetchModelsFromProvider}
                    />
                  </ComponentErrorBoundary>
                  <ComponentErrorBoundary componentName="Response Settings">
                    <ResponseSettings
                      config={localConfig}
                      onConfigChange={handleConfigChange}
                    />
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
                  <UISettings
                    config={localConfig}
                    onConfigChange={handleConfigChange}
                  />
                </ComponentErrorBoundary>
              </Accordion.Item>

              {/* Advanced Section */}
              <Accordion.Item
                id="advanced"
                title="Advanced"
                description="Advanced configuration options and experimental features"
              >
                <ComponentErrorBoundary componentName="Advanced Settings">
                  <AdvancedSettings
                    config={localConfig}
                    onConfigChange={handleConfigChange}
                  />
                </ComponentErrorBoundary>
              </Accordion.Item>
            </Accordion>
          </div>
        </div>
      </div>
    </SettingsErrorBoundary>
  );
};