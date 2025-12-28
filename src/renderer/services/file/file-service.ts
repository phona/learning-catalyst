/**
 * File Operations Service
 *
 * Provides secure file operations with validation and error handling
 *
 * This service uses the unwrapAPI pattern for consistent IPC error handling.
 * All IPC calls use unwrapAPI() which:
 * - Automatically unwraps APIResponse<T> to T
 * - Shows error toasts on failures
 * - Throws IPCError for programmatic error handling
 */

import type { ElectronAPI } from '@/shared/types/electron-api';
import type { DirectoryFilterConfig, DirectoryScanResult } from '@/shared/types/filesystem';
import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI.helpers';

// Fix: Align dialog option/return types with Electron to prevent type mismatch
// Rationale: Custom options previously allowed invalid 'openFiles' and returned generic string
// Now using Electron's types ensures compatibility with main process and better type safety
export type FileOpenDialogOptions = OpenDialogOptions;
export type FileSaveDialogOptions = SaveDialogOptions;

export interface FileOperationResult<T = string> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const MAX_FILE_SIZE = 50000; // 50KB limit
const ALLOWED_EXTENSIONS = [
  'txt',
  'md',
  'js',
  'ts',
  'py',
  'java',
  'cpp',
  'c',
  'json',
  'yml',
  'yaml',
  'xml',
  'csv',
  'html',
  'css',
];

/**
 * Validates file content for security and size
 */
function validateFileContent(content: unknown, filePath: string): FileOperationResult<string> {
  // Check if content is a string
  if (typeof content !== 'string') {
    return {
      success: false,
      error: {
        code: 'INVALID_CONTENT_TYPE',
        message: 'Invalid file content format - expected string',
        details: { receivedType: typeof content, filePath },
      },
    };
  }

  // Check file size
  if (content.length > MAX_FILE_SIZE) {
    return {
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File is too large (max ${MAX_FILE_SIZE} bytes)`,
        details: { fileSize: content.length, maxSize: MAX_FILE_SIZE, filePath },
      },
    };
  }

  return { success: true, data: content };
}

/**
 * Sanitizes file content to prevent XSS
 */
function sanitizeContent(content: string): string {
  return content.replace(/[<>&"']/g, (match) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    return entities[match];
  });
}

/**
 * Extracts file name from path
 */
function extractFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || 'Unknown file';
}

/**
 * File Operations Service Factory
 *
 * Provides secure file operations for the renderer process
 * Uses explicit dependency injection for better testability and modularity
 */
export function createFileService(electronAPI: ElectronAPI) {
  /**
   * Shows an open dialog to select files
   */
  const showOpenDialog = async (
    options?: FileOpenDialogOptions,
  ): Promise<FileOperationResult<OpenDialogReturnValue>> => {
    try {
      if (!electronAPI?.showOpenDialog) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'File dialog service is not available',
          },
        };
      }

      const result = await electronAPI.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ALLOWED_EXTENSIONS },
          { name: 'All Files', extensions: ['*'] },
        ],
        ...options,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:showOpenDialog',
      );
      return {
        success: false,
        error: {
          code: 'DIALOG_ERROR',
          message: error instanceof Error ? error.message : 'Failed to open file dialog',
          details: error,
        },
      };
    }
  };

  /**
   * Reads and validates file content
   */
  const readFile = async (
    filePath: string,
  ): Promise<FileOperationResult<{ content: string; fileName: string }>> => {
    try {
      if (!filePath) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'File path is required',
          },
        };
      }

      const fileName = extractFileName(filePath);

      // Read file through Electron API (unwrapAPI extracts response.data)
      const content = await unwrapAPI(electronAPI.readFile(filePath));

      // Validate content
      const validation = validateFileContent(content, filePath);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // Sanitize content
      const sanitizedContent = sanitizeContent(validation.data!);

      return {
        success: true,
        data: {
          content: sanitizedContent,
          fileName,
        },
      };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:readFile',
      );
      return {
        success: false,
        error: {
          code: 'READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to read file',
          details: { filePath, error },
        },
      };
    }
  };

  /**
   * Writes content to a file
   */
  const writeFile = async (filePath: string, content: string): Promise<FileOperationResult> => {
    try {
      if (!filePath) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'File path is required',
          },
        };
      }

      if (typeof content !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_CONTENT',
            message: 'Content must be a string',
          },
        };
      }

      // Write file through Electron API (unwrapAPI extracts response.data)
      await unwrapAPI(electronAPI.writeFile(filePath, content));

      return { success: true };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:writeFile',
      );
      return {
        success: false,
        error: {
          code: 'WRITE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to write file',
          details: { filePath, error },
        },
      };
    }
  };

  /**
   * Checks if a file exists
   */
  const existsFile = async (filePath: string): Promise<FileOperationResult<boolean>> => {
    try {
      if (!filePath) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'File path is required',
          },
        };
      }

      // Check existence through Electron API (unwrapAPI extracts response.data)
      const exists = await unwrapAPI(electronAPI.existsFile(filePath));

      return {
        success: true,
        data: exists,
      };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:existsFile',
      );
      return {
        success: false,
        error: {
          code: 'EXISTS_CHECK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check file existence',
          details: { filePath, error },
        },
      };
    }
  };

  /**
   * Shows a save dialog
   */
  const showSaveDialog = async (
    options?: FileSaveDialogOptions,
  ): Promise<FileOperationResult<SaveDialogReturnValue>> => {
    try {
      if (!electronAPI?.showSaveDialog) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Save dialog service is not available',
          },
        };
      }

      const result = await electronAPI.showSaveDialog(options ?? {});

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:showSaveDialog',
      );
      return {
        success: false,
        error: {
          code: 'DIALOG_ERROR',
          message: error instanceof Error ? error.message : 'Failed to open save dialog',
          details: error,
        },
      };
    }
  };

  const readDirectory = async (
    dirPath: string,
    recursive = true,
    maxDepth = 3,
    filterConfig?: DirectoryFilterConfig,
  ): Promise<FileOperationResult<DirectoryScanResult[]>> => {
    try {
      if (!dirPath) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Directory path is required',
          },
        };
      }

      if (!electronAPI?.readDirectory) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Directory listing service is not available',
          },
        };
      }

      // Read directory through Electron API (unwrapAPI extracts response.data)
      const items = await unwrapAPI(electronAPI.readDirectory(dirPath, recursive, maxDepth, filterConfig));

      return {
        success: true,
        data: Array.isArray(items) ? items : [],
      };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:readDirectory',
      );
      return {
        success: false,
        error: {
          code: 'READ_DIRECTORY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to read directory',
          details: { dirPath, error },
        },
      };
    }
  };

  const getWorkspacePath = async (): Promise<FileOperationResult<string | null>> => {
    try {
      if (!electronAPI?.getWorkspacePath) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Workspace path service is not available',
          },
        };
      }

      // Get workspace path through Electron API (unwrapAPI extracts response.data)
      const workspacePath = await unwrapAPI(electronAPI.getWorkspacePath());

      return {
        success: true,
        data: workspacePath || null,
      };
    } catch (error) {
      // Log error to console
      console.error(
        error instanceof Error ? error : String(error),
        'renderer:file-service:getWorkspacePath',
      );
      return {
        success: false,
        error: {
          code: 'WORKSPACE_PATH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get workspace path',
          details: error,
        },
      };
    }
  };

  return {
    showOpenDialog,
    readFile,
    writeFile,
    existsFile,
    showSaveDialog,
    readDirectory,
    getWorkspacePath,
  };
}

export type FileService = ReturnType<typeof createFileService>;
