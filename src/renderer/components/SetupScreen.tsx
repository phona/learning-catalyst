import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/renderer/utils/toast';
import { useConfigurationService } from '@/renderer/services/services-provider';
import {
  useSetupWorkflow,
  type ConfiguredProvider,
  type ModelAssignment,
  type SaveWorkflowStepId,
  type SaveWorkflowStepStatus,
} from '@/renderer/hooks/useSetupWorkflow';
import type {
  AppConfig,
  LearningConfig,
  PerformanceConfig,
  PrivacyConfig,
  ProviderConfig,
  ProviderType,
  UIConfig,
} from '@/shared/types/config';

interface ProviderOption {
  id: string;
  name: string;
  description: string;
  models: string[];
  metadata: {
    defaultModel: string;
    baseUrl: string;
  };
}

interface SetupScreenProps {
  message?: string;
}

type SaveWorkflowStep = {
  id: SaveWorkflowStepId;
  label: string;
  description: string;
};

const WORKFLOW_STEP_CONFIG: SaveWorkflowStep[] = [
  { id: 'saveUi', label: 'Save in UI layer', description: 'Capture provider and model choices before talking to the main process.' },
  { id: 'showLoader', label: 'Show loading indicator', description: 'Block interaction while the application applies the new configuration.' },
  { id: 'invokeConfig', label: 'Invoke configuration API', description: 'Call the renderer configuration API so the main process can pick up the settings.' },
  { id: 'persistConfig', label: 'Main process: Save to config file', description: 'Write the workspace configuration JSON so future launches pick up the setup.' },
  { id: 'rebuildObjects', label: 'Main process: Update/rebuild objects', description: 'Refresh providers, models, and services so everything runs with the new values.' },
  { id: 'blockUntilSuccess', label: 'Main process: Block until successful', description: 'Wait for the IPC round-trip to finish before unblocking the UI.' },
  { id: 'removeBlock', label: 'UI layer: Remove loading block', description: 'Hide the spinner and re-enable navigation after the save completes.' },
  { id: 'jumpToIndex', label: 'Jump into index page', description: 'Enter the main chat interface now that configuration is done.' },
];

const WORKFLOW_STATUS_ICONS: Record<SaveWorkflowStepStatus, string> = {
  idle: '○',
  pending: '⟳',
  success: '✓',
  error: '✖',
};

const WORKFLOW_STATUS_CLASSES: Record<SaveWorkflowStepStatus, string> = {
  idle: 'text-gray-400 dark:text-gray-600',
  pending: 'text-blue-500 dark:text-blue-300',
  success: 'text-green-500 dark:text-green-300',
  error: 'text-red-500 dark:text-red-400',
};

const DEFAULT_UI_CONFIG: UIConfig = {
  theme: 'light',
  show_token_usage: false,
  display_format: 'detailed',
  session_duration: 25,
  font_size: 'medium',
  sidebar_width: 300,
  auto_save: true,
  auto_scroll: true,
  show_line_numbers: false,
  enable_markdown: true,
  enable_syntax_highlighting: true,
  compact_mode: false,
};

const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  auto_save: true,
  session_timeout_minutes: 60,
  difficulty: 'intermediate',
  learning_style: 'visual',
  personalization_enabled: true,
  checkpoint_interval: 15,
  max_session_history: 100,
  enable_analytics: false,
  preferred_explanation_length: 'detailed',
};

const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  store_conversations: true,
  retention_days: 90,
  anonymous_analytics: false,
  crash_reporting: true,
  encrypt_local_storage: false,
  auto_cleanup: true,
  export_format: 'json',
};

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  cache_size_mb: 100,
  enable_caching: true,
  max_concurrent_requests: 5,
  request_timeout: 30,
  memory_limit_mb: 512,
  gpu_acceleration: false,
  background_processing: true,
  preload_models: false,
};

