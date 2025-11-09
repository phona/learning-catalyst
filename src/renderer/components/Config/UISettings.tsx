import React from 'react';
import type { AppConfig } from '@/shared/types/config';

interface UISettingsProps {
  config: AppConfig;
  onConfigChange: (updates: Partial<AppConfig>) => void;
}

export const UISettings: React.FC<UISettingsProps> = ({ config, onConfigChange }) => {
  return (
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
              id="theme-selector"
              value={config.ui.theme}
              onChange={(e) => onConfigChange({
                ui: { ...config.ui, theme: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Theme"
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
              id="font-size-selector"
              value={config.ui.font_size}
              onChange={(e) => onConfigChange({
                ui: { ...config.ui, font_size: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Font Size"
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
                  type="button"
                  role="switch"
                  aria-checked={config.ui[key as keyof typeof config.ui]}
                  aria-label={label}
                  onClick={() => onConfigChange({
                    ui: { ...config.ui, [key]: !config.ui[key as keyof typeof config.ui] }
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.ui[key as keyof typeof config.ui] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.ui[key as keyof typeof config.ui] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};