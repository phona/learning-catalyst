/**
 * Shared Utility Helpers
 *
 * Common utility functions used across the application.
 */

/**
 * Generate a unique identifier using crypto.randomUUID
 */
export function createUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a timestamp in milliseconds
 */
export function generateTimestamp(): number {
  return Date.now();
}

/**
 * Generate a short ID for non-critical uses
 */
export function generateShortId(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Create a correlation ID for tracking operations
 */
export function createCorrelationId(): string {
  return `corr_${Date.now()}_${generateShortId(6)}`;
}

/**
 * Generate a session ID
 */
export function createSessionId(): string {
  return `session_${Date.now()}_${generateShortId(9)}`;
}

/**
 * Alias for createSessionId to maintain compatibility
 */
export const generateSessionId = createSessionId;

/**
 * Create an execution ID for agent operations
 */
export function createExecutionId(): string {
  return `exec_${Date.now()}_${generateShortId(8)}`;
}