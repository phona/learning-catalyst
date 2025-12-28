import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Cog6ToothIcon, CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import { settingsToasts, utilityToasts } from '@/renderer/shared/lib';
import { SettingsErrorBoundary, ComponentErrorBoundary, Accordion, Input, ConfirmDialog } from '@/renderer/shared/ui';
import { AIProviderSettings, UISettings, ResponseSettings, AdvancedSettings } from '@/renderer/features/config';
import { ModelType } from '@/shared/types';
import type {
  AppConfig,
  ModelCapabilities,
  ModelTypeConfig,
  ProviderConfig,
  ProviderType,
  SelectedChatModel,
  SelectedModel,
} from '@/shared/types';
import { useService } from '@/renderer/services/services-context';

const modelTypes: ModelType[] = [ModelType.CHAT, ModelType.EMBEDDING, ModelType.RERANK];

const DEFAULT_PROVIDER_TYPES: ProviderType[] = [
  'openai',
  'chatglm',
  'deepseek',
  'siliconflow',
  'openai-compatible',
];

const resolveProviderTypes = (providers?: Record<string, ProviderConfig>): ProviderType[] => {
  const providerSet = new Set<ProviderType>(DEFAULT_PROVIDER_TYPES);
  Object.values(providers ?? {}).forEach((provider) => {
    providerSet.add(provider.providerType);
  });
  return Array.from(providerSet);
};

const buildModelTypeConfig = (
  modelType: ModelType,
  selectedModel?: SelectedModel,
  providers?: Record<string, ProviderConfig>,
): ModelTypeConfig => {
  const chatModel =
    modelType === ModelType.CHAT ? (selectedModel as SelectedChatModel | undefined) : undefined;
  const baseCapabilities: ModelCapabilities = {
    streaming: modelType === ModelType.CHAT ? !!chatModel?.stream : false,
    thinking: modelType === ModelType.CHAT ? !!chatModel?.enableThinking : false,
    functionCalling: chatModel?.capabilities?.functionCalling ?? false,
    vision: chatModel?.capabilities?.vision ?? false,
  };

  const capabilities = chatModel?.capabilities
    ? { ...baseCapabilities, ...chatModel.capabilities }
    : baseCapabilities;

  return {
    defaultProvider: chatModel?.defaultProvider ?? selectedModel?.provider ?? '',
    defaultModel: chatModel?.defaultModel ?? selectedModel?.model ?? '',
    availableProviders: resolveProviderTypes(providers),
    settings: {
      temperature: chatModel?.temperature,
      maxTokens: chatModel?.maxTokens,
      topP: chatModel?.topP,
      frequencyPenalty: chatModel?.frequencyPenalty,
      presencePenalty: chatModel?.presencePenalty,
    },
    capabilities,
  };
};

const mapModelTypeConfigToSelectedModel = (
  modelType: ModelType,
  modelConfig: ModelTypeConfig,
): SelectedModel | SelectedChatModel => {
  const base: SelectedModel = {
    provider: modelConfig.defaultProvider,
    model: modelConfig.defaultModel,
  };

  if (modelType === ModelType.CHAT) {
    const chatConfig: SelectedChatModel = {
      ...base,
      defaultProvider: modelConfig.defaultProvider,
      defaultModel: modelConfig.defaultModel,
      capabilities: modelConfig.capabilities,
      enableThinking: modelConfig.capabilities?.thinking,
      stream: modelConfig.capabilities?.streaming,
    };

    if (modelConfig.settings) {
      chatConfig.temperature = modelConfig.settings.temperature;
      chatConfig.maxTokens = modelConfig.settings.maxTokens;
      chatConfig.topP = modelConfig.settings.topP;
      chatConfig.frequencyPenalty = modelConfig.settings.frequencyPenalty;
      chatConfig.presencePenalty = modelConfig.settings.presencePenalty;
    }

    return chatConfig;
  }

  return base;
};

