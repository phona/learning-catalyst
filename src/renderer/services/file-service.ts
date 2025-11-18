/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */


/**
 * File Operations Service
 *
 * Provides secure file operations with validation and error handling
 */

import { useElectronAPIClient } from './services-provider';

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
  return content.replace(/[<>&]/g, (match) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;'
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
 * File Operations Service Hook
 *
 * Provides secure file operations for the renderer process
 */
export function useFileService() {
  const electronAPIClient = useElectronAPIClient();

  /**
   * Shows an open dialog to select files
   */
  const showOpenDialog = async (options?: FileOpenDialogOptions): Promise<FileOperationResult> => {
    try {
      if (!electronAPIClient?.showOpenDialog) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'File dialog service is not available'
          }
        };
      }

      const result = await electronAPIClient.showOpenDialog({
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
      const content = await electronAPIClient.readFile(filePath);

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

      await electronAPIClient.writeFile(filePath, content);

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

      const exists = await electronAPIClient.existsFile(filePath);

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
      if (!electronAPIClient?.showSaveDialog) {
        return {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Save dialog service is not available'
          }
        };
      }

      const result = await electronAPIClient.showSaveDialog(options);

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

  return {
    showOpenDialog,
    readFile,
    writeFile,
    existsFile,
    showSaveDialog
  };
}
