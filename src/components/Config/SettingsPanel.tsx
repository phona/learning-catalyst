import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  CubeIcon,
  AcademicCapIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useConfigStore } from '@/stores/useConfigStore';
import { configService } from '@/services/configService';
import { modelFetchingService } from '@/services/modelFetchingService';
import { settingsToasts, utilityToasts } from '@/utils/toast';
import type {
  AppConfig,
  ModelTypeConfig,
  ModelTestResult,
} from '@/types/config';
import type { ModelList } from '@/types/ai';

interface ModelTypeSection {
  type: 'chat' | 'embedding' | 'rerank';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const modelTypes: ModelTypeSection[] = [
  {
    type: 'chat',
    title: 'Chat Models',
    description: 'Conversational AI models for chat and dialogue',
    icon: ChatBubbleLeftRightIcon,
    color: 'blue',
  },
  {
    type: 'embedding',
    title: 'Embedding Models',
    description: 'Text embedding models for semantic search and similarity',
    icon: CubeIcon,
    color: 'green',
  },
  {
    type: 'rerank',
    title: 'Rerank Models',
    description: 'Text reranking models for improved search results',
    icon: AcademicCapIcon,
    color: 'purple',
  },
];

/**
 * Simple debounce utility function with cleanup support
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timeout: NodeJS.Timeout;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  const cancel = () => {
    clearTimeout(timeout);
  };
  return { debounced, cancel };
}

export const SettingsPanel: React.FC = () => {
  const { config, setConfig } = useConfigStore();
  const [activeSection, setActiveSection] = useState<'models' | 'ui' | 'advanced'>('models');
  const [expandedModelTypes, setExpandedModelTypes] = useState<Set<string>>(new Set(['chat']));
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set());
  const [modelTestResults, setModelTestResults] = useState<Record<string, ModelTestResult>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [manualModelInput, setManualModelInput] = useState<Record<string, string>>({});
  const [showManualInput, setShowManualInput] = useState<Record<string, boolean>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // Remote models state
  const [remoteModels, setRemoteModels] = useState<Record<string, ModelList>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});

  // Local state for configuration
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [modelTypeConfigs, setModelTypeConfigs] = useState<Record<string, ModelTypeConfig>>({});

  // Refs for cleanup
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedSaveRef = useRef<{ cancel: () => void }>();

  // Debounced auto-save function
  const debouncedSaveConfig = useMemo(
    () => {
      const { debounced, cancel } = debounce(async (config: AppConfig) => {
        try {
          await configService.saveConfig(config);
          setConfig(config);
          setSaveStatus('success');
          saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          setSaveStatus('error');
          saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }, 1000);
      debouncedSaveRef.current = { cancel };
      return debounced;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.cancel();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
        configService.saveConfig(updatedConfig).catch(console.error);
      }
    }
  }, [config]);

  const handleSaveConfig = async () => {
    if (!localConfig) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await configService.saveConfig(localConfig);
      setConfig(localConfig);
      setSaveStatus('success');
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      settingsToasts.saved();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      settingsToasts.providerError('Settings', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
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
    }

    // Update manual input state if model was changed
    if (updates.default_model) {
      setManualModelInput(prev => ({ ...prev, [modelType]: updates.default_model || '' }));
    }
  };

  const testModel = async (providerName: string, modelName: string, modelType: 'chat' | 'embedding' | 'rerank') => {
    const testKey = `${providerName}-${modelName}-${modelType}`;
    setTestingModels(prev => new Set(prev).add(testKey));

    try {
      const result = await configService.testModel(providerName, modelName, modelType);
      setModelTestResults(prev => ({ ...prev, [testKey]: result }));

      if (result.status === 'success') {
        utilityToasts.success(`${modelName} test successful`);
      } else {
        utilityToasts.error(`${modelName} test failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Model test failed:', error);
      utilityToasts.error(`${modelName} test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(testKey);
        return newSet;
      });
    }
  };

  const toggleModelTypeExpansion = (modelType: string) => {
    setExpandedModelTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelType)) {
        newSet.delete(modelType);
      } else {
        newSet.add(modelType);
      }
      return newSet;
    });
  };

  
  const toggleManualInput = (modelType: string) => {
    const key = modelType;
    setShowManualInput(prev => ({ ...prev, [key]: !prev[key] }));
    if (!showManualInput[key]) {
      // Initialize with current model value when opening
      const config = modelTypeConfigs[modelType];
      if (config) {
        setManualModelInput(prev => ({ ...prev, [key]: config.default_model }));
      }
    }
  };

  const toggleApiKeyVisibility = (modelType: string) => {
    setShowApiKeys(prev => ({ ...prev, [modelType]: !prev[modelType] }));
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
      const models = await modelFetchingService.fetchModels(config.default_provider, config);
      setRemoteModels(prev => ({ ...prev, [cacheKey]: models }));
      utilityToasts.success(`Fetched ${models.chat?.length || 0} models from ${config.default_provider}`);
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

  /**
   * Get available models combining remote and fallback models
   */
  const getAvailableModels = useMemo(() => {
    return (modelType: string): string[] => {
      const config = modelTypeConfigs[modelType];
      if (!config) return [];

      const cacheKey = `${config.default_provider}-${modelType}`;

      // Use remote models if available, otherwise fallback to hardcoded models
      const remoteModelList = remoteModels[cacheKey];
      if (remoteModelList) {
        const modelListKey = modelType as keyof ModelList;
        return remoteModelList[modelListKey]?.map(model => model.model_id) || [];
      }

      // Fallback to hardcoded models
      const providerMapping = getProviderModelMapping();
      return providerMapping[config.default_provider]?.[modelType] || [];
    };
  }, [modelTypeConfigs, remoteModels]);

