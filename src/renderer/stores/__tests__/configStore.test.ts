import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppConfig, ProviderConfig } from '@/shared/types';

let useConfigStore: typeof import('../useConfigStore').useConfigStore;
let setConfigurationService: typeof import('../useConfigStore').setConfigurationService;

const baseConfig: AppConfig = {
  ai: { providers: {}, modelTypes: {}, embeddingDimensions: 1024 },
  ui: { theme: 'light', showTokenUsage: false, displayFormat: 'detailed', sessionDuration: 25, fontSize: 'medium', sidebarWidth: 300, autoSave: true, autoScroll: true, showLineNumbers: false, enableMarkdown: true, enableSyntaxHighlighting: true, compactMode: false },
  learning: { autoSave: true, sessionTimeoutMinutes: 60, difficulty: 'intermediate', learningStyle: 'visual', personalizationEnabled: true, checkpointInterval: 15, maxSessionHistory: 100, enableAnalytics: false, preferredExplanationLength: 'detailed' },
  privacy: { storeConversations: true, retentionDays: 90, anonymousAnalytics: false, crashReporting: true, encryptLocalStorage: false, autoCleanup: true, exportFormat: 'json' },
  performance: { cacheSizeMb: 100, enableCaching: true, maxConcurrentRequests: 5, requestTimeout: 30, memoryLimitMb: 512, gpuAcceleration: false, backgroundProcessing: true, preloadModels: false },
};

describe('useConfigStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ useConfigStore, setConfigurationService } =
      await vi.importActual<typeof import('../useConfigStore')>('../useConfigStore'));
    // reset store & service
    useConfigStore.setState({
      config: null,
      loading: false,
      error: null,
    });
    setConfigurationService({
      getConfig: vi.fn().mockResolvedValue(baseConfig),
      saveConfig: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('loadConfig returns null when service missing and sets error', async () => {
    setConfigurationService(null);
    const result = await useConfigStore.getState().loadConfig();
    expect(result).toBeNull();
    expect(useConfigStore.getState().error).toContain('Configuration service has not been initialized');
    expect(useConfigStore.getState().loading).toBe(false);
  });

  it('loadConfig merges defaults from service', async () => {
    const getConfig = vi.fn().mockResolvedValue({ ui: { theme: 'dark' } });
    setConfigurationService({ getConfig, saveConfig: vi.fn() } as any);

    const loaded = await useConfigStore.getState().loadConfig();
    expect(loaded?.ui.theme).toBe('dark');
    expect(loaded?.learning.sessionTimeoutMinutes).toBe(60);
    expect(useConfigStore.getState().loading).toBe(false);
  });

  it('saveConfig delegates to service and clears loading', async () => {
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    setConfigurationService({ saveConfig, getConfig: vi.fn().mockResolvedValue(baseConfig) } as any);
    await useConfigStore.getState().saveConfig(baseConfig);
    expect(saveConfig).toHaveBeenCalledWith(baseConfig);
    expect(useConfigStore.getState().loading).toBe(false);
  });

  it('updateConfig throws when no config loaded', async () => {
    useConfigStore.setState({ config: null });
    await expect(useConfigStore.getState().updateConfig({ ui: { theme: 'dark' } })).rejects.toThrow(
      'No config loaded',
    );
  });

  it('setProviderConfig/save/remove/update default provider', async () => {
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    setConfigurationService({ saveConfig, getConfig: vi.fn().mockResolvedValue(baseConfig) } as any);
    useConfigStore.setState({ config: baseConfig, loading: false, error: null });

    const provider: ProviderConfig = { providerType: 'openai', baseUrl: 'u', apiKey: 'k', models: ['gpt-4'] };
    await useConfigStore.getState().setProviderConfig('openai', provider);

    const loadedProvider = useConfigStore.getState().getProviderConfig('openai');
    expect(loadedProvider?.providerType).toBe('openai');

    await useConfigStore.getState().setDefaultProvider('openai', 'gpt-4');
    await useConfigStore.getState().removeProviderConfig('openai');
    expect(useConfigStore.getState().config?.ai.providers['openai']).toBeUndefined();
    expect(saveConfig).toHaveBeenCalled();
  });

  it('resetConfig writes defaults', async () => {
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    setConfigurationService({ saveConfig, getConfig: vi.fn().mockResolvedValue(baseConfig) } as any);
    const config = await useConfigStore.getState().resetConfig();
    expect(config.ui.theme).toBe('light');
    expect(saveConfig).toHaveBeenCalled();
  });
});
