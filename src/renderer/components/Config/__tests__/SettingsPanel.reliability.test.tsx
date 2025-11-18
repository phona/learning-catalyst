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




import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeEmptyConfig } from '@/test/utils/fixtures/config';

// Mock entire module with all needed exports
vi.mock('@/renderer/services/services-provider', () => ({
  ConfigServiceProvider: ({ children }: { children: any }) => children,
  ServicesProvider: ({ children }: { children: any }) => children,
  ServiceContainerManager: vi.fn(),
  useService: vi.fn(() => ({
    saveConfig: vi.fn().mockResolvedValue(undefined),
    updateModelTypeConfig: vi.fn().mockResolvedValue(undefined),
    validateProvider: vi.fn().mockResolvedValue({ success: false, error: 'Invalid API key' }),
    getProviderModels: vi.fn().mockResolvedValue([]),
    testModel: vi.fn().mockResolvedValue({ status: 'success', details: { response_time: 15 } })
  }))
}));

vi.mock('@/renderer/hooks/useServices', () => ({
  ServiceProvider: ({ children }: { children: any }) => children
}));

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
  let mockUseService: any;

  beforeEach(async () => {
    const { useService } = await import('@/renderer/services/services-provider');
    mockUseService = vi.mocked(useService);
    
    mockUseService.mockReturnValue({
      saveConfig: vi.fn().mockResolvedValue(undefined),
      updateModelTypeConfig: vi.fn().mockResolvedValue(undefined),
      validateProvider: vi.fn().mockResolvedValue({ success: false, error: 'Invalid API key' }),
      getProviderModels: vi.fn().mockResolvedValue([]),
      testModel: vi.fn().mockResolvedValue({ status: 'success', details: { response_time: 15 } })
    });
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
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await userEvent.setup().click(saveButton);

    // The mock is already set up from beforeEach - may be called multiple times
    await waitFor(() => {
      expect(mockUseService().saveConfig).toHaveBeenCalled();
    });
  });
});