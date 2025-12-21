import type { AppConfig } from '@/shared/types';

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
export const validateConfig = (config: Partial<AppConfig> | null | undefined): ValidationResult => {
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
