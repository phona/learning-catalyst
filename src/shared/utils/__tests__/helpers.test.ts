import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  createUUID,
  generateTimestamp,
  generateShortId,
  isValidUUID,
  createCorrelationId,
  createSessionId,
  generateSessionId,
  createExecutionId,
} from '../helpers';

describe('shared/utils/helpers', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    // Restore crypto after tests that patch it
    globalThis.crypto = originalCrypto as Crypto;
    vi.restoreAllMocks();
  });

  it('uses crypto.randomUUID when available', () => {
    const mockUuid = '11111111-2222-3333-4444-555555555555';
    // @ts-expect-error allow overriding crypto for test
    globalThis.crypto = { randomUUID: vi.fn(() => mockUuid) };

    const value = createUUID();

    expect(value).toBe(mockUuid);
    expect((globalThis.crypto as unknown).randomUUID).toHaveBeenCalled();
  });

  it('falls back to manual UUID generation when crypto is missing', () => {
    // @ts-expect-error intentionally remove crypto
    globalThis.crypto = undefined;

    const value = createUUID();

    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(isValidUUID(value)).toBe(true);
  });

  it('validates UUID strings correctly', () => {
    expect(isValidUUID('00000000-0000-4000-8000-000000000000')).toBe(true);
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('generates predictable prefixes for correlation, session and execution ids', () => {
    const correlation = createCorrelationId();
    const session = createSessionId();
    const sessionAlias = generateSessionId();
    const execution = createExecutionId();

    expect(correlation.startsWith('corr_')).toBe(true);
    expect(session.startsWith('session_')).toBe(true);
    expect(sessionAlias.startsWith('session_')).toBe(true);
    expect(execution.startsWith('exec_')).toBe(true);
  });

  it('creates short ids with requested length', () => {
    const id = generateShortId(12);
    expect(id).toHaveLength(12);
  });

  it('generates a timestamp in milliseconds', () => {
    vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const ts = generateTimestamp();

    expect(ts).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    vi.useRealTimers();
  });
});
