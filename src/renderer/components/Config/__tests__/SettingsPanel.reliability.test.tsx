import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { makeEmptyConfig } from '@/test/utils/fixtures/config';

// Local mocks tailored for these reliability tests
vi.mock('@/renderer/hooks/useAppServices', async () => {
  const actual = await vi.importActual<typeof import('@/renderer/hooks/useAppServices')>('@/renderer/hooks/useAppServices');
  return {
    ...actual,
    useService: () => ({
      saveConfig: vi.fn().mockResolvedValue(undefined),
      updateModelTypeConfig: vi.fn().mockResolvedValue(undefined),
      validateProvider: vi.fn().mockResolvedValue({ success: false, error: 'Invalid API key' }),
      getProviderModels: vi.fn().mockResolvedValue([]),
      testModel: vi.fn().mockResolvedValue({ status: 'success', details: { response_time: 15 } }),
    }),
  };
});

vi.mock('@/renderer/utils/toast', () => ({
  utilityToasts: {
    success: vi.fn(),
    error: vi.fn(),
  },
  settingsToasts: {
    providerError: vi.fn(),
    saved: vi.fn(),
    reset: vi.fn(),
  },
}));

describe('SettingsPanel reliability', () => {
  it('disables Fetch Models before any provider assignment', async () => {
    const { renderSettingsPanel } = await import('@/test/utils/renderWithServices');
    await renderSettingsPanel({ config: makeEmptyConfig() });

    // Wait for panel to render and expand AI Models accordion
    await screen.findByText('Preferences');
    const aiModelsToggle = screen.getByRole('button', { name: /^AI Models/i });
    const user = (await import('@testing-library/user-event')).default.setup();
    // Expand if collapsed
    if (aiModelsToggle.getAttribute('aria-expanded') === 'false') {
      await user.click(aiModelsToggle);
    }

    // There are multiple model types; all should be disabled initially
    const buttons = screen.getAllByRole('button', { name: /fetch models/i });
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn).toHaveAttribute('disabled');
    }
  });

  it('shows validation error toast when provider validation fails', async () => {
    const { renderSettingsPanel } = await import('@/test/utils/renderWithServices');
    const toast = await import('@/renderer/utils/toast');
    const { utilityToasts } = toast as any;

    await renderSettingsPanel({ config: makeEmptyConfig() });

    await screen.findByText('Preferences');
    const aiModelsToggle = screen.getByRole('button', { name: /^AI Models/i });
    const user = (await import('@testing-library/user-event')).default.setup();
    if (aiModelsToggle.getAttribute('aria-expanded') === 'false') {
      await user.click(aiModelsToggle);
    }

    // Open Provider Configuration section is expanded by default in component
    // Select a provider and type an API key, then click Validate
    const providerSelect = screen.getAllByRole('combobox')[0];
    await (await import('@testing-library/user-event')).default.selectOptions(providerSelect as HTMLSelectElement, 'openai');

    const apiKeyInput = screen.getByPlaceholderText('Enter API key...');
    const user2 = (await import('@testing-library/user-event')).default.setup();
    await user2.type(apiKeyInput, 'bad-key');

    const validateButtons = screen.getAllByRole('button');
    const validateButton = validateButtons.find((b) => b.textContent?.trim() === 'Validate');
    expect(validateButton).toBeDefined();
    await user2.click(validateButton!);

    // Expect our mocked error toast to have been called
    expect(utilityToasts.error).toHaveBeenCalled();
  });
});
