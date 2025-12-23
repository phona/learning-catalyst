import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ServicesProvider } from '@/renderer/services/services-provider';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { AppConfig } from '@/shared/types/config';
import { ChatStoreProvider } from '@/renderer/stores/chat/ChatStoreProvider';
import { ElectronAPIProvider } from '@/renderer/hooks/useElectronAPI';
import { AssistantProvider } from '@assistant-ui/react';

// Create a minimal mock Assistant API for testing
// The assistant-ui library uses ProxiedAssistantState which calls api.threads().getState()
// and expects threads.threadIds.length and threads.archivedThreadIds.length
const createMockAssistantApi = () => {
  const listeners = new Set<() => void>();

  // State structure that matches what assistant-ui expects
  const threadsState = { threadIds: [], archivedThreadIds: [], isLoading: false };
  const emptyState = {};
  const emptyArrayState = { length: 0 };

  return {
    // Main subscription for useSyncExternalStore
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // These methods return store-like objects that ProxiedAssistantState uses
    threads: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => threadsState,
      getState: () => threadsState,
    }),
    tools: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyArrayState,
      getState: () => emptyArrayState,
    }),
    modelContext: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    thread: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    threadListItem: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    composer: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    message: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    part: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    attachment: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
  };
};

const queryClient = new QueryClient();

const readyElectronClient: ElectronAPI = (() => {
  const client = createMockElectronAPIClient();
  if (typeof client.settings?.getConfig === 'function') {
    client.settings.getConfig = async () =>
      ({
        success: true,
        data: {
          ai: { modelTypes: { chat: { provider: 'mock-provider', model: 'mock-model' } } },
          ui: {},
          learning: {},
          privacy: {},
        } as AppConfig,
      });
  }
  return client;
})();

const missingConfigElectronClient: ElectronAPI = (() => {
  const client = createMockElectronAPIClient();
  if (typeof client.settings?.getConfig === 'function') {
    client.settings.getConfig = async () => ({ success: true });
  }
  return client;
})();

export const QueryLayer = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export const Providers = ({
  children,
  routerProps,
  electronAPI,
  serviceOverrides,
}: {
  children: React.ReactNode;
  routerProps?: React.ComponentProps<typeof MemoryRouter>;
  electronAPI?: ElectronAPI;
  serviceOverrides?: React.ComponentProps<typeof ServicesProvider>['overrides'];
}): React.ReactElement => (
  <QueryLayer>
    <ElectronAPIProvider api={electronAPI ?? readyElectronClient}>
      <AssistantProvider api={createMockAssistantApi()}>
        <MemoryRouter {...routerProps}>
          <ServicesProvider apiClient={electronAPI ?? readyElectronClient} overrides={serviceOverrides}>
            <ChatStoreProvider>{children}</ChatStoreProvider>
          </ServicesProvider>
        </MemoryRouter>
      </AssistantProvider>
    </ElectronAPIProvider>
  </QueryLayer>
);

export const renderWithServices = (
  ui: React.ReactElement,
  {
    routerProps,
    electronUnavailable = false,
    electronAPI,
    renderOptions,
    serviceOverrides,
    preloadedConfig,
  }: {
    routerProps?: React.ComponentProps<typeof MemoryRouter>;
    electronUnavailable?: boolean;
    electronAPI?: ElectronAPI;
    renderOptions?: Parameters<typeof render>[1];
    serviceOverrides?: React.ComponentProps<typeof ServicesProvider>['overrides'];
    preloadedConfig?: AppConfig;
  } = {},
): ReturnType<typeof render> => {
  const noWindowElectron =
    typeof window !== 'undefined' &&
    !(window as typeof window & { electronAPI?: unknown }).electronAPI;
  const useMissing = electronUnavailable || noWindowElectron;

  let client = electronAPI ?? (useMissing ? missingConfigElectronClient : readyElectronClient);

  if (preloadedConfig) {
    // Seed the config store and supply an API client that returns the fixture
    useConfigStore.setState((state) => ({
      ...state,
      config: preloadedConfig,
      loading: false,
      error: null,
      loadConfig: async () => {
        useConfigStore.setState({ config: preloadedConfig, loading: false, error: null });
        return preloadedConfig;
      },
    }));
    const seededClient = createMockElectronAPIClient();
    if (seededClient.settings?.getConfig) {
      seededClient.settings.getConfig = async () => ({ success: true, data: preloadedConfig });
    }
    if (seededClient.settings?.setConfig) {
      seededClient.settings.setConfig = async () => ({ success: true });
    }
    client = seededClient;
  }

  return render(
    <Providers routerProps={routerProps} electronAPI={client} serviceOverrides={serviceOverrides}>
      {ui}
    </Providers>,
    renderOptions,
  );
};

export const renderWithSettings = (
  ui: React.ReactElement,
  {
    config,
    renderOptions,
    routerProps,
  }: {
    config?: AppConfig;
    renderOptions?: Parameters<typeof render>[1];
    routerProps?: React.ComponentProps<typeof MemoryRouter>;
  } = {},
): ReturnType<typeof render> => {
  if (config) {
    useConfigStore.setState({ config });
  }
  return render(<Providers routerProps={routerProps}>{ui}</Providers>, renderOptions);
};
