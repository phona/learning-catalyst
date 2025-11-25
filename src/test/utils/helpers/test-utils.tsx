// @ts-nocheck
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type {
  AppConfig,
  ModelCapabilities,
  ProviderConfig,
  SelectedChatModel,
} from '@/shared/types/config';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Test utilities for React Testing Library

// Create a test query client with default options
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

// Custom render function that includes providers
interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  queryClient = createTestQueryClient(),
  initialEntries = ['/'],
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: string[];
}

const customRender = (
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders queryClient={queryClient} initialEntries={initialEntries}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

let originalConsoleError = console.error;

// Mock handlers for common interactions
export const mockHandlers = {
  // Prevent console.error from failing tests
  suppressConsoleErrors: () => {
    originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Warning: ReactDOM.render is deprecated')
      ) {
        return;
      }
      originalConsoleError.call(console, ...args);
    };
  },

  // Restore console.error
  restoreConsole: () => {
    console.error = originalConsoleError;
  },

  // Mock ResizeObserver
  mockResizeObserver: () => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  },

  // Mock IntersectionObserver
  mockIntersectionObserver: () => {
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  },

  // Mock matchMedia
  mockMatchMedia: (matches = false) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  },

  // Mock clipboard API
  mockClipboard: () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
    return { mockWriteText };
  },

  // Mock Electron API
  mockElectronAPI: () => {
    const electronAPI = {
      getConfig: vi.fn(),
      setConfig: vi.fn(),
      showOpenDialog: vi.fn(),
      readFile: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    };

    Object.defineProperty(window, 'electronAPI', {
      value: electronAPI,
      writable: true,
    });

    return electronAPI;
  },
};

// Test data generators
export const createMockSession = (overrides = {}) => ({
  id: 'session-1',
  title: 'Test Chat',
  created_at: new Date('2024-01-01T10:00:00'),
  updated_at: new Date('2024-01-01T10:00:00'),
  messages: [],
  metadata: {
    title: 'Test Chat',
    tags: [],
    topics_covered: [],
    archived: false,
    pinned: false,
  },
  context: {
    current_provider: 'openai',
    current_model: 'gpt-3.5-turbo',
    temperature: 0.7,
    max_tokens: 4096,
    enable_thinking: true,
    conversation_style: 'educational',
    language: 'en',
    user_preferences: {
      learning_style: 'reading',
      detail_level: 'detailed',
      example_preference: 'all',
      response_length: 'medium',
      technical_level: 'intermediate',
    },
  },
  checkpoints: [],
  statistics: {
    total_messages: 0,
    user_messages: 0,
    assistant_messages: 0,
    total_tokens_used: 0,
    total_thinking_tokens: 0,
    session_duration: 0,
    average_response_time: 0,
    concepts_learned: 0,
    checkpoints_created: 0,
    productivity_score: 0,
    engagement_score: 0,
  },
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello, AI!',
  timestamp: new Date('2024-01-01T10:00:00'),
  ...overrides,
});

const defaultChatCapabilities: ModelCapabilities = {
  streaming: true,
  thinking: true,
  function_calling: false,
  vision: false,
  max_input_tokens: 4096,
  max_output_tokens: 2048,
};

const defaultChatModel: SelectedChatModel = {
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1,
  enable_thinking: true,
  stream: true,
  default_provider: 'openai',
  default_model: 'gpt-3.5-turbo',
  capabilities: defaultChatCapabilities,
};

const baseAIConfig: AppConfig['ai'] = {
  providers: {
    openai: {
      provider_type: 'openai',
      api_key: 'test-key',
      base_url: 'https://api.openai.com/v1',
      models: ['gpt-3.5-turbo', 'gpt-4'],
      streaming: true,
    } as ProviderConfig,
  },
  modelTypes: {
    chat: defaultChatModel,
  },
  metadata: {
    model_tests: [],
  },
  default_provider: 'openai',
  default_model: 'gpt-3.5-turbo',
  temperature: 0.7,
  max_tokens: 4096,
  streaming: true,
  enable_thinking: true,
  context_window_size: 4096,
};

