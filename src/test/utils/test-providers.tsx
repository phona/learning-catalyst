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
    <MemoryRouter {...routerProps}>
      <ServicesProvider apiClient={electronAPI ?? readyElectronClient} overrides={serviceOverrides}>
        <ChatStoreProvider>{children}</ChatStoreProvider>
      </ServicesProvider>
    </MemoryRouter>
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
