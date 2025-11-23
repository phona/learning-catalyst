import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { utilityToasts } from '@/renderer/utils/toast';
import { useService } from '@/renderer/services/services-provider';
import type { ProviderConfig, ProviderValidationResult, ProviderType } from '@/shared/types';
import { ModelType } from '@/shared/types/ai';
import { PREDEFINED_PROVIDERS } from '@/shared/constants/providers';

interface AIProviderSettingsProps {
  // New props for provider-based configuration
  providerConfigs?: Record<string, ProviderConfig>;
  modelAssignments?: Partial<Record<ModelType, { provider_config_id: string; model_id: string }>>;
  onProviderConfigChange?: (providerId: string, config: ProviderConfig) => void;
  onModelAssignmentChange?: (modelType: ModelType, providerId: string, modelId: string) => void;
}

export const AIProviderSettings: React.FC<AIProviderSettingsProps> = ({
  providerConfigs = {},
  modelAssignments = {},
  onProviderConfigChange,
  onModelAssignmentChange,
}) => {
  const configService = useService('configService');

  // Main component state according to plan
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | ''>('');
  const [configuredProviders, setConfiguredProviders] =
    useState<Record<string, ProviderConfig>>(providerConfigs);
  const [validationStatus, setValidationStatus] = useState<
    Record<string, ProviderValidationResult>
  >({});
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['provider-configuration', 'model-assignment']),
  );
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setConfiguredProviders(providerConfigs);
  }, [providerConfigs]);

  // Section expansion handlers
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Provider configuration handlers
  const handleProviderChange = (providerType: ProviderType | '') => {
    setSelectedProvider(providerType);
    const provider = providerType ? PREDEFINED_PROVIDERS[providerType] : null;
    if (provider) {
      setBaseUrlInput(provider.baseUrl);
      const typedProvider = providerType as ProviderType;
      // Reset validation status when switching providers
      setValidationStatus((prev) => {
        const { [typedProvider]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // API key validation handler
  const validateApiKey = async () => {
    if (!selectedProvider || !apiKeyInput.trim()) {
      utilityToasts.error('Please enter a provider and API key');
      return;
    }

    setIsValidating(true);
    try {
      const providerType = selectedProvider as ProviderType;
      const result = await configService.validateProvider(
        providerType,
        apiKeyInput.trim(),
        baseUrlInput,
      );
      setValidationStatus((prev) => ({ ...prev, [providerType]: result }));

      if (result.success) {
        utilityToasts.success('API key validated successfully');
      } else {
        utilityToasts.error(`Validation failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      const providerType = selectedProvider as ProviderType;
      setValidationStatus((prev) => ({
        ...prev,
        [providerType]: { success: false, error: errorMessage },
      }));
      utilityToasts.error(`Validation failed: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Model discovery handlers
  const fetchModelsForProvider = async (providerId: string) => {
    const providerConfig = configuredProviders[providerId];
    if (!providerConfig?.apiKey) {
      utilityToasts.error('Please configure and validate the provider first');
      return;
    }

    setIsFetchingModels(true);
    try {
      const models = await configService.getProviderModels(
        providerConfig.providerType,
        providerConfig.apiKey || '',
        providerConfig.baseUrl,
      );

      setDiscoveredModels((prev) => ({ ...prev, [providerId]: models }));

      // Update provider config with discovered models
      const updatedConfig = { ...providerConfig, models };
      setConfiguredProviders((prev) => ({ ...prev, [providerId]: updatedConfig }));

      if (onProviderConfigChange) {
        onProviderConfigChange(providerId, updatedConfig);
      }

      utilityToasts.success(`Found ${models.length} models for ${providerConfig.providerType}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      utilityToasts.error(`Failed to fetch models: ${errorMessage}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Provider configuration save handler
  const saveProviderConfiguration = async () => {
    if (!selectedProvider || !apiKeyInput.trim()) {
      utilityToasts.error('Please select a provider and enter an API key');
      return;
    }

    const providerType = selectedProvider as ProviderType;
    const providerId = `${providerType}-${Date.now()}`;
    const providerConfig: ProviderConfig = {
      providerType,
      apiKey: apiKeyInput.trim(),
      baseUrl: baseUrlInput,
      models: discoveredModels[providerId] || [],
    };

    try {
      setConfiguredProviders((prev) => ({ ...prev, [providerId]: providerConfig }));

      if (onProviderConfigChange) {
        onProviderConfigChange(providerId, providerConfig);
      }

      // Reset form
      setSelectedProvider('');
      setApiKeyInput('');
      setBaseUrlInput('');

      utilityToasts.success('Provider configuration saved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      utilityToasts.error(`Failed to save provider configuration: ${errorMessage}`);
    }
  };

  // Model type assignment handlers
  const handleModelAssignmentChange = (
    modelType: ModelType,
    providerId: string,
    modelId: string,
  ) => {
    if (onModelAssignmentChange) {
      onModelAssignmentChange(modelType, providerId, modelId);
    }
  };

  // UI helpers
  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const getAvailableModels = (providerId: string): string[] => {
    return discoveredModels[providerId] || configuredProviders[providerId]?.models || [];
  };

  // Provider Configuration Section Component
  const ProviderConfigurationSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Provider Configuration
      </h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Provider
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value as ProviderType | '')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose a provider...</option>
          {Object.entries(PREDEFINED_PROVIDERS).map(([id, provider]) => (
            <option key={id} value={id}>
              {provider.name} - {provider.description}
            </option>
          ))}
        </select>
      </div>

      {selectedProvider && (
        <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {PREDEFINED_PROVIDERS[selectedProvider]?.name} Configuration
            </h4>
            {validationStatus[selectedProvider]?.success && (
              <span className="text-green-600 text-sm flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Configured
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <div className="flex space-x-2">
              <input
                type={showApiKeys[selectedProvider] ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter API key..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => validateApiKey()}
                disabled={!apiKeyInput.trim() || isValidating}
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {isValidating ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate'
                )}
              </button>
            </div>

            {validationStatus[selectedProvider] && (
              <div
                className={`text-sm ${validationStatus[selectedProvider].success ? 'text-green-600' : 'text-red-600'} flex items-center`}
              >
                {validationStatus[selectedProvider].success ? (
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                )}
                {validationStatus[selectedProvider].success
                  ? '✓ API key is valid'
                  : `✗ ${validationStatus[selectedProvider].error}`}
              </div>
            )}
          </div>

          {/* Custom Base URL (for openai-compatible providers) */}
          {selectedProvider === 'openai-compatible' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Base URL
              </label>
              <input
                type="url"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={saveProviderConfiguration}
              disabled={!apiKeyInput.trim() || !validationStatus[selectedProvider]?.success}
              className="px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* List of configured providers */}
      {Object.entries(configuredProviders).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Configured Providers</h4>
          {Object.entries(configuredProviders).map(([providerId, config]) => (
            <div
              key={providerId}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {PREDEFINED_PROVIDERS[config.providerType]?.name || config.providerType}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {config.models?.length || 0} models available
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchModelsForProvider(providerId)}
                  disabled={isFetchingModels}
                  className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  title="Fetch models"
                >
                  {isFetchingModels ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowPathIcon className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => toggleApiKeyVisibility(providerId)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Toggle API key visibility"
                >
                  {showApiKeys[providerId] ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Model Type Assignment Section Component
  const ModelTypeAssignmentSection = () => {
    const modelTypes: ModelType[] = [ModelType.CHAT, ModelType.EMBEDDING, ModelType.RERANK];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Model Type Assignment
        </h3>

        {modelTypes.map((modelType) => (
          <div key={modelType} className="flex items-center space-x-4">
            <span className="capitalize w-24 text-gray-700 dark:text-gray-300">{modelType}:</span>

            <select
              value={modelAssignments[modelType]?.provider_config_id || ''}
              onChange={(e) => {
                const providerId = e.target.value;
                if (providerId) {
                  const models = getAvailableModels(providerId);
                  if (models.length > 0) {
                    handleModelAssignmentChange(modelType, providerId, models[0]);
                  }
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select provider...</option>
              {Object.entries(configuredProviders)
                .filter(([_, config]) => config.apiKey)
                .map(([providerId]) => (
                  <option key={providerId} value={providerId}>
                    {PREDEFINED_PROVIDERS[configuredProviders[providerId].providerType]?.name ||
                      providerId}
                  </option>
                ))}
            </select>

            <select
              value={modelAssignments[modelType]?.model_id || ''}
              onChange={(e) => {
                const providerId = modelAssignments[modelType]?.provider_config_id;
                if (providerId) {
                  handleModelAssignmentChange(modelType, providerId, e.target.value);
                }
              }}
              disabled={!modelAssignments[modelType]?.provider_config_id}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Select model...</option>
              {getAvailableModels(modelAssignments[modelType]?.provider_config_id || '').map(
                (model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ),
              )}
            </select>

            <button
              onClick={() =>
                fetchModelsForProvider(modelAssignments[modelType]?.provider_config_id || '')
              }
              disabled={
                !modelAssignments[modelType]?.provider_config_id ||
                !configuredProviders[modelAssignments[modelType]?.provider_config_id || '']
                  ?.apiKey ||
                isFetchingModels
              }
              className="px-3 py-1 bg-green-500 text-white rounded-md text-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              data-testid="fetch-models-button"
            >
              {isFetchingModels ? (
                <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <ArrowPathIcon className="w-3 h-3 mr-1" />
              )}
              <span>Fetch Models</span>
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Main render
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          AI Provider Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure AI providers and assign models to different task types. Each provider can be
          validated before use.
        </p>

        <div className="space-y-6">
          {/* Provider Configuration Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('provider-configuration')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <CubeIcon className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Provider Configuration
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set up and validate AI providers
                  </p>
                </div>
              </div>
              {expandedSections.has('provider-configuration') ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.has('provider-configuration') && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <ProviderConfigurationSection />
              </div>
            )}
          </div>

          {/* Model Type Assignment Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection('model-assignment')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <AcademicCapIcon className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Model Type Assignment
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Assign providers and models to task types
                  </p>
                </div>
              </div>
              {expandedSections.has('model-assignment') ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedSections.has('model-assignment') && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <ModelTypeAssignmentSection />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AIProviderSettings;
