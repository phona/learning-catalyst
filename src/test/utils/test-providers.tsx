import { render, RenderOptions } from '@testing-library/react';
import type { AppConfig } from '@/shared/types/configuration';
import { useConfigStore } from '@/renderer/services/configuration/config-store';
import { makeEmptyConfig } from '@/shared/config/default-app-config';
import { Providers, QueryLayer } from './test-components';

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

export const renderWithSettings = (
  ui: React.ReactElement,
  { config, ...options }: RenderSettingsOptions = {}
) => {
  ensureConfigLoaded(config);
  return renderWithServices(ui, options);
};

// Re-export testing utilities
export { screen, fireEvent, waitFor } from '@testing-library/react';

// Re-export components for tests that need them
export { Providers, QueryLayer } from './test-components';