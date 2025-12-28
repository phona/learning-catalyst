/**
 * File Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFileService } from '../file-service';
import type { ElectronAPI } from '@/shared/types';
import type { APIResponse } from '@/shared/types/electron-api/base';

// Helper to create a successful API response
const okResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// Helper to create a failed API response
const failResponse = (message: string, code = 'ERROR'): APIResponse<never> => ({
  success: false,
  error: { message, code },
  timestamp: new Date().toISOString(),
});

// Mock electronAPI with proper APIResponse return types
const mockElectronAPI: Partial<ElectronAPI> = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  existsFile: vi.fn(),
};

describe('FileService', () => {
  let fileService: ReturnType<typeof createFileService>;

  beforeEach(() => {
    vi.clearAllMocks();
    fileService = createFileService(mockElectronAPI as ElectronAPI);
  });

  describe('showOpenDialog', () => {
    it('should successfully open dialog', async () => {
      const mockResult = { canceled: false, filePaths: ['/path/to/file.txt'] };
      vi.mocked(mockElectronAPI.showOpenDialog!).mockResolvedValue(mockResult as any);

      const result = await fileService.showOpenDialog();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });

    it('should merge defaults with provided options', async () => {
      const mockResult = { canceled: false, filePaths: ['/path/to/dir'] };
      vi.mocked(mockElectronAPI.showOpenDialog!).mockResolvedValue(mockResult as any);

      const options = {
        properties: ['openDirectory', 'multiSelections'] as Array<
          'openDirectory' | 'multiSelections' | 'openFile' | 'createDirectory'
        >,
        title: 'Pick Dir',
      };
      const result = await fileService.showOpenDialog(options);

      expect(result.success).toBe(true);
      expect(mockElectronAPI.showOpenDialog).toHaveBeenCalled();
      const callArg = vi.mocked(mockElectronAPI.showOpenDialog!).mock.calls[0][0] as any;
      expect(callArg.properties).toEqual(['openDirectory', 'multiSelections']);
      expect(callArg.title).toBe('Pick Dir');
      expect(callArg.filters).toBeDefined();
    });

    it('should handle service unavailability', async () => {
      const noServiceAPI = {} as ElectronAPI;
      const noServiceFileService = createFileService(noServiceAPI);

      const result = await noServiceFileService.showOpenDialog();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('readFile', () => {
    it('should successfully read and validate file', async () => {
      const mockContent = 'Hello, World!';
      vi.mocked(mockElectronAPI.readFile!).mockResolvedValue(okResponse(mockContent) as any);

      const result = await fileService.readFile('/path/to/file.txt');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(mockContent);
      expect(result.data?.fileName).toBe('file.txt');
    });

    it('should handle invalid path', async () => {
      const result = await fileService.readFile('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATH');
    });

    it('should sanitize content', async () => {
      const maliciousContent = '<script>alert("xss")</script>';
      vi.mocked(mockElectronAPI.readFile!).mockResolvedValue(okResponse(maliciousContent) as any);

      const result = await fileService.readFile('/path/to/file.txt');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle file too large', async () => {
      const largeContent = 'x'.repeat(60000); // Exceeds 50KB limit
      vi.mocked(mockElectronAPI.readFile!).mockResolvedValue(okResponse(largeContent) as any);

      const result = await fileService.readFile('/path/to/large.txt');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_TOO_LARGE');
    });

    it('returns error for non-string content and read failure', async () => {
      vi.mocked(mockElectronAPI.readFile!).mockResolvedValue(okResponse(123 as any) as any);
      let result = await fileService.readFile('/path/to/file.txt');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONTENT_TYPE');

      vi.mocked(mockElectronAPI.readFile!).mockRejectedValue(new Error('boom'));
      result = await fileService.readFile('/path/fail.txt');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ERROR');
    });
  });

  describe('writeFile', () => {
    it('should successfully write file', async () => {
      vi.mocked(mockElectronAPI.writeFile!).mockResolvedValue(okResponse(undefined) as any);

      const result = await fileService.writeFile('/path/to/file.txt', 'Hello, World!');

      expect(result.success).toBe(true);
      expect(mockElectronAPI.writeFile).toHaveBeenCalledWith('/path/to/file.txt', 'Hello, World!');
    });

    it('should handle invalid path', async () => {
      const result = await fileService.writeFile('', 'content');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATH');
    });

    it('should handle invalid content type', async () => {
      const result = await fileService.writeFile('/path/to/file.txt', null as any);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONTENT');
    });

    it('should surface write errors', async () => {
      vi.mocked(mockElectronAPI.writeFile!).mockRejectedValue(new Error('write-fail'));
      const result = await fileService.writeFile('/path/to/file.txt', 'text');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
    });
  });

  describe('existsFile', () => {
    it('should successfully check file existence', async () => {
      vi.mocked(mockElectronAPI.existsFile!).mockResolvedValue(okResponse(true) as any);

      const result = await fileService.existsFile('/path/to/file.txt');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle invalid path', async () => {
      const result = await fileService.existsFile('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PATH');
    });
  });

  describe('showSaveDialog', () => {
    it('should successfully open save dialog', async () => {
      const mockResult = { canceled: false, filePath: '/path/to/save.txt' };
      vi.mocked(mockElectronAPI.showSaveDialog!).mockResolvedValue(mockResult as any);

      const result = await fileService.showSaveDialog();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });

    it('should pass through provided options', async () => {
      const mockResult = { canceled: false, filePath: '/path/to/save.txt' };
      vi.mocked(mockElectronAPI.showSaveDialog!).mockResolvedValue(mockResult as any);

      const options = { defaultPath: '/path/to/default.txt', title: 'Save As' };
      const result = await fileService.showSaveDialog(options);

      expect(result.success).toBe(true);
      expect(mockElectronAPI.showSaveDialog).toHaveBeenCalledWith(options);
    });

    it('should handle service unavailability', async () => {
      const noServiceAPI = {} as ElectronAPI;
      const noServiceFileService = createFileService(noServiceAPI);

      const result = await noServiceFileService.showSaveDialog();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('readDirectory and workspace', () => {
    it('handles service unavailable and invalid path', async () => {
      const noService = createFileService({} as ElectronAPI);
      const invalid = await noService.readDirectory('');
      expect(invalid.success).toBe(false);
      expect(invalid.error?.code).toBe('INVALID_PATH');

      const unavailable = await noService.readDirectory('/some');
      expect(unavailable.success).toBe(false);
      expect(unavailable.error?.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('handles getWorkspacePath unavailable', async () => {
      const noService = createFileService({} as ElectronAPI);
      const res = await noService.getWorkspacePath();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('SERVICE_UNAVAILABLE');
    });
  });
});
