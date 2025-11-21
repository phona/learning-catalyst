
import { describe, it, expect, vi } from 'vitest';

describe('electronAPI contract', () => {
  it('exposes core domain modules with callable methods', async () => {
    const api = window.electronAPI;
    expect(api).toBeDefined();

    expect(api.chat).toBeDefined();
    expect(typeof api.chat.sendMessage).toBe('function');

    expect(api.learning).toBeDefined();
    expect(typeof api.learning.startLearningSession).toBe('function');

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
    expect(typeof api.content.exploreLocalProjects).toBe('function');

    expect(api.settings).toBeDefined();
    await expect(api.settings.getUserPreferences()).resolves.toMatchObject({ success: true });

    expect(api.catalyst).toBeDefined();
    expect(typeof api.catalyst.executeAgent).toBe('function');
  });

  it('exposes filesystem utilities used by renderer code', async () => {
    const api = window.electronAPI;

    await expect(api.getWorkspacePath()).resolves.toBeDefined();
    await expect(api.readDirectory('/tmp')).resolves.toBeInstanceOf(Array);
    await expect(api.readFile('mock.md')).resolves.toBeDefined();
    await expect(api.writeFile('mock.md', '# Title')).resolves.toBeUndefined();
    await expect(api.existsFile('mock.md')).resolves.toBe(true);
  });

  it('exposes dialog and lifecycle helpers', async () => {
    const api = window.electronAPI;

    await expect(api.showOpenDialog()).resolves.toHaveProperty('canceled');
    await expect(api.showSaveDialog()).resolves.toHaveProperty('canceled');
    await expect(api.getAppVersion()).resolves.toBeDefined();
    await expect(api.quit()).resolves.toBeUndefined();
    expect(typeof api.onMenuAction).toBe('function');

    const handler = vi.fn();
    const unsubscribe = api.onMenuAction(handler);
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
});
