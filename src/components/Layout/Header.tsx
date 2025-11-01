import React from 'react';
import {
  Bars3Icon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/useAppStore';
import { useChatStore } from '@/hooks/useChatStore';

export const Header: React.FC = () => {
  const {
    sidebar_open,
    theme,
    setSidebarOpen,
    setSettingsPanelOpen,
    setTheme,
  } = useAppStore();
  const chatStore = useChatStore();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebar_open);
  };

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-5 h-5" />;
      case 'dark':
        return <MoonIcon className="w-5 h-5" />;
      case 'auto':
        return <ComputerDesktopIcon className="w-5 h-5" />;
      default:
        return <SunIcon className="w-5 h-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
      default:
        return 'Light';
    }
  };

  // Get current session state on every render to ensure reactivity
  const { currentSession } = chatStore();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Menu toggle and session title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle sidebar"
          >
            <Bars3Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Learning Catalyst
            </h1>
            {currentSession && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                {currentSession.metadata.title}
              </p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={`Theme: ${getThemeLabel()}`}
          >
            {getThemeIcon()}
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsPanelOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Help */}
          <button
            onClick={() => {
              // TODO: Implement help dialog
              console.log('Help clicked');
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Help"
          >
            <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </header>
  );
};