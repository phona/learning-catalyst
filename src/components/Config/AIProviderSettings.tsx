import React, { useState, useCallback, useMemo } from 'react';
import {
  ChatBubbleLeftRightIcon,
  CubeIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { modelFetchingService } from '@/services/modelFetchingService';
import { utilityToasts } from '@/utils/toast';
import type {
  ModelTypeConfig,
  ModelTestResult,
} from '@/types/config';
import type { ModelList } from '@/types/ai';
import { configService } from '@/services/configService';

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

interface AIProviderSettingsProps {
  modelTypeConfigs: Record<string, ModelTypeConfig>;
  onModelTypeConfigChange: (modelType: string, updates: Partial<ModelTypeConfig>) => void;
  remoteModels: Record<string, ModelList>;
  fetchingModels: Record<string, boolean>;
  fetchErrors: Record<string, string>;
  onFetchModels: (modelType: string) => void;
}

export const AIProviderSettings: React.FC<AIProviderSettingsProps> = ({
  modelTypeConfigs,
  onModelTypeConfigChange,
  remoteModels,
  fetchingModels,
  fetchErrors,
  onFetchModels,
}) => {
  const [expandedModelTypes, setExpandedModelTypes] = useState<Set<string>>(new Set(['chat']));
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set());
  const [modelTestResults, setModelTestResults] = useState<Record<string, ModelTestResult>>({});
  const [manualModelInput, setManualModelInput] = useState<Record<string, string>>({});
  const [showManualInput, setShowManualInput] = useState<Record<string, boolean>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const testModel = async (providerName: string, modelName: string, modelType: 'chat' | 'embedding' | 'rerank') => {
    const testKey = `${providerName}-${modelName}-${modelType}`;
    setTestingModels(prev => new Set(prev).add(testKey));

    try {
      const result = await configService.testModel(providerName, modelName, modelType);
      setModelTestResults(prev => ({ ...prev, [testKey]: result }));

      if (result.status === 'success') {
        utilityToasts.success(`${modelName} test successful`);
      } else {
        utilityToasts.error(`${modelName} test failed: ${result.error_message || 'Unknown error'}`);
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

  const getProviderModelMapping = () => {
    return configService.getProviderModelMapping();
  };

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
    onModelTypeConfigChange(modelType, { default_model: modelName });
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

  return (
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
                        onChange={(e) => onModelTypeConfigChange(type, { default_provider: e.target.value })}
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
                            onChange={(e) => onModelTypeConfigChange(type, { custom_provider_url: e.target.value })}
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
                            onChange={(e) => onModelTypeConfigChange(type, {
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
                            onChange={(e) => onModelTypeConfigChange(type, { default_model: e.target.value })}
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
                            onClick={() => onFetchModels(type)}
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
                            onChange={(e) => onModelTypeConfigChange(type, {
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
                            onChange={(e) => onModelTypeConfigChange(type, {
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
    </div>
  );
};