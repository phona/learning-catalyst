import type { AppConfig } from '@/shared/types/config';
import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { assertOk, unwrap } from '@/renderer/shared/lib';
import type { ElectronAPI, APIResponse } from '@/shared/types/electron-api';


// Menu handlers interface
interface MenuHandlers {
  [action: string]: () => void;
}

/**
 * Initialize the application
 */
export async function initializeApp(): Promise<void> {
  try {
    // Check if we're in Electron environment
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    throw error;
  }
}

/**
 * Setup menu event handlers
 */
export function setupMenuHandlers(handlers: MenuHandlers): void {
  if (!window.electronAPI) {
    console.warn('Electron API not available, cannot setup menu handlers');
    return;
  }

  window.electronAPI.onMenuAction((action: string, data?: unknown) => {
    const handler = handlers[action];
    if (handler) {
      handler();
    } else {
      console.warn(`No handler found for menu action: ${action}`, data);
    }
  });
}

/**
 * Get application version
 */
export async function getAppVersion(): Promise<string> {
  if (!window.electronAPI) {
    return 'Unknown';
  }

  try {
    const versionInfo = await window.electronAPI.getVersion();
    return versionInfo.version;
  } catch (error) {
    console.error('Failed to get app version:', error);
    return 'Unknown';
  }
}

/**
 * Quit the application
 */
export async function quitApp(): Promise<void> {
  if (!window.electronAPI) {
    return;
  }

  try {
    await window.electronAPI.relaunchApp();
  } catch (error) {
    console.error('Failed to quit app:', error);
  }
}

/**
 * Show open file dialog
 */
export async function showOpenDialog(options?: OpenDialogOptions) {
  if (!window.electronAPI) {
    return { canceled: true, filePaths: [] };
  }

  try {
    return await window.electronAPI.showOpenDialog(options || {});
  } catch (error) {
    console.error('Failed to show open dialog:', error);
    return { canceled: true, filePaths: [] };
  }
}

/**
 * Show save file dialog
 */
export async function showSaveDialog(options?: SaveDialogOptions) {
  if (!window.electronAPI) {
    return { canceled: true, filePath: '' };
  }

  try {
    return await window.electronAPI.showSaveDialog(options || {});
  } catch (error) {
    console.error('Failed to show save dialog:', error);
    return { canceled: true, filePath: '' };
  }
}

/**
 * Read file content
 */
export async function readFile(path: string): Promise<string> {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }

  try {
    return await window.electronAPI.readFile(path);
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
}

/**
 * Write file content
 */
export async function writeFile(path: string, content: string): Promise<void> {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }

  try {
    await window.electronAPI.writeFile(path, content);
  } catch (error) {
    console.error('Failed to write file:', error);
    throw error;
  }
}

/**
 * Check if file exists
 */
export async function existsFile(path: string): Promise<boolean> {
  if (!window.electronAPI) {
    return false;
  }

  try {
    return await window.electronAPI.existsFile(path);
  } catch (error) {
    console.error('Failed to check file existence:', error);
    return false;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): config is AppConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const configObj = config as Record<string, unknown>;

  // Basic structure validation
  const requiredSections = ['ai', 'ui', 'learning', 'privacy', 'performance'];
  for (const section of requiredSections) {
    if (!configObj[section] || typeof configObj[section] !== 'object') {
      return false;
    }
  }

  // AI section validation
  const aiConfig = configObj.ai as Record<string, unknown>;
  if (!aiConfig.default_provider || typeof aiConfig.default_provider !== 'string') {
    return false;
  }

  if (!aiConfig.default_model || typeof aiConfig.default_model !== 'string') {
    return false;
  }

  if (
    typeof aiConfig.temperature !== 'number' ||
    aiConfig.temperature < 0 ||
    aiConfig.temperature > 2
  ) {
    return false;
  }

  return true;
}
