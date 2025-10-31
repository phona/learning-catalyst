import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/Chat/ChatInterface';
import { SessionManager } from './components/Session/SessionManager';
import { SettingsPanel } from './components/Config/SettingsPanel';
import { LearningDashboard } from './components/Dashboard/LearningDashboard';
import { KnowledgeMap } from './components/Dashboard/KnowledgeMap';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { LoadingScreen } from './components/UI/LoadingScreen';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { useAppStore } from './stores/useAppStore';
import { useConfigStore } from './stores/useConfigStore';
import { setupMenuHandlers } from './services/appService';
import { useAppServices } from './hooks/useAppServices';
import { useChatStoreWithServices } from './hooks/useChatStoreWithServices';
import type { AppConfig } from '@/types';

// Global flag to track if setup has already been completed to prevent double execution in Strict Mode
// This is outside the component so it persists across mount/unmount cycles in Strict Mode
let hasSetupApp = false;

function App() {
  const { setCurrentView, setTheme, setError, setSuccess } = useAppStore();
  const { setConfig, loadConfig } = useConfigStore();
  const {
    ready: servicesReady,
    error: servicesError
  } = useAppServices();

  // Initialize chat store with session service
  useChatStoreWithServices();

  // FIRST EFFECT: Application initialization and setup
  // This effect handles the one-time setup process that should only run once when services are ready.
  // It's separated from error handling to avoid re-running initialization logic every time an error occurs.
  // Uses a global flag to prevent double execution in React Strict Mode (development only).
  useEffect(() => {
    // Only run additional setup when services are fully ready
    if (!servicesReady) {
      return;
    }

    const setupApplication = async () => {
      // Prevent double execution in React Strict Mode
      if (hasSetupApp) {
        return;
      }

      try {
        // Mark setup as started immediately to prevent race conditions
        hasSetupApp = true;

        // Check if running in Electron environment
        const isElectron = typeof window !== 'undefined' && window.electronAPI;

        if (!isElectron) {
          console.warn('Running in browser environment - some features will be limited');
          return;
        }

        // Load configuration
        const config = await loadConfig();
        if (config) {
          setConfig(config);

          // Apply theme
          if (config.ui?.theme) {
            setTheme(config.ui.theme);
          }
        }

        // Setup menu handlers
        setupMenuHandlers({
          'new-chat': () => setCurrentView('chat'),
          'open-settings': () => setCurrentView('settings'),
          'view-progress': () => setCurrentView('progress'),
          'view-knowledge-map': () => setCurrentView('knowledge-map'),
          'discover-content': () => setCurrentView('discovery'),
          'toggle-theme': () => {
            const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
          },
          'refresh-modules': () => {
            setSuccess('Module system refreshed');
          },
        });
      } catch (error) {
        console.error('Failed to setup application:', error);
        setError(`Application setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    setupApplication();
  }, [servicesReady, setCurrentView, setTheme, setSuccess, loadConfig, setConfig]);

  // SECOND EFFECT: Service error handling
  // This effect is separated from initialization to handle errors independently.
  // It allows us to react to service errors without re-triggering the entire initialization process.
  useEffect(() => {
    if (servicesError) {
      setError(`Services error: ${servicesError}`);
    }
  }, [servicesError, setError]);

  return (
    <>
      {servicesError ? (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Initialization Error
            </h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Learning Catalyst failed to start properly. Please restart the application.
            </p>
            <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm">
              <summary className="cursor-pointer font-semibold">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {servicesError}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Restart Application
            </button>
          </div>
        </div>
      ) : !servicesReady ? (
        <LoadingScreen message="Initializing services..." />
      ) : (
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<ChatInterface />} />
              <Route path="chat" element={<ChatInterface />} />
              <Route path="sessions" element={<SessionManager />} />
              <Route path="sessions/:sessionId" element={<ChatInterface />} />
              <Route path="settings" element={<SettingsPanel />} />
              <Route path="progress" element={<LearningDashboard />} />
              <Route path="knowledge-map" element={<KnowledgeMap />} />
              <Route path="discovery" element={<DiscoveryPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      )}
    </>
  );
}

export default App;