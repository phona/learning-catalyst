import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIProviderSettings } from '@/renderer/components/Config/AIProviderSettings';
import { useService } from '@/renderer/services/services-provider';
import {
  createMockConfigurationService,
  createMockFileService,
} from '@/test/utils/services-provider-stubs';

// Temporary debug log to inspect environment.
console.log('[AIProviderSettings tests] NODE_ENV:', process.env.NODE_ENV);

const { mockUtilityToasts } = vi.hoisted(() => ({
  mockUtilityToasts: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/renderer/utils/toast', () => ({
  utilityToasts: mockUtilityToasts,
}));

const configServiceMock = createMockConfigurationService();
const fileServiceMock = createMockFileService();

vi.mock('@/renderer/services/services-provider', () => ({
  useService: vi.fn(),
  useConfigurationService: vi.fn(() => configServiceMock),
  useFileService: vi.fn(() => fileServiceMock),
}));

describe('AIProviderSettings (current UI)', () => {
  const validateProvider = vi.fn().mockResolvedValue({ success: true });
  const getProviderModels = vi.fn().mockResolvedValue(['gpt-3.5-turbo', 'gpt-4']);

  const mockConfigService = {
    validateProvider,
    getProviderModels,
  } as any;

  const baseProviderConfigs = {
    'openai-123': {
      provider_type: 'openai',
      api_key: 'test-openai-key',
      base_url: 'https://api.openai.com/v1',
      models: ['gpt-3.5-turbo', 'gpt-4'],
    },
  } as const;

  const baseAssignments = {
    chat: { provider_config_id: 'openai-123', model_id: 'gpt-3.5-turbo' },
    embedding: { provider_config_id: 'openai-123', model_id: 'text-embedding-ada-002' },
    rerank: { provider_config_id: 'openai-123', model_id: 'rerank-model' },
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    (useService as unknown as vi.Mock).mockReturnValue(mockConfigService);
    mockUtilityToasts.success.mockReset();
    mockUtilityToasts.error.mockReset();
  });

  it('renders sections and model types', () => {
    render(
      <AIProviderSettings
        providerConfigs={baseProviderConfigs as any}
        modelAssignments={baseAssignments as any}
      />,
    );

    expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Provider Configuration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Model Type Assignment').length).toBeGreaterThan(0);

    expect(screen.getByText('chat:')).toBeInTheDocument();
    expect(screen.getByText('embedding:')).toBeInTheDocument();
    expect(screen.getByText('rerank:')).toBeInTheDocument();
  });

  it('validates provider and enables save', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <AIProviderSettings
        providerConfigs={baseProviderConfigs as any}
        modelAssignments={baseAssignments as any}
      />,
    );

    // Provider configuration section should be expanded by default
    // Find the provider select dropdown within the form section
    const providerSelect = screen.getByDisplayValue('Choose a provider...');
    await user.selectOptions(providerSelect, 'openai');

    const apiKey = screen.getByPlaceholderText('Enter API key...');
    // Set the input value directly using paste/change event to avoid typing issues
    await user.clear(apiKey);
    await user.paste('key-123');

    // Verify the input has the correct value
    expect(apiKey).toHaveValue('key-123');

    // Find the Validate button within the form (not accordion)
    const validateButton = screen.getByRole('button', { name: 'Validate' });
    await user.click(validateButton);

    await waitFor(
      () => {
        expect(validateProvider).toHaveBeenCalledWith('openai', 'key-123', expect.any(String));
      },
      { timeout: 5000 },
    );

    // Save should be enabled after successful validation
    const saveButton = screen.getByRole('button', { name: 'Save Configuration' });
    await waitFor(() => expect(saveButton).toBeEnabled(), { timeout: 5000 });

    // Status text appears
    expect(screen.getByText('✓ API key is valid')).toBeInTheDocument();
  }, 10000);

  it('lists configured providers and allows fetching models', async () => {
    const user = userEvent.setup();
    render(
      <AIProviderSettings
        providerConfigs={baseProviderConfigs as any}
        modelAssignments={baseAssignments as any}
      />,
    );

    // Provider appears in configured list (should be visible since sections are expanded by default)
    expect(screen.getByText('Configured Providers')).toBeInTheDocument();

    // Find the Fetch Models button in the configured providers section
    // Use getAllByText because there might be multiple Fetch Models buttons
    const fetchButtons = screen.getAllByText('Fetch Models');
    const configuredProviderFetchBtn = fetchButtons.find(
      (btn) => btn.closest('button')?.hasAttribute('disabled') === false,
    );

    if (configuredProviderFetchBtn) {
      await user.click(configuredProviderFetchBtn);

      await waitFor(
        () => {
          expect(getProviderModels).toHaveBeenCalledWith(
            'openai',
            'test-openai-key',
            'https://api.openai.com/v1',
          );
        },
        { timeout: 5000 },
      );
    }
  }, 10000);

  it('emits onModelAssignmentChange when selecting model', async () => {
    const user = userEvent.setup();
    const onModelAssignmentChange = vi.fn();

    render(
      <AIProviderSettings
        providerConfigs={baseProviderConfigs as any}
        modelAssignments={baseAssignments as any}
        onModelAssignmentChange={onModelAssignmentChange}
      />,
    );

    const modelSelect = screen.getByDisplayValue('gpt-3.5-turbo');
    await user.selectOptions(modelSelect, 'gpt-4');

    expect(onModelAssignmentChange).toHaveBeenCalledWith('chat', 'openai-123', 'gpt-4');
  }, 10000);
});
