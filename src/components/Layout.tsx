import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Layout/Sidebar';
import { Header } from './Layout/Header';
import { useAppStore } from '@/stores/useAppStore';
import { useConfigStore } from '@/stores/useConfigStore';

export const Layout: React.FC = () => {
  const { sidebar_open, theme } = useAppStore();
  const { config } = useConfigStore();

  // Apply theme on component mount and config change
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }

    // Listen for system theme changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = () => {
        root.classList.toggle('dark', mediaQuery.matches);
      };

      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <Header />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar open={sidebar_open} />

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Status bar (optional) */}
      {config?.ui?.show_token_usage && (
        <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-1">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              Provider: {config.ai.model_types?.chat?.default_provider || config.ai.default_provider} | Model: {config.ai.model_types?.chat?.default_model || config.ai.default_model}
            </span>
            <span>Theme: {theme}</span>
          </div>
        </div>
      )}
    </div>
  );
};