  const handleManualModelInput = (modelType: string, modelName: string) => {
    handleModelTypeConfigChange(modelType, { default_model: modelName });
    setManualModelInput(prev => ({ ...prev, [modelType]: modelName }));
  };

  const applyManualModel = (modelType: string) => {
    const modelName = manualModelInput[modelType];
    if (modelName && modelName.trim()) {
      handleManualModelInput(modelType, modelName.trim());
      toggleManualInput(modelType);
      utilityToasts.success(`Model "${modelName.trim()}" applied successfully`);
    } else {
      utilityToasts.error('Please enter a valid model name');
    }
  };

  const getProviderModelMapping = () => {
    return configService.getProviderModelMapping();
  };

  const getStatusIcon = (result?: ModelTestResult, isTesting?: boolean) => {
    if (isTesting) {
      return <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    if (!result) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />;
    }
    switch (result.status) {
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!localConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cog6ToothIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Settings
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'models', label: 'AI Models', icon: SparklesIcon },
            { id: 'ui', label: 'Interface', icon: GlobeAltIcon },
            { id: 'advanced', label: 'Advanced', icon: Cog6ToothIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors ${
                activeSection === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* AI Models Section */}
          {activeSection === 'models' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  AI Model Configuration
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Configure different types of AI models for various tasks. Each model type serves a specific purpose in the learning platform.
                </p>

                <div className="space-y-4">
                  {modelTypes.map(({ type, title, description, icon: Icon, color }) => {
                    const isExpanded = expandedModelTypes.has(type);
                    const config = modelTypeConfigs[type];
                    const providerMapping = getProviderModelMapping();

                    return (
                      <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <button
                          onClick={() => toggleModelTypeExpansion(type)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 bg-${color}-100 dark:bg-${color}-900 rounded-lg`}>
                              <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                            </div>
                            <div className="text-left">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          )}
                        </button>

                        {isExpanded && config && (
                          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                            {/* Provider Selection */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Provider
                              </label>
                              <select
                                value={config.default_provider}
                                onChange={(e) => handleModelTypeConfigChange(type, { default_provider: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {config.available_providers.map(provider => (
                                  <option key={provider} value={provider}>
                                    {provider === 'openai-compatible' ? 'OpenAI-Compatible' :
                                     provider.charAt(0).toUpperCase() + provider.slice(1)}
                                  </option>
                                ))}
                              </select>

                              {/* Custom URL Input for OpenAI-Compatible Provider */}
                              {config.default_provider === 'openai-compatible' && (
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    API Endpoint URL
                                  </label>
                                  <input
                                    type="url"
                                    value={config.custom_provider_url || ''}
                                    onChange={(e) => handleModelTypeConfigChange(type, { custom_provider_url: e.target.value })}
                                    placeholder="https://api.example.com/v1"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Enter the base URL for your OpenAI-compatible API endpoint
                                  </p>
                                </div>
                              )}

                              {/* API Key Input for All Providers */}
                              <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {config.default_provider === 'openai-compatible' ? 'API Key' :
                                   config.default_provider === 'openai' ? 'OpenAI API Key' :
                                   config.default_provider === 'chatglm' ? 'ChatGLM API Key' :
                                   config.default_provider === 'deepseek' ? 'DeepSeek API Key' :
                                   config.default_provider === 'siliconflow' ? 'SiliconFlow API Key' :
                                   'API Key'} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type={showApiKeys[type] ? 'text' : 'password'}
                                    value={config.api_keys?.[config.default_provider as keyof typeof config.api_keys] || ''}
                                    onChange={(e) => handleModelTypeConfigChange(type, {
                                      api_keys: {
                                        ...config.api_keys,
                                        [config.default_provider]: e.target.value
                                      }
                                    })}
                                    placeholder="Enter your API key"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <button
                                    onClick={() => toggleApiKeyVisibility(type)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    title={showApiKeys[type] ? 'Hide API key' : 'Show API key'}
                                  >
                                    {showApiKeys[type] ? (
                                      <EyeSlashIcon className="w-4 h-4" />
                                    ) : (
                                      <EyeIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  API key is required for authentication
                                </p>
                              </div>
                            </div>

                            {/* Model Selection */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Model
                              </label>
                              {!showManualInput[type] ? (
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={config.default_model}
                                    onChange={(e) => handleModelTypeConfigChange(type, { default_model: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value="">Select a model</option>
                                    {/* Custom model first if it exists and not in available models */}
                                    {config.default_model &&
                                     !getAvailableModels(type).includes(config.default_model) && (
                                      <option key="custom-model" value={config.default_model}>
                                        {config.default_model} (Custom)
                                      </option>
                                    )}
                                    {/* Available models from API or fallback */}
                                    {getAvailableModels(type).map((model: string) => (
                                      <option key={model} value={model}>
                                        {model}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => toggleManualInput(type)}
                                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                    title="Enter model manually"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => testModel(config.default_provider, config.default_model, type as any)}
                                    disabled={testingModels.has(`${config.default_provider}-${config.default_model}-${type}`)}
                                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                    title="Test model"
                                  >
                                    {getStatusIcon(
                                      modelTestResults[`${config.default_provider}-${config.default_model}-${type}`],
                                      testingModels.has(`${config.default_provider}-${config.default_model}-${type}`)
                                    )}
                                  </button>
                                  <button
                                    onClick={() => fetchModelsFromProvider(type)}
                                    disabled={fetchingModels[`${config.default_provider}-${type}`] || !config.api_keys?.[config.default_provider as keyof typeof config.api_keys]}
                                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={config.api_keys?.[config.default_provider as keyof typeof config.api_keys] ? "Fetch latest models from API" : "Enter API key to fetch models"}
                                  >
                                    {fetchingModels[`${config.default_provider}-${type}`] ? (
                                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <ArrowPathIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={manualModelInput[type] || ''}
                                    onChange={(e) => setManualModelInput(prev => ({ ...prev, [type]: e.target.value }))}
                                    placeholder="Enter model name manually"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        applyManualModel(type);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => applyManualModel(type)}
                                    className="p-2 text-green-600 hover:text-green-700 transition-colors"
                                    title="Apply model"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => toggleManualInput(type)}
                                    className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                    title="Cancel"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Model Fetching Status */}
                            {(() => {
                              const cacheKey = `${config.default_provider}-${type}`;
                              const isFetching = fetchingModels[cacheKey];
                              const error = fetchErrors[cacheKey];
                              const hasRemoteModels = remoteModels[cacheKey];
                              const modelCount = getAvailableModels(type).length;

                              return (
                                <div className="mt-2 text-xs">
                                  {isFetching && (
                                    <div className="flex items-center space-x-1 text-blue-600">
                                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                      <span>Fetching models from {config.default_provider}...</span>
                                    </div>
                                  )}
                                  {error && (
                                    <div className="flex items-center space-x-1 text-red-600">
                                      <ExclamationTriangleIcon className="w-3 h-3" />
                                      <span>{error}</span>
                                    </div>
                                  )}
                                  {hasRemoteModels && !isFetching && !error && (
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <CheckCircleIcon className="w-3 h-3" />
                                      <span>
                                        {modelCount} models from {config.default_provider} API
                                      </span>
                                    </div>
                                  )}
                                  {!config.api_keys?.[config.default_provider as keyof typeof config.api_keys] && (
                                    <div className="text-gray-500">
                                      Enter API key to fetch latest models
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Model Settings */}
                            {type === 'chat' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Temperature
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={config.settings.temperature || 0.7}
                                    onChange={(e) => handleModelTypeConfigChange(type, {
                                      settings: { ...config.settings, temperature: parseFloat(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Max Tokens
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="32000"
                                    value={config.settings.max_tokens || 4096}
                                    onChange={(e) => handleModelTypeConfigChange(type, {
                                      settings: { ...config.settings, max_tokens: parseInt(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Capabilities */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Supported Capabilities
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(config.capabilities)
                                  .filter(([, value]) => value === true)
                                  .map(([capability]) => (
                                    <span
                                      key={capability}
                                      className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full"
                                    >
                                      {capability.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Streaming and Thinking Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Response Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900 dark:text-gray-100">
                        Enable Streaming Responses
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Display AI responses in real-time as they are generated
                      </p>
                    </div>
                    <button
                      onClick={() => setLocalConfig({
                        ...localConfig,
                        ai: { ...localConfig.ai, streaming: !localConfig.ai.streaming }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        localConfig.ai.streaming ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          localConfig.ai.streaming ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900 dark:text-gray-100">
                        Enable Thinking Display
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show AI reasoning process during responses (ChatGLM only)
                      </p>
                    </div>
                    <button
                      onClick={() => setLocalConfig({
                        ...localConfig,
                        ai: { ...localConfig.ai, enable_thinking: !localConfig.ai.enable_thinking }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        localConfig.ai.enable_thinking ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          localConfig.ai.enable_thinking ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          
          {/* Interface Section */}
          {activeSection === 'ui' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Interface Preferences
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Theme
                    </label>
                    <select
                      value={localConfig.ui.theme}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        ui: { ...localConfig.ui, theme: e.target.value as any }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Size
                    </label>
                    <select
                      value={localConfig.ui.font_size}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        ui: { ...localConfig.ui, font_size: e.target.value as any }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'show_token_usage', label: 'Show Token Usage', description: 'Display token usage statistics' },
                      { key: 'auto_save', label: 'Auto Save', description: 'Automatically save conversations' },
                      { key: 'auto_scroll', label: 'Auto Scroll', description: 'Automatically scroll to new messages' },
                      { key: 'enable_markdown', label: 'Enable Markdown', description: 'Render markdown formatting' },
                      { key: 'enable_syntax_highlighting', label: 'Syntax Highlighting', description: 'Highlight code syntax' },
                      { key: 'compact_mode', label: 'Compact Mode', description: 'Use compact interface layout' },
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <label className="font-medium text-gray-900 dark:text-gray-100">{label}</label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                        </div>
                        <button
                          onClick={() => setLocalConfig({
                            ...localConfig,
                            ui: { ...localConfig.ui, [key]: !localConfig.ui[key as keyof typeof localConfig.ui] }
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            localConfig.ui[key as keyof typeof localConfig.ui] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              localConfig.ui[key as keyof typeof localConfig.ui] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Section */}
          {activeSection === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Advanced Settings
                </h2>

                <div className="space-y-6">
                  {/* Performance Settings */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cache Size (MB)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={localConfig.performance.cache_size_mb}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            performance: { ...localConfig.performance, cache_size_mb: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Concurrent Requests
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={localConfig.performance.max_concurrent_requests}
                          onChange={(e) => setLocalConfig({
                            ...localConfig,
                            performance: { ...localConfig.performance, max_concurrent_requests: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Privacy</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'store_conversations', label: 'Store Conversations', description: 'Save conversation history locally' },
                        { key: 'anonymous_analytics', label: 'Anonymous Analytics', description: 'Share anonymous usage data' },
                        { key: 'crash_reporting', label: 'Crash Reporting', description: 'Send crash reports automatically' },
                        { key: 'encrypt_local_storage', label: 'Encrypt Local Storage', description: 'Encrypt stored data' },
                        { key: 'auto_cleanup', label: 'Auto Cleanup', description: 'Automatically clean old data' },
                      ].map(({ key, label, description }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <label className="font-medium text-gray-900 dark:text-gray-100">{label}</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                          </div>
                          <button
                            onClick={() => setLocalConfig({
                              ...localConfig,
                              privacy: { ...localConfig.privacy, [key]: !localConfig.privacy[key as keyof typeof localConfig.privacy] }
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              localConfig.privacy[key as keyof typeof localConfig.privacy] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                localConfig.privacy[key as keyof typeof localConfig.privacy] ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};