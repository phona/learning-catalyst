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
        ai: { model_types: { chat: { provider: 'mock-provider', model: 'mock-model' } } },
        ui: {},
        learning: {},
        privacy: {},
      }) as unknown as AppConfig;
  }
  return client;
})();

const missingConfigElectronClient: ElectronAPI = (() => {
  const client = createMockElectronAPIClient();
  if (typeof client.settings?.getConfig === 'function') {
    client.settings.getConfig = async () => null as unknown as AppConfig;
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
}: {
  children: React.ReactNode;
  routerProps?: React.ComponentProps<typeof MemoryRouter>;
  electronAPI?: ElectronAPI;
}): React.ReactElement => (
  <QueryLayer>
    <MemoryRouter {...routerProps}>
      <ServicesProvider apiClient={electronAPI ?? readyElectronClient}>
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
  }: {
    routerProps?: React.ComponentProps<typeof MemoryRouter>;
    electronUnavailable?: boolean;
    electronAPI?: ElectronAPI;
    renderOptions?: Parameters<typeof render>[1];
  } = {},
): ReturnType<typeof render> => {
  const noWindowElectron =
    typeof window !== 'undefined' &&
    !(window as typeof window & { electronAPI?: unknown }).electronAPI;
  const useMissing = electronUnavailable || noWindowElectron;
  const client = electronAPI ?? (useMissing ? missingConfigElectronClient : readyElectronClient);
  return render(
    <Providers routerProps={routerProps} electronAPI={client}>
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
