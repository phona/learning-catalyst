import type { APIResponse, APIResponseError } from '@/shared/types/electron-api';

export class APIError extends Error {
  code?: string;
  details?: unknown;
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, APIError.prototype);
    this.name = 'APIError';
  }
}

export function toError(err: APIResponseError): Error {
  return new APIError(err.message, err.code, err.details);
}

export function unwrap<T>(resp: APIResponse<T>): T {
  if (resp.success) {
    return (resp.data as T) as T;
  }
  throw toError(resp.error);
}

export function assertOk(resp: APIResponse<unknown>): void {
  if (!resp.success) {
    throw toError(resp.error);
  }
}
