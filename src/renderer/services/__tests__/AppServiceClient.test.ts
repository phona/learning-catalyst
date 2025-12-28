import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initializeApp,
  setupMenuHandlers,
  getAppVersion,
  quitApp,
  showOpenDialog,
  showSaveDialog,
  readFile,
  writeFile,
  existsFile,
  validateConfig,
} from '../AppServiceClient';

const originalElectron = (globalThis as any).window?.electronAPI;

describe('AppServiceClient', () => {
  beforeEach(() => {
    (globalThis as any).window = { ...globalThis.window };
    (window as any).electronAPI = undefined;
  });

  afterEach(() => {
    (window as any).electronAPI = originalElectron;
    vi.restoreAllMocks();
  });

  it('initializeApp rejects when electronAPI missing', async () => {
    await expect(initializeApp()).rejects.toThrow('Electron API not available');
  });

  it('initializeApp resolves when electronAPI exists', async () => {
    (window as any).electronAPI = {};
    await expect(initializeApp()).resolves.toBeUndefined();
  });

  it('setupMenuHandlers no-ops without electronAPI', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => setupMenuHandlers({})).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('setupMenuHandlers wires handler when electronAPI present', () => {
    const handler = vi.fn();
    (window as any).electronAPI = {
      onMenuAction: (cb: any) => cb('save'),
    };

    setupMenuHandlers({ save: handler });
    expect(handler).toHaveBeenCalled();
  });

  it('getAppVersion returns Unknown without electronAPI', async () => {
    const version = await getAppVersion();
    expect(version).toBe('Unknown');
  });

  it('getAppVersion returns string when available', async () => {
    (window as any).electronAPI = {
      getVersion: vi.fn().mockResolvedValue({
        success: true,
        data: { version: '2.0.0', build: 'test', platform: 'web' },
      }),
    };
    const version = await getAppVersion();
    expect(version).toBe('2.0.0');
  });

  it('quitApp ignores missing electronAPI', async () => {
    await expect(quitApp()).resolves.toBeUndefined();
  });

  it('quitApp calls relaunchApp when present', async () => {
    const relaunch = vi.fn().mockResolvedValue(undefined);
    (window as any).electronAPI = { relaunchApp: relaunch };
    await quitApp();
    expect(relaunch).toHaveBeenCalled();
  });

  it('dialogs fall back when electronAPI missing', async () => {
    const open = await showOpenDialog();
    const save = await showSaveDialog();
    expect(open.canceled).toBe(true);
    expect(save.filePath).toBe('');
  });

  it('dialogs delegate when electronAPI present', async () => {
    const open = vi.fn().mockResolvedValue({ canceled: false, filePaths: ['a'] });
    const save = vi.fn().mockResolvedValue({ canceled: false, filePath: 'b' });
    (window as any).electronAPI = { showOpenDialog: open, showSaveDialog: save };
    expect((await showOpenDialog()).filePaths[0]).toBe('a');
    expect(await showSaveDialog()).toEqual({ canceled: false, filePath: 'b' });
  });

  it('read/write throw without electronAPI', async () => {
    await expect(readFile('/tmp')).rejects.toThrow('Electron API not available');
    await expect(writeFile('/tmp', 'x')).rejects.toThrow('Electron API not available');
  });

  it('existsFile returns false when missing and delegates when present', async () => {
    expect(await existsFile('/tmp')).toBe(false);
    const exists = vi.fn().mockResolvedValue({ success: true, data: true });
    (window as any).electronAPI = { existsFile: exists };
    expect(await existsFile('/tmp')).toBe(true);
    expect(exists).toHaveBeenCalledWith('/tmp');
  });

  it('validateConfig accepts minimal valid config', () => {
    const valid = {
      ai: { default_provider: 'openai', default_model: 'gpt-4', temperature: 0.5 },
      ui: {},
      learning: {},
      privacy: {},
      performance: {},
    };
    expect(validateConfig(valid)).toBe(true);
    expect(validateConfig({})).toBe(false);
    expect(validateConfig({ ai: {} })).toBe(false);
  });
});
