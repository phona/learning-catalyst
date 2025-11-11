import { describe, it, expect } from 'vitest';

describe('electronAPI contract (renderer baseline)', () => {
  it('exposes settings and basic methods that return promises', async () => {
    expect(window.electronAPI).toBeDefined();
    expect(window.electronAPI.settings).toBeDefined();
    expect(typeof window.electronAPI.settings.getUserPreferences).toBe('function');
    expect(typeof window.electronAPI.settings.updatePreferences).toBe('function');

    const prefs = await window.electronAPI.settings.getUserPreferences();
    expect(prefs).toBeDefined();
    const updateRes = await window.electronAPI.settings.updatePreferences({ interface: { theme: 'dark' } } as any);
    expect(updateRes).toBeDefined();
  });

  it('exposes session and catalyst namespaces used by renderer code', async () => {
    expect(window.electronAPI.session).toBeDefined();
    expect(typeof window.electronAPI.session.list).toBe('function');
    const listRes = await window.electronAPI.session.list();
    expect(listRes).toBeDefined();

    expect(window.electronAPI.catalyst).toBeDefined();
    expect(typeof window.electronAPI.catalyst.sendChat).toBe('function');
  });
});

