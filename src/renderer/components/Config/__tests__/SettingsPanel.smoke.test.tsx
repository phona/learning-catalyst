/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithSettings } from '@/test/utils/renderWithServices';
import { makeEmptyConfig } from '@/test/utils/fixtures/config';

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
    const { SettingsPanel } = await import('../SettingsPanel');
    renderWithSettings(<SettingsPanel />, { config: makeEmptyConfig() });

    expect(await screen.findByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('AI Models')).toBeInTheDocument();
    expect(screen.getByText('Interface')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('renders with provider metadata without crashing', async () => {
    const configWithProvider = makeEmptyConfig({
      ai: {
        providers: {
          'openai-config': {
            provider_type: 'openai',
            api_key: 'test-key'
          },
        },
        model_types: {
          chat: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            enable_thinking: false,
            stream: true
          },
        },
      },
    });

    const { SettingsPanel } = await import('../SettingsPanel');
    renderWithSettings(<SettingsPanel />, { config: configWithProvider });
    expect(await screen.findByText('Preferences')).toBeInTheDocument();
  });
});
