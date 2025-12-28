import React from 'react';
import type { AppConfig } from '@/shared/types';

interface AdvancedSettingsProps {
  config: AppConfig;
  onConfigChange: (updates: Partial<AppConfig>) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ config, onConfigChange }) => {
  return (
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
                  value={config.performance.cacheSizeMb}
                  onChange={(e) =>
                    onConfigChange({
                      performance: {
                        ...config.performance,
                        cacheSizeMb: parseInt(e.target.value),
                      },
                    })
                  }
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
                  value={config.performance.maxConcurrentRequests}
                  onChange={(e) =>
                    onConfigChange({
                      performance: {
                        ...config.performance,
                        maxConcurrentRequests: parseInt(e.target.value),
                      },
                    })
                  }
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
                {
                  key: 'storeConversations',
                  label: 'Store Conversations',
                  description: 'Save conversation history locally',
                },
                {
                  key: 'anonymousAnalytics',
                  label: 'Anonymous Analytics',
                  description: 'Share anonymous usage data',
                },
                {
                  key: 'crashReporting',
                  label: 'Crash Reporting',
                  description: 'Send crash reports automatically',
                },
                {
                  key: 'encryptLocalStorage',
                  label: 'Encrypt Local Storage',
                  description: 'Encrypt stored data',
                },
                {
                  key: 'autoCleanup',
                  label: 'Auto Cleanup',
                  description: 'Automatically clean old data',
                },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900 dark:text-gray-100">{label}</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                  <button
                    onClick={() =>
                      onConfigChange({
                        privacy: {
                          ...config.privacy,
                          [key]: !config.privacy[key as keyof typeof config.privacy],
                        },
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.privacy[key as keyof typeof config.privacy]
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.privacy[key as keyof typeof config.privacy]
                          ? 'translate-x-6'
                          : 'translate-x-1'
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
  );
};
export default AdvancedSettings;
