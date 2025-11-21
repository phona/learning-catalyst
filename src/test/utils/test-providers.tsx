import { render, RenderOptions } from '@testing-library/react';
import type { MemoryRouterProps } from 'react-router-dom';
import type { AppConfig } from '@/shared/types/config';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import { Providers, QueryLayer } from './test-components';

const ensureConfigLoaded = (config: AppConfig | null = null) => {
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

interface RenderWithServicesOptions extends RenderOptions {
  routerProps?: MemoryRouterProps;
}

export const renderWithServices = (
  ui: React.ReactElement,
  { routerProps, ...options }: RenderWithServicesOptions = {}
) => {
  return render(<Providers routerProps={routerProps}>{ui}</Providers>, options);
};

interface RenderSettingsOptions extends RenderOptions {
  config?: AppConfig | null;
  routerProps?: MemoryRouterProps;
}

export const renderWithSettings = (
  ui: React.ReactElement,
  { config, routerProps, ...options }: RenderSettingsOptions = {}
) => {
  ensureConfigLoaded(config);
  return renderWithServices(ui, { routerProps, ...options });
};

// Re-export testing utilities
export { screen, fireEvent, waitFor } from '@testing-library/react';

// Re-export components for tests that need them
export { Providers, QueryLayer } from './test-components';
