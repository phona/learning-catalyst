import React from 'react';
import type { AppConfig, UIConfig } from '@/shared/types/config';

type ToggleSettingKey = Extract<
  keyof UIConfig,
  | 'showTokenUsage'
  | 'autoSave'
  | 'autoScroll'
  | 'enableMarkdown'
  | 'enableSyntaxHighlighting'
  | 'compactMode'
>;

const TOGGLE_SETTINGS: ReadonlyArray<{
  key: ToggleSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: 'showTokenUsage',
    label: 'Show Token Usage',
    description: 'Display token usage statistics',
  },
  {
    key: 'autoSave',
    label: 'Auto Save',
    description: 'Automatically save conversations',
  },
  {
    key: 'autoScroll',
    label: 'Auto Scroll',
    description: 'Automatically scroll to new messages',
  },
  {
    key: 'enableMarkdown',
    label: 'Enable Markdown',
    description: 'Render markdown formatting',
  },
  {
    key: 'enableSyntaxHighlighting',
    label: 'Syntax Highlighting',
    description: 'Highlight code syntax',
  },
  {
    key: 'compactMode',
    label: 'Compact Mode',
    description: 'Use compact interface layout',
  },
];

interface UISettingsProps {
  config: AppConfig;
  onConfigChange: (updates: Partial<AppConfig>) => void;
}

export const UISettings: React.FC<UISettingsProps> = ({ config, onConfigChange }) => {
  const updateUIConfig = <K extends keyof UIConfig>(key: K, value: UIConfig[K]) => {
    onConfigChange({
      ui: {
        ...config.ui,
        [key]: value,
      },
    });
  };

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
              onChange={(event) => updateUIConfig('theme', event.target.value as UIConfig['theme'])}
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
              value={config.ui.fontSize}
              onChange={(event) =>
                updateUIConfig('fontSize', event.target.value as UIConfig['fontSize'])
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Font Size"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="space-y-4">
            {TOGGLE_SETTINGS.map(({ key, label, description }) => {
              const isEnabled = config.ui[key];
              return (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900 dark:text-gray-100">{label}</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={label}
                    onClick={() => updateUIConfig(key, !isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Title Depth (H1–H6)
            </label>
            <div className="flex items-center gap-3">
              <select
                id="heading-depth-selector"
                value={(config.ui.documentHeadingDepth ?? 3).toString()}
                onChange={(event) =>
                  updateUIConfig('documentHeadingDepth', Math.max(1, Math.min(6, Number(event.target.value))))
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Max Title Depth"
              >
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
                <option value="4">H4</option>
                <option value="5">H5</option>
                <option value="6">H6</option>
              </select>
              <div className="flex items-center gap-1" aria-label="Included heading levels">
                {Array.from({ length: 6 }, (_, i) => i + 1).map((lvl) => {
                  const selected = (config.ui.documentHeadingDepth ?? 3) >= lvl;
                  return (
                    <span
                      key={lvl}
                      className={`text-xs px-2 py-1 rounded border ${
                        selected
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      H{lvl}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Sections start at headings up to the selected depth; deeper headings stay within their parent section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UISettings;
