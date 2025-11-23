import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedSettings } from '@/renderer/components/Config/AdvancedSettings';
import { createMockConfig } from '@/test/utils/helpers/test-utils';

const baseConfig = createMockConfig({
  performance: {
    cacheSizeMb: 256,
    maxConcurrentRequests: 3,
  },
  privacy: {
    storeConversations: true,
    anonymousAnalytics: true,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: false,
  },
});

describe('AdvancedSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders headings and inputs', () => {
    render(<AdvancedSettings config={baseConfig} onConfigChange={vi.fn()} />);

    expect(screen.getByText(/Advanced Settings/i)).toBeInTheDocument();
    const spinboxes = screen.getAllByRole('spinbutton');
    expect(spinboxes[0]).toHaveValue(256);
    expect(spinboxes[1]).toHaveValue(3);
  });

  it('updates performance fields', async () => {
    const onConfigChange = vi.fn();
    render(<AdvancedSettings config={baseConfig} onConfigChange={onConfigChange} />);
    const user = userEvent.setup();

    const [cacheInput, maxRequests] = screen.getAllByRole('spinbutton');
    fireEvent.change(cacheInput, { target: { value: '512' } });
    expect(onConfigChange.mock.calls.at(-1)?.[0]).toMatchObject({
      performance: expect.objectContaining({ cacheSizeMb: 512 }),
    });

    fireEvent.change(maxRequests, { target: { value: '5' } });
    expect(onConfigChange.mock.calls.at(-1)?.[0]).toMatchObject({
      performance: expect.objectContaining({ maxConcurrentRequests: 5 }),
    });
  });

  it('toggles privacy flags', async () => {
    const onConfigChange = vi.fn();
    render(<AdvancedSettings config={baseConfig} onConfigChange={onConfigChange} />);
    const user = userEvent.setup();

    const storeToggle = screen
      .getAllByRole('button')
      .find((btn) =>
        btn.previousElementSibling
          ?.querySelector('label')
          ?.textContent?.includes('Store Conversations'),
      );
    expect(storeToggle).toBeDefined();
    await user.click(storeToggle!);

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        privacy: expect.objectContaining({ storeConversations: false }),
      }),
    );
  });
});
