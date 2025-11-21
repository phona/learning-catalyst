/**
 * File Operations Service
 *
 * Provides secure file operations with validation and error handling
 */

import type { ElectronAPI } from '@/shared/types/electron-api';
import type { DirectoryFilterConfig, DirectoryScanResult } from '@/shared/types/filesystem';

export interface FileOpenDialogOptions {
  properties?: ('openFile' | 'openFiles' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent')[];
  filters?: Array<{ name: string; extensions: string[] }>;
  title?: string;
  defaultPath?: string;
}

export interface FileSaveDialogOptions {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  title?: string;
  buttonLabel?: string;
}

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
const ALLOWED_EXTENSIONS = ['txt', 'md', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'json', 'yml', 'yaml', 'xml', 'csv', 'html', 'css'];

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
        details: { receivedType: typeof content, filePath }
      }
    };
  }

  // Check file size
  if (content.length > MAX_FILE_SIZE) {
    return {
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File is too large (max ${MAX_FILE_SIZE} bytes)`,
        details: { fileSize: content.length, maxSize: MAX_FILE_SIZE, filePath }
      }
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
      "'": '&#x27;'
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
  const showOpenDialog = async (options?: FileOpenDialogOptions): Promise<FileOperationResult> => {
    try {
      if (!electronAPI?.showOpenDialog) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'File dialog service is not available'
          }
        };
      }

      const result = await electronAPI.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ALLOWED_EXTENSIONS },
          { name: 'All Files', extensions: ['*'] },
        ],
        ...options
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DIALOG_ERROR',
          message: error instanceof Error ? error.message : 'Failed to open file dialog',
          details: error
        }
      };
    }
  };

  /**
   * Reads and validates file content
   */
  const readFile = async (filePath: string): Promise<FileOperationResult<{ content: string; fileName: string }>> => {
    try {
      if (!filePath) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'File path is required'
          }
        };
      }

      const fileName = extractFileName(filePath);

      // Read file through Electron API
      const content = await electronAPI.readFile(filePath);

      // Validate content
      const validation = validateFileContent(content, filePath);
      if (!validation.success) {
        return validation as FileOperationResult;
      }

      // Sanitize content
      const sanitizedContent = sanitizeContent(validation.data!);

      return {
        success: true,
        data: {
          content: sanitizedContent,
          fileName
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to read file',
          details: { filePath, error }
        }
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
            message: 'File path is required'
          }
        };
      }

      if (typeof content !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_CONTENT',
            message: 'Content must be a string'
          }
        };
      }

      await electronAPI.writeFile(filePath, content);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WRITE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to write file',
          details: { filePath, error }
        }
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
            message: 'File path is required'
          }
        };
      }

      const exists = await electronAPI.existsFile(filePath);

      return {
        success: true,
        data: exists
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXISTS_CHECK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check file existence',
          details: { filePath, error }
        }
      };
    }
  };

  /**
   * Shows a save dialog
   */
  const showSaveDialog = async (options?: FileSaveDialogOptions): Promise<FileOperationResult> => {
    try {
      if (!electronAPI?.showSaveDialog) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Save dialog service is not available'
          }
        };
      }

      const result = await electronAPI.showSaveDialog(options);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DIALOG_ERROR',
          message: error instanceof Error ? error.message : 'Failed to open save dialog',
          details: error
        }
      };
    }
  };

  const readDirectory = async (
    dirPath: string,
    recursive = true,
    maxDepth = 3,
    filterConfig?: DirectoryFilterConfig
  ): Promise<FileOperationResult<DirectoryScanResult[]>> => {
    try {
      if (!dirPath) {
        return {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Directory path is required'
          }
        };
      }

      if (!electronAPI?.readDirectory) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Directory listing service is not available'
          }
        };
      }

      const items = await electronAPI.readDirectory(dirPath, recursive, maxDepth, filterConfig);

      return {
        success: true,
        data: Array.isArray(items) ? items : []
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'READ_DIRECTORY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to read directory',
          details: { dirPath, error }
        }
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
            message: 'Workspace path service is not available'
          }
        };
      }

      const workspacePath = await electronAPI.getWorkspacePath();

      return {
        success: true,
        data: workspacePath || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WORKSPACE_PATH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get workspace path',
          details: error
        }
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
    getWorkspacePath
  };
}

export type FileService = ReturnType<typeof createFileService>;
