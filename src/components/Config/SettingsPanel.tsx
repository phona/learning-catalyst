import React, { useState, useEffect } from 'react';
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
  EyeIcon,
  EyeSlashIcon,
  ServerIcon,
  KeyIcon,
  GlobeAltIcon,
  ClockIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import { useConfigStore } from '@/stores/useConfigStore';
import { configService } from '@/services/configService';
import type {
  AppConfig,
  ProviderConfig,
  ModelTypeConfig,
  ModelTestResult,
  ModelValidationResult,
} from '@/types/config';

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

export const SettingsPanel: React.FC = () => {
  const { config, setConfig } = useConfigStore();
  const [activeSection, setActiveSection] = useState<'providers' | 'models' | 'ui' | 'advanced'>('models');
  const [expandedModelTypes, setExpandedModelTypes] = useState<Set<string>>(new Set(['chat']));
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set());
  const [modelTestResults, setModelTestResults] = useState<Record<string, ModelTestResult>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Local state for configuration
  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderConfig>>({});
  const [modelTypeConfigs, setModelTypeConfigs] = useState<Record<string, ModelTypeConfig>>({});

  useEffect(() => {
    if (config) {
      setLocalConfig({ ...config });
      setProviderConfigs({ ...config.ai.providers });
      setModelTypeConfigs({ ...config.ai.model_types });
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
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderConfigChange = (providerName: string, updates: Partial<ProviderConfig>) => {
    const updatedProviders = {
      ...providerConfigs,
      [providerName]: {
        ...providerConfigs[providerName],
        ...updates,
      },
    };
    setProviderConfigs(updatedProviders);

    if (localConfig) {
      const updatedConfig = {
        ...localConfig,
        ai: {
          ...localConfig.ai,
          providers: updatedProviders,
        },
      };
      setLocalConfig(updatedConfig);
    }
  };

  const handleModelTypeConfigChange = (modelType: string, updates: Partial<ModelTypeConfig>) => {
    const updatedModelTypes = {
      ...modelTypeConfigs,
      [modelType]: {
        ...modelTypeConfigs[modelType],
        ...updates,
      },
    };
    setModelTypeConfigs(updatedModelTypes);

    if (localConfig) {
      const updatedConfig = {
        ...localConfig,
        ai: {
          ...localConfig.ai,
          model_types: updatedModelTypes as any,
        },
      };
      setLocalConfig(updatedConfig);
    }
  };

  const testModel = async (providerName: string, modelName: string, modelType: 'chat' | 'embedding' | 'rerank') => {
    const testKey = `${providerName}-${modelName}-${modelType}`;
    setTestingModels(prev => new Set(prev).add(testKey));

    try {
      const result = await configService.testModel(providerName, modelName, modelType);
      setModelTestResults(prev => ({ ...prev, [testKey]: result }));
    } catch (error) {
      console.error('Model test failed:', error);
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

  const toggleApiKeyVisibility = (providerName: string) => {
    setShowApiKeys(prev => ({ ...prev, [providerName]: !prev[providerName] }));
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
              <span className="text-sm text-green-600 dark:text-green-400">Configuration saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 dark:text-red-400">Failed to save</span>
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
            { id: 'providers', label: 'Providers', icon: ServerIcon },
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
                                Default Provider
                              </label>
                              <select
                                value={config.default_provider}
                                onChange={(e) => handleModelTypeConfigChange(type, { default_provider: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {config.available_providers.map(provider => (
                                  <option key={provider} value={provider}>
                                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Model Selection */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Default Model
                              </label>
                              <div className="space-y-2">
                                {config.available_providers.map(provider => {
                                  const availableModels = providerMapping[provider]?.[type] || [];
                                  if (availableModels.length === 0) return null;

                                  return (
                                    <div key={provider} className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-24">
                                        {provider}:
                                      </span>
                                      <select
                                        value={config.default_provider === provider ? config.default_model : ''}
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleModelTypeConfigChange(type, {
                                              default_provider: provider,
                                              default_model: e.target.value,
                                            });
                                          }
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      >
                                        <option value="">Select a model</option>
                                        {availableModels.map(model => (
                                          <option key={model} value={model}>
                                            {model}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => testModel(provider, config.default_model, type as any)}
                                        disabled={testingModels.has(`${provider}-${config.default_model}-${type}`)}
                                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                        title="Test model"
                                      >
                                        {getStatusIcon(
                                          modelTestResults[`${provider}-${config.default_model}-${type}`],
                                          testingModels.has(`${provider}-${config.default_model}-${type}`)
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

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
                                  .filter(([key, value]) => value === true)
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

          {/* Providers Section */}
          {activeSection === 'providers' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  AI Provider Configuration
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Configure API keys and settings for each AI provider. Make sure to have valid API keys for the providers you want to use.
                </p>

                <div className="space-y-6">
                  {Object.entries(providerConfigs).map(([providerName, providerConfig]) => (
                    <div key={providerName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {providerName.charAt(0).toUpperCase() + providerName.slice(1)}
                        </h3>
                        <button
                          onClick={() => handleProviderConfigChange(providerName, { enabled: !providerConfig.enabled })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            providerConfig.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              providerConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            API Key
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type={showApiKeys[providerName] ? 'text' : 'password'}
                              value={providerConfig.api_key || ''}
                              onChange={(e) => handleProviderConfigChange(providerName, { api_key: e.target.value })}
                              placeholder="Enter your API key"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => toggleApiKeyVisibility(providerName)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              {showApiKeys[providerName] ? (
                                <EyeSlashIcon className="w-4 h-4" />
                              ) : (
                                <EyeIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {providerConfig.base_url !== undefined && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Base URL
                            </label>
                            <input
                              type="url"
                              value={providerConfig.base_url || ''}
                              onChange={(e) => handleProviderConfigChange(providerName, { base_url: e.target.value })}
                              placeholder="https://api.example.com"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Timeout (seconds)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="300"
                              value={providerConfig.timeout || 30}
                              onChange={(e) => handleProviderConfigChange(providerName, { timeout: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Max Retries
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={providerConfig.max_retries || 3}
                              onChange={(e) => handleProviderConfigChange(providerName, { max_retries: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add New Provider Button */}
                  <button className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center space-x-2">
                    <ServerIcon className="w-4 h-4" />
                    <span>Add New Provider</span>
                  </button>
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