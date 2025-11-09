/**
 * Catalyst Services Index
 *
 * Main exports for catalyst-related services in the main thread.
 */

export * from './catalyst-service';
export type { CatalystServiceMain } from './catalyst-service';

// Note: The renderer CatalystService was moved to src/renderer/services/CatalystService.ts
// This file exports only the main process CatalystServiceMain