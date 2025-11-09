import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/Chat/ChatInterface';
import { SessionManager } from './components/Session/SessionManager';
import { SettingsPanel } from './components/Config/SettingsPanel';
import { LearningDashboard } from './components/Dashboard/LearningDashboard';
import { KnowledgeMap } from './components/Dashboard/KnowledgeMap';
import { DiscoveryPage } from './DiscoveryPage';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { useAppStore } from './stores/useAppStore';
import { useConfigStore } from './stores/useConfigStore';
import { setupMenuHandlers } from './services/AppServiceClient';
import { ServicesProvider } from './services/services-container';

// Global flag to track if setup has already been completed to prevent double execution in Strict Mode
// This is outside the component so it persists across mount/unmount cycles in Strict Mode
let hasSetupApp = false;

function App() {
  const { setCurrentView, setTheme, setError, setSuccess } = useAppStore();
  const { setConfig, loadConfig } = useConfigStore();
  // Services are now provided through proper IPC communication
  // No direct service access needed in App component

  // Application setup - runs once when services are ready
  // Uses a global flag to prevent double execution in React Strict Mode (development only)
  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasSetupApp) {
      return;
    }

    const setupApplication = async () => {
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
  }, [setCurrentView, setTheme, setSuccess, loadConfig, setConfig]);

  // ServiceProvider now handles all dependency injection
  // Services are available to all child components through the context
  return (
    <ErrorBoundary>
      <ServicesProvider>
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
      </ServicesProvider>
    </ErrorBoundary>
  );
}

export default App;