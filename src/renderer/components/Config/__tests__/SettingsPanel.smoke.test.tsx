import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderSettingsPanel } from '@/test/utils/renderWithServices';
import { makeEmptyConfig, makeProviderConfig } from '@/test/utils/fixtures/config';

vi.mock('@/renderer/hooks/useAppServices', async () => {
  const actual = await vi.importActual<typeof import('@/renderer/hooks/useAppServices')>('@/renderer/hooks/useAppServices');
  return {
    ...actual,
    useService: () => ({
      saveConfig: vi.fn().mockResolvedValue(undefined),
      updateModelTypeConfig: vi.fn().mockResolvedValue(undefined),
      validateProvider: vi.fn().mockResolvedValue({ success: true }),
      getProviderModels: vi.fn().mockResolvedValue(['gpt-3.5-turbo']),
      testModel: vi.fn().mockResolvedValue({
        status: 'success',
        details: { response_time: 10 },
      }),
    }),
  };
});

describe('SettingsPanel smoke coverage', () => {
  it('renders the preferences layout with empty configuration', async () => {
    await renderSettingsPanel({ config: makeEmptyConfig() });

    expect(await screen.findByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('AI Models')).toBeInTheDocument();
    expect(screen.getByText('Interface')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('renders with provider metadata without crashing', async () => {
    const configWithProvider = makeEmptyConfig({
      ai: {
        providers: {
          'openai-config': makeProviderConfig(),
        },
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            available_providers: ['openai'],
            settings: {},
            capabilities: {
              streaming: true,
              thinking: true,
              function_calling: false,
              vision: false,
            },
          },
        },
      },
    });

    await renderSettingsPanel({ config: configWithProvider });
    expect(await screen.findByText('Preferences')).toBeInTheDocument();
  });
});
