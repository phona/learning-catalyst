import { describe, it, expect } from 'vitest';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('electron-api-client mock behavior', () => {
  it('exposes file helpers with safe defaults', async () => {
    const client = createMockElectronAPIClient();

    const exists = await client.existsFile('/missing.md');
    const content = await client.readFile('/somewhere.md');
    const workspace = await client.getWorkspacePath();

    expect(exists).toBe(false);
    expect(content).toContain('Mock file content');
    expect(workspace).toBe('/mock/workspace');
  });

  it('returns structured content import response', async () => {
    const client = createMockElectronAPIClient();
    const result = await client.content.importLearningContent({});

    expect(result.success).toBe(true);
    expect(result.data?.summary?.difficulty).toBe('beginner');
  });

  it('provides settings/config accessors', async () => {
    const client = createMockElectronAPIClient();
    const cfg = await client.settings.getConfig();
    const version = await client.settings.getAppVersion();

    expect(cfg.success).toBe(true);
    expect(cfg.data?.ui?.theme).toBe('light');
    expect(version.data).toBe('1.0.0');
  });
});
