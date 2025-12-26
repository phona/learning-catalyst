import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupSettingsHandlers } from '@/main/handlers/settings-handlers';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import type { AppConfig } from '@/shared/types';
import type { ConfigService } from '@/main/services/core/config/config-service';

// DI pattern: Create mocked dependencies following testing guide best practices
const createConfigService = (): ConfigService => {
  const config: AppConfig = {
    ai: { providers: {}, embeddingDimensions: 1536 },
    ui: {
      theme: 'light',
      showTokenUsage: false,
      displayFormat: 'detailed',
      sessionDuration: 25,
      fontSize: 'medium',
      sidebarWidth: 300,
      autoSave: true,
      autoScroll: true,
      showLineNumbers: false,
      enableMarkdown: true,
      enableSyntaxHighlighting: true,
      compactMode: false,
    },
    learning: {
      autoSave: true,
      sessionTimeoutMinutes: 60,
      difficulty: 'intermediate',
      learningStyle: 'visual',
      personalizationEnabled: true,
      checkpointInterval: 15,
      maxSessionHistory: 100,
      enableAnalytics: false,
      preferredExplanationLength: 'detailed',
    },
    privacy: {
      storeConversations: true,
      retentionDays: 90,
      anonymousAnalytics: false,
      crashReporting: true,
      encryptLocalStorage: false,
      autoCleanup: true,
      exportFormat: 'json',
    },
    performance: {
      cacheSizeMb: 100,
      enableCaching: true,
      maxConcurrentRequests: 5,
      requestTimeout: 30,
      memoryLimitMb: 512,
      gpuAcceleration: false,
      backgroundProcessing: true,
      preloadModels: false,
    },
    parsing: {},
  };

  return {
    getConfig: vi.fn(async () => config),
    setConfig: vi.fn(async () => undefined),
    get: vi.fn(async () => undefined) as any,
    getProviderConfig: vi.fn(async () => undefined),
    setProviderConfig: vi.fn(async () => undefined),
    onConfigChanged: vi.fn(() => vi.fn()),
    isSetupComplete: vi.fn(async () => true),
  };
};

describe('[TC-501] settings IPC contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[TC-502] returns available providers summary', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const configService = createConfigService();

    setupSettingsHandlers(ipcMain, { configService });

    const res = await ipcRenderer.invoke('settings:getAvailableProviders');
    expect(res).toBeDefined();
    expect(res.summary?.total).toBeGreaterThan(0);
  });

  it('[TC-503] updates user preferences and reports changed keys', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const configService = createConfigService();

    setupSettingsHandlers(ipcMain, { configService });

    const res = await ipcRenderer.invoke('settings:update-preferences', { theme: 'dark' });

    expect(res.updatedSettings?.theme).toBe('dark');
    expect(res.changes).toContain('theme');
  });

  it('[TC-504] configures provider and echoes providerId', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const configService = createConfigService();

    setupSettingsHandlers(ipcMain, { configService });

    const res = await ipcRenderer.invoke('settings:configureProvider', {
      provider: 'openai',
      config: { providerType: 'openai', apiKey: 'k' },
    });

    expect(res.providerId).toBe('openai');
    expect(res.status).toBe('configured');
  });

  it('[TC-505] saves workspace config successfully', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const configService = createConfigService();

    setupSettingsHandlers(ipcMain, { configService });

    const res = await ipcRenderer.invoke('settings:setWorkspaceConfig', { ui: { theme: 'dark' } });

    expect(res).toBeUndefined();
    expect(configService.setConfig).toHaveBeenCalledWith({ ui: { theme: 'dark' } });
  });

  it('[TC-506] returns failure when config write fails', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const configService = createConfigService();

    // Mock setConfig to throw error
    configService.setConfig = vi.fn(async () => {
      throw new Error('disk full');
    });

    setupSettingsHandlers(ipcMain, { configService });

    await expect(
      ipcRenderer.invoke('settings:setWorkspaceConfig', { ui: { theme: 'dark' } })
    ).rejects.toThrow('disk full');
  });
});
