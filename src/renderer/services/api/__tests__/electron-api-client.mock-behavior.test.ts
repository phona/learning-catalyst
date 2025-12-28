import { describe, it, expect } from 'vitest';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('electron-api-client mock behavior', () => {
  it('exposes file helpers with safe defaults', async () => {
    const client = createMockElectronAPIClient();

    const exists = await client.existsFile('/missing.md');
    const content = await client.readFile('/somewhere.md');
    const workspace = await client.getWorkspacePath();

    expect(exists.success).toBe(true);
    expect(exists.data).toBe(false);
    expect(content.success).toBe(true);
    expect(content.data).toContain('Mock file content');
    expect(workspace.success).toBe(true);
    expect(workspace.data).toBe('/mock/workspace');
  });

  it('returns structured content import response', async () => {
    const client = createMockElectronAPIClient();
    // Create a mock FileList for testing
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const mockFileList = {
      0: mockFile,
      length: 1,
      item: (index: number) => index === 0 ? mockFile : null,
      [Symbol.iterator]: function* () {
        yield mockFile;
      },
    } as FileList;
    const result = await client.content.importLearningContent(mockFileList);

    expect(result.success).toBe(true);
    expect(result.data?.summary?.difficulty).toBe('beginner');
    expect(result.data?.processedFiles).toBe(1);
    expect(result.data?.totalFiles).toBe(1);
  });

  it('provides settings/config accessors', async () => {
    const client = createMockElectronAPIClient();
    const cfg = await client.settings.getConfig();
    const versionInfo = await client.getVersion();

    expect(cfg.success).toBe(true);
    expect(cfg.data?.ui?.theme).toBe('light');
    expect(versionInfo.success).toBe(true);
    expect(versionInfo.data?.version).toBe('1.0.0');
  });
});
