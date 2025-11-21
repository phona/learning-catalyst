import { vi } from 'vitest';
import type { AppConfig } from '@/shared/types/config';

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

type ConfigurationServiceStub = {
  getConfig: () => Promise<AppConfig | null>;
};

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
  showSaveDialog: vi.fn().mockResolvedValue({ success: true, data: { canceled: true, filePath: '' } }),
  readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/mock/workspace' }),
});

export const createMockConfigurationService = (config: AppConfig | null = null): ConfigurationServiceStub => ({
  getConfig: vi.fn().mockResolvedValue(config),
});

export const createMockElectronAPIClient = (): ElectronAPIClientStub => ({
  onIPCError: vi.fn(() => () => undefined),
});
