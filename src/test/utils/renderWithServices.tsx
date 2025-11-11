import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ConfigServiceProvider } from '@/renderer/hooks/useAppServices';
import { ServiceProvider } from '@/renderer/hooks/useServices';
import { ServicesProvider } from '@/renderer/services/services-container';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import type { AppConfig } from '@/shared/types/config';
import { makeEmptyConfig } from './fixtures/config';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const QueryLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConfigServiceProvider>
    <ServiceProvider>
      <ServicesProvider>
        <QueryLayer>{children}</QueryLayer>
      </ServicesProvider>
    </ServiceProvider>
  </ConfigServiceProvider>
);

const ensureConfigLoaded = (config: AppConfig | null = makeEmptyConfig()) => {
  useConfigStore.setState(
    {
      config,
      loading: false,
      error: null,
    },
    false,
    'test:config'
  );
};

export const renderWithServices = (ui: React.ReactElement, options?: RenderOptions) => {
  return render(<Providers>{ui}</Providers>, options);
};

interface RenderSettingsOptions extends RenderOptions {
  config?: AppConfig | null;
}

export const renderSettingsPanel = async ({
  config = makeEmptyConfig(),
  ...options
}: RenderSettingsOptions = {}) => {
  ensureConfigLoaded(config);
  const { SettingsPanel } = await import('@/renderer/components/Config/SettingsPanel');
  return renderWithServices(<SettingsPanel />, options);
};

interface RenderChatOptions extends RenderOptions {
  config?: AppConfig | null;
}

export const renderChatInterface = async ({
  config = makeEmptyConfig(),
  ...options
}: RenderChatOptions = {}) => {
  ensureConfigLoaded(config);
  const { ChatInterface } = await import('@/renderer/components/Chat/ChatInterface');
  return renderWithServices(<ChatInterface />, options);
};
