/**
 * @fileoverview Application initialization utilities
 *
 * This module contains helper functions for validating configuration
 * and handling initialization errors in the AppContent component.
 */

import { showError } from '@/renderer/utils/toast';
import { READY_TIMEOUT_MS } from '@/shared/types/electron-api';

/**
 * Configuration structure for AI chat models
 */
export interface ChatModelConfig {
  provider: string;
  model: string;
}

/**
 * Complete application configuration structure
 */
export interface AppConfig {
  ai?: {
    modelTypes?: {
      chat?: ChatModelConfig;
    };
  };
}

/**
 * Result of configuration validation
 */
export interface ValidationResult {
  /** Whether setup is required */
  needsSetup: boolean;
  /** Optional message explaining why setup is needed */
  message?: string;
}

/**
 * Validates application configuration to determine if setup is required
 *
 * This function checks:
 * 1. Configuration existence (electron API availability)
 * 2. Chat model provider configuration
 * 3. Chat model name configuration
 *
 * @param config - The application configuration to validate
 * @returns ValidationResult indicating if setup is needed and why
 */
export const validateConfig = (config: AppConfig | null): ValidationResult => {
  // Check if configuration exists (electron API is available)
  if (!config) {
    return {
      needsSetup: true,
      message: 'Electron API is unavailable.'
    };
  }

  // Validate chat model configuration
  const chatConfig = config?.ai?.modelTypes?.chat;
  if (!chatConfig?.provider || !chatConfig?.model) {
    return {
      needsSetup: true,
      message: 'AI provider is not configured yet.'
    };
  }

  // Configuration is valid
  return { needsSetup: false };
};

/**
 * Initialization step identifier for error handling
 */
export type InitStep = 'load-config' | 'await-ready';

/**
 * Handles initialization errors based on the step where failure occurred
 *
 * Provides appropriate user feedback:
 * - For await-ready failures: sets initialization error message
 * - For config load failures: shows toast notification and transitions to setup
 *
 * @param error - The error that occurred during initialization
 * @param step - The initialization step where the error happened
 * @param setInitError - State setter for initialization error message
 * @param setStatus - State setter for application status
 * @param setStatusMessage - State setter for status display message
 */
export const handleInitError = (
  error: unknown,
  step: InitStep,
  setInitError: (message: string) => void,
  setStatus: (status: 'loading' | 'setup' | 'error' | 'ready') => void,
  setStatusMessage: (message: string | null) => void
): void => {
  console.error(`[App] ${step} failed`, error);

  // Handle timeout during await-ready phase
  if (step === 'await-ready') {
    setInitError('System initialization timed out. Please restart the application.');
    return;
  }

  // Handle configuration loading errors
  showError(
    error instanceof Error ? error.message : 'Failed to load workspace configuration.'
  );
  setStatus('setup');
  setStatusMessage('Unable to load workspace configuration.');
};
