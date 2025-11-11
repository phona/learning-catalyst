import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useConfigStore } from '@/renderer/stores/useConfigStore';

describe('useConfigStore reliability', () => {
  it('maps getUserPreferences into AppConfig on loadConfig', async () => {
    const getUserPreferences = window.electronAPI.settings.getUserPreferences as unknown as ReturnType<typeof vi.fn>;
    // Ensure our setup mock is wired
    expect(getUserPreferences).toBeDefined();

    let cfg: any = null;
    await act(async () => {
      cfg = await useConfigStore.getState().loadConfig();
    });

    expect(cfg).toBeTruthy();
    // Verify a few key mappings
    expect(cfg.ui.theme).toBeDefined();
    expect(cfg.ui.font_size).toBeDefined();
    expect(cfg.learning.difficulty).toBeDefined();
    expect(cfg.privacy.store_conversations).toBeDefined();
  });

  it('calls updatePreferences on saveConfig with mapped payload', async () => {
    const updatePreferences = window.electronAPI.settings.updatePreferences as unknown as ReturnType<typeof vi.fn>;

    // Prime store with a config
    let loaded = null as any;
    await act(async () => {
      loaded = await useConfigStore.getState().loadConfig();
    });

    // Modify and save
    const updated = {
      ...loaded,
      ui: {
        ...loaded.ui,
        theme: 'dark',
        font_size: 'large',
      },
    };

    await act(async () => {
      await useConfigStore.getState().saveConfig(updated);
    });

    expect(updatePreferences).toHaveBeenCalled();
    const call = updatePreferences.mock.calls.at(-1)?.[0];
    expect(call.interface.theme).toBe('dark');
    expect(call.interface.fontSize).toBe('large');
  });
});

