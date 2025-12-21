declare const process: {
  env: {
    NODE_ENV: string;
  };
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { App } from '@/renderer/app';
import { ServicesProvider } from './services/services-provider';
import { createElectronAPIClient } from './services/api/electron-api-client';
import { ElectronAPIProvider } from './hooks/useElectronAPI';
import { ChatStoreProvider } from './stores/chat/ChatStoreProvider';
import { ErrorBoundary } from '@/renderer/shared/ui';
import '../index.css';
import '@assistant-ui/react-ui/styles/index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Render the app
const electronAPI = createElectronAPIClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Top-level error boundary with full variant for critical failures */}
    <ErrorBoundary
      variant="full"
      title="Application Error"
      description="Learning Catalyst encountered an unexpected error. The application will attempt to recover."
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ElectronAPIProvider api={electronAPI}>
            <ServicesProvider apiClient={electronAPI}>
              <ChatStoreProvider>
                <App />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </ChatStoreProvider>
            </ServicesProvider>
          </ElectronAPIProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
