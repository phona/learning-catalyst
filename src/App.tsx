import React, { useEffect, useState } from 'react';
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
import { initializeApp, setupMenuHandlers } from './services/appService';
import { useAppServices } from './hooks/useAppServices';
import type { AppConfig } from '@/types';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const { setCurrentView, setTheme, setError, setSuccess } = useAppStore();
  const { setConfig, loadConfig } = useConfigStore();
  const {
    initialized: servicesInitialized,
    loading: servicesLoading,
    error: servicesError,
    systemHealth,
    refreshSystemHealth
  } = useAppServices();

  useEffect(() => {
    const initializeApplication = async () => {
      // Prevent multiple initializations
      if (isInitializing || isInitialized) {
        return;
      }

      setIsInitializing(true);
      try {
        // Check if running in Electron environment
        const isElectron = typeof window !== 'undefined' && window.electronAPI;

        if (!isElectron) {
          console.warn('Running in browser environment - some features will be limited');
          setIsInitialized(true);
          return;
        }

        // Initialize the application
        await initializeApp();

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
            refreshSystemHealth();
            setSuccess('Module system refreshed');
          },
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize application:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        setError(`Application initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApplication();
  }, []); // Remove dependencies to prevent re-initialization, only run once on mount

  // Handle service errors
  useEffect(() => {
    if (servicesError) {
      setError(`Services error: ${servicesError}`);
    }
  }, [servicesError, setError]);

  if (initError) {
    return (
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
              {initError}
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
    );
  }

  if (!isInitialized || servicesLoading) {
    return (
      <LoadingScreen
        message={servicesLoading ? "Initializing services..." : "Starting application..."}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ChatInterface />} />
          <Route path="chat" element={<ChatInterface />} />
          <Route path="sessions" element={<SessionManager />} />
          <Route path="settings" element={<SettingsPanel />} />
          <Route path="progress" element={<LearningDashboard />} />
          <Route path="knowledge-map" element={<KnowledgeMap />} />
          <Route path="discovery" element={<DiscoveryPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;