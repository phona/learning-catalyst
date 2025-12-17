import React, { useMemo, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ThreadListSidebar } from './Layout/ThreadListSidebar';
import { Header } from './Layout/Header';
import { useAppStore } from '@/renderer/stores/useAppStore';
import { useConfigStore } from '@/renderer/stores/useConfigStore';

/**
 * 🏗️ Application Layout Component
 *
 * Main application layout that orchestrates header, sidebar, and content areas.
 * ThreadListSidebar and content (via Outlet) are siblings under the same
 * AssistantRuntimeProvider - no extra wrappers needed.
 */
export const Layout: React.FC = () => {
  const { sidebar_open, theme, focus_mode } = useAppStore();
  const { config } = useConfigStore();

  // Memoize theme calculation to prevent unnecessary re-renders
  const _themeClasses = useMemo(() => {
    const root = document.documentElement;

    if (theme === 'auto') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
      return systemTheme;
    } else {
      root.classList.toggle('dark', theme === 'dark');
      return theme;
    }
  }, [theme]);

  // Set up system theme listener only when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (): void => {
      const root = document.documentElement;
      root.classList.toggle('dark', mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return (): void => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [theme]);

  return (
    <div
      className={`h-screen flex flex-col bg-gray-50 dark:bg-gray-900 ${focus_mode ? 'focus-mode' : ''}`}
    >
      {/* Header - Hidden in focus mode */}
      {!focus_mode && <Header />}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar - Hidden in focus mode */}
        {!focus_mode && <ThreadListSidebar open={sidebar_open} />}

        {/* Main content area */}
        <main
          className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300 ${
            focus_mode ? 'max-w-4xl mx-auto' : ''
          }`}
        >
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Status bar (optional) - Hidden in focus mode */}
      {!focus_mode && config?.ui?.showTokenUsage != null && (
        <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-1">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              Provider: {config.ai.modelTypes?.chat?.defaultProvider ?? config.ai.defaultProvider} |
              Model: {config.ai.modelTypes?.chat?.defaultModel ?? config.ai.defaultModel}
            </span>
            <span>Theme: {theme}</span>
          </div>
        </div>
      )}

      {/* Focus mode indicator */}
      {focus_mode && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-primary-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
            <span>Focus Mode</span>
            <button
              onClick={() => useAppStore.getState().toggleFocusMode()}
              className="ml-2 text-primary-200 hover:text-white transition-colors"
              title="Exit focus mode (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Layout;
