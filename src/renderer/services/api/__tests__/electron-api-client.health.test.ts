import { describe, it, expect, vi } from 'vitest';
import { createElectronAPIClient, createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('electron-api-client health and lifecycle', () => {
  it('falls back and exposes healthCheck with mock data', async () => {
    (globalThis as any).window = {}; // force fallback
    const client = createElectronAPIClient();
    const health = await client.healthCheck();
    expect(health.status).toBe('healthy');
  });

  it('uses provided electronAPI without warnings when present', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = {
      healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
    };
    (globalThis as any).window = { electronAPI: fake };

    const client = createElectronAPIClient();
    const res = await client.healthCheck();

    expect(res.status).toBe('ok');
    expect(warn).not.toHaveBeenCalled();
  });

  it('mock client exposes writeFile and show dialogs safely', async () => {
    const mock = createMockElectronAPIClient();
    await expect(mock.writeFile('/tmp/file.txt', 'content')).resolves.toBeUndefined();
    const open = await mock.showOpenDialog({});
    const save = await mock.showSaveDialog({});
    expect(open.canceled).toBe(true);
    expect(save.canceled).toBe(true);
  });
});
