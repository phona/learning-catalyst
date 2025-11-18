/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { showError, showSuccess } from '@/renderer/utils/toast';

const PROVIDER_OPTIONS = [
  {
    value: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    defaultBaseUrl: 'https://api.openai.com/v1'
  },
  {
    value: 'openai-compatible',
    label: 'OpenAI Compatible',
    defaultModel: 'llama3.1:8b',
    defaultBaseUrl: 'http://localhost:11434/v1'
  }
] as const;

interface SetupScreenProps {
  message?: string;
}

const resolveProviderDefaults = (provider: string) => {
  return PROVIDER_OPTIONS.find(option => option.value === provider);
};

const SetupScreen: React.FC<SetupScreenProps> = ({ message }) => {
  const [provider, setProvider] = useState(PROVIDER_OPTIONS[0].value);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(PROVIDER_OPTIONS[0].defaultModel);
  const [baseUrl, setBaseUrl] = useState(PROVIDER_OPTIONS[0].defaultBaseUrl);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const defaults = resolveProviderDefaults(provider);
    if (defaults) {
      setModel(defaults.defaultModel);
      setBaseUrl(defaults.defaultBaseUrl);
    }
  }, [provider]);

  const providerOptions = useMemo(() => PROVIDER_OPTIONS, []);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!provider || !apiKey.trim() || !model.trim()) {
      showError('Provider, API key, and model are required to continue.');
      return;
    }

    if (!window?.electronAPI?.settings?.setWorkspaceConfigKey) {
      showError('Configuration channel is not ready yet.');
      return;
    }

    setIsSaving(true);

    try {
      const providerConfig = {
        provider_type: provider,
        api_key: apiKey.trim(),
        base_url: baseUrl.trim() || undefined
      };

      await window.electronAPI.settings.setWorkspaceConfigKey(`ai.providers.${provider}`, providerConfig);
      await window.electronAPI.settings.setWorkspaceConfigKey('ai.model_types.chat', {
        provider,
        model: model.trim(),
        temperature: 0.4,
        max_tokens: 2048
      });

      showSuccess('Configuration saved. Restart the app to finish setup.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to Learning Catalyst</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {message || 'To continue, configure your AI provider so the agents can start.'}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {providerOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              After saving, restart the application so the new provider is loaded.
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isSaving ? 'Saving…' : 'Save & Restart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;
