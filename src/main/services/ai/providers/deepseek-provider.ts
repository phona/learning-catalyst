/**
 * DeepSeek Provider - Refactored to use base factory
 *
 * BEFORE: ~206 lines of duplicated code
 * AFTER: ~10 lines using base factory
 *
 * This demonstrates 95% code reduction while maintaining identical functionality.
 */

import { createProviderService, providerConfigs } from './base-provider-factory';

/**
 * DeepSeek service factory using base provider factory
 * Eliminated 95% of duplicated code while maintaining identical functionality
 */
export const createDeepSeekService = ({ loggerService }: { loggerService: any }) => {
  return createProviderService(providerConfigs.deepseek)({ loggerService });
};
