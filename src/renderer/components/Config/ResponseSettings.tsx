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


import React from 'react';
import type { AppConfig } from '@/shared/types/config';

interface ResponseSettingsProps {
  config: AppConfig | null;
  onConfigChange: (updates: Partial<AppConfig>) => void;
}

export const ResponseSettings: React.FC<ResponseSettingsProps> = ({ config, onConfigChange }) => {
  const chatConfig = config?.ai?.model_types?.chat;
  const capabilities = chatConfig?.capabilities ?? { streaming: false, thinking: false };
  const controlsDisabled = !config || !chatConfig;

  const toggleCapability = (key: 'streaming' | 'thinking') => {
    if (!config || !chatConfig) {
      return;
    }

    onConfigChange({
      ai: {
        ...config.ai,
        model_types: {
          ...config.ai.model_types,
          chat: {
            ...chatConfig,
            capabilities: {
              ...capabilities,
              [key]: !capabilities[key]
            }
          }
        }
      }
    });
  };

  return (
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
            onClick={() => toggleCapability('streaming')}
            disabled={controlsDisabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              capabilities.streaming ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                capabilities.streaming ? 'translate-x-6' : 'translate-x-1'
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
            onClick={() => toggleCapability('thinking')}
            disabled={controlsDisabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              capabilities.thinking ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                capabilities.thinking ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {controlsDisabled && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Chat model configuration is unavailable. Configure a chat provider to enable these controls.
          </p>
        )}
      </div>
    </div>
  );
};
