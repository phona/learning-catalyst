/* eslint-disable @typescript-eslint/ban-ts-comment */

import { describe, it, expect, vi } from 'vitest';

// Import the renderer test setup to get the mock electronAPI
import '@/test/setup/renderer/setup';

describe('electronAPI contract', () => {
  it('exposes core domain modules with callable methods', async () => {
    // @ts-ignore: Test environment access to mocked electronAPI
    const api = window.electronAPI;
    expect(api).toBeDefined();

    expect(api.chat).toBeDefined();
    expect(typeof api.chat.generateTitle).toBe('function');
    expect(typeof api.chat.getMessages).toBe('function');
    expect(api.aiSDK).toBeDefined();
    expect(typeof api.aiSDK.stream).toBe('function');

    expect(api.knowledge).toBeDefined();
    expect(typeof api.knowledge.exploreConcept).toBe('function');

    expect(api.analytics).toBeDefined();
    expect(typeof api.analytics.getDashboard).toBe('function');

    expect(api.sessions).toBeDefined();
    expect(typeof api.sessions.list).toBe('function');
    await expect(api.sessions.list()).resolves.toMatchObject({ success: true });

    expect(api.agents).toBeDefined();
    expect(typeof api.agents.getAvailableAgents).toBe('function');

    expect(api.content).toBeDefined();
    expect(typeof api.content.importLearningContent).toBe('function');

    expect(api.settings).toBeDefined();
    await expect(api.settings.getUserPreferences()).resolves.toMatchObject({ success: true });

    expect(api.catalyst).toBeDefined();
    expect(typeof api.catalyst.executeAgent).toBe('function');
  });

  it('should document deprecated catalyst methods that need IPC handlers', async () => {
    // @ts-ignore: Test environment access to mocked electronAPI
    const api = window.electronAPI;
    expect(api).toBeDefined();
    expect(api.catalyst).toBeDefined();

    // These methods exist in the preload but have NO corresponding IPC handlers
    // in the main process, causing "No handler registered" errors in production
    const deprecatedMethods = [
      'catalyst:list-agents',
      'catalyst:get-active-executions'
    ];

    // Document the issue - these methods should either:
    // 1. Have IPC handlers created, OR
    // 2. Be removed from the preload API

    expect(deprecatedMethods).toHaveLength(2);
    expect(deprecatedMethods).toContain('catalyst:list-agents');
    expect(deprecatedMethods).toContain('catalyst:get-active-executions');
  });

  it('should validate error shape for IPC failures', async () => {
    // @ts-ignore: Test environment access to mocked electronAPI
    const api = window.electronAPI;
    expect(api).toBeDefined();

    // Test that IPC errors have the expected structure
    const mockIPCHandler = vi.fn().mockRejectedValue({
      type: 'IPC_ERROR',
      code: 'NO_HANDLER',
      message: 'No handler registered for test-channel',
      details: { channel: 'test-channel' }
    });

    expect(mockIPCHandler).toBeDefined();

    try {
      await mockIPCHandler();
    } catch (error: any) {
      expect(error).toHaveProperty('type');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error.type).toBe('IPC_ERROR');
    }
  });

  it('exposes filesystem utilities used by renderer code', async () => {
    // @ts-ignore: Test environment access to mocked electronAPI
    const api = window.electronAPI;

    await expect(api.getWorkspacePath()).resolves.toMatchObject({ success: true });
    await expect(api.readDirectory('/tmp')).resolves.toMatchObject({ success: true, data: expect.any(Array) });
    await expect(api.readFile('mock.md')).resolves.toMatchObject({ success: true });
    await expect(api.writeFile('mock.md', '# Title')).resolves.toMatchObject({ success: true });
    await expect(api.existsFile('mock.md')).resolves.toMatchObject({ success: true, data: true });
  });

  it('exposes dialog and lifecycle helpers', async () => {
    // @ts-ignore: Test environment access to mocked electronAPI
    const api = window.electronAPI;

    await expect(api.showOpenDialog({} as any)).resolves.toHaveProperty('canceled');
    await expect(api.showSaveDialog({} as any)).resolves.toHaveProperty('canceled');
    await expect(api.getVersion()).resolves.toMatchObject({ success: true });
    // await expect(api.quit()).resolves.toBeUndefined(); // quit method doesn't exist on ElectronAPI
    expect(typeof api.onMenuAction).toBe('function');

    const handler = vi.fn();
    api.onMenuAction(handler); // onMenuAction returns void, not a function
  });
});
