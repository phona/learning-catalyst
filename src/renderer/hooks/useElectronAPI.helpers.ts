/**
 * Electron API helper utilities
 *
 * Provides the standardized `unwrapAPI` helper and `IPCError` type used by
 * renderer services and components for IPC error handling.
 */

import type { APIResponse } from '@/shared/types/electron-api/base';
import { showError } from '@/renderer/shared/lib';

/** IPC call options */
export interface IPCCallOptions {
  /** Suppress toast notification on error */
  silent?: boolean;
}

/** Structured IPC error with code for programmatic handling */
export class IPCError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IPCError';
  }
}

/**
 * Internal helper to unwrap APIResponse<T> to T.
 *
 * @throws IPCError if response indicates failure
 */
function unwrap<T>(response: APIResponse<T>, options: IPCCallOptions = {}): T {
  if (!response.success) {
    const errorMessage = response.error?.message ?? 'unknown error';

    // Extract error code - check both response.code and response.error.code
    const errorCode = response.code ?? response.error?.code ?? 'UNKNOWN_ERROR';

    // Extract error details if present
    const errorDetails = response.error?.details;

    // Toast unless silent
    if (!options.silent) {
      showError(errorMessage);
    }

    // Re-throw for caller handling
    throw new IPCError(errorCode, errorMessage, errorDetails);
  }

  return response.data as T;
}

/**
 * Helper to unwrap API responses
 *
 * This is the STANDARDIZED way to call IPC methods in the renderer. All services should use
 * unwrapAPI instead of manual response unwrapping.
 *
 * @param responsePromise - Promise that resolves to APIResponse<T>
 * @param options - Options for unwrapping behavior
 * @returns Promise that resolves to unwrapped data T
 *
 * @example
 * ```typescript
 * // Basic usage
 * const data = await unwrapAPI(electronAPI.sessions.list());
 *
 * // With error handling
 * try {
 *   const sessions = await unwrapAPI(electronAPI.sessions.list());
 *   // Use sessions directly
 * } catch (error) {
 *   if (error instanceof IPCError) {
 *     // Handle specific error codes
 *   }
 * }
 *
 * // Silent mode (no toast)
 * const data = await unwrapAPI(electronAPI.backgroundTask(), { silent: true });
 * ```
 */
export function unwrapAPI<T>(
  responsePromise: Promise<APIResponse<T>>,
  options: IPCCallOptions = {},
): Promise<T> {
  return responsePromise.then((response) => unwrap(response, options));
}