const SetupScreen: React.FC<SetupScreenProps> = ({ message }) => {
  const configService = useConfigurationService();
  // Wizard step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const navigate = useNavigate();
  const { isSaving, workflowStatus, workflowError, executeWorkflow } = useSetupWorkflow(configService);

  // Page 1: Provider configuration
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<ConfiguredProvider[]>([]);
  const [newProviderId, setNewProviderId] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Page 2: Model assignments
  const [chatAssignment, setChatAssignment] = useState<ModelAssignment | null>(null);
  const [embeddingAssignment, setEmbeddingAssignment] = useState<ModelAssignment | null>(null);
  const [rerankAssignment, setRerankAssignment] = useState<ModelAssignment | null>(null);

  // Page 3: Review & Save
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const getProviderType = (providerId: string): 'cloud' | 'local' => {
    const localProviders = ['openai-compatible', 'ollama', 'lmstudio'];
    return localProviders.includes(providerId) ? 'local' : 'cloud';
  };

  const getProviderName = (providerId: string): string => {
    const provider = providerOptions.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  const categorizeModels = (models: string[]) => {
    const chatModels = models.filter(model =>
      !model.includes('embedding') &&
      !model.includes('rerank') &&
      !model.includes('bge')
    );
    const embeddingModels = models.filter(model =>
      model.includes('embedding') ||
      (model.includes('bge') && !model.includes('rerank'))
    );
    const rerankModels = models.filter(model =>
      model.includes('rerank')
    );

    return { chatModels, embeddingModels, rerankModels };
  };

  const buildAppConfigFromSelections = (): AppConfig => {
    const providerConfigs = configuredProviders.reduce<Record<string, ProviderConfig>>((acc, provider) => {
      acc[provider.id] = {
        provider_type: provider.id as ProviderType,
        api_key: provider.apiKey,
        base_url: provider.baseUrl || undefined,
        models: [...provider.models],
      };
      return acc;
    }, {});

    const modelTypes: AppConfig['ai']['model_types'] = {};
    const chatSettings = chatAssignment?.settings;

    modelTypes.chat = {
      provider: chatAssignment!.providerId,
      model: chatAssignment!.model,
      temperature: chatSettings?.temperature ?? 0.7,
      max_tokens: chatSettings?.maxTokens ?? 2048,
      top_p: 1,
      enable_thinking: false,
      stream: true,
    };

    if (embeddingAssignment) {
      modelTypes.embedding = {
        provider: embeddingAssignment.providerId,
        model: embeddingAssignment.model,
      };
    }

    if (rerankAssignment) {
      modelTypes.rerank = {
        provider: rerankAssignment.providerId,
        model: rerankAssignment.model,
      };
    }

    return {
      ai: {
        providers: providerConfigs,
        model_types: modelTypes,
        metadata: {
          model_tests: [],
        },
      },
      ui: DEFAULT_UI_CONFIG,
      learning: DEFAULT_LEARNING_CONFIG,
      privacy: DEFAULT_PRIVACY_CONFIG,
      performance: DEFAULT_PERFORMANCE_CONFIG,
    };
  };

  // Load available providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await configService.getAvailableProviders();

        // Handle different response structures
        let providers: any[] = [];
        if (Array.isArray(response)) {
          providers = response;
        } else if (response && Array.isArray(response.providers)) {
          providers = response.providers;
        } else {
          console.error('Unexpected response format:', response);
          showError('Failed to load providers: Invalid response format');
          return;
        }

        console.log('Loaded providers:', providers);

        const providerOptions = providers.map((p: any) => ({
          id: p.id,
          name: p.displayName || p.name || p.id,
          description: p.description || '',
          models: Array.isArray(p.models)
            ? p.models.map((m: any) => typeof m === 'string' ? m : m.id).filter(Boolean)
            : [],
          metadata: {
            defaultModel: 'default',
            baseUrl: ''
          }
        }));

        setProviderOptions(providerOptions);
      } catch (error) {
        showError('Failed to load available providers');
        console.error('Failed to load providers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, [configService]);

  useEffect(() => {
    if (!shouldNavigate) {
      return;
    }

    setIsFadingOut(true);

    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 600);

    return () => clearTimeout(timer);
  }, [shouldNavigate, navigate]);

  // Add a new provider
  const handleAddProvider = () => {
    if (!newProviderId || !newProviderApiKey.trim()) {
      showError('Provider and API key are required');
      return;
    }

    const providerOption = providerOptions.find(p => p.id === newProviderId);
    if (!providerOption) {
      showError('Invalid provider selected');
      return;
    }

    // Check if already configured
    if (configuredProviders.find(p => p.id === newProviderId)) {
      showError('Provider already configured');
      return;
    }

    const newProvider: ConfiguredProvider = {
      id: newProviderId,
      name: providerOption.name,
      apiKey: newProviderApiKey.trim(),
      baseUrl: newProviderBaseUrl.trim(),
      models: providerOption.models
    };

    setConfiguredProviders([...configuredProviders, newProvider]);
    setNewProviderId('');
    setNewProviderApiKey('');
    setNewProviderBaseUrl('');
  };

  // Remove a provider
  const handleRemoveProvider = (providerId: string) => {
    setConfiguredProviders(configuredProviders.filter(p => p.id !== providerId));

    // Clean up assignments that use this provider
    if (chatAssignment?.providerId === providerId) {
      setChatAssignment(null);
    }
    if (embeddingAssignment?.providerId === providerId) {
      setEmbeddingAssignment(null);
    }
    if (rerankAssignment?.providerId === providerId) {
      setRerankAssignment(null);
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentStep === 1) {
      if (configuredProviders.length === 0) {
        showError('Please configure at least one provider');
        return;
      }
    } else if (currentStep === 2) {
      if (!chatAssignment) {
        showError('Please select a chat model');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Save configuration
  const handleSave = async () => {
    if (!chatAssignment) {
      showError('Chat model is required');
      return;
    }

    setShouldNavigate(false);

    try {
      await executeWorkflow({
        configuredProviders,
        chatAssignment,
        embeddingAssignment,
        rerankAssignment,
        buildAppConfig: buildAppConfigFromSelections,
      });

      showSuccess('Configuration saved successfully. Redirecting to the chat interface...');
      setShouldNavigate(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration.';
      showError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <main role="main" className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-300 mt-4">Loading available providers...</p>
        </div>
      </main>
    );
  }

  // Step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <React.Fragment key={stepNumber}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isCompleted
                  ? 'bg-green-600 text-white'
                  : isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {isCompleted ? '✓' : stepNumber}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`flex-1 h-1 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Page 1: Configure Providers
  const renderPage1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Configure AI Providers
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Add the AI providers you want to use. You can configure multiple providers and reuse them for different features.
        </p>
      </div>

      {configuredProviders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Configured Providers ({configuredProviders.length})
          </h3>
          {configuredProviders.map(provider => (
            <div
              key={provider.id}
              className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {provider.name}
                    </h4>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      {getProviderType(provider.id)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    API Key: ••••••••••••••••••••••••••••••••
                  </p>
                  {provider.baseUrl && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Base URL: {provider.baseUrl}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Models available: {provider.models.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveProvider(provider.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Add New Provider
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={newProviderId}
              onChange={(e) => {
                setNewProviderId(e.target.value);
                const provider = providerOptions.find(p => p.id === e.target.value);
                setNewProviderBaseUrl(provider?.metadata.baseUrl || '');
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              disabled={providerOptions.length === 0}
            >
              <option value="">Select a provider...</option>
              {providerOptions.map(option => {
                const providerType = getProviderType(option.id);
                return (
                  <option key={option.id} value={option.id}>
                    {option.name} ({providerType}) • {option.models.length} models
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={newProviderApiKey}
              onChange={(e) => setNewProviderApiKey(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="sk-..."
            />
          </div>

          {newProviderId && getProviderType(newProviderId) === 'local' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Base URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProviderBaseUrl}
                onChange={(e) => setNewProviderBaseUrl(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="http://localhost:11434/v1"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleAddProvider}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Provider
          </button>
        </div>
      </div>
    </div>
  );

  // Page 2: Configure Model Usages
  const renderPage2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Configure Model Usages
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Choose which provider and model to use for each feature.
        </p>
      </div>

      {/* Chat Model */}
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Chat Model <span className="text-red-500">*</span>
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Provider
            </label>
            <select
              value={chatAssignment?.providerId || ''}
              onChange={(e) => {
                if (!e.target.value) {
                  setChatAssignment(null);
                  return;
                }
                const provider = configuredProviders.find(p => p.id === e.target.value);
                if (provider) {
                  const { chatModels } = categorizeModels(provider.models);
                  setChatAssignment({
                    providerId: e.target.value,
                    model: chatModels[0] || '',
                    settings: { temperature: 0.4, maxTokens: 2048 }
                  });
                }
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select provider...</option>
              {configuredProviders.map(provider => {
                const { chatModels } = categorizeModels(provider.models);
                return (
                  <option key={provider.id} value={provider.id} disabled={chatModels.length === 0}>
                    {provider.name} {chatModels.length === 0 ? '(no chat models)' : `(${chatModels.length} models)`}
                  </option>
                );
              })}
            </select>
          </div>

          {chatAssignment && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Model
                </label>
                <input
                  list="chat-models-list"
                  type="text"
                  value={chatAssignment.model}
                  onChange={(e) =>
                    setChatAssignment({ ...chatAssignment, model: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="Type to search or enter model ID"
                />
                <datalist id="chat-models-list">
                  {configuredProviders
                    .find(p => p.id === chatAssignment.providerId)
                    ?.models.filter(m => !m.includes('embedding') && !m.includes('rerank'))
                    .map(model => (
                      <option key={model} value={model} />
                    ))}
                </datalist>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Type to search available models or enter a custom model ID
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={chatAssignment.settings?.temperature || 0.4}
                    onChange={(e) =>
                      setChatAssignment({
                        ...chatAssignment,
                        settings: {
                          ...chatAssignment.settings,
                          temperature: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={chatAssignment.settings?.maxTokens || 2048}
                    onChange={(e) =>
                      setChatAssignment({
                        ...chatAssignment,
                        settings: {
                          ...chatAssignment.settings,
                          maxTokens: parseInt(e.target.value)
                        }
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Embedding Model */}
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Embedding Model
          </h3>
          {!embeddingAssignment && (
            <button
              type="button"
              onClick={() => {
                if (configuredProviders.length > 0) {
                  const firstProvider = configuredProviders[0];
                  const { embeddingModels } = categorizeModels(firstProvider.models);
                  if (embeddingModels.length > 0) {
                    setEmbeddingAssignment({
                      providerId: firstProvider.id,
                      model: embeddingModels[0]
                    });
                  }
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Configure
            </button>
          )}
        </div>

        {embeddingAssignment ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Provider
              </label>
              <select
                value={embeddingAssignment.providerId}
                onChange={(e) => {
                  const provider = configuredProviders.find(p => p.id === e.target.value);
                  if (provider) {
                    const { embeddingModels } = categorizeModels(provider.models);
                    setEmbeddingAssignment({
                      providerId: e.target.value,
                      model: embeddingModels[0] || ''
                    });
                  }
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                {configuredProviders.map(provider => {
                  const { embeddingModels } = categorizeModels(provider.models);
                  return (
                    <option key={provider.id} value={provider.id} disabled={embeddingModels.length === 0}>
                      {provider.name} {embeddingModels.length === 0 ? '(no embedding models)' : `(${embeddingModels.length} models)`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Model
              </label>
              <input
                list="embedding-models-list"
                type="text"
                value={embeddingAssignment.model}
                onChange={(e) =>
                  setEmbeddingAssignment({ ...embeddingAssignment, model: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="Type to search or enter model ID"
              />
              <datalist id="embedding-models-list">
                {configuredProviders
                  .find(p => p.id === embeddingAssignment.providerId)
                  ?.models.filter(m => m.includes('embedding') || (m.includes('bge') && !m.includes('rerank')))
                  .map(model => (
                    <option key={model} value={model} />
                  ))}
              </datalist>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              ℹ Used for semantic search and knowledge graphs
            </p>

            <button
              type="button"
              onClick={() => setEmbeddingAssignment(null)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Optional: Configure for semantic search and knowledge graph features
          </p>
        )}
      </div>

      {/* Rerank Model */}
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Rerank Model
          </h3>
          {!rerankAssignment && (
            <button
              type="button"
              onClick={() => {
                if (configuredProviders.length > 0) {
                  const firstProvider = configuredProviders[0];
                  const { rerankModels } = categorizeModels(firstProvider.models);
                  if (rerankModels.length > 0) {
                    setRerankAssignment({
                      providerId: firstProvider.id,
                      model: rerankModels[0]
                    });
                  }
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Configure
            </button>
          )}
        </div>

        {rerankAssignment ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Provider
              </label>
              <select
                value={rerankAssignment.providerId}
                onChange={(e) => {
                  const provider = configuredProviders.find(p => p.id === e.target.value);
                  if (provider) {
                    const { rerankModels } = categorizeModels(provider.models);
                    setRerankAssignment({
                      providerId: e.target.value,
                      model: rerankModels[0] || ''
                    });
                  }
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                {configuredProviders.map(provider => {
                  const { rerankModels } = categorizeModels(provider.models);
                  return (
                    <option key={provider.id} value={provider.id} disabled={rerankModels.length === 0}>
                      {provider.name} {rerankModels.length === 0 ? '(no rerank models)' : `(${rerankModels.length} models)`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Model
              </label>
              <input
                list="rerank-models-list"
                type="text"
                value={rerankAssignment.model}
                onChange={(e) =>
                  setRerankAssignment({ ...rerankAssignment, model: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="Type to search or enter model ID"
              />
              <datalist id="rerank-models-list">
                {configuredProviders
                  .find(p => p.id === rerankAssignment.providerId)
                  ?.models.filter(m => m.includes('rerank'))
                  .map(model => (
                    <option key={model} value={model} />
                  ))}
              </datalist>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              ℹ Used for improving search result relevance
            </p>

            <button
              type="button"
              onClick={() => setRerankAssignment(null)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Optional: Configure for improved search relevance
          </p>
        )}
      </div>
    </div>
  );

  const renderWorkflowPanel = () => (
    <div className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Save workflow
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Each stage follows the UI → main process handoff you described.
          </p>
        </div>
        {workflowError && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            {workflowError}
          </p>
        )}
      </div>
      <ol className="mt-4 space-y-3">
        {WORKFLOW_STEP_CONFIG.map((step, index) => {
          const status = workflowStatus[step.id];
          return (
            <li key={step.id} className="flex gap-3 items-start">
              <span className={`text-lg font-semibold ${WORKFLOW_STATUS_CLASSES[status]}`}>
                {WORKFLOW_STATUS_ICONS[status]}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {index + 1}. {step.label}
                  </p>
                  <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {status === 'pending'
                      ? 'Working'
                      : status === 'success'
                        ? 'Complete'
                        : status === 'error'
                          ? 'Errored'
                          : 'Idle'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );

  // Page 3: Review
  const renderPage3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Review Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Verify everything looks correct before saving.
        </p>
      </div>

      {renderWorkflowPanel()}

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Configured Providers ({configuredProviders.length})
          </h3>
          <div className="space-y-2">
            {configuredProviders.map(provider => {
              const usages = [];
              if (chatAssignment?.providerId === provider.id) usages.push('Chat');
              if (embeddingAssignment?.providerId === provider.id) usages.push('Embedding');
              if (rerankAssignment?.providerId === provider.id) usages.push('Rerank');

              return (
                <div
                  key={provider.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {provider.name}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {getProviderType(provider.id)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        API Key: ✓ Configured
                      </p>
                      {provider.baseUrl && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Base URL: {provider.baseUrl}
                        </p>
                      )}
                      {usages.length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Used for: {usages.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Model Assignments
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                💬 Chat
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Provider: {getProviderName(chatAssignment!.providerId)}<br />
                Model: {chatAssignment!.model}<br />
                Settings: Temperature {chatAssignment!.settings?.temperature}, Max Tokens {chatAssignment!.settings?.maxTokens}
              </p>
            </div>

            {embeddingAssignment && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  🔍 Embedding
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Provider: {getProviderName(embeddingAssignment.providerId)}<br />
                  Model: {embeddingAssignment.model}
                </p>
              </div>
            )}

            {rerankAssignment && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  🎯 Rerank
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Provider: {getProviderName(rerankAssignment.providerId)}<br />
                  Model: {rerankAssignment.model}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ℹ Configuration will be saved locally. Restart the application to apply changes.
        </p>
      </div>
    </div>
  );

  const activeWorkflowStepLabel = WORKFLOW_STEP_CONFIG.find(step => workflowStatus[step.id] === 'pending')?.label;

  return (
    <main
      role="main"
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-8">
        {isSaving && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-900/80 text-white"
            aria-live="assertive"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white border-t-transparent animate-spin" />
            <p className="text-lg font-semibold">Applying configuration…</p>
            <p className="text-sm text-white/80">
              {activeWorkflowStepLabel ? `Step: ${activeWorkflowStepLabel}` : 'Preparing...'}
            </p>
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to Learning Catalyst
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {message || 'Configure your AI providers and models to enable all Learning Catalyst features.'}
          </p>
        </div>

        {renderStepIndicator()}

        {currentStep === 1 && renderPage1()}
        {currentStep === 2 && renderPage2()}
        {currentStep === 3 && renderPage3()}

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && currentStep < 3 && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Step {currentStep} of {totalSteps}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={isSaving}
                >
                  ← Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={isSaving}
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save & Finish ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SetupScreen;