export const SettingsPage: React.FC = () => {
  const { config, setConfig } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const initialConfigRef = useRef<AppConfig | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<AppConfig | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);

  // Local state for configuration
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [modelTypeConfigs, setModelTypeConfigs] = useState<Record<ModelType, ModelTypeConfig>>(() =>
    modelTypes.reduce<Record<ModelType, ModelTypeConfig>>(
      (acc, type) => {
        acc[type] = buildModelTypeConfig(type);
        return acc;
      },
      {} as Record<ModelType, ModelTypeConfig>,
    ),
  );
  const configService = useService('configService');

  // Re-embedding state
  const [isReembedding, setIsReembedding] = useState(false);
  const [reembedProgress, setReembedProgress] = useState(0);
  const [pendingDimensionChange, setPendingDimensionChange] = useState<number | null>(null);
  const [showDimensionConfirm, setShowDimensionConfirm] = useState(false);

  useEffect(() => {
    if (!config) {
      useConfigStore
        .getState()
        .loadConfig()
        .catch(() => {});
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;
    if (!initialConfigRef.current) {
      initialConfigRef.current = config;
    }

    const providerPool = config.ai.providers ?? {};
    const normalizedModelTypes = modelTypes.reduce<Record<ModelType, ModelTypeConfig>>(
      (acc, modelType) => {
        acc[modelType] = buildModelTypeConfig(
          modelType,
          config.ai.modelTypes?.[modelType],
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

    setSaveError(null);
    setSaveStatus('saving');

    try {
      if (!configService) {
        settingsToasts.providerError('Settings', 'Config service unavailable');
        setSaveStatus('error');
        return;
      }
      // Prefer the most recent store snapshot in case other components updated config
      const storeConfig = useConfigStore.getState().config;
      const mergedConfig: AppConfig = storeConfig
        ? {
            ...storeConfig,
            ...localConfig,
            ai: {
              ...(storeConfig.ai ?? localConfig.ai),
              ...localConfig.ai,
              modelTypes: localConfig.ai.modelTypes ?? storeConfig.ai?.modelTypes ?? {},
            },
          }
        : localConfig;

      // If providers/modelTypes vanished (e.g., during tests or hot state), pull from persisted config
      let persisted: AppConfig | null = null;
      if (
        Object.keys(mergedConfig.ai.providers ?? {}).length === 0 ||
        !mergedConfig.ai.modelTypes
      ) {
        try {
          persisted = await configService.getConfig();
          mergedConfig.ai.providers = Object.keys(mergedConfig.ai.providers ?? {}).length
            ? mergedConfig.ai.providers
            : (persisted?.ai?.providers ?? {});
          mergedConfig.ai.modelTypes =
            mergedConfig.ai.modelTypes ?? persisted?.ai?.modelTypes ?? {};
        } catch {
          // best-effort fallback; continue with current state
        }
      }

      const providerIds = Object.keys(mergedConfig.ai.providers ?? {});
      const coerceProviderId = (maybeId: string | undefined) => {
        if (maybeId && providerIds.includes(maybeId)) return maybeId;
        if (providerIds.length === 1) return providerIds[0];
        return maybeId ?? '';
      };

      // Repair model assignments if provider ids were lost during UI state changes
      const patchedModelTypes = { ...(mergedConfig.ai.modelTypes ?? {}) };
      (Object.keys(patchedModelTypes) as (keyof typeof patchedModelTypes)[]).forEach(
        (modelType) => {
          const validTypes = new Set<string>(Object.values(ModelType) as unknown as string[]);
          if (!validTypes.has(modelType as unknown as string)) {
            return;
          }
          const entry = patchedModelTypes[modelType] as SelectedModel | undefined;
          const fallback = storeConfig?.ai.modelTypes?.[modelType] as SelectedModel | undefined;
          const persistedEntry = persisted?.ai?.modelTypes?.[modelType] as
            | SelectedModel
            | undefined;
          if (!entry) return;
          const providerMissing = entry.provider && !providerIds.includes(entry.provider);
          const missingModel = !entry.model && fallback?.model;
          const fixedProvider = coerceProviderId(entry.provider);
          const fixedModel = entry.model || fallback?.model || '';
          patchedModelTypes[modelType] = {
            ...entry,
            provider: providerMissing ? coerceProviderId(fallback?.provider) : fixedProvider,
            model: fixedModel,
          };

          if (persistedEntry) {
            const providerMismatch =
              !patchedModelTypes[modelType].provider && persistedEntry.provider;
            const modelMismatch =
              (!patchedModelTypes[modelType].model && persistedEntry.model) ||
              (patchedModelTypes[modelType].provider === persistedEntry.provider &&
                patchedModelTypes[modelType].model !== persistedEntry.model);
            if (providerMismatch || modelMismatch) {
              patchedModelTypes[modelType] = {
                ...persistedEntry,
                provider: providerMismatch
                  ? coerceProviderId(persistedEntry.provider)
                  : patchedModelTypes[modelType].provider,
                model: modelMismatch ? persistedEntry.model : patchedModelTypes[modelType].model,
              };
            }
          }
        },
      );
      if (persisted?.ai?.modelTypes) {
        Object.entries(persisted.ai.modelTypes).forEach(([modelType, persistedEntry]) => {
          const existing = patchedModelTypes[modelType as ModelType] as SelectedModel | undefined;
          if (!existing || !existing.model || !existing.provider) {
            patchedModelTypes[modelType as ModelType] = persistedEntry as SelectedModel;
          }
        });
      }
      mergedConfig.ai.modelTypes = patchedModelTypes;

      if (initialConfigRef.current) {
        const beforeProviders = Object.keys(initialConfigRef.current.ai?.providers ?? {}).sort();
        const afterProviders = Object.keys(mergedConfig.ai?.providers ?? {}).sort();
        const changed = beforeProviders.join(',') !== afterProviders.join(',');
        if (changed) {
          setPendingConfig(mergedConfig);
          setConfirmOpen(true);
          setSaveStatus('idle');
          return;
        }
      }

      await configService.saveConfig(mergedConfig);
      setConfig(mergedConfig);
      initialConfigRef.current = mergedConfig;
      setSaveStatus('success');
      // Visual feedback is shown in the header - no toast needed
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
      settingsToasts.providerError(
        'Settings',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const handleConfirmProviderChange = async () => {
    try {
      if (!pendingConfig || !configService) return;
      setIsManualSaving(true);
      setSaveStatus('saving');
      await configService.saveConfig(pendingConfig);
      setConfig(pendingConfig);
      initialConfigRef.current = pendingConfig;
      setSaveStatus('success');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
      settingsToasts.providerError(
        'Settings',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setConfirmOpen(false);
      setPendingConfig(null);
      setIsManualSaving(false);
    }
  };

  const handleCancelProviderChange = () => {
    setConfirmOpen(false);
    setPendingConfig(null);
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

    const existingModelTypes = localConfig.ai.modelTypes ?? {};
    const selectedModel = mapModelTypeConfigToSelectedModel(modelType, mergedConfig);
    const updatedModelTypes = {
      ...existingModelTypes,
      [modelType]: selectedModel,
    };

    let aiConfigUpdates = { ...localConfig.ai };
    if (modelType === ModelType.CHAT) {
      aiConfigUpdates = {
        ...aiConfigUpdates,
        defaultProvider: mergedConfig.defaultProvider || aiConfigUpdates.defaultProvider,
        defaultModel: mergedConfig.defaultModel || aiConfigUpdates.defaultModel,
      };
    }

    const updatedConfig: AppConfig = {
      ...localConfig,
      ai: {
        ...aiConfigUpdates,
        modelTypes: updatedModelTypes,
      },
    };
    setLocalConfig(updatedConfig);
    setSaveStatus('idle');
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
        provider_config_id: localConfig?.ai?.modelTypes?.chat?.provider || '',
        model_id: localConfig?.ai?.modelTypes?.chat?.model || '',
      },
      [ModelType.EMBEDDING]: {
        provider_config_id: localConfig?.ai?.modelTypes?.embedding?.provider || '',
        model_id: localConfig?.ai?.modelTypes?.embedding?.model || '',
      },
      [ModelType.RERANK]: {
        provider_config_id: localConfig?.ai?.modelTypes?.rerank?.provider || '',
        model_id: localConfig?.ai?.modelTypes?.rerank?.model || '',
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
    setSaveStatus('idle');
  };

  const handleProviderRemove = (providerId: string) => {
    if (!localConfig) return;
    const { [providerId]: _removed, ...remainingProviders } = localConfig.ai.providers ?? {};
    const updatedConfig: AppConfig = {
      ...localConfig,
      ai: {
        ...localConfig.ai,
        providers: remainingProviders,
      },
    };
    setLocalConfig(updatedConfig);
    setSaveStatus('idle');
  };

  const handleModelAssignmentChange = (
    modelType: ModelType,
    providerId: string,
    modelId: string,
  ) => {
    if (!localConfig) return;

    const existingModelTypes = localConfig.ai.modelTypes ?? {};
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
        modelTypes: updatedModelTypes,
      },
    };

    setLocalConfig(updatedConfig);
    setSaveStatus('idle');

    setModelTypeConfigs((prev) => ({
      ...prev,
      [modelType]: {
        ...prev[modelType],
        defaultProvider: providerId,
        defaultModel: modelId,
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
      setSaveStatus('idle');
    },
    [localConfig],
  );

  // Handle embedding dimension change with re-embedding
  const handleEmbeddingDimensionsChange = useCallback(async (newDimensions: number) => {
    if (!localConfig) return;
    const currentDimensions = localConfig.ai.embeddingDimensions;

    if (newDimensions === currentDimensions) return;

    // If dimensions changed, show confirmation dialog
    setPendingDimensionChange(newDimensions);
    setShowDimensionConfirm(true);
  }, [localConfig]);

  // Confirm re-embedding process
  const confirmReembedding = useCallback(async () => {
    if (!localConfig || pendingDimensionChange === null || !configService) return;

    setIsReembedding(true);
    setReembedProgress(0);
    setShowDimensionConfirm(false);

    try {
      // Update config with new embedding dimensions
      setReembedProgress(50);
      const updatedConfig = {
        ...localConfig,
        ai: {
          ...localConfig.ai,
          embeddingDimensions: pendingDimensionChange,
        },
      };
      await configService.saveConfig(updatedConfig);
      setConfig(updatedConfig);

      // Update local config and complete
      setLocalConfig(updatedConfig);
      setReembedProgress(100);
      setIsReembedding(false);
      setPendingDimensionChange(null);

      utilityToasts.success('Embedding dimensions updated successfully');

    } catch (error) {
      console.error('Failed to update embedding dimensions:', error);
      setIsReembedding(false);
      setPendingDimensionChange(null);
      utilityToasts.error('Failed to update embedding dimensions: ' + (error as Error).message);
      throw error;
    }
  }, [localConfig, pendingDimensionChange, configService, setConfig]);

  // Cancel re-embedding
  const cancelReembedding = useCallback(() => {
    setShowDimensionConfirm(false);
    setPendingDimensionChange(null);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('settings_expanded_sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setExpandedSections(parsed);
        }
      }
    } catch {
      void 0;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('settings_expanded_sections', JSON.stringify(expandedSections));
    } catch {
      void 0;
    }
  }, [expandedSections]);

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
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
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
                <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                  <XCircleIcon className="w-4 h-4" />
                  <span>{saveError || 'Save failed'}</span>
                  <button
                    onClick={handleSaveConfig}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                  >
                    Retry
                  </button>
                </div>
              )}
              <button
                onClick={handleSaveConfig}
                disabled={saveStatus === 'saving' || isManualSaving}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isManualSaving ? 'Saving...' : 'Save Changes'}
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
            <Accordion
              multiple
              className="space-y-4"
              expandedIds={expandedSections}
              onExpandedChange={setExpandedSections}
            >
              {/* AI Models Section */}
              {filterContent('AI Models Configure AI providers, models, and response settings') && (
                <Accordion.Item
                  id="ai-models"
                  title="AI Models"
                  description="Configure AI providers, models, and response settings"

                >
                  <div className="space-y-6">
                    <ComponentErrorBoundary componentName="AI Provider Settings">
                      <AIProviderSettings
                        providerConfigs={providerConfigs}
                        modelAssignments={modelAssignments}
                        onProviderConfigChange={handleProviderConfigChange}
                        onProviderRemove={handleProviderRemove}
                        onModelAssignmentChange={handleModelAssignmentChange}
                      />
                    </ComponentErrorBoundary>

                    {/* Embedding Configuration */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Embedding Configuration
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Embedding Dimensions
                          </label>
                          <Input
                            type="number"
                            min="64"
                            max="4096"
                            step="64"
                            value={localConfig.ai.embeddingDimensions}
                            onChange={(e) =>
                              handleEmbeddingDimensionsChange(parseInt(e.target.value, 10) || 1024)
                            }
                            disabled={isReembedding}
                            className="w-full"
                            helperText={
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {isReembedding
                                  ? `Re-embedding knowledge data... ${reembedProgress.toFixed(0)}%`
                                  : 'Changing will re-embed all knowledge data with new dimensions'
                                }
                              </span>
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <ComponentErrorBoundary componentName="Response Settings">
                      <ResponseSettings config={localConfig} onConfigChange={handleConfigChange} />
                    </ComponentErrorBoundary>
                  </div>
                </Accordion.Item>
              )}

              {/* Interface Section */}
              {filterContent(
                'Interface Customize the appearance and behavior of the application',
              ) && (
                <Accordion.Item
                  id="interface"
                  title="Interface"
                  description="Customize the appearance and behavior of the application"

                >
                  <ComponentErrorBoundary componentName="UI Settings">
                    <UISettings config={localConfig} onConfigChange={handleConfigChange} />
                  </ComponentErrorBoundary>
                </Accordion.Item>
              )}

              {/* Advanced Section */}
              {filterContent(
                'Advanced Advanced configuration options and experimental features',
              ) && (
                <Accordion.Item
                  id="advanced"
                  title="Advanced"
                  description="Advanced configuration options and experimental features"

                >
                  <ComponentErrorBoundary componentName="Advanced Settings">
                    <AdvancedSettings config={localConfig} onConfigChange={handleConfigChange} />
                  </ComponentErrorBoundary>
                </Accordion.Item>
              )}
            </Accordion>
          </div>
        </div>

        <ConfirmDialog
          isOpen={confirmOpen}
          title="Apply Provider Changes"
          message="Changing providers may reset or invalidate model assignments. You may need to reselect models."
          confirmText="Apply"
          cancelText="Cancel"
          onConfirm={handleConfirmProviderChange}
          onCancel={handleCancelProviderChange}
        />

        {/* Embedding Dimensions Re-embedding Confirmation */}
        <ConfirmDialog
          isOpen={showDimensionConfirm}
          title="Update Embedding Dimensions?"
          message={
            <div className="space-y-3">
              <p>Changing embedding dimensions will update your configuration.</p>
              <p>Note: You may need to re-process your knowledge data to use the new dimensions.</p>
              <p className="font-medium">This will update your embedding dimensions setting.</p>
            </div>
          }
          confirmText="Continue"
          cancelText="Cancel"
          onConfirm={confirmReembedding}
          onCancel={cancelReembedding}
        />
      </div>
    </SettingsErrorBoundary>
  );
};
export default SettingsPage;
