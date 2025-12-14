import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { utilityToasts } from '@/renderer/utils/toast';
import { useService } from '@/renderer/services/services-provider';
import type { ProviderConfig, ProviderValidationResult, ProviderType } from '@/shared/types';
import { ModelType } from '@/shared/types/ai';
import { PREDEFINED_PROVIDERS } from '@/shared/constants/providers';
import { ProviderSelect } from '@/renderer/components/Config/components/ProviderSelect';
import { ModelSelect } from '@/renderer/components/Config/components/ModelSelect';

interface AIProviderSettingsProps {
  // New props for provider-based configuration
  providerConfigs?: Record<string, ProviderConfig>;
  modelAssignments?: Partial<Record<ModelType, { provider_config_id: string; model_id: string }>>;
  onProviderConfigChange?: (providerId: string, config: ProviderConfig) => void;
  onModelAssignmentChange?: (modelType: ModelType, providerId: string, modelId: string) => void;
  onProviderRemove?: (providerId: string) => void;
}

export const AIProviderSettings: React.FC<AIProviderSettingsProps> = ({
  providerConfigs = {},
  modelAssignments = {},
  onProviderConfigChange,
  onModelAssignmentChange,
  onProviderRemove,
}) => {
  const configService = useService('configService');

  const providersEqual = (
    a: Record<string, ProviderConfig>,
    b: Record<string, ProviderConfig>,
  ): boolean => {
    const normalize = (input: Record<string, ProviderConfig>) => {
      const sortedKeys = Object.keys(input).sort();
      const entries = sortedKeys.map((k) => {
        const p = input[k] || {};
        const models = Array.isArray(p.models) ? [...p.models] : [];
        return [k, { ...p, models }];
      });
      return JSON.stringify(entries);
    };
    return normalize(a) === normalize(b);
  };

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
  // Keep track of focus for configured provider inputs to avoid unwanted blur
  const apiKeyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastPointerDownTs = useRef<number>(0);

  // UI state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [editedApiKeys, setEditedApiKeys] = useState<Record<string, string>>({});
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  // Record pointer downs so we can distinguish real blur (click elsewhere) vs spurious blur after typing
  useEffect(() => {
    const handlePointerDown = () => {
      lastPointerDownTs.current = Date.now();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  useEffect(() => {
    if (editingProviderId) return;
    if (!providersEqual(configuredProviders, providerConfigs)) {
      setConfiguredProviders(providerConfigs);
    }
  }, [providerConfigs, configuredProviders, editingProviderId]);

  useEffect(() => {
    if (editingProviderId) {
      restoreFocusIfNeeded(editingProviderId);
    }
  }, [editingProviderId, editedApiKeys, configuredProviders]);

  // Provider configuration handlers
  const handleProviderChange = (providerType: ProviderType | '') => {
    setSelectedProvider(providerType);
    const provider = providerType ? PREDEFINED_PROVIDERS[providerType] : null;
    if (provider) {
      setBaseUrlInput(provider.baseUrl);
      if (!displayNameInput.trim()) {
        setDisplayNameInput(provider.name);
      }
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
    if (!selectedProvider || !apiKeyInput.trim() || !displayNameInput.trim()) {
      utilityToasts.error('Please select a provider, enter a name, and enter an API key');
      return;
    }

    const providerType = selectedProvider as ProviderType;
    const providerId = `${providerType}-${Date.now()}`;
    const providerConfig: ProviderConfig = {
      providerType,
      apiKey: apiKeyInput.trim(),
      baseUrl: baseUrlInput,
      displayName: displayNameInput.trim(),
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
      setDisplayNameInput('');

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

  const updateProviderApiKey = (providerId: string, apiKey: string) => {
    setConfiguredProviders((prev) => {
      const existing = prev[providerId];
      if (!existing) return prev;
      const updated = { ...existing, apiKey };
      if (onProviderConfigChange) {
        onProviderConfigChange(providerId, updated);
      }
      return { ...prev, [providerId]: updated };
    });
  };

  const commitEditedApiKey = (providerId: string) => {
    const draft = editedApiKeys[providerId];
    const current = configuredProviders[providerId]?.apiKey ?? '';
    const next = draft ?? current;
    if (next !== current) {
      updateProviderApiKey(providerId, next);
    }
    setEditedApiKeys((prev) => {
      const { [providerId]: _removed, ...rest } = prev;
      return rest;
    });
  };
  const restoreFocusIfNeeded = (providerId: string) => {
    // If focus disappeared (e.g., jumps to body after first keystroke), bring it back.
    requestAnimationFrame(() => {
      const el = apiKeyInputRefs.current[providerId];
      if (!el) return;
      const active = document.activeElement;
      const lost = !active || active === document.body;
      if (lost) {
        el.focus();
        // place caret at end
        const len = el.value.length;
        try {
          el.setSelectionRange(len, len);
        } catch {
          /* ignore caret errors */
        }
      }
    });
  };

  const removeProvider = (providerId: string) => {
    const inUse = Object.values(modelAssignments ?? {}).some(
      (assignment) => assignment?.provider_config_id === providerId,
    );
    if (inUse) return;

    setConfiguredProviders((prev) => {
      const { [providerId]: _removed, ...rest } = prev;
      return rest;
    });
    setDiscoveredModels((prev) => {
      const { [providerId]: _removed, ...rest } = prev;
      return rest;
    });
    setShowApiKeys((prev) => {
      const { [providerId]: _removed, ...rest } = prev;
      return rest;
    });
    onProviderRemove?.(providerId);
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
              Provider Name
            </label>
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="e.g. My OpenAI workspace"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                onClick={() => toggleApiKeyVisibility(selectedProvider)}
                className="px-3 py-2 text-gray-500 hover:text-gray-700"
                title="Toggle API key visibility"
              >
                {showApiKeys[selectedProvider] ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
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
              disabled={!displayNameInput.trim() || !apiKeyInput.trim() || !validationStatus[selectedProvider]?.success}
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
          {Object.entries(configuredProviders).map(([providerId, config]) => {
            const inUse = Object.values(modelAssignments ?? {}).some(
              (assignment) => assignment?.provider_config_id === providerId,
            );
            const providerLabel =
              config.displayName ??
              PREDEFINED_PROVIDERS[config.providerType]?.name ??
              config.providerType;

            return (
              <div
                key={providerId}
                className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col gap-1 w-full mr-3">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {providerLabel}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-2 py-1 border border-gray-200 dark:border-gray-700 rounded">
                      {config.providerType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                  <input
                    type={showApiKeys[providerId] ? 'text' : 'password'}
                    value={editedApiKeys[providerId] ?? config.apiKey ?? ''}
                    ref={(el) => {
                      apiKeyInputRefs.current[providerId] = el;
                    }}
                    onChange={(e) => {
                      setEditingProviderId(providerId);
                      setEditedApiKeys((prev) => ({ ...prev, [providerId]: e.target.value }));
                      restoreFocusIfNeeded(providerId);
                    }}
                    onFocus={() => setEditingProviderId(providerId)}
                    onBlur={(e) => {
                      const nextTarget = e.relatedTarget as HTMLElement | null;
                      const pointerBlur = Date.now() - lastPointerDownTs.current < 200;
                      const movingFocus =
                        (nextTarget && nextTarget !== document.body) || pointerBlur;
                      if (!movingFocus) {
                        // Focus vanished after typing; bring it back and keep editing
                        restoreFocusIfNeeded(providerId);
                        return;
                      }
                      commitEditedApiKey(providerId);
                      setEditingProviderId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitEditedApiKey(providerId);
                        setEditingProviderId(null);
                      }
                    }}
                    placeholder="API key hidden"
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                    <button
                      onClick={() => toggleApiKeyVisibility(providerId)}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title={showApiKeys[providerId] ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKeys[providerId] ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => fetchModelsForProvider(providerId)}
                      disabled={isFetchingModels}
                      className="p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1"
                      title="Fetch models"
                    >
                      {isFetchingModels ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowPathIcon className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium">Fetch Models</span>
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {config.models?.length || 0} models available
                  </div>
                </div>
                <button
                  onClick={() => removeProvider(providerId)}
                  disabled={inUse}
                  className="p-2 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={inUse ? 'Provider in use; update model assignments first' : 'Remove'}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
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

            <ProviderSelect
              providers={Object.entries(configuredProviders)
                .filter(([_, config]) => !!config.apiKey)
                .map(([providerId, config]) => ({
                  id: providerId,
                  label:
                    config.displayName ??
                    PREDEFINED_PROVIDERS[config.providerType]?.name ??
                    providerId,
                }))}
              value={modelAssignments[modelType]?.provider_config_id || ''}
              onChange={(providerId) => {
                // Always assign the selected provider, even if no models are available yet
                if (!providerId) {
                  handleModelAssignmentChange(modelType, '', '');
                  return;
                }
                const models = getAvailableModels(providerId);
                const nextModel = models.length > 0 ? models[0] : '';
                handleModelAssignmentChange(modelType, providerId, nextModel);
              }}
              placeholderLabel="Select provider..."
            />

            <ModelSelect
              models={getAvailableModels(modelAssignments[modelType]?.provider_config_id || '')}
              value={modelAssignments[modelType]?.model_id || ''}
              onChange={(modelId) => {
                const providerId = modelAssignments[modelType]?.provider_config_id;
                if (providerId) {
                  handleModelAssignmentChange(modelType, providerId, modelId);
                }
              }}
              commitOnBlur
              disabled={!modelAssignments[modelType]?.provider_config_id}
              allowFreeInput
            />
          </div>
        ))}
      </div>
    );
  };

  // Main render
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <ProviderConfigurationSection />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <ModelTypeAssignmentSection />
      </div>
    </div>
  );
};
export default AIProviderSettings;
