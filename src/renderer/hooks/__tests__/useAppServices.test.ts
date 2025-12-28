import { describe, expect, it } from 'vitest';
import { useAppServices, useService } from '../useAppServices';

describe('useAppServices placeholder', () => {
  it('returns ready state with empty services', () => {
    const hook = useAppServices();
    expect(hook.ready).toBe(true);
    expect(hook.error).toBeNull();
    expect(hook.services).toEqual({});
  });

  it('throws when using unimplemented useService helper', () => {
    const hook = useAppServices();
    expect(() => hook.useService?.('anything')).toThrow(/not implemented/);
    expect(() => useService('anything')).toThrow(/not implemented/);
  });
});
