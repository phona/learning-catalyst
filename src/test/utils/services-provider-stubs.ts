import { vi } from 'vitest';
import type { AppConfig, ProviderConfig } from '@/shared/types/config';
import type { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

type FileServiceStub = {
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  readFile: () => Promise<{
    success: true;
    data: { content: string; fileName: string };
  }>;
  writeFile: () => Promise<{ success: true }>;
  existsFile: () => Promise<{ success: true; data: boolean }>;
  showSaveDialog: () => Promise<{ success: true; data: { canceled: boolean; filePath: string } }>;
  readDirectory: () => Promise<{ success: true; data: unknown[] }>;
  getWorkspacePath: () => Promise<{ success: true; data: string }>;
};

type ConfigurationServiceStub = ConfigurationService;

type ElectronAPIClientStub = {
  onIPCError: (callback: (payload: unknown) => void) => () => void;
};

export const createMockFileService = (): FileServiceStub => ({
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  readFile: vi.fn().mockResolvedValue({
    success: true,
    data: {
      content: '',
      fileName: 'mock.txt',
    },
  }),
  writeFile: vi.fn().mockResolvedValue({ success: true }),
  existsFile: vi.fn().mockResolvedValue({ success: true, data: true }),
  showSaveDialog: vi
    .fn()
    .mockResolvedValue({ success: true, data: { canceled: true, filePath: '' } }),
  readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/mock/workspace' }),
});

export const createMockConfigurationService = (
  config: AppConfig | null = null,
): ConfigurationServiceStub => ({
  getAvailableProviders: vi
    .fn()
    .mockResolvedValue({ success: true, providers: [], summary: { total: 0, connected: 0, configured: 0 } }),
  configureProvider: vi
    .fn()
    .mockResolvedValue({ providerId: 'mock', status: 'configured' }),
  validateProvider: vi.fn().mockResolvedValue({ success: true }),
  getProviderModels: vi.fn().mockResolvedValue([]),
  getConfig: vi.fn().mockResolvedValue(config),
  setConfig: vi.fn().mockResolvedValue(undefined),
  saveConfig: vi.fn().mockResolvedValue(undefined),
});

export const createMockElectronAPIClient = (): ElectronAPIClientStub => ({
  onIPCError: vi.fn(() => () => undefined),
});
