import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeEmptyConfig } from '@/test/utils/fixtures/config';

const configServiceMock = vi.hoisted(() => ({
  saveConfig: vi.fn().mockResolvedValue(undefined),
  updateModelTypeConfig: vi.fn().mockResolvedValue(undefined),
  validateProvider: vi.fn().mockResolvedValue({ success: false, error: 'Invalid API key' }),
  getProviderModels: vi.fn().mockResolvedValue([]),
  testModel: vi.fn().mockResolvedValue({ status: 'success', details: { response_time: 15 } })
}));

vi.mock('@/renderer/hooks/useAppServices', async () => {
  const actual = await vi.importActual<typeof import('@/renderer/hooks/useAppServices')>(
    '@/renderer/hooks/useAppServices'
  );
  return {
    ...actual,
    useService: () => configServiceMock
  };
});

vi.mock('@/renderer/utils/toast', () => ({
  utilityToasts: {
    success: vi.fn(),
    error: vi.fn()
  },
  settingsToasts: {
    providerError: vi.fn(),
    saved: vi.fn(),
    reset: vi.fn()
  }
}));

describe('SettingsPanel reliability', () => {
  beforeEach(() => {
    Object.values(configServiceMock).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
    configServiceMock.validateProvider.mockResolvedValue({ success: false, error: 'Invalid API key' });
    configServiceMock.getProviderModels.mockResolvedValue([]);
    configServiceMock.testModel.mockResolvedValue({ status: 'success', details: { response_time: 15 } });
  });

  it('disables Fetch Models before any provider assignment', async () => {
    const { renderSettingsPanel } = await import('@/test/utils/renderWithServices');
    await renderSettingsPanel({ config: makeEmptyConfig() });

    await screen.findByText('Preferences');
    const aiModelsToggle = screen.getByRole('button', { name: /^AI Models/i });
    const user = userEvent.setup();
    if (aiModelsToggle.getAttribute('aria-expanded') === 'false') {
      await user.click(aiModelsToggle);
    }

    const buttons = screen.getAllByRole('button', { name: /fetch models/i });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => expect(btn).toHaveAttribute('disabled'));
  });

  it('shows validation error toast when provider validation fails', async () => {
    const { renderSettingsPanel } = await import('@/test/utils/renderWithServices');
    const toast = await import('@/renderer/utils/toast');
    const { utilityToasts } = toast as any;

    await renderSettingsPanel({ config: makeEmptyConfig() });

    await screen.findByText('Preferences');
    const aiModelsToggle = screen.getByRole('button', { name: /^AI Models/i });
    const user = userEvent.setup();
    if (aiModelsToggle.getAttribute('aria-expanded') === 'false') {
      await user.click(aiModelsToggle);
    }

    const providerSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(providerSelect as HTMLSelectElement, 'openai');

    const apiKeyInput = screen.getByPlaceholderText('Enter API key...');
    await user.type(apiKeyInput, 'bad-key');

    const validateButton = screen.getAllByRole('button').find((b) => b.textContent?.trim() === 'Validate');
    expect(validateButton).toBeDefined();
    await user.click(validateButton!);

    expect(utilityToasts.error).toHaveBeenCalled();
  });

  it('saves configuration when Save Changes is clicked', async () => {
    const { renderSettingsPanel } = await import('@/test/utils/renderWithServices');
    await renderSettingsPanel({ config: makeEmptyConfig() });

    await screen.findByText('Preferences');
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    await userEvent.setup().click(saveButton);

    await waitFor(() => {
      expect(configServiceMock.saveConfig).toHaveBeenCalledTimes(1);
    });
  });
});
