import React from 'react';
import type { AppConfig } from '@/types/config';

interface ResponseSettingsProps {
  config: AppConfig;
  onConfigChange: (updates: Partial<AppConfig>) => void;
}

export const ResponseSettings: React.FC<ResponseSettingsProps> = ({ config, onConfigChange }) => {
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
            onClick={() => onConfigChange({
              ai: { ...config.ai, streaming: !config.ai.streaming }
            })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.ai.streaming ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.ai.streaming ? 'translate-x-6' : 'translate-x-1'
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
            onClick={() => onConfigChange({
              ai: { ...config.ai, enable_thinking: !config.ai.enable_thinking }
            })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.ai.enable_thinking ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.ai.enable_thinking ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};