const baseUIConfig: AppConfig['ui'] = {
  theme: 'dark',
  show_token_usage: true,
  display_format: 'detailed',
  session_duration: 45,
  font_size: 'medium',
  sidebar_width: 256,
  auto_save: true,
  auto_scroll: true,
  show_line_numbers: true,
  enable_markdown: true,
  enable_syntax_highlighting: true,
  compact_mode: false,
};

const baseLearningConfig: AppConfig['learning'] = {
  auto_save: true,
  session_timeout_minutes: 120,
  difficulty: 'adaptive',
  learning_style: 'reading',
  personalization_enabled: true,
  checkpoint_interval: 30,
  max_session_history: 100,
  enable_analytics: true,
  preferred_explanation_length: 'detailed',
};

const basePrivacyConfig: AppConfig['privacy'] = {
  store_conversations: true,
  retention_days: 30,
  anonymous_analytics: true,
  crash_reporting: true,
  encrypt_local_storage: false,
  auto_cleanup: true,
  export_format: 'json',
};

const basePerformanceConfig: AppConfig['performance'] = {
  cache_size_mb: 100,
  enable_caching: true,
  max_concurrent_requests: 3,
  request_timeout: 30,
  memory_limit_mb: 512,
  gpu_acceleration: false,
  background_processing: true,
  preload_models: false,
};

const mergeProviders = (
  original: Record<string, ProviderConfig>,
  overrides?: DeepPartial<Record<string, ProviderConfig>>,
): Record<string, ProviderConfig> => {
  if (!overrides) {
    return { ...original };
  }

  const merged: Record<string, ProviderConfig> = { ...original };
  for (const [providerKey, override] of Object.entries(overrides)) {
    if (!override) continue;
    merged[providerKey] = {
      ...merged[providerKey],
      ...override,
    } as ProviderConfig;
  }
  return merged;
};

const mergeModelTypes = (
  original: AppConfig['ai']['modelTypes'] = {},
  overrides?: DeepPartial<AppConfig['ai']['modelTypes']>,
): AppConfig['ai']['modelTypes'] => {
  if (!overrides) {
    return { ...(original ?? {}) };
  }

  const merged: AppConfig['ai']['modelTypes'] = { ...(original ?? {}) };
  const overrideKeys = Object.keys(overrides) as (keyof AppConfig['ai']['modelTypes'])[];
  for (const key of overrideKeys) {
    const override = overrides[key];
    if (!override) continue;
    merged[key] = {
      ...(merged[key] as SelectedChatModel | SelectedModel),
      ...override,
    } as SelectedChatModel | SelectedModel;
  }
  return merged;
};

export const createMockConfig = (overrides: DeepPartial<AppConfig> = {}): AppConfig => {
  const aiOverrides = overrides.ai as DeepPartial<AppConfig['ai']> | undefined;
  const hasAiOverride = Object.prototype.hasOwnProperty.call(overrides, 'ai');

  const aiSection =
    hasAiOverride && aiOverrides === undefined
      ? undefined
      : {
        ...baseAIConfig,
        ...(aiOverrides ?? {}),
        providers: mergeProviders(baseAIConfig.providers, aiOverrides?.providers),
        modelTypes: mergeModelTypes(baseAIConfig.modelTypes, aiOverrides?.modelTypes),
      };

  if (aiSection && aiOverrides) {
    if (
      Object.prototype.hasOwnProperty.call(aiOverrides, 'providers') &&
      aiOverrides.providers === undefined
    ) {
      (aiSection as any).providers = undefined;
    }
    if (
      Object.prototype.hasOwnProperty.call(aiOverrides, 'modelTypes') &&
      aiOverrides.modelTypes === undefined
    ) {
      (aiSection as any).modelTypes = undefined;
    }
  }

  const config: AppConfig = {
    ai: aiSection ?? baseAIConfig,
    ui: {
      ...baseUIConfig,
      ...(overrides.ui ?? {}),
    },
    learning: {
      ...baseLearningConfig,
      ...(overrides.learning ?? {}),
    },
    privacy: {
      ...basePrivacyConfig,
      ...(overrides.privacy ?? {}),
    },
    performance: {
      ...basePerformanceConfig,
      ...(overrides.performance ?? {}),
    },
  };

  if (aiSection === undefined) {
    (config as any).ai = undefined;
  }

  return config;
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
export { createTestQueryClient };
