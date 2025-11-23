import { describe, expect, it } from 'vitest';
import { createIPCError, IPCErrorException } from '@/shared/types/ipc-error';
import { serializeIPCError } from '../ipc-error-handler';

describe('serializeIPCError', () => {
  it('returns the payload from IPCErrorException instances', () => {
    const payload = createIPCError({
      type: 'CONFIG_ERROR',
      code: 'test.code',
      message: 'Setup is required',
      needsSetup: true,
    });

    const structured = new IPCErrorException(payload);

    expect(serializeIPCError(structured, 'startup')).toEqual(payload);
  });

  it('converts unknown errors into structured payloads', () => {
    const error = new Error('boom');

    const result = serializeIPCError(error, 'handler:doSomething');

    expect(result.type).toBe('SYSTEM_ERROR');
    expect(result.code).toContain('handler:doSomething');
    expect(result.message).toBe('boom');
    expect(result.action).toBe('retry');
  });

  it('passes through raw IPC payloads unchanged', () => {
    const payload = createIPCError({
      type: 'SYSTEM_ERROR',
      code: 'custom.payload',
      message: 'already structured',
    });

    expect(serializeIPCError(payload, 'ignored')).toBe(payload);
  });
});
