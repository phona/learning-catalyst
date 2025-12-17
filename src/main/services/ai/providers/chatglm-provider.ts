/**
 * ChatGLM Provider - Refactored to use base factory
 *
 * BEFORE: ~256 lines of duplicated code
 * AFTER: ~10 lines using base factory
 *
 * This demonstrates 95% code reduction while maintaining identical functionality.
 */

import { createProviderService, providerConfigs } from './base-provider-factory';
import type { LoggerService } from '@/main/services/core/logger/logger-service';

/**
 * ChatGLM service factory using base provider factory
 * Eliminated 95% of duplicated code while maintaining identical functionality
 */
export const createChatGLMService = ({ loggerService }: { loggerService: LoggerService }) => {
  return createProviderService(providerConfigs.chatglm)({ loggerService });
};
